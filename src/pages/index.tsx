import {
  contactToName,
  normalizePhoneNumber,
  textFromBinary,
} from '@/helpers/format';
import {
  chatsQuery,
  contactsQuery,
  messagesQuery,
  useSQL,
} from '@/helpers/sql';
import { Chat } from '@/helpers/types';
import { FileInput } from '@mantine/core';
import React, { useEffect, useMemo, useState } from 'react';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { db } from '@/helpers/db';
import { useLiveQuery } from 'dexie-react-hooks';
dayjs.extend(relativeTime);

const Home: React.FC = () => {
  const [contactsFile, setContactsFile] = useState<File | null>(null);
  const [messagesFile, setMessagesFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChats, setSelectedChats] = useState<Chat[]>([]);

  const messages = useLiveQuery(
    () =>
      db.messages
        .where('chatId')
        .anyOf(selectedChats.map((chat) => chat.id))
        .reverse()
        .sortBy('timestamp'),
    [selectedChats],
    [],
  );

  const { initDatabase, runQuery, deleteDatabase } = useSQL();

  const chatToId = ({
    name,
    participants,
  }: Pick<Chat, 'name' | 'participants'>) =>
    name === 'Group Chat' ? participants.join(',') : name;

  const nonDuplicateChats = useMemo(
    () =>
      chats
        .filter(
          (chat, i) =>
            !chats.slice(0, i).map(chatToId).includes(chatToId(chat)),
        )
        .map((chat) => ({
          ...chat,
          lastMessageDate: chat.lastMessageDate
            ? dayjs(chat.lastMessageDate).fromNow()
            : '',
        })),
    [chats],
  );

  useEffect(() => {
    if (chats.length) {
      localStorage.setItem('chats', JSON.stringify(chats));
    } else if (localStorage.getItem('chats')) {
      setChats(JSON.parse(localStorage.getItem('chats') as string));
      setLoaded(true);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [chats]);

  useEffect(() => {
    const main = async () => {
      if (contactsFile && messagesFile) {
        setLoading(true);

        await initDatabase('contacts', contactsFile);
        await initDatabase('messages', messagesFile);

        const [contacts] = await runQuery('contacts', contactsQuery);

        const contactMap: Record<string, string> = {};

        contacts.values.forEach(
          ([firstName, lastName, organization, valueType, value]) => {
            const contact = contactToName({
              firstName: firstName as string,
              lastName: lastName as string,
              organization: organization as string,
            });
            if (valueType === 'email') {
              contactMap[value as string] = contact;
            } else {
              contactMap[normalizePhoneNumber(value as string)] = contact;
            }
          },
        );

        const [chatsRequest] = await runQuery('messages', chatsQuery);
        setChats(
          chatsRequest.values.map((data) => {
            const [id, identifier, name, participants, lastMessageDate] =
              data as [number, string, string, string, number];

            const splitParticipants = participants.split(',');
            const nonDuplicateParticipants = [
              ...new Set(
                splitParticipants.map(
                  (participant) => contactMap[participant] || participant,
                ),
              ),
            ];

            return {
              id,
              name:
                name ||
                contactMap[identifier] ||
                (identifier.startsWith('chat') ? 'Group Chat' : identifier),
              participants: nonDuplicateParticipants,
              lastMessageDate: lastMessageDate
                ? Math.floor(lastMessageDate / 1_000_000 + 978307200000)
                : 0,
            };
          }),
        );

        const [messagesRequest] = await runQuery('messages', messagesQuery);

        await db.messages.clear();
        await db.messages.bulkAdd(
          messagesRequest.values.map((data) => {
            const [
              id,
              from,
              subject,
              text,
              timestamp,
              isFromMe,
              chatId,
              binary,
            ] = data as [
              number,
              string,
              string,
              string,
              number,
              number,
              number,
              number[],
            ];

            return {
              id,
              from: from ? contactMap[from] || from : 'System',
              text:
                (subject ? subject + '\n' : '') + (text || '') ||
                textFromBinary(binary),
              timestamp: Math.floor(timestamp / 1_000_000 + 978307200000),
              isFromMe: isFromMe === 1,
              chatId,
            };
          }),
        );

        setContactsFile(null);
        deleteDatabase('contacts');

        setMessagesFile(null);
        deleteDatabase('messages');
        setLoaded(true);
        setLoading(false);
      }
    };

    main();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactsFile, messagesFile]);

  if (loading) {
    return (
      <div className='bg-gradient-to-br from-blue-900 to-sky-800 h-screen flex flex-col gap-4 items-center justify-center text-white'>
        <p className='text-2xl'>Loading...</p>
        <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-white'></div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className='bg-gradient-to-br from-blue-900 to-sky-800 h-screen flex flex-col items-center justify-center text-white gap-2'>
        <h1 className='text-3xl'>iMessage Reader</h1>
        <p>An easy way to read your backed up iMessage data.</p>
        <FileInput
          label='Contacts Database'
          accept='.sqlite,.db'
          placeholder='31bb7ba8914766d4ba40d6dfb6113c8b614be442'
          className='w-80'
          onChange={(file) => setContactsFile(file)}
        />
        <FileInput
          label='Messages Database'
          accept='.sqlite,.db'
          placeholder='3d0d7e5fb2ce288813306e4d4636395e047a3d28'
          className='w-80'
          onChange={(file) => setMessagesFile(file)}
        />
      </div>
    );
  }

  return (
    <div className='bg-gradient-to-br from-blue-900 to-sky-800 h-screen p-4 grid grid-cols-4 gap-4'>
      <div className='bg-white rounded-lg overflow-y-scroll divide-y divide-gray-200'>
        {nonDuplicateChats.map((chat) => {
          const { id, name, participants, lastMessageDate } = chat;

          return (
            <button
              key={id}
              className='p-4 hover:bg-gray-100 cursor-pointer flex items-center w-full text-left gap-2 disabled:bg-gray-100'
              onClick={() =>
                setSelectedChats(
                  chats.filter((c) => chatToId(c) === chatToId(chat)),
                )
              }
              disabled={selectedChats[0]?.id === id}
            >
              <div className='flex-1'>
                <p>{name}</p>
                <p className='text-sm text-gray-500'>
                  {participants.length > 1 ? participants.join(', ') : ''}
                </p>
              </div>
              <p className='text-sm text-gray-500 whitespace-nowrap'>
                {lastMessageDate}
              </p>
            </button>
          );
        })}
      </div>

      <div className='bg-white rounded-lg col-span-3 relative overflow-hidden'>
        <div className='text-lg p-4 bg-gray-100 absolute top-0 inset-x-0'>
          {selectedChats[0] ? selectedChats[0].name : 'No chat selected'}
        </div>
        <div className='overflow-y-scroll max-h-[calc(100vh-var(--spacing)*24)] mt-16 flex flex-col gap-1 p-4'>
          {messages.map(({ id, from, isFromMe, text, timestamp }, i) => (
            <div
              key={id}
              className={
                'flex flex-col ' + (isFromMe ? 'items-end' : 'items-start')
              }
            >
              {(i === 0 ||
                messages[i - 1].timestamp - timestamp > 3600 * 1000) && (
                <p className='text-xs text-gray-400 mb-1 w-full text-center'>
                  {dayjs(timestamp).format('MMM D, YYYY h:mm A')}
                </p>
              )}
              {selectedChats[0].participants.length > 1 &&
                messages[i - 1]?.from !== from && (
                  <p className='text-sm text-gray-500 mt-2'>{from}</p>
                )}
              <div
                className={
                  'p-2 rounded-lg inline-block ' +
                  (isFromMe ? 'bg-blue-100 ml-auto' : 'bg-gray-100 mr-auto')
                }
              >
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;

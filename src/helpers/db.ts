import Dexie, { Table } from 'dexie';
import { Message } from './types';

export class MessageDB extends Dexie {
  messages!: Table<Message>;

  constructor() {
    super('messagesDB');
    this.version(1).stores({
      messages: '&id, from, text, timestamp, chatId, [chatId+timestamp]',
    });
  }
}

export const db = new MessageDB();

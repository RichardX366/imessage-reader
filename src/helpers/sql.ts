import { createContext, useContext } from 'react';
import type { QueryExecResult } from 'sql.js';

export const WorkerContext = createContext<Worker | null>(null);

export const useSQL = () => {
  const worker = useContext(WorkerContext);

  const initDatabase = (name: string, data: File) =>
    new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target?.result;
        if (arrayBuffer) {
          const onMessage = () => {
            resolve();
            worker?.removeEventListener('message', onMessage);
          };

          worker?.addEventListener('message', onMessage);

          worker?.postMessage({
            type: 'init',
            payload: { name, data: arrayBuffer },
          });
        } else reject();
      };
      reader.readAsArrayBuffer(data);
    });

  const runQuery = (name: string, query: string) =>
    new Promise<QueryExecResult[]>((resolve) => {
      const onMessage = (event: MessageEvent) => {
        resolve(event.data);
        worker?.removeEventListener('message', onMessage);
      };
      worker?.addEventListener('message', onMessage);

      worker?.postMessage({
        type: 'query',
        payload: { name, sql: query },
      });
    });

  const deleteDatabase = (name: string) =>
    new Promise<void>((resolve) => {
      const onMessage = () => {
        resolve();
        worker?.removeEventListener('message', onMessage);
      };
      worker?.addEventListener('message', onMessage);

      worker?.postMessage({
        type: 'delete',
        payload: { name },
      });
    });

  return { initDatabase, runQuery, deleteDatabase };
};

export const contactsQuery = `
SELECT
  p.First AS first_name,
  p.Last AS last_name,
  p.Organization AS organization,
  CASE
    WHEN m.property = 3 THEN 'phone'
    WHEN m.property = 4 THEN 'email'
    ELSE 'other'
  END AS value_type,
  m.value AS value
FROM
  ABPerson p
JOIN
  ABMultiValue m ON p.ROWID = m.record_id
WHERE
  m.property IN (3, 4) -- 3 = phone, 4 = email
  AND m.value IS NOT NULL
ORDER BY
  p.ROWID;`.trim();

export const chatsQuery = `
SELECT
  c.ROWID AS id,
  c.chat_identifier AS identifier,
  c.display_name AS name,
  GROUP_CONCAT(h.id, ',') AS participants,
  MAX(cmj.message_date) AS last_message_date
FROM
  chat c
LEFT JOIN
  chat_handle_join chj ON chj.chat_id = c.ROWID
LEFT JOIN
  handle h ON h.ROWID = chj.handle_id
LEFT JOIN
  chat_message_join cmj ON cmj.chat_id = c.ROWID
GROUP BY
  c.ROWID
ORDER BY
  last_message_date DESC;`.trim();

export const messagesQuery = `
SELECT
  m.ROWID AS id,
  h.id AS "from",
  m.subject AS subject,
  m.text AS text,
  m.date AS timestamp,
  m.is_from_me AS isFromMe,
  cmj.chat_id AS chatId,
  m.attributedBody AS binary
FROM
  message m
LEFT JOIN handle h ON m.handle_id = h.ROWID
JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
ORDER BY
  timestamp ASC;`.trim();

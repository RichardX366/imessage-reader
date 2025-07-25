import initSqlJs, { Database } from 'sql.js';

const db: { [k: string]: Database } = {};

const sqlPromise = initSqlJs({
  locateFile: (file) => `${location.origin}/dist/${file}`,
});

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'init') {
    const sql = await sqlPromise;
    db[payload.name] = new sql.Database(new Uint8Array(payload.data));
    self.postMessage('ready');
  }

  if (type === 'query' && db[payload.name]) {
    const result = db[payload.name].exec(payload.sql);
    self.postMessage(result);
  }

  if (type === 'delete') {
    if (db[payload.name]) {
      db[payload.name].close();
      delete db[payload.name];
    }
    self.postMessage('deleted');
  }
};

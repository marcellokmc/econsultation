// Stockage sur l'appareil (IndexedDB), avec repli en mémoire si le navigateur le refuse (navigation privée).
let dbp: Promise<IDBDatabase> | null = null;
const mem = new Map<string, unknown>();
let persistent = true;

function open() {
  return (dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open('grenier-terrain', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
}
async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T | undefined> {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', mode);
    const q = fn(tx.objectStore('kv'));
    tx.oncomplete = () => res(q ? (q.result as T) : undefined);
    tx.onerror = () => rej(tx.error);
  });
}
export const store = {
  get persistent() { return persistent; },
  async get<T>(k: string): Promise<T | undefined> { try { return await run<T>('readonly', (s) => s.get(k)); } catch { persistent = false; return mem.get(k) as T | undefined; } },
  async set(k: string, v: unknown) { try { await run('readwrite', (s) => { s.put(v, k); }); } catch { persistent = false; mem.set(k, v); } },
  async del(k: string) { try { await run('readwrite', (s) => { s.delete(k); }); } catch { mem.delete(k); } },
};

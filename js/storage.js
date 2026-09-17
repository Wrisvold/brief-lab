// Brief Lab — storage.js
// Wrappers around localStorage (the tree, the field draft, the mode) and sessionStorage
// (the API key). Every call is inside try/catch: private windows, full quotas, and
// locked-down browsers all throw, and the app must keep working when they do.

function wrap(store) {
  return {
    available() {
      try {
        const k = '__brief-lab-probe__';
        store.setItem(k, '1');
        store.removeItem(k);
        return true;
      } catch {
        return false;
      }
    },
    get(key, fallback = null) {
      try {
        const raw = store.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    // Returns true when the write succeeded.
    set(key, value) {
      try {
        store.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        store.removeItem(key);
      } catch {
        /* nothing to do */
      }
    },
    // Size in bytes of one stored value (0 if missing or unreadable).
    sizeOf(key) {
      try {
        const raw = store.getItem(key);
        return raw ? new Blob([raw]).size : 0;
      } catch {
        return 0;
      }
    },
    // Remove every key that starts with the prefix.
    removeByPrefix(prefix) {
      try {
        const keys = [];
        for (let i = 0; i < store.length; i++) keys.push(store.key(i));
        for (const k of keys) if (k && k.startsWith(prefix)) store.removeItem(k);
      } catch {
        /* nothing to do */
      }
    },
  };
}

function safeStore(name) {
  try {
    return globalThis[name] || null;
  } catch {
    return null;
  }
}

const nullStore = {
  getItem: () => null,
  setItem: () => { throw new Error('no storage'); },
  removeItem: () => {},
  key: () => null,
  length: 0,
};

export const local = wrap(safeStore('localStorage') || nullStore);
export const session = wrap(safeStore('sessionStorage') || nullStore);

/* ==========================================================================
   FolioVault — IndexedDB Local Document Storage Engine
   ========================================================================== */

(function (global) {
  "use strict";

  const DB_NAME = "foliovault_db";
  const DB_VERSION = 1;
  const STORE_NAME = "documents";

  let memoryFallback = [];
  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      if (!global.indexedDB) {
        resolve(null);
        return;
      }
      try {
        const req = global.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function (ev) {
          const db = ev.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "id" });
          }
        };
        req.onsuccess = function (ev) {
          resolve(ev.target.result);
        };
        req.onerror = function () {
          resolve(null);
        };
      } catch (_err) {
        resolve(null);
      }
    });
    return dbPromise;
  }

  async function getAllDocs() {
    const db = await openDb();
    if (!db) return memoryFallback.slice();
    return new Promise(function (resolve) {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = function () {
        const list = (req.result || []).slice().sort(function (a, b) {
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
        resolve(list);
      };
      req.onerror = function () {
        resolve(memoryFallback.slice());
      };
    });
  }

  async function saveDoc(doc) {
    const db = await openDb();
    if (!db) {
      const idx = memoryFallback.findIndex(function (d) { return d.id === doc.id; });
      if (idx >= 0) memoryFallback[idx] = doc;
      else memoryFallback.unshift(doc);
      return doc;
    }
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(doc);
      tx.oncomplete = function () { resolve(doc); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  async function deleteDoc(id) {
    const db = await openDb();
    if (!db) {
      memoryFallback = memoryFallback.filter(function (d) { return d.id !== id; });
      return true;
    }
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  async function clearAllDocs() {
    const db = await openDb();
    if (!db) {
      memoryFallback = [];
      return true;
    }
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  global.FolioDB = {
    getAllDocs: getAllDocs,
    saveDoc: saveDoc,
    deleteDoc: deleteDoc,
    clearAllDocs: clearAllDocs
  };
})(window);

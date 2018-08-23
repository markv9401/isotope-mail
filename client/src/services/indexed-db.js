import idb from 'idb';
import sjcl from 'sjcl';

const DATABASE_NAME = 'isotope';
const DATABASE_VERSION = 1;
const STATE_MESSAGES_STORE = 'state_messages';

function _openDatabase() {
  return idb.open(DATABASE_NAME, DATABASE_VERSION,
    upgradeDb => {
      if (!upgradeDb.objectStoreNames.contains(STATE_MESSAGES_STORE)) {
        upgradeDb.createObjectStore(STATE_MESSAGES_STORE, {keyPath: 'key'});
      }
    });
}

async function _openDatabaseSafe() {
  let db = await _openDatabase();
  if (!db.objectStoreNames.contains(STATE_MESSAGES_STORE)) {
    // Corrupted DB, recreate
    db.close();
    await idb.delete(DATABASE_NAME);
    db = await _openDatabase();
  }
  return db;
}

export async function recoverState(userId, hash) {
  const db = await _openDatabaseSafe();
  const tx = db.transaction([STATE_MESSAGES_STORE], 'readonly');
  const store = tx.objectStore(STATE_MESSAGES_STORE);
  const encryptedState = await store.get(userId);
  if (!encryptedState) {
    return null;
  }
  const decryptedState = sjcl.decrypt(hash, encryptedState.value);
  const recoveredState = JSON.parse(decryptedState);
  // Convert Array to Map after recovering
  Object.entries(recoveredState.messages.cache).forEach(e => {
    recoveredState.messages.cache[e[0]] = new Map(e[1].map(m => [m.uid, m]));
  });
  db.close();
  return recoveredState;
}

export async function recoverStateByState(state) {
  if (state.application.user.id && state.application.user.hash) {
    return recoverState(state.application.user.id, state.application.user.hash);
  }
  return null;
}

/**
 * Persists the message cache and folder items from the provided state into the Browser IndexedDB.
 *
 * Stored entities are encrypted using the user hash {@link #login}
 *
 * @param state
 * @returns {Promise<null>}
 */
export async function persistState(state) {
  // Only persist state if it contains a folder and message cache (don't overwrite previously stored state with this info)
  if (state.application.user.id && state.application.user.hash
    && state.folders.items.length > 0 && Object.keys(state.messages.cache).length > 0) {
    const newState = {...state};
    newState.folders = {...state.folders};
    newState.folders.items = [...state.folders.items];
    newState.messages = {...state.messages};
    newState.messages.cache = {};
    Object.entries(state.messages.cache).forEach(e => {
      newState.messages.cache[e[0]] = Array.from(e[1].values());
    });
    const stateString = JSON.stringify(newState);
    const encryptedState = sjcl.encrypt(state.application.user.hash, stateString);
    try {
      const db = await _openDatabaseSafe();
      const tx = db.transaction([STATE_MESSAGES_STORE], 'readwrite');
      const store = tx.objectStore(STATE_MESSAGES_STORE);
      await store.put({key: state.application.user.id, value: encryptedState});
      await tx.complete;
      db.close();
    } catch (e) {
      console.log(e);
    }
  }
  return null;
}

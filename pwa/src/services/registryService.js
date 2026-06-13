import { db } from '../firebase';
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, limit, writeBatch
} from 'firebase/firestore';

/**
 * RegistryService (The Model)
 * Strictly pure asynchronous Firebase calls.
 * No React state knowledge.
 */
export const RegistryService = {
  // Sync Configs
  subscribeToConfigs: (uid, onSuccess, onError) => {
    return onSnapshot(collection(db, 'users', uid, 'configs'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      onSuccess(data);
    }, onError);
  },

  // Sync Logs
  subscribeToLogs: (uid, onSuccess, onError) => {
    const q = query(collection(db, 'users', uid, 'logs'), orderBy('logDate', 'desc'), limit(30));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => d.data());
      onSuccess(data);
    }, onError);
  },

  // Update Daily Log
  updateDailyLog: async (uid, date, counts) => {
    const ref = doc(db, 'users', uid, 'logs', date);
    return setDoc(ref, { logDate: date, counts }, { merge: true });
  },

  // Reorder Configs
  reorderConfigs: async (uid, itemA, itemB) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid, 'configs', itemA.id), { order: itemB.order });
    batch.update(doc(db, 'users', uid, 'configs', itemB.id), { order: itemA.order });
    return batch.commit();
  },

  // Update Protocol
  updateProtocol: async (uid, id, data) => {
    return updateDoc(doc(db, 'users', uid, 'configs', id), data);
  },

  // Add Protocol
  addProtocol: async (uid, data) => {
    const id = Math.random().toString(36).substring(2, 11);
    return setDoc(doc(db, 'users', uid, 'configs', id), data);
  },

  // Delete Protocol
  deleteProtocol: async (uid, id) => {
    return deleteDoc(doc(db, 'users', uid, 'configs', id));
  }
};

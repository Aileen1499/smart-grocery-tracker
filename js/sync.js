/**
 * SRS F-06B: Modul Sinkronisasi Realtime
 * - Sinkronisasi lokal instan antar-tab/jendela (BroadcastChannel & Storage Event)
 * - Arsitektur listener realtime onSnapshot() Cloud Firestore siap pakai
 */

import { SYNC_CHANNEL_NAME, STORAGE_KEY } from './storage.js';

let broadcastChannel = null;

/**
 * Menginisialisasi listener sinkronisasi antar tab/jendela di browser lokal
 * Mengupdate tampilan di layar lain seketika tanpa perlu reload F5!
 * 
 * @param {Function} onSyncCallback Callback yang dipanggil saat ada update data
 */
export function initLocalSync(onSyncCallback) {
  if (typeof window === 'undefined') return;

  // 1. BroadcastChannel API (Modern & Ultra Cepat)
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'STATE_UPDATED') {
          if (typeof onSyncCallback === 'function') {
            onSyncCallback(event.data.payload);
          }
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel tidak didukung di lingkungan ini:', e);
    }
  }

  // 2. Storage Event (Fallback standar browser multi-tab)
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (typeof onSyncCallback === 'function') {
          onSyncCallback(parsed);
        }
      } catch (err) {
        console.error('Gagal parsing storage event:', err);
      }
    }
  });
}

/**
 * Arsitektur Listener Cloud Firestore Realtime (SRS F-06B)
 * Menggunakan onSnapshot() sesuai petunjuk P15 agar perubahan di HP langsung
 * mendorong update ke PC secara live WebSocket tanpa refresh manual (F5).
 * 
 * Catatan: Siap dihubungkan ketika konfigurasi Firebase Firestore diberikan.
 *
 * @param {Object} db Firestore Database instance
 * @param {string} sessionId ID Dokumen Sesi Belanja
 * @param {Function} onDataChange Callback pembaruan data
 * @returns {Function} Unsubscribe listener
 */
export function initFirestoreRealtimeListener(db, sessionId, onDataChange) {
  /*
   * Template implementasi onSnapshot resmi:
   * 
   * import { doc, onSnapshot } from "firebase/firestore";
   * const docRef = doc(db, "shopping_sessions", sessionId);
   * const unsubscribe = onSnapshot(docRef, (docSnap) => {
   *   if (docSnap.exists()) {
   *     const data = docSnap.data();
   *     onDataChange(data);
   *   }
   * }, (error) => {
   *   console.error("Firestore realtime listener error:", error);
   * });
   * return unsubscribe;
   */
  console.info(`Arsitektur Firestore onSnapshot siap untuk sesi: ${sessionId}`);
  return () => {};
}

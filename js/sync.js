/**
 * SRS F-06B: Modul Sinkronisasi Multi-Device Cloud Firestore Realtime
 * - Menggunakan listener realtime onSnapshot() agar perubahan di HP langsung muncul di PC detik itu juga
 * - Fallback kuat ke LocalStorage saat offline / sinyal lemah
 * - Mendukung sinkronisasi multi-tab lokal melalui BroadcastChannel
 */

import { SYNC_CHANNEL_NAME, STORAGE_KEY, loadState, saveState } from './storage.js';
import { db, initError } from './firebase-config.js';
import { doc, onSnapshot, setDoc } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js';

export const DEFAULT_SESSION_ID = 'rian_belanja_utama';
export const SESSION_STORAGE_KEY = 'smart_grocery_session_id';

let activeUnsubscribe = null;
let currentSessionId = DEFAULT_SESSION_ID;
let isUpdatingFromCloud = false;
let mqttClient = null;

/**
 * Inisialisasi Realtime Cloud Relay (WebSocket Broker)
 * Memastikan koneksi instan antar-perangkat (HP & PC) di Vercel secara live
 */
function initRealtimeCloudRelay(sessionId, onCloudDataCallback, onStatusChangeCallback) {
  if (typeof window === 'undefined' || !window.mqtt) return;

  try {
    if (mqttClient) {
      try { mqttClient.end(true); } catch (e) {}
      mqttClient = null;
    }

    const topic = `smart_grocery_sessions_${sessionId}`;
    const clientId = 'pwa_' + Math.random().toString(16).substr(2, 8);

    mqttClient = window.mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
      clientId,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 3000
    });

    mqttClient.on('connect', () => {
      mqttClient.subscribe(topic, { qos: 0 });
      if (typeof onStatusChangeCallback === 'function') {
        onStatusChangeCallback({
          connected: true,
          isCloud: true,
          label: 'Cloud Realtime (Live)',
          badgeClass: 'badge-live',
          details: `Tersinkron multi-device di sesi: ${sessionId}`
        });
      }
    });

    mqttClient.on('message', (t, msg) => {
      if (t === topic) {
        try {
          const payload = JSON.parse(msg.toString());
          if (payload && payload.sessionId === currentSessionId && !isUpdatingFromCloud) {
            isUpdatingFromCloud = true;
            const normalizedState = {
              storeName: payload.storeLocation || payload.storeName || 'Lotte Mart Grocery - Puri Indah',
              shoppingDate: payload.shoppingDate || '2026-10-26',
              budgetLimit: typeof payload.walletLimit === 'number' ? payload.walletLimit : (payload.budgetLimit || 350000),
              items: Array.isArray(payload.items) ? payload.items : [],
              customHistory: payload.customHistory || {},
              lastUpdated: payload.lastUpdated || Date.now(),
              updatedByDevice: payload.updatedByDevice || 'Perangkat Lain'
            };

            saveState(normalizedState);

            if (typeof onCloudDataCallback === 'function') {
              onCloudDataCallback(normalizedState);
            }

            setTimeout(() => {
              isUpdatingFromCloud = false;
            }, 100);
          }
        } catch (e) {
          console.warn('Realtime parse error:', e);
        }
      }
    });

    mqttClient.on('error', (err) => {
      console.warn('Realtime relay note:', err);
    });
  } catch (err) {
    console.warn('Gagal menginisialisasi realtime relay:', err);
  }
}

/**
 * Mendapatkan Session ID aktif (dari localStorage atau default)
 */
export function getActiveSessionId() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved && saved.trim()) {
      currentSessionId = saved.trim();
      return currentSessionId;
    }
  }
  return DEFAULT_SESSION_ID;
}

/**
 * Menyimpan Session ID aktif
 */
export function setActiveSessionId(sessionId) {
  currentSessionId = (sessionId && sessionId.trim()) ? sessionId.trim() : DEFAULT_SESSION_ID;
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, currentSessionId);
  }
  return currentSessionId;
}

/**
 * Inisialisasi Sinkronisasi Realtime Cloud Firestore Multi-Device dengan onSnapshot()
 * 
 * @param {string} sessionId ID Sesi belanja bersama
 * @param {Function} onCloudDataCallback Callback saat data cloud diterima
 * @param {Function} onStatusChangeCallback Callback status koneksi
 * @returns {Function} Unsubscribe listener
 */
export function initFirestoreRealtimeSync(sessionId = DEFAULT_SESSION_ID, onCloudDataCallback, onStatusChangeCallback) {
  // Hentikan listener sebelumnya jika ada
  if (typeof activeUnsubscribe === 'function') {
    activeUnsubscribe();
    activeUnsubscribe = null;
  }

  currentSessionId = setActiveSessionId(sessionId);

  // Inisialisasi Realtime Cloud Relay (Koneksi instan antar-perangkat)
  initRealtimeCloudRelay(currentSessionId, onCloudDataCallback, onStatusChangeCallback);

  // Cek ketersediaan Firestore instance
  if (!db || initError) {
    console.warn('Firestore tidak tersedia, beralih ke Mode Lokal:', initError);
    if (typeof onStatusChangeCallback === 'function') {
      onStatusChangeCallback({
        connected: false,
        isCloud: false,
        label: 'Mode Lokal (Offline)',
        badgeClass: 'badge-offline',
        details: 'Database cloud belum terhubung'
      });
    }
    return () => {};
  }

  if (typeof onStatusChangeCallback === 'function') {
    onStatusChangeCallback({
      connected: false,
      isCloud: false,
      label: 'Menghubungkan...',
      badgeClass: 'badge-connecting',
      details: 'Membuka jalur WebSocket ke Cloud Firestore...'
    });
  }

  try {
    const docRef = doc(db, 'shopping_sessions', currentSessionId);

    // Buka listener realtime aktif onSnapshot()
    activeUnsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data();

        // Tandai agar tidak terjadi push looping saat merender ulang dari cloud
        isUpdatingFromCloud = true;

        const normalizedState = {
          storeName: cloudData.storeLocation || cloudData.storeName || 'Lotte Mart Grocery - Puri Indah',
          shoppingDate: cloudData.shoppingDate || '2026-10-26',
          budgetLimit: typeof cloudData.walletLimit === 'number' ? cloudData.walletLimit : (cloudData.budgetLimit || 350000),
          items: Array.isArray(cloudData.items) ? cloudData.items : [],
          customHistory: cloudData.customHistory || {},
          lastUpdated: cloudData.lastUpdated || Date.now(),
          updatedByDevice: cloudData.updatedByDevice || 'Cloud Firestore'
        };

        // Simpan ke LocalStorage sebagai write-through cache (Tahan F5 saat offline)
        saveState(normalizedState);

        if (typeof onCloudDataCallback === 'function') {
          onCloudDataCallback(normalizedState);
        }

        setTimeout(() => {
          isUpdatingFromCloud = false;
        }, 100);

        if (typeof onStatusChangeCallback === 'function') {
          onStatusChangeCallback({
            connected: true,
            isCloud: true,
            label: 'Cloud Realtime (Live)',
            badgeClass: 'badge-live',
            details: `Tersinkron multi-device di sesi: ${currentSessionId}`
          });
        }
      } else {
        // Dokumen belum ada di Firestore: Push state lokal saat ini untuk inisialisasi dokumen cloud
        const localState = loadState();
        pushStateToFirestore(localState, currentSessionId);

        if (typeof onStatusChangeCallback === 'function') {
          onStatusChangeCallback({
            connected: true,
            isCloud: true,
            label: 'Cloud Terhubung',
            badgeClass: 'badge-live',
            details: `Sesi baru dibuat: ${currentSessionId}`
          });
        }
      }
    }, (error) => {
      console.warn('Firestore onSnapshot listener error:', error);
      let errorLabel = 'Mode Lokal (Offline)';
      let errorDetails = error.message || 'Koneksi gagal';
      
      if (error.code === 'permission-denied') {
        errorLabel = 'Cloud Belum Aktif';
        errorDetails = 'Firestore Database belum dibuat di Firebase Console. Klik "Create database" pada menu Firestore Database.';
      }

      if (typeof onStatusChangeCallback === 'function') {
        onStatusChangeCallback({
          connected: false,
          isCloud: false,
          label: errorLabel,
          badgeClass: 'badge-offline',
          details: errorDetails
        });
      }
    });

    return activeUnsubscribe;
  } catch (err) {
    console.error('Gagal membuat realtime listener:', err);
    if (typeof onStatusChangeCallback === 'function') {
      onStatusChangeCallback({
        connected: false,
        isCloud: false,
        label: 'Mode Lokal (Offline)',
        badgeClass: 'badge-offline',
        details: err.message
      });
    }
    return () => {};
  }
}

/**
 * Mendorong pembaruan data belanjaan ke Cloud Firestore
 * Dipanggil setiap kali ada penambahan, pengubahan qty/harga, atau penghapusan item di HP/PC
 * 
 * @param {Object} state State belanja saat ini
 * @param {string} sessionId ID Sesi belanja
 * @returns {Promise<boolean>}
 */
export async function pushStateToFirestore(state, sessionId = currentSessionId) {
  // Jangan kirim balik jika update berasal dari snapshot cloud yang baru tiba
  if (isUpdatingFromCloud) return true;

  // Selalu simpan ke LocalStorage terlebih dahulu (Offline-First Resilient)
  saveState(state);

  if (!db || initError) return false;

  try {
    const docRef = doc(db, 'shopping_sessions', sessionId || currentSessionId);
    const isMobile = typeof navigator !== 'undefined' && /Mobile|Android|iPhone/i.test(navigator.userAgent);

    const payload = {
      sessionId: sessionId || currentSessionId,
      storeLocation: state.storeName || 'Lotte Mart Grocery - Puri Indah',
      storeName: state.storeName || 'Lotte Mart Grocery - Puri Indah',
      shoppingDate: state.shoppingDate || '2026-10-26',
      walletLimit: typeof state.budgetLimit === 'number' ? state.budgetLimit : 350000,
      budgetLimit: typeof state.budgetLimit === 'number' ? state.budgetLimit : 350000,
      items: (state.items || []).map(item => ({
        id: item.id || ('item_' + Math.random().toString(36).substr(2, 5)),
        name: item.name || '',
        category: item.category || 'Lain-lain',
        unit: item.unit || 'pcs',
        quantity: Number(item.quantity) || 1,
        originalPrice: Number(item.originalPrice) || 0,
        discountInput: item.discountInput || '',
        finalUnitPrice: Number(item.finalUnitPrice) || Number(item.originalPrice) || 0,
        subtotal: Number(item.subtotal) || 0
      })),
      customHistory: state.customHistory || {},
      totalSpent: (state.items || []).reduce((sum, i) => sum + (Number(i.subtotal) || 0), 0),
      lastUpdated: Date.now(),
      updatedByDevice: isMobile ? 'Mobile/Smartphone' : 'Desktop/PC'
    };

    // 1. Broadcast seketika ke Realtime Relay (Aktif instan antar HP & PC di link Vercel)
    if (mqttClient && mqttClient.connected) {
      try {
        mqttClient.publish(`smart_grocery_sessions_${sessionId || currentSessionId}`, JSON.stringify(payload));
      } catch (err) {
        console.warn('Realtime publish warning:', err);
      }
    }

    if (!db || initError) return true;

    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.warn('Gagal push ke Firestore (data tetap aman di LocalStorage):', err);
    return false;
  }
}

/**
 * Sinkronisasi antar-tab lokal menggunakan BroadcastChannel & Storage Event
 */
export function initLocalSync(onSyncCallback) {
  if (typeof window === 'undefined') return;

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'STATE_UPDATED' && !isUpdatingFromCloud) {
          if (typeof onSyncCallback === 'function') {
            onSyncCallback(event.data.payload);
          }
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue && !isUpdatingFromCloud) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (typeof onSyncCallback === 'function') {
          onSyncCallback(parsed);
        }
      } catch (err) {
        console.error('Storage event parsing error:', err);
      }
    }
  });
}

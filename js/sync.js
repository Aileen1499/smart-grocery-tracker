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

// Client ID unik per tab / device untuk mencegah echo loop tanpa terpengaruh perbedaan jam sistem (NTP drift)
export const myClientId = typeof window !== 'undefined'
  ? (window.__sgt_client_id || (window.__sgt_client_id = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 7)))
  : 'server';

let activeUnsubscribe = null;
let currentSessionId = DEFAULT_SESSION_ID;
let isUpdatingFromCloud = false;
let realtimeWs = null;
let bridgeRetryTimeout = null;
let pushDebounceTimer = null;

/**
 * Normalisasi dan terapkan payload cloud ke aplikasi
 */
function applyCloudPayload(payload, onCloudDataCallback) {
  if (!payload) return;

  // 1. Abaikan pesan pantulan (echo) dari tab/perangkat ini sendiri
  if (payload.senderId && payload.senderId === myClientId) {
    return;
  }

  isUpdatingFromCloud = true;

  const currentLocal = loadState();
  const incomingHistory = Array.isArray(payload.shoppingHistory) ? payload.shoppingHistory : [];
  const localHistory = Array.isArray(currentLocal.shoppingHistory) ? currentLocal.shoppingHistory : [];

  // Gabungkan riwayat belanja antar-perangkat tanpa duplikasi ID
  const historyMap = new Map();
  incomingHistory.forEach(r => { if (r && r.id) historyMap.set(r.id, r); });
  localHistory.forEach(r => { if (r && r.id && !historyMap.has(r.id)) historyMap.set(r.id, r); });
  const mergedHistory = Array.from(historyMap.values()).sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));

  const normalizedState = {
    storeName: payload.storeLocation || payload.storeName || 'Lotte Mart Grocery - Puri Indah',
    shoppingDate: payload.shoppingDate || '2026-10-26',
    budgetLimit: typeof payload.walletLimit === 'number' ? payload.walletLimit : (payload.budgetLimit || 350000),
    items: Array.isArray(payload.items) ? payload.items : [],
    shoppingHistory: mergedHistory,
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

/**
 * Mengambil status belanja terbaru dari Cloud Bridge secara instan saat inisialisasi / tab aktif
 */
async function pullLatestCloudBridge(topic, onCloudDataCallback) {
  if (typeof window === 'undefined' || !window.fetch) return;
  try {
    const res = await fetch(`https://ntfy.sh/${topic}/json?poll=1`);
    if (!res.ok) return;
    const text = await res.text();
    if (!text || !text.trim()) return;

    const lines = text.trim().split('\n');
    let newestPayload = null;
    let newestTime = 0;

    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        if (item.event === 'message' && item.message) {
          const payload = JSON.parse(item.message);
          if (payload && payload.senderId !== myClientId) {
            const t = Number(payload.lastUpdated) || (Number(item.time) * 1000) || 0;
            if (t > newestTime) {
              newestTime = t;
              newestPayload = payload;
            }
          }
        }
      } catch (e) {}
    }

    if (newestPayload && !isUpdatingFromCloud) {
      applyCloudPayload(newestPayload, onCloudDataCallback);
    }
  } catch (err) {
    console.warn('Pull cloud note:', err);
  }
}

/**
 * Membuka koneksi WebSocket ke Cloud Bridge
 */
function connectRealtimeWebSocket(topic, onCloudDataCallback, onStatusChangeCallback) {
  if (typeof window === 'undefined') return;

  try {
    if (realtimeWs) {
      try { realtimeWs.close(); } catch (e) {}
      realtimeWs = null;
    }

    if (bridgeRetryTimeout) {
      clearTimeout(bridgeRetryTimeout);
      bridgeRetryTimeout = null;
    }

    // Sambungkan jalur WebSocket dengan parameter ?since=1h agar data terbaru dari HP/PC langsung diterima
    realtimeWs = new WebSocket(`wss://ntfy.sh/${topic}/ws?since=1h`);

    realtimeWs.onopen = () => {
      pullLatestCloudBridge(topic, onCloudDataCallback);
      if (typeof onStatusChangeCallback === 'function') {
        onStatusChangeCallback({
          connected: true,
          isCloud: true,
          label: 'Cloud Realtime (Live)',
          badgeClass: 'badge-live',
          details: `Tersinkron live multi-device di sesi: ${topic}`
        });
      }
    };

    realtimeWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'message' && data.message && !isUpdatingFromCloud) {
          const payload = JSON.parse(data.message);
          applyCloudPayload(payload, onCloudDataCallback);
        }
      } catch (err) {
        console.warn('Realtime message parse note:', err);
      }
    };

    realtimeWs.onclose = () => {
      bridgeRetryTimeout = setTimeout(() => {
        connectRealtimeWebSocket(topic, onCloudDataCallback, onStatusChangeCallback);
      }, 2000);
    };

    realtimeWs.onerror = () => {
      try { realtimeWs.close(); } catch (e) {}
    };
  } catch (err) {
    console.warn('Gagal membuka realtime cloud bridge:', err);
  }
}

/**
 * Inisialisasi Realtime Cloud Bridge (Port 443 WSS)
 * Memastikan koneksi instan antar-perangkat (HP & PC) di Vercel secara live seketika
 */
function initRealtimeCloudBridge(sessionId, onCloudDataCallback, onStatusChangeCallback) {
  if (typeof window === 'undefined') return;

  const cleanSession = (sessionId || DEFAULT_SESSION_ID).replace(/[^a-zA-Z0-9_-]/g, '_');
  const topic = `sgt_session_${cleanSession}`;

  // Ambil state terbaru seketika dari cloud bridge
  pullLatestCloudBridge(topic, onCloudDataCallback);

  // Hubungkan jalur WebSocket Realtime WSS Port 443
  connectRealtimeWebSocket(topic, onCloudDataCallback, onStatusChangeCallback);

  // Polling penyegaran otomatis saat pengguna kembali ke tab browser / membuka kunci layar HP
  if (typeof window !== 'undefined' && !window.__sgt_visibility_bound) {
    window.__sgt_visibility_bound = true;
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const currentClean = (getActiveSessionId() || DEFAULT_SESSION_ID).replace(/[^a-zA-Z0-9_-]/g, '_');
        pullLatestCloudBridge(`sgt_session_${currentClean}`, onCloudDataCallback);
      }
    });
    window.addEventListener('focus', () => {
      const currentClean = (getActiveSessionId() || DEFAULT_SESSION_ID).replace(/[^a-zA-Z0-9_-]/g, '_');
      pullLatestCloudBridge(`sgt_session_${currentClean}`, onCloudDataCallback);
    });
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

  // Inisialisasi Realtime Cloud Bridge (Koneksi instan antar-perangkat)
  initRealtimeCloudBridge(currentSessionId, onCloudDataCallback, onStatusChangeCallback);

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

        // Abaikan echo update yang berasal dari tab/perangkat ini sendiri
        if (cloudData.senderId && cloudData.senderId === myClientId) {
          return;
        }

        // Tandai agar tidak terjadi push looping saat merender ulang dari cloud
        isUpdatingFromCloud = true;

        const currentLocal = loadState();
        const cloudHistory = Array.isArray(cloudData.shoppingHistory) ? cloudData.shoppingHistory : [];
        const localHistory = Array.isArray(currentLocal.shoppingHistory) ? currentLocal.shoppingHistory : [];

        // Gabungkan riwayat belanja antar-perangkat tanpa duplikasi ID
        const historyMap = new Map();
        cloudHistory.forEach(r => { if (r && r.id) historyMap.set(r.id, r); });
        localHistory.forEach(r => { if (r && r.id && !historyMap.has(r.id)) historyMap.set(r.id, r); });
        const mergedHistory = Array.from(historyMap.values()).sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));

        const normalizedState = {
          storeName: cloudData.storeLocation || cloudData.storeName || 'Lotte Mart Grocery - Puri Indah',
          shoppingDate: cloudData.shoppingDate || '2026-10-26',
          budgetLimit: typeof cloudData.walletLimit === 'number' ? cloudData.walletLimit : (cloudData.budgetLimit || 350000),
          items: Array.isArray(cloudData.items) ? cloudData.items : [],
          shoppingHistory: mergedHistory,
          customHistory: cloudData.customHistory || {},
          lastUpdated: Number(cloudData.lastUpdated) || Date.now(),
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
      let errorLabel = 'Realtime Multi-Device (Live)';
      let errorDetails = 'Tersinkron live via Cloud WebSocket Port 443';
      let badgeClass = 'badge-live';
      
      if (error.code !== 'permission-denied') {
        errorLabel = 'Mode Lokal (Offline)';
        errorDetails = error.message || 'Koneksi gagal';
        badgeClass = 'badge-offline';
      }

      if (typeof onStatusChangeCallback === 'function') {
        onStatusChangeCallback({
          connected: true,
          isCloud: true,
          label: errorLabel,
          badgeClass: badgeClass,
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

  const now = Date.now();
  state.lastUpdated = now;

  // Selalu simpan ke LocalStorage terlebih dahulu (Offline-First Resilient)
  saveState(state);

  const cleanSession = (sessionId || currentSessionId || DEFAULT_SESSION_ID).replace(/[^a-zA-Z0-9_-]/g, '_');
  const isMobile = typeof navigator !== 'undefined' && /Mobile|Android|iPhone/i.test(navigator.userAgent);

  const cleanShoppingHistory = (state.shoppingHistory || []).map(r => ({
    id: String(r.id || ('receipt_' + Date.now())),
    storeName: String(r.storeName || state.storeName || DEFAULT_STORE),
    shoppingDate: String(r.shoppingDate || state.shoppingDate || DEFAULT_DATE),
    timestamp: Number(r.timestamp) || Date.now(),
    totalSpent: Number(r.totalSpent) || 0,
    budgetLimit: Number(r.budgetLimit) || 350000,
    isOverBudget: Boolean(r.isOverBudget),
    itemCount: Number(r.itemCount) || ((r.items && r.items.length) ? r.items.length : 0),
    items: (r.items || []).map(i => ({
      name: String(i.name || ''),
      category: String(i.category || 'Bahan Pokok'),
      unit: String(i.unit || 'pcs'),
      quantity: Number(i.quantity) || 1,
      originalPrice: Number(i.originalPrice) || 0,
      finalUnitPrice: Number(i.finalUnitPrice) || Number(i.originalPrice) || 0,
      subtotal: Number(i.subtotal) || 0
    }))
  }));

  const payload = {
    senderId: myClientId,
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
    shoppingHistory: cleanShoppingHistory,
    totalSpent: (state.items || []).reduce((sum, i) => sum + (Number(i.subtotal) || 0), 0),
    lastUpdated: now,
    updatedByDevice: isMobile ? 'Mobile/Smartphone' : 'Desktop/PC'
  };

  // Debounce network I/O sebesar 60ms agar UI terasa responsif 0ms tanpa lag saat input cepat
  if (pushDebounceTimer) {
    clearTimeout(pushDebounceTimer);
  }

  return new Promise((resolve) => {
    pushDebounceTimer = setTimeout(async () => {
      // 1. Broadcast seketika ke Realtime Cloud Bridge (Port 443 WSS)
      try {
        if (typeof window !== 'undefined' && window.fetch) {
          const bridgePayload = {
            ...payload,
            shoppingHistory: cleanShoppingHistory.slice(0, 5) // Maks 5 struk terbaru agar ukuran pesan pas
          };
          fetch(`https://ntfy.sh/sgt_session_${cleanSession}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bridgePayload)
          }).catch(() => {});
        }
      } catch (e) {}

      if (!db || initError) {
        resolve(true);
        return;
      }

      try {
        const docRef = doc(db, 'shopping_sessions', sessionId || currentSessionId);
        await setDoc(docRef, payload, { merge: true });
        resolve(true);
      } catch (err) {
        console.warn('Gagal push ke Firestore (data tetap aman di LocalStorage):', err);
        resolve(false);
      }
    }, 60);
  });
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

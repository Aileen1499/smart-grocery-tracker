/**
 * SRS F-06A: Modul Persistensi Data Lokal (LocalStorage & Session Cache)
 * Memastikan data keranjang belanja, toko, tanggal, dan limit dompet tahan reload browser (F5)
 */

import { DEFAULT_STORE, DEFAULT_DATE, DEFAULT_BUDGET } from './history-data.js';

export const STORAGE_KEY = 'smart_grocery_session_v1';
export const SYNC_CHANNEL_NAME = 'smart_grocery_realtime_sync';

/**
 * Menghasilkan state default awal sesi belanja Rian
 */
export function getDefaultState() {
  return {
    storeName: DEFAULT_STORE,
    shoppingDate: DEFAULT_DATE,
    budgetLimit: DEFAULT_BUDGET,
    items: [],
    customHistory: {},
    lastUpdated: Date.now()
  };
}

/**
 * Membaca data state aplikasi dari LocalStorage
 * @returns {Object} Data state tersimpan atau default
 */
export function loadState() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return getDefaultState();
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultState();
    }
    const parsed = JSON.parse(raw);
    return {
      storeName: parsed.storeName || DEFAULT_STORE,
      shoppingDate: parsed.shoppingDate || DEFAULT_DATE,
      budgetLimit: typeof parsed.budgetLimit === 'number' ? parsed.budgetLimit : DEFAULT_BUDGET,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      customHistory: parsed.customHistory || {},
      lastUpdated: parsed.lastUpdated || Date.now()
    };
  } catch (err) {
    console.error('Gagal membaca LocalStorage:', err);
    return getDefaultState();
  }
}

/**
 * Menyimpan seluruh data state aplikasi ke LocalStorage dan menyebarkan event realtime
 * @param {Object} state Data state yang akan disimpan
 * @returns {boolean} Berhasil atau tidak
 */
export function saveState(state) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const dataToSave = {
      ...state,
      lastUpdated: Date.now()
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));

    // Kirim sinyal broadcast sinkronisasi realtime ke tab/perangkat lain yang membuka app
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        channel.postMessage({ type: 'STATE_UPDATED', payload: dataToSave });
        channel.close();
      } catch (e) {
        // BroadcastChannel opsional jika dibatasi browser
      }
    }

    return true;
  } catch (err) {
    console.error('Gagal menyimpan ke LocalStorage:', err);
    return false;
  }
}

/**
 * Menghapus seluruh data sesi belanja (reset)
 */
export function clearState() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    return true;
  } catch (err) {
    console.error('Gagal menghapus LocalStorage:', err);
    return false;
  }
}


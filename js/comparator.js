/**
 * SRS F-04: Modul Komparasi Fluktuasi Harga Realtime (Price Tracker)
 * Menyimpan dan membandingkan harga input saat ini dengan harga histori bulan lalu di toko yang sama,
 * serta menampilkan perubahan nominal, persentase, dan arah perubahan.
 */

import { HISTORICAL_PRICES, DEFAULT_STORE, HISTORICAL_DATE } from './history-data.js';
import { formatRupiah } from './calculator.js';

/**
 * Normalisasi string nama barang untuk pencarian fleksibel
 * Contoh: "Beras Rojolele 5kg" -> "beras rojolele 5kg"
 */
export function normalizeName(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Mencari harga histori barang pada toko dan tanggal referensi
 * 
 * @param {string} itemName Nama barang input
 * @param {string} storeName Nama toko
 * @param {string} referenceDate Tanggal pembanding (default: 2026-09-26)
 * @param {Object} customHistory Data histori tambahan tersimpan di storage
 * @returns {Object|null} Data histori barang atau null jika tidak ditemukan
 */
export function findHistoricalPrice(itemName, storeName = DEFAULT_STORE, referenceDate = HISTORICAL_DATE, customHistory = {}) {
  const normInput = normalizeName(itemName);
  if (!normInput) return null;

  // 1. Cek pada customHistory di storage jika ada
  if (customHistory && customHistory[storeName] && customHistory[storeName][referenceDate]) {
    const list = customHistory[storeName][referenceDate];
    const found = list.find(item => {
      const normItem = normalizeName(item.name);
      return normItem === normInput || 
             (item.aliases && item.aliases.some(a => normalizeName(a) === normInput)) ||
             normInput.includes(normItem) || normItem.includes(normInput);
    });
    if (found) return found;
  }

  // 2. Cek pada baseline histori bawaan modul toko yang dipilih
  const storeData = HISTORICAL_PRICES[storeName] || HISTORICAL_PRICES[DEFAULT_STORE];
  if (storeData) {
    const list = storeData[referenceDate] || storeData[HISTORICAL_DATE];
    if (list) {
      // Cari exact match atau alias match terlebih dahulu
      let match = list.find(item => {
        const normItem = normalizeName(item.name);
        if (normItem === normInput) return true;
        if (item.aliases && item.aliases.some(a => normalizeName(a) === normInput)) return true;
        return false;
      });

      // Jika belum ketemu, coba substring matching
      if (!match) {
        match = list.find(item => {
          const normItem = normalizeName(item.name);
          return normInput.includes(normItem) || normItem.includes(normInput);
        });
      }

      if (match) return match;
    }
  }

  // 3. Fallback ke baseline toko default jika toko yang dipilih belum memuat item ini
  if (storeName !== DEFAULT_STORE && HISTORICAL_PRICES[DEFAULT_STORE]) {
    const defaultList = HISTORICAL_PRICES[DEFAULT_STORE][referenceDate] || HISTORICAL_PRICES[DEFAULT_STORE][HISTORICAL_DATE];
    if (defaultList) {
      let match = defaultList.find(item => {
        const normItem = normalizeName(item.name);
        if (normItem === normInput) return true;
        if (item.aliases && item.aliases.some(a => normalizeName(a) === normInput)) return true;
        return false;
      });

      if (!match) {
        match = defaultList.find(item => {
          const normItem = normalizeName(item.name);
          return normInput.includes(normItem) || normItem.includes(normInput);
        });
      }

      if (match) return match;
    }
  }

  return null;
}

/**
 * Menyimpan harga barang ke catatan histori dinamis (Price Tracker)
 * 
 * @param {string} itemName Nama barang
 * @param {number} price Harga satuan
 * @param {string} storeName Nama toko
 * @param {string} date Tanggal pencatatan
 * @param {Object} customHistory Object custom history dari storage
 * @returns {Object} Updated custom history
 */
export function recordPriceHistory(itemName, price, storeName = DEFAULT_STORE, date = HISTORICAL_DATE, customHistory = {}) {
  const updatedHistory = { ...customHistory };
  if (!updatedHistory[storeName]) {
    updatedHistory[storeName] = {};
  }
  if (!updatedHistory[storeName][date]) {
    updatedHistory[storeName][date] = [];
  }

  const normInput = normalizeName(itemName);
  const existingIndex = updatedHistory[storeName][date].findIndex(
    item => normalizeName(item.name) === normInput
  );

  const record = {
    name: itemName,
    price: Math.max(0, Number(price) || 0),
    recordedAt: Date.now()
  };

  if (existingIndex >= 0) {
    updatedHistory[storeName][date][existingIndex] = record;
  } else {
    updatedHistory[storeName][date].push(record);
  }

  return updatedHistory;
}

/**
 * Membandingkan harga saat ini dengan harga histori bulan lalu (SRS F-04 & Prioritas 4)
 * Menghitung perubahan nominal, persentase, dan arah perubahan.
 *
 * Status & Arah:
 * - 'UP' / 'NAIK'       : Panah Merah Naik (↑), nominal (+Rp X.XXX), persentase (+Y.Y%)
 * - 'DOWN' / 'TURUN'   : Panah Hijau Turun (↓), nominal (-Rp X.XXX), persentase (-Y.Y%)
 * - 'STABLE' / 'STABIL' : Tanda Setara Abu-abu (=), nominal (Rp 0), persentase (0%)
 * - 'NEW' / 'BARU'      : Item baru
 *
 * @param {string} itemName Nama barang
 * @param {number} currentPrice Harga satuan yang diinput sekarang
 * @param {string} storeName Toko belanja
 * @param {string} referenceDate Tanggal histori
 * @param {Object} customHistory
 * @returns {Object} Hasil komparasi
 */
export function comparePrice(itemName, currentPrice, storeName = DEFAULT_STORE, referenceDate = HISTORICAL_DATE, customHistory = {}) {
  const current = Math.max(0, Number(currentPrice) || 0);
  const hist = findHistoricalPrice(itemName, storeName, referenceDate, customHistory);

  if (!hist || typeof hist.price !== 'number' || hist.price <= 0) {
    return {
      status: 'NEW',
      direction: 'BARU',
      trend: 'new',
      symbol: '✨',
      iconClass: 'trend-new',
      colorClass: 'badge-new',
      diff: 0,
      diffFormatted: 'Item Baru',
      diffPercent: 0,
      diffPercentFormatted: 'Baru',
      previousPrice: null,
      currentPrice: current,
      historicalPrice: null,
      message: 'Item baru / belum ada histori pembanding',
      matchedItem: null
    };
  }

  const pastPrice = hist.price;
  const diff = current - pastPrice;
  const rawPercent = (diff / pastPrice) * 100;
  const diffPercent = Math.round(Math.abs(rawPercent) * 10) / 10;

  if (diff > 0) {
    // Harga Naik
    return {
      status: 'UP',
      direction: 'NAIK',
      trend: 'up',
      symbol: '↑',
      iconClass: 'trend-up',
      colorClass: 'badge-danger',
      diff: diff,
      diffFormatted: `+${formatRupiah(diff)}`,
      diffPercent: diffPercent,
      diffPercentFormatted: `+${diffPercent}%`,
      previousPrice: pastPrice,
      currentPrice: current,
      historicalPrice: pastPrice,
      message: `Harga Naik (+${formatRupiah(diff)} / +${diffPercent}% dari bulan lalu: ${formatRupiah(pastPrice)})`,
      matchedItem: hist.name
    };
  } else if (diff < 0) {
    // Harga Turun
    const absDiff = Math.abs(diff);
    return {
      status: 'DOWN',
      direction: 'TURUN',
      trend: 'down',
      symbol: '↓',
      iconClass: 'trend-down',
      colorClass: 'badge-success',
      diff: diff,
      diffFormatted: `-${formatRupiah(absDiff)}`,
      diffPercent: diffPercent,
      diffPercentFormatted: `-${diffPercent}%`,
      previousPrice: pastPrice,
      currentPrice: current,
      historicalPrice: pastPrice,
      message: `Harga Turun (-${formatRupiah(absDiff)} / -${diffPercent}% lebih hemat dari bulan lalu: ${formatRupiah(pastPrice)})`,
      matchedItem: hist.name
    };
  } else {
    // Harga Stabil
    return {
      status: 'STABLE',
      direction: 'STABIL',
      trend: 'stable',
      symbol: '=',
      iconClass: 'trend-stable',
      colorClass: 'badge-neutral',
      diff: 0,
      diffFormatted: 'Stabil',
      diffPercent: 0,
      diffPercentFormatted: '0%',
      previousPrice: pastPrice,
      currentPrice: current,
      historicalPrice: pastPrice,
      message: `Harga Stabil (Sama persis dengan bulan lalu: ${formatRupiah(pastPrice)})`,
      matchedItem: hist.name
    };
  }
}

/**
 * Mengambil katalog harga acuan untuk toko tertentu (untuk tab Riwayat Toko)
 * 
 * @param {string} storeName Nama supermarket
 * @param {string} referenceDate Tanggal pembanding
 * @returns {Array} Daftar item katalog dan harga histori
 */
export function getStorePriceCatalog(storeName = DEFAULT_STORE, referenceDate = HISTORICAL_DATE) {
  const storeData = HISTORICAL_PRICES[storeName] || HISTORICAL_PRICES[DEFAULT_STORE];
  if (!storeData) return [];
  return storeData[referenceDate] || storeData[HISTORICAL_DATE] || [];
}

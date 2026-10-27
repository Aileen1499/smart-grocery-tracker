/**
 * SRS F-04: Modul Komparasi Fluktuasi Harga Realtime
 * Membandingkan harga input saat ini dengan harga histori bulan lalu di toko yang sama
 */

import { HISTORICAL_PRICES, DEFAULT_STORE, HISTORICAL_DATE } from './history-data.js';
import { formatRupiah } from './calculator.js';

/**
 * Normalisasi string nama barang untuk pencarian fleksibel
 * Contoh: "Beras Rojolele 5kg" -> "beras rojolele 5kg"
 */
function normalizeName(str) {
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

  // 2. Cek pada baseline histori bawaan modul (SSOT Lotte Mart Grocery - Puri Indah)
  const storeData = HISTORICAL_PRICES[storeName];
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

  return null;
}

/**
 * Membandingkan harga saat ini dengan harga histori bulan lalu (SRS F-04)
 *
 * Status:
 * - 'UP'     : Harga Naik -> Panah Merah Naik (↑), nominal selisih (+Rp X.XXX)
 * - 'DOWN'   : Harga Turun -> Panah Hijau Turun (↓), nominal hemat (-Rp X.XXX)
 * - 'STABLE' : Harga Stabil -> Tanda Setara Abu-abu (=), harga tetap stabil
 * - 'NEW'    : Item baru (belum ada data histori pembanding)
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

  if (!hist || typeof hist.price !== 'number') {
    return {
      status: 'NEW',
      trend: 'new',
      symbol: '✨',
      iconClass: 'trend-new',
      colorClass: 'badge-new',
      diff: 0,
      diffFormatted: 'Item Baru',
      historicalPrice: null,
      message: 'Item baru / belum ada histori bulan lalu',
      matchedItem: null
    };
  }

  const pastPrice = hist.price;
  const diff = current - pastPrice;

  if (diff > 0) {
    // Harga Naik
    return {
      status: 'UP',
      trend: 'up',
      symbol: '↑',
      iconClass: 'trend-up',
      colorClass: 'badge-danger',
      diff: diff,
      diffFormatted: `+${formatRupiah(diff)}`,
      historicalPrice: pastPrice,
      message: `Harga Naik (+${formatRupiah(diff)} dari bulan lalu: ${formatRupiah(pastPrice)})`,
      matchedItem: hist.name
    };
  } else if (diff < 0) {
    // Harga Turun
    const absDiff = Math.abs(diff);
    return {
      status: 'DOWN',
      trend: 'down',
      symbol: '↓',
      iconClass: 'trend-down',
      colorClass: 'badge-success',
      diff: diff,
      diffFormatted: `-${formatRupiah(absDiff)}`,
      historicalPrice: pastPrice,
      message: `Harga Turun (-${formatRupiah(absDiff)} lebih hemat dari bulan lalu: ${formatRupiah(pastPrice)})`,
      matchedItem: hist.name
    };
  } else {
    // Harga Stabil
    return {
      status: 'STABLE',
      trend: 'stable',
      symbol: '=',
      iconClass: 'trend-stable',
      colorClass: 'badge-neutral',
      diff: 0,
      diffFormatted: 'Stabil',
      historicalPrice: pastPrice,
      message: `Harga Stabil (Sama persis dengan bulan lalu: ${formatRupiah(pastPrice)})`,
      matchedItem: hist.name
    };
  }
}

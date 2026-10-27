import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDiscountStages,
  calculateDiscount,
  calculateSubtotal,
  calculateGrandTotal,
  formatRupiah,
  parseRupiah
} from '../js/calculator.js';

import {
  comparePrice,
  findHistoricalPrice,
  recordPriceHistory
} from '../js/comparator.js';

import {
  evaluateBudget,
  DANGER_BANNER_MESSAGE,
  WARNING_STATUS_LABEL
} from '../js/budget.js';

import {
  getDefaultState
} from '../js/storage.js';

describe('SRS F-03 & Prioritas 3: Kalkulator Diskon Bertingkat (Kompound)', () => {
  it('harus memparsing berbagai format diskon kompound termasuk "50% + 20%" dan "50% lalu 20%"', () => {
    assert.deepEqual(parseDiscountStages('50% + 20%'), [50, 20]);
    assert.deepEqual(parseDiscountStages('50% lalu 20%'), [50, 20]);
    assert.deepEqual(parseDiscountStages('50+20'), [50, 20]);
    assert.deepEqual(parseDiscountStages('25%'), [25]);
    assert.deepEqual(parseDiscountStages('25'), [25]);
    assert.deepEqual(parseDiscountStages(25), [25]);
    assert.deepEqual(parseDiscountStages(''), []);
    assert.deepEqual(parseDiscountStages(null), []);
  });

  it('KETENTUAN KALKULASI 1: Sabun Rp 20.000 diskon 25% = Rp 15.000', () => {
    const result = calculateDiscount(20000, '25%');
    assert.equal(result.originalPrice, 20000);
    assert.equal(result.finalPrice, 15000);
    assert.equal(result.totalDiscountAmount, 5000);
    assert.equal(result.effectivePercentage, 25);
    assert.equal(result.hasDiscount, true);
  });

  it('KETENTUAN KALKULASI 2: Wajan Rp 100.000 diskon 50% lalu 20% = TEPAT Rp 40.000 (Jangan hitung diskon ke-2 dari harga awal)', () => {
    // Tahap 1: 100.000 - 50% = 50.000
    // Tahap 2: 50.000 - 20% = 40.000
    // BUKAN 70% linier (Rp 30.000)
    const result = calculateDiscount(100000, '50% lalu 20%');
    assert.equal(result.finalPrice, 40000, 'Harga akhir wajan promo 50%+20% wajib Rp 40.000');
    assert.equal(result.totalDiscountAmount, 60000);
    assert.equal(result.effectivePercentage, 60);
    assert.equal(result.stages.length, 2);
    assert.equal(result.stages[0].resultingPrice, 50000);
    assert.equal(result.stages[1].resultingPrice, 40000);
  });

  it('harus menangani kasus tanpa diskon dan harga 0', () => {
    const result = calculateDiscount(74000, 0);
    assert.equal(result.finalPrice, 74000);
    assert.equal(result.totalDiscountAmount, 0);
    assert.equal(result.hasDiscount, false);

    const zeroResult = calculateDiscount(0, '50%');
    assert.equal(zeroResult.finalPrice, 0);
    assert.equal(zeroResult.hasDiscount, false);
  });
});

describe('SRS F-02 & Prioritas 1 & 2: Reaktivitas Kuantitas, Subtotal & Edit Item', () => {
  it('SKENARIO WAJIB SRS F-02: Minyak Goreng Rp 43.000, qty 1 -> Rp 43.000; ubah qty ke 3 -> Rp 129.000', () => {
    const subtotalQty1 = calculateSubtotal(43000, 1);
    assert.equal(subtotalQty1, 43000);

    const subtotalQty3 = calculateSubtotal(43000, 3);
    assert.equal(subtotalQty3, 129000, 'Subtotal minyak 3x Rp 43.000 wajib Rp 129.000');
  });

  it('harus menghitung ulang grand total saat item diedit atau dihapus', () => {
    let items = [
      { id: '1', name: 'Beras Rojolele', finalUnitPrice: 74000, quantity: 1, subtotal: 74000 },
      { id: '2', name: 'Minyak Goreng 2L', finalUnitPrice: 43000, quantity: 1, subtotal: 43000 }
    ];
    assert.equal(calculateGrandTotal(items), 117000);

    // Edit item 2: ubah kuantitas dari 1 menjadi 3
    items[1].quantity = 3;
    items[1].subtotal = calculateSubtotal(items[1].finalUnitPrice, items[1].quantity);
    assert.equal(items[1].subtotal, 129000);
    assert.equal(calculateGrandTotal(items), 203000);

    // Hapus item 1
    items = items.filter(item => item.id !== '1');
    assert.equal(calculateGrandTotal(items), 129000);
  });

  it('harus memvalidasi harga negatif dan kuantitas tidak valid', () => {
    assert.equal(calculateSubtotal(-50000, 2), 0);
    assert.equal(calculateSubtotal(50000, -2), 0);
    assert.equal(calculateSubtotal(50000, 0), 0);
    assert.equal(calculateSubtotal(NaN, 1), 0);
  });

  it('harus memformat mata uang rupiah standar Indonesia', () => {
    assert.equal(formatRupiah(74000), 'Rp 74.000');
    assert.equal(formatRupiah(129000), 'Rp 129.000');
    assert.equal(parseRupiah('Rp 74.000'), 74000);
  });
});

describe('SRS F-04 & Prioritas 4: Price Tracker (Nominal, Persentase & Arah Perubahan)', () => {
  const store = 'Lotte Mart Grocery - Puri Indah';

  it('SKENARIO 1 (Harga Naik): Beras 5kg bulan lalu Rp 68.000 -> sekarang Rp 74.000 (+Rp 6.000 / +8.8% / NAIK)', () => {
    const result = comparePrice('Beras Rojolele', 74000, store);
    assert.equal(result.status, 'UP');
    assert.equal(result.direction, 'NAIK');
    assert.equal(result.trend, 'up');
    assert.equal(result.symbol, '↑');
    assert.equal(result.diff, 6000);
    assert.equal(result.diffFormatted, '+Rp 6.000');
    assert.equal(result.diffPercent, 8.8);
    assert.equal(result.diffPercentFormatted, '+8.8%');
    assert.equal(result.historicalPrice, 68000);
    assert.equal(result.currentPrice, 74000);
  });

  it('SKENARIO 2 (Harga Turun): Telur 1kg bulan lalu Rp 32.000 -> sekarang Rp 28.000 (-Rp 4.000 / -12.5% / TURUN)', () => {
    const result = comparePrice('Telur 1kg', 28000, store);
    assert.equal(result.status, 'DOWN');
    assert.equal(result.direction, 'TURUN');
    assert.equal(result.trend, 'down');
    assert.equal(result.symbol, '↓');
    assert.equal(result.diff, -4000);
    assert.equal(result.diffFormatted, '-Rp 4.000');
    assert.equal(result.diffPercent, 12.5);
    assert.equal(result.diffPercentFormatted, '-12.5%');
    assert.equal(result.historicalPrice, 32000);
    assert.equal(result.currentPrice, 28000);
  });

  it('SKENARIO 3 (Harga Stabil): Garam 500g bulan lalu Rp 5.000 -> sekarang Rp 5.000 (Rp 0 / 0% / STABIL)', () => {
    const result = comparePrice('Garam 500g', 5000, store);
    assert.equal(result.status, 'STABLE');
    assert.equal(result.direction, 'STABIL');
    assert.equal(result.trend, 'stable');
    assert.equal(result.symbol, '=');
    assert.equal(result.diff, 0);
    assert.equal(result.diffFormatted, 'Stabil');
    assert.equal(result.diffPercent, 0);
    assert.equal(result.diffPercentFormatted, '0%');
    assert.equal(result.historicalPrice, 5000);
    assert.equal(result.currentPrice, 5000);
  });

  it('harus mencatat harga histori baru secara dinamis dengan recordPriceHistory', () => {
    let customHistory = {};
    customHistory = recordPriceHistory('Kopi Arabika', 45000, store, '2026-09-26', customHistory);
    
    // Bandingkan harga baru Rp 50.000 terhadap histori Rp 45.000 yang baru dicatat
    const comp = comparePrice('Kopi Arabika', 50000, store, '2026-09-26', customHistory);
    assert.equal(comp.status, 'UP');
    assert.equal(comp.direction, 'NAIK');
    assert.equal(comp.diff, 5000);
    assert.equal(comp.diffPercent, 11.1);
  });
});

describe('SRS F-05 & Prioritas 5: Budget Warning & Safety Cap', () => {
  it('Kondisi Anggaran Awal Default Rp 350.000: Belanja Rp 74.000 -> Sisa Rp 276.000, Status Aman', () => {
    const res = evaluateBudget(74000, 350000);
    assert.equal(res.status, 'SAFE');
    assert.equal(res.remaining, 276000);
    assert.equal(res.showDangerBanner, false);
    assert.equal(res.isWarning, false);
  });

  it('Peringatan Mendekati Batas (>= 90%): Belanja Rp 320.000 pada limit Rp 350.000 (91.4%) -> Status Peringatan Waspada', () => {
    const res = evaluateBudget(320000, 350000);
    assert.equal(res.status, 'WARNING');
    assert.equal(res.isWarning, true);
    assert.equal(res.statusLabel, WARNING_STATUS_LABEL);
    assert.equal(res.remaining, 30000);
    assert.equal(res.showDangerBanner, false);
  });

  it('Peringatan Melewati Batas (> 100%): Belanja Rp 360.000 pada limit Rp 350.000 -> Banner Bahaya Menyala Tegas', () => {
    const res = evaluateBudget(360000, 350000);
    assert.equal(res.status, 'OVER_BUDGET');
    assert.equal(res.isDanger, true);
    assert.equal(res.showDangerBanner, true);
    assert.equal(res.bannerMessage, DANGER_BANNER_MESSAGE);
    assert.equal(res.overAmount, 10000);
  });
});

describe('SRS F-06A: Struktur Default State & Persistensi', () => {
  it('harus menyediakan state default yang sesuai kasus Rian (Limit Rp 350.000, Lotte Mart)', () => {
    const def = getDefaultState();
    assert.equal(def.storeName, 'Lotte Mart Grocery - Puri Indah');
    assert.equal(def.shoppingDate, '2026-10-26');
    assert.equal(def.budgetLimit, 350000);
    assert.deepEqual(def.items, []);
  });
});

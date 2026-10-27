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
  findHistoricalPrice
} from '../js/comparator.js';

import {
  evaluateBudget,
  DANGER_BANNER_MESSAGE,
  WARNING_STATUS_LABEL
} from '../js/budget.js';

import {
  getDefaultState
} from '../js/storage.js';

describe('SRS F-03: Kalkulator Diskon Bertingkat (Kompound)', () => {
  it('harus memparsing string diskon kompound dengan benar', () => {
    assert.deepEqual(parseDiscountStages('50% + 20%'), [50, 20]);
    assert.deepEqual(parseDiscountStages('50+20'), [50, 20]);
    assert.deepEqual(parseDiscountStages('25%'), [25]);
    assert.deepEqual(parseDiscountStages('25'), [25]);
    assert.deepEqual(parseDiscountStages(25), [25]);
    assert.deepEqual(parseDiscountStages(''), []);
    assert.deepEqual(parseDiscountStages(null), []);
  });

  it('harus menghitung diskon tunggal secara presisi: Sabun Cuci Rp 20.000 diskon 25% -> Rp 15.000', () => {
    const result = calculateDiscount(20000, '25%');
    assert.equal(result.originalPrice, 20000);
    assert.equal(result.finalPrice, 15000);
    assert.equal(result.totalDiscountAmount, 5000);
    assert.equal(result.effectivePercentage, 25);
    assert.equal(result.hasDiscount, true);
  });

  it('SKENARIO WAJIB SRS F-03: Promo Wajan Rp 100.000 dengan promo 50% + 20% wajib TEPAT Rp 40.000', () => {
    const result = calculateDiscount(100000, '50% + 20%');
    // Tahap 1: 100.000 - 50% = 50.000
    // Tahap 2: 50.000 - 20% = 40.000
    // BUKAN linier 70% (Rp 30.000)
    assert.equal(result.finalPrice, 40000, 'Harga akhir wajan promo 50%+20% wajib Rp 40.000');
    assert.equal(result.totalDiscountAmount, 60000);
    assert.equal(result.effectivePercentage, 60); // (60.000 / 100.000) * 100 = 60%
    assert.equal(result.stages.length, 2);
    assert.equal(result.stages[0].resultingPrice, 50000);
    assert.equal(result.stages[1].resultingPrice, 40000);
  });

  it('harus menangani kasus tanpa diskon', () => {
    const result = calculateDiscount(74000, 0);
    assert.equal(result.finalPrice, 74000);
    assert.equal(result.totalDiscountAmount, 0);
    assert.equal(result.hasDiscount, false);
  });
});

describe('SRS F-02: Reaktivitas Kuantitas dan Subtotal', () => {
  it('SKENARIO WAJIB SRS F-02: Minyak Goreng Rp 43.000, qty 1 -> Rp 43.000; ubah qty ke 3 -> Rp 129.000', () => {
    const subtotalQty1 = calculateSubtotal(43000, 1);
    assert.equal(subtotalQty1, 43000);

    const subtotalQty3 = calculateSubtotal(43000, 3);
    assert.equal(subtotalQty3, 129000, 'Subtotal minyak 3x Rp 43.000 wajib Rp 129.000');
  });

  it('harus menghitung grand total dari seluruh baris keranjang belanja', () => {
    const items = [
      { name: 'Beras Rojolele', subtotal: 74000 },
      { name: 'Minyak Goreng 2L', subtotal: 129000 },
      { name: 'Sabun Cuci', subtotal: 15000 }
    ];
    const grandTotal = calculateGrandTotal(items);
    assert.equal(grandTotal, 218000);
  });

  it('harus memformat mata uang rupiah standar Indonesia', () => {
    assert.equal(formatRupiah(74000), 'Rp 74.000');
    assert.equal(formatRupiah(129000), 'Rp 129.000');
    assert.equal(parseRupiah('Rp 74.000'), 74000);
  });
});

describe('SRS F-04: Komparator Fluktuasi Harga Realtime (Lotte Mart Puri Indah)', () => {
  const store = 'Lotte Mart Grocery - Puri Indah';

  it('SKENARIO 1 (Harga Naik): Beras 5kg bulan lalu Rp 68.000 -> sekarang Rp 74.000 (↑ +Rp 6.000)', () => {
    const result = comparePrice('Beras Rojolele', 74000, store);
    assert.equal(result.status, 'UP');
    assert.equal(result.trend, 'up');
    assert.equal(result.symbol, '↑');
    assert.equal(result.diff, 6000);
    assert.equal(result.diffFormatted, '+Rp 6.000');
    assert.equal(result.historicalPrice, 68000);
  });

  it('SKENARIO 2 (Harga Turun): Telur 1kg bulan lalu Rp 32.000 -> sekarang Rp 28.000 (↓ -Rp 4.000)', () => {
    const result = comparePrice('Telur 1kg', 28000, store);
    assert.equal(result.status, 'DOWN');
    assert.equal(result.trend, 'down');
    assert.equal(result.symbol, '↓');
    assert.equal(result.diff, -4000);
    assert.equal(result.diffFormatted, '-Rp 4.000');
    assert.equal(result.historicalPrice, 32000);
  });

  it('SKENARIO 3 (Harga Stabil): Garam 500g bulan lalu Rp 5.000 -> sekarang Rp 5.000 (= Stabil)', () => {
    const result = comparePrice('Garam 500g', 5000, store);
    assert.equal(result.status, 'STABLE');
    assert.equal(result.trend, 'stable');
    assert.equal(result.symbol, '=');
    assert.equal(result.diff, 0);
    assert.equal(result.diffFormatted, 'Stabil');
    assert.equal(result.historicalPrice, 5000);
  });

  it('harus mengenali item baru yang belum memiliki histori', () => {
    const result = comparePrice('Barang Fiktif 999', 25000, store);
    assert.equal(result.status, 'NEW');
    assert.equal(result.trend, 'new');
    assert.equal(result.historicalPrice, null);
  });
});

describe('SRS F-05: Pengendali Anggaran (Budget Safety Cap)', () => {
  const limit = 100000; // Skenario uji lab limit Rp 100.000

  it('Kondisi Aman (< 90%): Belanja Rp 74.000 -> Status Aman, banner tidak muncul', () => {
    const res = evaluateBudget(74000, limit);
    assert.equal(res.status, 'SAFE');
    assert.equal(res.isWarning, false);
    assert.equal(res.isDanger, false);
    assert.equal(res.showDangerBanner, false);
    assert.equal(res.remaining, 26000);
  });

  it('SKENARIO UJI LAB (Waspada >= 90%): Belanja Rp 95.000 pada limit Rp 100.000 -> Status Peringatan Waspada', () => {
    const res = evaluateBudget(95000, limit);
    assert.equal(res.status, 'WARNING');
    assert.equal(res.isWarning, true);
    assert.equal(res.isDanger, false);
    assert.equal(res.statusLabel, WARNING_STATUS_LABEL);
    assert.equal(res.showDangerBanner, false);
    assert.equal(res.percentage, 95);
  });

  it('SKENARIO UJI LAB (Bahaya > 100%): Belanja Rp 110.000 pada limit Rp 100.000 -> Banner merah menyala tegas', () => {
    const res = evaluateBudget(110000, limit);
    assert.equal(res.status, 'OVER_BUDGET');
    assert.equal(res.isWarning, false);
    assert.equal(res.isDanger, true);
    assert.equal(res.showDangerBanner, true);
    assert.equal(res.bannerMessage, DANGER_BANNER_MESSAGE);
    assert.equal(res.overAmount, 10000);
  });
});

describe('SRS F-06A: Struktur Default State & Persistensi', () => {
  it('harus menyediakan state default yang sesuai kasus Rian', () => {
    const def = getDefaultState();
    assert.equal(def.storeName, 'Lotte Mart Grocery - Puri Indah');
    assert.equal(def.shoppingDate, '2026-10-26');
    assert.equal(def.budgetLimit, 350000);
    assert.deepEqual(def.items, []);
  });
});

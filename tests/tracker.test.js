import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDiscountStages,
  calculateDiscount,
  calculateSubtotal,
  calculateGrandTotal,
  formatRupiah,
  parseRupiah,
  formatNumberWithCommas,
  parsePriceInput
} from '../js/calculator.js';

import {
  comparePrice,
  findHistoricalPrice,
  recordPriceHistory,
  getStorePriceCatalog
} from '../js/comparator.js';

import {
  evaluateBudget,
  DANGER_BANNER_MESSAGE,
  WARNING_STATUS_LABEL
} from '../js/budget.js';

import {
  getDefaultState
} from '../js/storage.js';

describe('A. SKENARIO 1 DAILY TEST 2 — Diskon Bertingkat (Kompound)', () => {
  it('Uji 1.1: Sabun Rp 20.000 dengan diskon 25% wajib menghasilkan tepat Rp 15.000', () => {
    const result = calculateDiscount(20000, '25%');
    assert.equal(result.originalPrice, 20000);
    assert.equal(result.finalPrice, 15000, 'Harga akhir sabun harus Rp 15.000');
    assert.equal(result.totalDiscountAmount, 5000);
    assert.equal(result.effectivePercentage, 25);
    assert.equal(result.hasDiscount, true);
  });

  it('Uji 1.2: Wajan Rp 100.000 dengan diskon 50% lalu 20% wajib menghasilkan tepat Rp 40.000', () => {
    // Sesuai materi:
    // Tahap 1: Rp 100.000 dipotong 50% = Rp 50.000
    // Tahap 2: Sisa Rp 50.000 dipotong lagi 20% = Rp 40.000
    // PERINGATAN: Sistem yang salah akan menghitung 50% + 20% = 70% (Rp 30.000)
    const result = calculateDiscount(100000, '50% lalu 20%');
    assert.equal(result.finalPrice, 40000, 'Harga wajan diskon bertingkat 50%+20% wajib Rp 40.000, BUKAN Rp 30.000');
    assert.equal(result.totalDiscountAmount, 60000);
    assert.equal(result.effectivePercentage, 60);
    assert.equal(result.stages.length, 2);
    assert.equal(result.stages[0].basePrice, 100000);
    assert.equal(result.stages[0].discountAmount, 50000);
    assert.equal(result.stages[0].resultingPrice, 50000);
    assert.equal(result.stages[1].basePrice, 50000, 'Diskon tahap 2 harus dari sisa harga tahap 1, BUKAN dari harga awal');
    assert.equal(result.stages[1].discountAmount, 10000);
    assert.equal(result.stages[1].resultingPrice, 40000);
  });

  it('Uji 1.3: Mendukung variasi format input string: "50% + 20%", "50+20", "50% lalu 20%"', () => {
    const r1 = calculateDiscount(100000, '50% + 20%');
    const r2 = calculateDiscount(100000, '50+20');
    const r3 = calculateDiscount(100000, '50% lalu 20%');
    assert.equal(r1.finalPrice, 40000);
    assert.equal(r2.finalPrice, 40000);
    assert.equal(r3.finalPrice, 40000);
  });

  it('Uji 1.4: Menangani barang tanpa diskon dan harga Rp 0 secara konsisten', () => {
    const r0 = calculateDiscount(74000, '');
    assert.equal(r0.finalPrice, 74000);
    assert.equal(r0.hasDiscount, false);

    const rZero = calculateDiscount(0, '25%');
    assert.equal(rZero.finalPrice, 0);
    assert.equal(rZero.hasDiscount, false);
  });
});

describe('B. SKENARIO 2 DAILY TEST 2 — Penggandaan Kuantitas Otomatis', () => {
  it('Uji 2.1: Minyak Goreng Rp 43.000 qty awal = 1 -> Rp 43.000; ubah qty menjadi 3 -> seketika Rp 129.000', () => {
    const unitPrice = 43000;
    const subtotalQty1 = calculateSubtotal(unitPrice, 1);
    assert.equal(subtotalQty1, 43000);

    const subtotalQty3 = calculateSubtotal(unitPrice, 3);
    assert.equal(subtotalQty3, 129000, 'Subtotal 3x Rp 43.000 wajib Rp 129.000');
  });

  it('Uji 2.2: Pengubahan kuantitas beberapa kali berturut-turut (1 -> 3 -> 5 -> 2) menghasilkan subtotal akurat tanpa delay', () => {
    const unitPrice = 43000;
    const q1 = calculateSubtotal(unitPrice, 1);
    assert.equal(q1, 43000);

    const q3 = calculateSubtotal(unitPrice, 3);
    assert.equal(q3, 129000);

    const q5 = calculateSubtotal(unitPrice, 5);
    assert.equal(q5, 215000);

    const q2 = calculateSubtotal(unitPrice, 2);
    assert.equal(q2, 86000);
  });

  it('Uji 2.3: Grand Total terhitung akurat dan konsisten dari seluruh baris troli belanja', () => {
    const items = [
      { name: 'Beras Rojolele', subtotal: 74000 },
      { name: 'Minyak Goreng 2L (3x)', subtotal: 129000 },
      { name: 'Sabun Cuci Diskon', subtotal: 15000 },
      { name: 'Wajan Diskon Kompound', subtotal: 40000 }
    ];
    const total = calculateGrandTotal(items);
    assert.equal(total, 258000, 'Total belanja = 74000 + 129000 + 15000 + 40000 = 258000');
  });
});

describe('C. SKENARIO 3 DAILY TEST 2 — Fluktuasi Harga Realtime (Lotte Mart Puri Indah)', () => {
  const store = 'Lotte Mart Grocery - Puri Indah';

  it('Uji 3.1 (Harga Naik): Beras 5kg bulan lalu Rp 68.000 -> sekarang Rp 74.000 (↑ +Rp 6.000 / +8.8% / NAIK)', () => {
    const res = comparePrice('Beras Rojolele', 74000, store);
    assert.equal(res.status, 'UP');
    assert.equal(res.direction, 'NAIK');
    assert.equal(res.symbol, '↑');
    assert.equal(res.diff, 6000);
    assert.equal(res.diffFormatted, '+Rp 6.000');
    assert.equal(res.diffPercent, 8.8);
    assert.equal(res.diffPercentFormatted, '+8.8%');
    assert.equal(res.historicalPrice, 68000);
    assert.equal(res.currentPrice, 74000);
  });

  it('Uji 3.2 (Harga Turun): Telur 1kg bulan lalu Rp 32.000 -> sekarang Rp 28.000 (↓ -Rp 4.000 / -12.5% / TURUN)', () => {
    const res = comparePrice('Telur 1kg', 28000, store);
    assert.equal(res.status, 'DOWN');
    assert.equal(res.direction, 'TURUN');
    assert.equal(res.symbol, '↓');
    assert.equal(res.diff, -4000);
    assert.equal(res.diffFormatted, '-Rp 4.000');
    assert.equal(res.diffPercent, 12.5);
    assert.equal(res.diffPercentFormatted, '-12.5%');
    assert.equal(res.historicalPrice, 32000);
    assert.equal(res.currentPrice, 28000);
  });

  it('Uji 3.3 (Harga Stabil): Garam 500g bulan lalu Rp 5.000 -> sekarang Rp 5.000 (= Stabil / 0% / STABIL)', () => {
    const res = comparePrice('Garam 500g', 5000, store);
    assert.equal(res.status, 'STABLE');
    assert.equal(res.direction, 'STABIL');
    assert.equal(res.symbol, '=');
    assert.equal(res.diff, 0);
    assert.equal(res.diffFormatted, 'Stabil');
    assert.equal(res.diffPercent, 0);
    assert.equal(res.diffPercentFormatted, '0%');
    assert.equal(res.historicalPrice, 5000);
  });

  it('Uji 3.4 (Pencatatan Dinamis): Mengubah harga barang dari histori yang baru dicatat', () => {
    let customHistory = {};
    // Catat harga awal Rp 20.000
    customHistory = recordPriceHistory('Kecap Manis', 20000, store, '2026-09-26', customHistory);

    // 1. Ubah harga menjadi lebih tinggi (Rp 25.000) -> Naik
    const cUp = comparePrice('Kecap Manis', 25000, store, '2026-09-26', customHistory);
    assert.equal(cUp.status, 'UP');
    assert.equal(cUp.diff, 5000);
    assert.equal(cUp.diffPercent, 25);

    // 2. Ubah harga menjadi lebih rendah (Rp 18.000) -> Turun
    const cDown = comparePrice('Kecap Manis', 18000, store, '2026-09-26', customHistory);
    assert.equal(cDown.status, 'DOWN');
    assert.equal(cDown.diff, -2000);
    assert.equal(cDown.diffPercent, 10);

    // 3. Ubah harga menjadi sama persis (Rp 20.000) -> Stabil
    const cStable = comparePrice('Kecap Manis', 20000, store, '2026-09-26', customHistory);
    assert.equal(cStable.status, 'STABLE');
    assert.equal(cStable.diff, 0);
  });

  it('Uji 3.5: Katalog acuan toko Lotte Mart memuat item SSOT resmi', () => {
    const catalog = getStorePriceCatalog(store, '2026-09-26');
    assert.ok(Array.isArray(catalog));
    assert.ok(catalog.length >= 6);
    assert.ok(catalog.some(c => c.name === 'Beras Rojolele' && c.price === 68000));
    assert.ok(catalog.some(c => c.name === 'Telur 1kg' && c.price === 32000));
    assert.ok(catalog.some(c => c.name === 'Garam 500g' && c.price === 5000));
  });
});

describe('D. SKENARIO 4 DAILY TEST 2 — Budget Warning & Safety Cap', () => {
  const limit = 350000; // Batas Anggaran Rian Rp 350.000

  it('Uji 4.1: Di bawah ambang (< 90%): Belanja Rp 200.000 (57.1%) -> Status Aman, banner tidak muncul', () => {
    const res = evaluateBudget(200000, limit);
    assert.equal(res.status, 'SAFE');
    assert.equal(res.isWarning, false);
    assert.equal(res.isDanger, false);
    assert.equal(res.showDangerBanner, false);
    assert.equal(res.remaining, 150000);
  });

  it('Uji 4.2: Mendekati batas (>= 90% dan <= 100%): Belanja Rp 320.000 (91.4%) -> Status Peringatan Waspada', () => {
    const res = evaluateBudget(320000, limit);
    assert.equal(res.status, 'WARNING');
    assert.equal(res.isWarning, true);
    assert.equal(res.isDanger, false);
    assert.equal(res.statusLabel, WARNING_STATUS_LABEL);
    assert.equal(res.showDangerBanner, false);
    assert.equal(res.remaining, 30000);
  });

  it('Uji 4.3: Tepat pada batas (100%): Belanja Rp 350.000 -> Status Peringatan Waspada, Sisa Rp 0, banner belum menyala', () => {
    const res = evaluateBudget(350000, limit);
    assert.equal(res.status, 'WARNING');
    assert.equal(res.isWarning, true);
    assert.equal(res.isDanger, false);
    assert.equal(res.showDangerBanner, false);
    assert.equal(res.remaining, 0);
  });

  it('Uji 4.4: Melampaui batas (> 100%): Belanja Rp 360.000 -> Status OVER_BUDGET, Banner Merah Menyala Tegas', () => {
    const res = evaluateBudget(360000, limit);
    assert.equal(res.status, 'OVER_BUDGET');
    assert.equal(res.isWarning, false);
    assert.equal(res.isDanger, true);
    assert.equal(res.showDangerBanner, true);
    assert.equal(res.bannerMessage, DANGER_BANNER_MESSAGE);
    assert.equal(res.overAmount, 10000);
  });

  it('Uji 4.5: Skenario Lab Limit Rp 100.000: Belanja Rp 95.000 (kuning waspada) lalu Rp 110.000 (merah tegas)', () => {
    const labLimit = 100000;
    const res95k = evaluateBudget(95000, labLimit);
    assert.equal(res95k.status, 'WARNING');
    assert.equal(res95k.isWarning, true);
    assert.equal(res95k.showDangerBanner, false);

    const res110k = evaluateBudget(110000, labLimit);
    assert.equal(res110k.status, 'OVER_BUDGET');
    assert.equal(res110k.isDanger, true);
    assert.equal(res110k.showDangerBanner, true);
  });
});

describe('E. UJI FUNGSI VALIDASI INPUT & PERSISTENSI PENYIMPANAN', () => {
  it('Uji 5.1: Mencegah input harga negatif atau non-numerik merusak kalkulasi', () => {
    assert.equal(calculateSubtotal(-15000, 1), 0);
    assert.equal(calculateSubtotal(0, 1), 0);
    assert.equal(calculateSubtotal('invalid', 1), 0);
  });

  it('Uji 5.2: Mencegah kuantitas invalid (<= 0 atau NaN) merusak kalkulasi', () => {
    assert.equal(calculateSubtotal(50000, 0), 0);
    assert.equal(calculateSubtotal(50000, -3), 0);
    assert.equal(calculateSubtotal(50000, NaN), 0);
  });

  it('Uji 5.3: Struktur default state persistensi memuat seluruh atribut Kasus Rian', () => {
    const def = getDefaultState();
    assert.equal(def.storeName, 'Lotte Mart Grocery - Puri Indah');
    assert.equal(def.shoppingDate, '2026-10-26');
    assert.equal(def.budgetLimit, 350000);
    assert.deepEqual(def.items, []);
    assert.ok(typeof def.lastUpdated === 'number');
  });

  it('Uji 5.4: Format rupiah standar Indonesia memformat angka tanpa kehilangan presisi', () => {
    assert.equal(formatRupiah(74000), 'Rp 74.000');
    assert.equal(formatRupiah(129000), 'Rp 129.000');
    assert.equal(parseRupiah('Rp 74.000'), 74000);
  });

  it('Uji 5.5: Format koma ribuan (74,000) mempermudah penghitungan nol dan deteksi minus', () => {
    assert.equal(formatNumberWithCommas('74000'), '74,000');
    assert.equal(formatNumberWithCommas('100000'), '100,000');
    assert.equal(formatNumberWithCommas('-15000'), '-15,000');
    assert.equal(formatNumberWithCommas(''), '');

    assert.equal(parsePriceInput('74,000'), 74000);
    assert.equal(parsePriceInput('100,000'), 100000);
    assert.equal(parsePriceInput('-15000'), -15000);
    assert.equal(parsePriceInput('-Rp 15.000'), -15000);
    assert.equal(parsePriceInput('Rp 74.000'), 74000);
    assert.equal(parsePriceInput(''), 0);
  });
});

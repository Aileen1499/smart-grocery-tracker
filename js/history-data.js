/**
 * Baseline data histori harga belanja (SSOT Skenario DT2 Kasus Rian)
 * Toko Referensi: Lotte Mart Grocery - Puri Indah
 * Tanggal Referensi: 26 September 2026 (Bulan Lalu)
 */

export const DEFAULT_STORE = 'Lotte Mart Grocery - Puri Indah';
export const DEFAULT_DATE = '2026-10-26';
export const HISTORICAL_DATE = '2026-09-26';
export const DEFAULT_BUDGET = 350000;

export const HISTORICAL_PRICES = {
  'Lotte Mart Grocery - Puri Indah': {
    '2026-09-26': [
      {
        name: 'Beras Rojolele',
        aliases: ['beras', 'beras 5kg', 'beras rojolele 5kg', 'beras rojolele'],
        category: 'Bahan Pokok',
        unit: 'karung/5kg',
        price: 68000
      },
      {
        name: 'Telur 1kg',
        aliases: ['telur', 'telur ayam', 'telur 1kg', 'telur ayam 1kg'],
        category: 'Bahan Pokok',
        unit: 'kg',
        price: 32000
      },
      {
        name: 'Garam 500g',
        aliases: ['garam', 'garam 500g', 'garam dapur'],
        category: 'Bumbu Dapur',
        unit: 'bungkus',
        price: 5000
      },
      {
        name: 'Minyak Goreng 2L',
        aliases: ['minyak', 'minyak goreng', 'minyak goreng 2l', 'minyak 2l'],
        category: 'Bahan Pokok',
        unit: 'liter',
        price: 43000
      },
      {
        name: 'Sabun Cuci',
        aliases: ['sabun', 'sabun cuci', 'sabun cuci piring', 'sabun deterjen'],
        category: 'Kebutuhan Rumah Tangga',
        unit: 'pcs',
        price: 20000
      },
      {
        name: 'Wajan',
        aliases: ['wajan', 'wajan penggorengan', 'wajan teflon'],
        category: 'Kebutuhan Rumah Tangga',
        unit: 'pcs',
        price: 100000
      }
    ]
  }
};

/**
 * Benchmark harga supermarket terkini (26 Oktober 2026) sesuai Skenario Uji 4 DT2
 * - Beras 5kg: Bulan lalu Rp 68.000 -> Sekarang Rp 74.000 (Harga Naik / ↑ +Rp 6.000 / Merah)
 * - Telur 1kg: Bulan lalu Rp 32.000 -> Sekarang Rp 28.000 (Harga Turun / ↓ -Rp 4.000 / Hijau)
 * - Garam 500g: Bulan lalu Rp 5.000 -> Sekarang Rp 5.000 (Harga Stabil / = Stabil / Abu-abu)
 * - Minyak Goreng 2L: Rp 43.000 (Stabil)
 * - Sabun Cuci: Rp 20.000 (Stabil)
 * - Wajan: Rp 100.000 (Stabil)
 */
export const CURRENT_BENCHMARK_PRICES = {
  'Lotte Mart Grocery - Puri Indah': {
    'Beras Rojolele': 74000,
    'Telur 1kg': 28000,
    'Garam 500g': 5000,
    'Minyak Goreng 2L': 43000,
    'Sabun Cuci': 20000,
    'Wajan': 100000
  }
};

export const STORE_OPTIONS = [
  'Lotte Mart Grocery - Puri Indah',
  'Hypermart - Puri Indah',
  'Superindo - Daan Mogot',
  'Pasar Tradisional Puri',
  'Indomaret Point',
  'Alfamart'
];

export const CATEGORY_OPTIONS = [
  'Bahan Pokok',
  'Bumbu Dapur',
  'Kebutuhan Rumah Tangga',
  'Sayur & Buah',
  'Daging & Seafood',
  'Minuman',
  'Snack',
  'Lainnya'
];

export const UNIT_OPTIONS = [
  'karung/5kg',
  'kg',
  'liter',
  'pcs',
  'botol',
  'bungkus',
  'pack',
  'dus'
];


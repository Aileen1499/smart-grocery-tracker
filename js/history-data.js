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


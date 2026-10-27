/**
 * SRS F-03 & F-02: Modul Kalkulator Diskon Kompound & Perhitungan Subtotal
 */

/**
 * Memecah string input diskon menjadi array persentase angka
 * Contoh input yang didukung:
 * - "50% + 20%" -> [50, 20]
 * - "50+20"      -> [50, 20]
 * - "25%"        -> [25]
 * - "25"         -> [25]
 * - 25           -> [25]
 * - "" / null    -> []
 *
 * @param {string|number} discountInput 
 * @returns {number[]} Array persentase diskon
 */
export function parseDiscountStages(discountInput) {
  if (discountInput === null || discountInput === undefined) return [];
  
  if (typeof discountInput === 'number') {
    if (isNaN(discountInput) || discountInput <= 0) return [];
    return [Math.min(100, discountInput)];
  }

  const str = String(discountInput).trim();
  if (!str) return [];

  // Pisahkan berdasarkan tanda '+', '&', koma, atau kata 'lalu' / 'kemudian'
  const parts = str.split(/[+&,]|lalu|kemudian/i);
  const stages = [];

  for (const part of parts) {
    // Hapus karakter non-digit selain titik desimal
    const cleaned = part.replace(/[^0-9.]/g, '').trim();
    if (cleaned) {
      const val = parseFloat(cleaned);
      if (!isNaN(val) && val > 0) {
        // Diskon tidak boleh melebihi 100% per tahap
        stages.push(Math.min(100, Math.max(0, val)));
      }
    }
  }

  return stages;
}

/**
 * Menghitung harga akhir dengan diskon bertingkat (Kompound) sesuai SRS F-03
 * Rumus Bertingkat:
 * Tahap 1: Harga Normal dipotong d1%
 * Tahap 2: Sisa harga dari Tahap 1 dipotong d2%
 * dst.
 * 
 * Contoh: Rp 100.000 dengan promo 50% + 20%
 * - Tahap 1: 100.000 - 50% = 50.000
 * - Tahap 2: 50.000 - 20% = 40.000 (Tepat Rp 40.000, BUKAN 70% = 30.000)
 *
 * @param {number} originalPrice Harga awal sebelum diskon
 * @param {string|number|number[]} discountInput Input diskon
 * @returns {Object} Hasil perhitungan diskon
 */
export function calculateDiscount(originalPrice, discountInput) {
  const price = Math.max(0, Number(originalPrice) || 0);
  const stages = Array.isArray(discountInput) 
    ? discountInput 
    : parseDiscountStages(discountInput);

  if (price === 0 || stages.length === 0) {
    return {
      originalPrice: price,
      finalPrice: price,
      totalDiscountAmount: 0,
      effectivePercentage: 0,
      discountString: '0%',
      stages: [],
      hasDiscount: false
    };
  }

  let currentPrice = price;
  const stageBreakdown = [];

  for (let i = 0; i < stages.length; i++) {
    const rate = stages[i];
    const discountInStage = Math.round(currentPrice * (rate / 100));
    const nextPrice = Math.max(0, currentPrice - discountInStage);

    stageBreakdown.push({
      stage: i + 1,
      rate,
      basePrice: currentPrice,
      discountAmount: discountInStage,
      resultingPrice: nextPrice
    });

    currentPrice = nextPrice;
  }

  const totalDiscountAmount = price - currentPrice;
  const effectivePercentage = price > 0 ? ((totalDiscountAmount / price) * 100) : 0;
  const discountString = stages.map(s => `${s}%`).join(' + ');

  return {
    originalPrice: price,
    finalPrice: Math.round(currentPrice),
    totalDiscountAmount,
    effectivePercentage: Math.round(effectivePercentage * 10) / 10,
    discountString,
    stages: stageBreakdown,
    hasDiscount: totalDiscountAmount > 0
  };
}

/**
 * Menghitung subtotal baris item (SRS F-02)
 * Subtotal = Harga Satuan Efektif (setelah diskon) * Kuantitas
 *
 * @param {number} unitPriceAfterDiscount Harga satuan setelah diskon
 * @param {number} quantity Kuantitas barang
 * @returns {number} Subtotal
 */
export function calculateSubtotal(unitPriceAfterDiscount, quantity) {
  const qty = Math.max(0, Number(quantity) || 0);
  const price = Math.max(0, Number(unitPriceAfterDiscount) || 0);
  return Math.round(price * qty);
}

/**
 * Menghitung grand total belanjaan dari seluruh daftar item (SRS F-02)
 * 
 * @param {Array} items Daftar item keranjang
 * @returns {number} Grand total belanja
 */
export function calculateGrandTotal(items = []) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((total, item) => {
    return total + (Number(item.subtotal) || 0);
  }, 0);
}

/**
 * Format mata uang Rupiah standar Indonesia
 * Contoh: 74000 -> "Rp 74.000"
 *
 * @param {number} amount
 * @param {boolean} includePrefix Tambahkan "Rp " di awal
 * @returns {string}
 */
export function formatRupiah(amount, includePrefix = true) {
  const num = Math.round(Number(amount) || 0);
  const formatted = num.toLocaleString('id-ID');
  return includePrefix ? `Rp ${formatted}` : formatted;
}

/**
 * Format string angka dengan pemisah ribuan berupa koma (,) agar mudah menghitung digit nol
 * Contoh: "74000" -> "74,000"
 *
 * @param {string|number} rawStr
 * @returns {string}
 */
export function formatNumberWithCommas(rawStr) {
  if (rawStr === null || rawStr === undefined || rawStr === '') return '';
  const str = String(rawStr).trim();
  const isNegative = str.startsWith('-');
  const digitsOnly = str.replace(/[^0-9]/g, '');
  if (!digitsOnly) return isNegative ? '-' : '';
  const num = parseInt(digitsOnly, 10);
  if (isNaN(num)) return '';
  const formatted = num.toLocaleString('en-US'); // Pemisah ribuan menggunakan koma (74,000)
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Parsing string input harga termasuk deteksi nilai negatif
 * Mendukung format: "74,000", "74.000", "-15000", "-Rp 15.000", "Rp 74.000"
 *
 * @param {string|number} input
 * @returns {number}
 */
export function parsePriceInput(input) {
  if (typeof input === 'number') return isNaN(input) ? 0 : input;
  if (!input) return 0;
  const str = String(input).trim();
  const isNegative = str.startsWith('-') || str.includes('-');
  const cleaned = str.replace(/[^0-9]/g, '');
  if (!cleaned) return 0;
  const num = parseInt(cleaned, 10) || 0;
  return isNegative ? -num : num;
}

/**
 * Parsing string input rupiah menjadi angka murni
 *
 * @param {string|number} str
 * @returns {number}
 */
export function parseRupiah(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const cleaned = String(str).replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
}


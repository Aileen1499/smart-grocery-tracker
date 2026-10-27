/**
 * SRS F-05: Modul Pengendali Anggaran (Budget Safety Cap)
 * Memantau total belanja terhadap limit saldo dompet dan memberikan peringatan visual
 */

import { formatRupiah } from './calculator.js';

export const DANGER_BANNER_MESSAGE = 'Total belanja melebihi batas saldo dompet! Kurangi kuantitas atau batalkan barang sekunder.';
export const WARNING_STATUS_LABEL = 'Peringatan Waspada';

/**
 * Menganalisis kondisi anggaran belanja (SRS F-05)
 *
 * Skenario Ambang Batas:
 * 1. Safe (< 90%): Status Aman, bar status normal hijau/teal.
 * 2. Waspada (>= 90% dan <= 100%): Bar status berubah warna menjadi kuning (Peringatan Waspada).
 * 3. Bahaya (> 100%): Banner atas menyala merah tegas dengan notifikasi:
 *    "Total belanja melebihi batas saldo dompet! Kurangi kuantitas atau batalkan barang sekunder."
 *
 * @param {number} grandTotal Total belanjaan saat ini
 * @param {number} budgetLimit Batas saldo dompet
 * @returns {Object} Hasil evaluasi anggaran
 */
export function evaluateBudget(grandTotal, budgetLimit) {
  const total = Math.max(0, Number(grandTotal) || 0);
  const limit = Math.max(0, Number(budgetLimit) || 0);

  if (limit <= 0) {
    return {
      status: 'UNSET',
      percentage: 0,
      percentageFormatted: '0%',
      progressWidth: 0,
      remaining: 0,
      remainingFormatted: 'Limit belum disetel',
      overAmount: 0,
      statusLabel: 'Belum Ada Limit',
      statusClass: 'status-neutral',
      barClass: 'bar-neutral',
      showDangerBanner: false,
      bannerMessage: '',
      isWarning: false,
      isDanger: false
    };
  }

  const ratio = total / limit;
  const percentage = Math.round(ratio * 1000) / 10; // 1 desimal
  const progressWidth = Math.min(100, Math.max(0, percentage));
  const remaining = limit - total;
  const overAmount = Math.max(0, total - limit);

  if (ratio > 1.0) {
    // KONDISI BAHAYA / OVER BUDGET (> 100%)
    return {
      status: 'OVER_BUDGET',
      percentage,
      percentageFormatted: `${percentage}%`,
      progressWidth: 100,
      remaining: remaining, // Nilai minus
      remainingFormatted: `Minus ${formatRupiah(overAmount)}`,
      overAmount,
      statusLabel: 'Melebihi Batas Saldo Dompet!',
      statusClass: 'status-danger',
      barClass: 'bar-danger',
      showDangerBanner: true,
      bannerMessage: DANGER_BANNER_MESSAGE,
      isWarning: false,
      isDanger: true
    };
  } else if (ratio >= 0.90) {
    // KONDISI WASPADA (>= 90% dan <= 100%)
    return {
      status: 'WARNING',
      percentage,
      percentageFormatted: `${percentage}%`,
      progressWidth,
      remaining,
      remainingFormatted: `Sisa ${formatRupiah(remaining)}`,
      overAmount: 0,
      statusLabel: WARNING_STATUS_LABEL,
      statusClass: 'status-warning',
      barClass: 'bar-warning',
      showDangerBanner: false,
      bannerMessage: '',
      isWarning: true,
      isDanger: false
    };
  } else {
    // KONDISI AMAN (< 90%)
    return {
      status: 'SAFE',
      percentage,
      percentageFormatted: `${percentage}%`,
      progressWidth,
      remaining,
      remainingFormatted: `Sisa ${formatRupiah(remaining)}`,
      overAmount: 0,
      statusLabel: 'Aman',
      statusClass: 'status-safe',
      barClass: 'bar-safe',
      showDangerBanner: false,
      bannerMessage: '',
      isWarning: false,
      isDanger: false
    };
  }
}

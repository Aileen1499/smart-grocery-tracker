/**
 * UX Modul: Toast Notification Non-Blocking & Modal Konfirmasi Aman
 * Memenuhi Skenario Uji 8:
 * - Visual feedback non-blocking (TIDAK MENGGUNAKAN window.alert())
 * - Modal konfirmasi hapus aman pencegah salah klik
 * - Touch target ergonomis
 */

/**
 * Menampilkan pesan toast halus non-blocking
 * @param {string} message Pesan notifikasi
 * @param {'success'|'error'|'warning'|'info'} type Jenis notifikasi
 * @param {number} duration Durasi dalam ms
 */
export function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || 'ℹ'}</span>
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);

  // Animasi masuk
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Hapus setelah durasi
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

/**
 * Menampilkan modal dialog konfirmasi ramah pengguna
 * @param {string} title Judul konfirmasi
 * @param {string} message Keterangan aksi
 * @param {string} confirmText Label tombol setuju
 * @param {string} cancelText Label tombol batal
 * @returns {Promise<boolean>}
 */
export function showConfirmModal({
  title = 'Konfirmasi',
  message = 'Apakah Anda yakin ingin melanjutkan?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  isDanger = false
}) {
  return new Promise((resolve) => {
    const modalId = 'app-confirm-modal';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
        </div>
        <div class="modal-body">
          <p>${message}</p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary modal-btn-cancel">${cancelText}</button>
          <button type="button" class="btn ${isDanger ? 'btn-danger' : 'btn-primary'} modal-btn-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = (result) => {
      overlay.classList.add('closing');
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(result);
      }, 200);
    };

    overlay.querySelector('.modal-btn-confirm').addEventListener('click', () => cleanup(true));
    overlay.querySelector('.modal-btn-cancel').addEventListener('click', () => cleanup(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });

    // Animasi tampil
    requestAnimationFrame(() => {
      overlay.classList.add('open');
    });
  });
}

/**
 * UX Modul: Toast Notification Non-Blocking & Modal Konfirmasi / Edit
 * Memenuhi Skenario Uji 8 & Prioritas 1:
 * - Visual feedback non-blocking (TIDAK MENGGUNAKAN window.alert())
 * - Modal konfirmasi hapus aman pencegah salah klik
 * - Modal edit item belanjaan
 * - Touch target ergonomis
 */

import { CATEGORY_OPTIONS, UNIT_OPTIONS } from './history-data.js';

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

    let resolved = false;
    const doResolve = (result) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
      overlay.classList.add('closing');
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 150);
    };

    const confirmBtn = overlay.querySelector('.modal-btn-confirm');
    const cancelBtn = overlay.querySelector('.modal-btn-cancel');

    confirmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      doResolve(true);
    });

    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      doResolve(false);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) doResolve(false);
    });

    // Tampilkan modal secara langsung dan aktifkan animasi
    overlay.classList.add('open');
  });
}

/**
 * Menampilkan modal dialog edit data barang belanjaan (Prioritas 1: Edit Barang)
 * @param {Object} item Data barang saat ini
 * @returns {Promise<Object|null>} Data hasil edit atau null jika dibatalkan
 */
export function showEditItemModal(item) {
  return new Promise((resolve) => {
    const modalId = 'app-edit-item-modal';
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.className = 'modal-overlay';

    const categoryOptionsHtml = CATEGORY_OPTIONS.map(cat => 
      `<option value="${cat}" ${cat === item.category ? 'selected' : ''}>${cat}</option>`
    ).join('');

    const unitOptionsHtml = UNIT_OPTIONS.map(u => 
      `<option value="${u}" ${u === item.unit ? 'selected' : ''}>${u}</option>`
    ).join('');

    overlay.innerHTML = `
      <div class="modal-card modal-card-lg" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title">✏️ Edit Barang Belanjaan</h3>
        </div>
        <form id="modal-edit-form" class="modal-body">
          <div class="form-group" style="margin-bottom: 8px;">
            <label class="form-label">Nama Barang <span style="color:var(--danger)">*</span></label>
            <input type="text" id="edit-item-name" class="form-control" value="${item.name}" required>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Kategori</label>
              <select id="edit-item-category" class="form-control">
                ${categoryOptionsHtml}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Satuan</label>
              <select id="edit-item-unit" class="form-control">
                ${unitOptionsHtml}
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Harga Satuan Normal (Rp) <span style="color:var(--danger)">*</span></label>
              <input type="number" id="edit-item-price" class="form-control" value="${item.originalPrice}" min="1" step="500" inputmode="numeric" required>
            </div>
            <div class="form-group">
              <label class="form-label">Kuantitas <span style="color:var(--danger)">*</span></label>
              <input type="number" id="edit-item-qty" class="form-control" value="${item.quantity}" min="1" max="999" inputmode="numeric" required>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label">Diskon Promo (Opsional: Kompound)</label>
            <input type="text" id="edit-item-discount" class="form-control" value="${item.discountInput || ''}" placeholder="Contoh: 50+20 atau 25%">
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary modal-btn-cancel">Batal</button>
            <button type="submit" class="btn btn-primary modal-btn-save">Simpan Perubahan</button>
          </div>
        </form>
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

    const form = overlay.querySelector('#modal-edit-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = overlay.querySelector('#edit-item-name').value.trim();
      const category = overlay.querySelector('#edit-item-category').value;
      const unit = overlay.querySelector('#edit-item-unit').value;
      const price = parseFloat(overlay.querySelector('#edit-item-price').value);
      const qty = parseInt(overlay.querySelector('#edit-item-qty').value, 10);
      const discountInput = overlay.querySelector('#edit-item-discount').value.trim();

      if (!name) {
        showToast('Nama barang wajib diisi!', 'warning');
        return;
      }
      if (isNaN(price) || price <= 0) {
        showToast('Harga barang harus angka positif lebih dari 0!', 'error');
        return;
      }
      if (isNaN(qty) || qty <= 0) {
        showToast('Kuantitas minimal 1!', 'warning');
        return;
      }

      cleanup({
        ...item,
        name,
        category,
        unit,
        originalPrice: price,
        quantity: qty,
        discountInput
      });
    });

    overlay.querySelector('.modal-btn-cancel').addEventListener('click', () => cleanup(null));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(null);
    });

    requestAnimationFrame(() => {
      overlay.classList.add('open');
    });
  });
}

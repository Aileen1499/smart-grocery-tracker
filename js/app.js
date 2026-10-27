/**
 * Smart Grocery & Price Tracker - Main Controller
 * Implementasi F-01 sampai F-06 berdasarkan Kasus Rian & SRS DT2
 */

import {
  calculateDiscount,
  calculateSubtotal,
  calculateGrandTotal,
  formatRupiah,
  parseRupiah
} from './calculator.js';

import {
  comparePrice
} from './comparator.js';

import {
  evaluateBudget
} from './budget.js';

import {
  loadState,
  saveState,
  clearState,
  getDefaultState
} from './storage.js';

import {
  initLocalSync
} from './sync.js';

import {
  showToast,
  showConfirmModal
} from './ui.js';

import {
  STORE_OPTIONS,
  CATEGORY_OPTIONS,
  UNIT_OPTIONS,
  DEFAULT_STORE,
  DEFAULT_DATE,
  DEFAULT_BUDGET
} from './history-data.js';

// State aplikasi aktif
let state = getDefaultState();

// Referensi Elemen DOM
let dom = {};

/**
 * Menginisialisasi referensi elemen DOM
 */
function initDomReferences() {
  dom = {
    // Banner bahaya
    dangerBanner: document.getElementById('danger-banner'),
    dangerBannerText: document.getElementById('danger-banner-text'),

    // Form Sesi
    storeSelect: document.getElementById('store-select'),
    dateInput: document.getElementById('date-input'),

    // Budget Cap
    budgetLimitInput: document.getElementById('budget-limit-input'),
    budgetProgressBar: document.getElementById('budget-progress-bar'),
    budgetProgressFill: document.getElementById('budget-progress-fill'),
    budgetBadge: document.getElementById('budget-status-badge'),
    budgetRemainingText: document.getElementById('budget-remaining-text'),
    budgetTotalText: document.getElementById('budget-total-text'),
    budgetPercentText: document.getElementById('budget-percent-text'),

    // Form Input Item
    itemForm: document.getElementById('item-form'),
    itemNameInput: document.getElementById('item-name'),
    itemCategorySelect: document.getElementById('item-category'),
    itemUnitSelect: document.getElementById('item-unit'),
    itemQtyInput: document.getElementById('item-qty'),
    itemPriceInput: document.getElementById('item-price'),
    itemDiscountInput: document.getElementById('item-discount'),
    formPreviewBox: document.getElementById('form-preview-box'),

    // Keranjang
    cartCountBadge: document.getElementById('cart-count-badge'),
    cartItemsList: document.getElementById('cart-items-list'),
    emptyStateContainer: document.getElementById('empty-state'),
    btnClearCart: document.getElementById('btn-clear-cart'),
    btnLoadScenario: document.getElementById('btn-load-scenario'),
    btnQuickAddBeras: document.getElementById('btn-quick-beras'),
    btnQuickAddMinyak: document.getElementById('btn-quick-minyak'),

    // Sticky Bottom Bar
    stickyTotalText: document.getElementById('sticky-total-text'),
    stickyStatusBadge: document.getElementById('sticky-status-badge')
  };
}

/**
 * Mengisi opsi dropdown toko, kategori, dan satuan
 */
function populateDropdownOptions() {
  if (dom.storeSelect) {
    dom.storeSelect.innerHTML = STORE_OPTIONS.map(store => 
      `<option value="${store}" ${store === state.storeName ? 'selected' : ''}>${store}</option>`
    ).join('');
  }

  if (dom.itemCategorySelect) {
    dom.itemCategorySelect.innerHTML = CATEGORY_OPTIONS.map(cat => 
      `<option value="${cat}">${cat}</option>`
    ).join('');
  }

  if (dom.itemUnitSelect) {
    dom.itemUnitSelect.innerHTML = UNIT_OPTIONS.map(unit => 
      `<option value="${unit}">${unit}</option>`
    ).join('');
  }
}

/**
 * Menghitung ulang seluruh subtotal item, grand total, komparasi harga, dan status budget
 */
function recalculateAll() {
  // Update komparasi dan subtotal setiap item
  state.items = state.items.map(item => {
    // Diskon kompound
    const discountRes = calculateDiscount(item.originalPrice, item.discountInput || '');
    const finalUnitPrice = discountRes.finalPrice;
    const subtotal = calculateSubtotal(finalUnitPrice, item.quantity);

    // Komparasi harga historis (SRS F-04)
    const comparison = comparePrice(
      item.name,
      item.originalPrice,
      state.storeName,
      '2026-09-26',
      state.customHistory
    );

    return {
      ...item,
      discountResult: discountRes,
      finalUnitPrice,
      subtotal,
      comparison
    };
  });

  const grandTotal = calculateGrandTotal(state.items);
  const budgetEvaluation = evaluateBudget(grandTotal, state.budgetLimit);

  return { grandTotal, budgetEvaluation };
}

/**
 * Merender seluruh tampilan UI aplikasi
 */
function render() {
  const { grandTotal, budgetEvaluation } = recalculateAll();

  // 1. Render Banner Peringatan Bahaya (> 100%) (SRS F-05)
  if (dom.dangerBanner) {
    if (budgetEvaluation.showDangerBanner) {
      dom.dangerBanner.classList.remove('hidden');
      if (dom.dangerBannerText) {
        dom.dangerBannerText.textContent = budgetEvaluation.bannerMessage;
      }
    } else {
      dom.dangerBanner.classList.add('hidden');
    }
  }

  // 2. Render Form Sesi (Toko & Tanggal) (SRS F-01)
  if (dom.storeSelect && dom.storeSelect.value !== state.storeName) {
    dom.storeSelect.value = state.storeName;
  }
  if (dom.dateInput) {
    dom.dateInput.value = state.shoppingDate;
  }

  // 3. Render Budget Safety Cap (SRS F-05)
  if (dom.budgetLimitInput) {
    // Biarkan nilai input tetap sinkron tanpa mengganggu kursor pengguna
    if (document.activeElement !== dom.budgetLimitInput) {
      dom.budgetLimitInput.value = state.budgetLimit;
    }
  }
  if (dom.budgetProgressFill) {
    dom.budgetProgressFill.style.width = `${budgetEvaluation.progressWidth}%`;
    dom.budgetProgressFill.className = `progress-fill ${budgetEvaluation.barClass}`;
  }
  if (dom.budgetBadge) {
    dom.budgetBadge.textContent = budgetEvaluation.statusLabel;
    dom.budgetBadge.className = `status-badge ${budgetEvaluation.statusClass}`;
  }
  if (dom.budgetTotalText) {
    dom.budgetTotalText.textContent = formatRupiah(grandTotal);
  }
  if (dom.budgetRemainingText) {
    dom.budgetRemainingText.textContent = budgetEvaluation.remainingFormatted;
  }
  if (dom.budgetPercentText) {
    dom.budgetPercentText.textContent = budgetEvaluation.percentageFormatted;
  }

  // 4. Render Sticky Bottom Bar (Ergonomi Mobile)
  if (dom.stickyTotalText) {
    dom.stickyTotalText.textContent = formatRupiah(grandTotal);
  }
  if (dom.stickyStatusBadge) {
    dom.stickyStatusBadge.textContent = budgetEvaluation.statusLabel;
    dom.stickyStatusBadge.className = `status-badge ${budgetEvaluation.statusClass}`;
  }

  // 5. Render Daftar Keranjang Belanja (SRS F-01, F-02, F-03, F-04, F-06A)
  if (dom.cartCountBadge) {
    dom.cartCountBadge.textContent = `${state.items.length} Barang`;
  }

  if (state.items.length === 0) {
    if (dom.emptyStateContainer) dom.emptyStateContainer.classList.remove('hidden');
    if (dom.cartItemsList) dom.cartItemsList.innerHTML = '';
  } else {
    if (dom.emptyStateContainer) dom.emptyStateContainer.classList.add('hidden');
    if (dom.cartItemsList) {
      dom.cartItemsList.innerHTML = state.items.map((item, index) => renderCartItemRow(item, index)).join('');
    }
  }

  // Simpan state terkini ke LocalStorage (SRS F-06A)
  saveState(state);
}

/**
 * Merender baris kartu item keranjang belanja
 */
function renderCartItemRow(item, index) {
  const comp = item.comparison || {};
  const disc = item.discountResult || {};

  // Badge komparasi harga
  let compBadgeHtml = '';
  if (comp.status === 'UP') {
    compBadgeHtml = `<span class="price-comp-badge comp-up" title="${comp.message}">
      <span class="comp-icon">↑</span> ${comp.diffFormatted}
    </span>`;
  } else if (comp.status === 'DOWN') {
    compBadgeHtml = `<span class="price-comp-badge comp-down" title="${comp.message}">
      <span class="comp-icon">↓</span> ${comp.diffFormatted}
    </span>`;
  } else if (comp.status === 'STABLE') {
    compBadgeHtml = `<span class="price-comp-badge comp-stable" title="${comp.message}">
      <span class="comp-icon">=</span> Stabil
    </span>`;
  } else {
    compBadgeHtml = `<span class="price-comp-badge comp-new">Item Baru</span>`;
  }

  // Info diskon jika ada
  let discountHtml = '';
  if (disc.hasDiscount) {
    discountHtml = `
      <div class="item-discount-info">
        <span class="orig-price-strike">${formatRupiah(item.originalPrice)}</span>
        <span class="discount-pill">Promo ${disc.discountString}</span>
        <span class="final-unit-tag">${formatRupiah(item.finalUnitPrice)}/${item.unit}</span>
      </div>
    `;
  } else {
    discountHtml = `
      <div class="item-unit-price">${formatRupiah(item.originalPrice)} / ${item.unit}</div>
    `;
  }

  return `
    <li class="cart-item-card" data-id="${item.id}">
      <div class="cart-item-header">
        <div class="item-identity">
          <span class="item-title">${escapeHtml(item.name)}</span>
          <div class="item-meta">
            <span class="badge-cat">${escapeHtml(item.category)}</span>
            <span class="badge-unit">${escapeHtml(item.unit)}</span>
          </div>
        </div>
        <div class="item-comp-wrapper">
          ${compBadgeHtml}
        </div>
      </div>

      <div class="cart-item-pricing">
        ${discountHtml}
      </div>

      <div class="cart-item-footer">
        <div class="qty-controller" role="group" aria-label="Pengatur kuantitas ${escapeHtml(item.name)}">
          <button type="button" class="btn-qty btn-minus" data-id="${item.id}" aria-label="Kurangi kuantitas">−</button>
          <input 
            type="number" 
            class="input-qty" 
            data-id="${item.id}" 
            value="${item.quantity}" 
            min="1" 
            max="999" 
            inputmode="numeric" 
            aria-label="Jumlah kuantitas"
          />
          <button type="button" class="btn-qty btn-plus" data-id="${item.id}" aria-label="Tambah kuantitas">+</button>
        </div>

        <div class="item-subtotal-block">
          <span class="subtotal-label">Subtotal</span>
          <span class="subtotal-val">${formatRupiah(item.subtotal)}</span>
        </div>

        <button 
          type="button" 
          class="btn-delete-item" 
          data-id="${item.id}" 
          data-name="${escapeHtml(item.name)}" 
          title="Hapus ${escapeHtml(item.name)}"
          aria-label="Hapus item ${escapeHtml(item.name)}"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    </li>
  `;
}

/**
 * Sanitasi string HTML untuk mencegah XSS
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Mengupdate realtime preview kalkulasi form saat pengguna mengetik harga / diskon / nama
 */
function updateFormPreview() {
  if (!dom.formPreviewBox) return;

  const name = dom.itemNameInput?.value.trim() || '';
  const price = parseFloat(dom.itemPriceInput?.value) || 0;
  const discountStr = dom.itemDiscountInput?.value.trim() || '';

  if (price <= 0 && !name) {
    dom.formPreviewBox.classList.add('hidden');
    dom.formPreviewBox.innerHTML = '';
    return;
  }

  let htmlParts = [];

  // Preview Diskon Kompound (SRS F-03)
  if (price > 0 && discountStr) {
    const disc = calculateDiscount(price, discountStr);
    if (disc.hasDiscount) {
      htmlParts.push(`
        <div class="preview-item">
          <span class="preview-tag">Diskon Kompound:</span>
          <strong>${formatRupiah(disc.finalPrice)}</strong>
          <span class="preview-save">(Hemat ${formatRupiah(disc.totalDiscountAmount)} • ${disc.discountString})</span>
        </div>
      `);
    }
  }

  // Preview Komparasi Fluktuasi Harga (SRS F-04)
  if (name && price > 0) {
    const comp = comparePrice(name, price, state.storeName, '2026-09-26', state.customHistory);
    if (comp.status === 'UP') {
      htmlParts.push(`
        <div class="preview-item preview-up">
          <span class="preview-tag">Komparasi Bulan Lalu:</span>
          <strong>↑ ${comp.diffFormatted}</strong> (Bulan lalu: ${formatRupiah(comp.historicalPrice)})
        </div>
      `);
    } else if (comp.status === 'DOWN') {
      htmlParts.push(`
        <div class="preview-item preview-down">
          <span class="preview-tag">Komparasi Bulan Lalu:</span>
          <strong>↓ ${comp.diffFormatted}</strong> (Bulan lalu: ${formatRupiah(comp.historicalPrice)})
        </div>
      `);
    } else if (comp.status === 'STABLE') {
      htmlParts.push(`
        <div class="preview-item preview-stable">
          <span class="preview-tag">Komparasi Bulan Lalu:</span>
          <strong>= Stabil</strong> (Harga sama: ${formatRupiah(comp.historicalPrice)})
        </div>
      `);
    }
  }

  if (htmlParts.length > 0) {
    dom.formPreviewBox.innerHTML = htmlParts.join('');
    dom.formPreviewBox.classList.remove('hidden');
  } else {
    dom.formPreviewBox.classList.add('hidden');
    dom.formPreviewBox.innerHTML = '';
  }
}

/**
 * Menangani penambahan item belanja dari form (SRS F-01, F-02, F-03, F-04)
 */
function handleAddItem(event) {
  event.preventDefault();

  const name = dom.itemNameInput?.value.trim() || '';
  const category = dom.itemCategorySelect?.value || 'Bahan Pokok';
  const unit = dom.itemUnitSelect?.value || 'pcs';
  const qtyRaw = dom.itemQtyInput?.value;
  const priceRaw = dom.itemPriceInput?.value;
  const discountInput = dom.itemDiscountInput?.value.trim() || '';

  // VALIDASI FORM WAJIB (SRS F-01 & Skenario Uji Lab 1):
  // 1. Nama barang tidak boleh kosong
  if (!name) {
    showToast('Nama barang wajib diisi!', 'warning');
    dom.itemNameInput?.focus();
    return;
  }

  // 2. Harga tidak boleh negatif atau 0
  const price = parseFloat(priceRaw);
  if (isNaN(price) || price <= 0) {
    showToast('Harga barang harus angka positif dan lebih dari 0! (Tidak boleh minus atau kosong)', 'error');
    dom.itemPriceInput?.focus();
    return;
  }

  // 3. Kuantitas harus minimal 1
  const qty = parseInt(qtyRaw, 10);
  if (isNaN(qty) || qty <= 0) {
    showToast('Kuantitas barang minimal 1!', 'warning');
    dom.itemQtyInput?.focus();
    return;
  }

  // Buat objek item baru
  const newItem = {
    id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    name,
    category,
    unit,
    quantity: qty,
    originalPrice: price,
    discountInput
  };

  // Tambahkan ke keranjang
  state.items.push(newItem);

  // Reset form
  dom.itemForm.reset();
  if (dom.itemQtyInput) dom.itemQtyInput.value = '1';
  if (dom.formPreviewBox) {
    dom.formPreviewBox.classList.add('hidden');
    dom.formPreviewBox.innerHTML = '';
  }

  render();
  showToast(`"${name}" berhasil ditambahkan ke keranjang`, 'success');
}

/**
 * Menangani klik kontrol kuantitas (+ / -) dan tombol hapus (SRS F-02 & F-06A)
 */
function handleCartListClick(event) {
  const target = event.target;

  // Tombol Plus (+) Kuantitas
  const btnPlus = target.closest('.btn-plus');
  if (btnPlus) {
    const id = btnPlus.getAttribute('data-id');
    const item = state.items.find(i => i.id === id);
    if (item) {
      item.quantity += 1;
      render();
    }
    return;
  }

  // Tombol Minus (-) Kuantitas
  const btnMinus = target.closest('.btn-minus');
  if (btnMinus) {
    const id = btnMinus.getAttribute('data-id');
    const item = state.items.find(i => i.id === id);
    if (item) {
      if (item.quantity > 1) {
        item.quantity -= 1;
        render();
      } else {
        showToast('Kuantitas minimal adalah 1. Gunakan tombol hapus untuk membuang item.', 'info');
      }
    }
    return;
  }

  // Tombol Hapus Baris Item (SRS F-06A)
  const btnDelete = target.closest('.btn-delete-item');
  if (btnDelete) {
    const id = btnDelete.getAttribute('data-id');
    const name = btnDelete.getAttribute('data-name') || 'barang';
    const index = state.items.findIndex(i => i.id === id);
    if (index !== -1) {
      state.items.splice(index, 1);
      render();
      showToast(`Item "${name}" dihapus dari keranjang`, 'info');
    }
    return;
  }
}

/**
 * Menangani perubahan langsung nilai kuantitas pada input number
 */
function handleQtyInputChange(event) {
  const target = event.target;
  if (!target.classList.contains('input-qty')) return;

  const id = target.getAttribute('data-id');
  const val = parseInt(target.value, 10);
  const item = state.items.find(i => i.id === id);

  if (item) {
    if (!isNaN(val) && val >= 1) {
      item.quantity = val;
      render();
    } else {
      // Revert ke nilai valid sebelumnya jika input invalid
      target.value = item.quantity;
      showToast('Kuantitas harus angka minimal 1!', 'warning');
    }
  }
}

/**
 * Memuat Skenario Uji DT2 Lengkap untuk kemudahan demonstrasi guru di laboratorium
 */
function loadScenarioDT2() {
  state.storeName = DEFAULT_STORE;
  state.shoppingDate = DEFAULT_DATE;
  state.budgetLimit = 100000; // Skenario uji budget warning Rp 100.000

  // Siapkan 5 item uji SSOT DT2
  state.items = [
    {
      id: 'dt2_beras',
      name: 'Beras Rojolele',
      category: 'Bahan Pokok',
      unit: 'karung/5kg',
      quantity: 1,
      originalPrice: 74000,
      discountInput: ''
    },
    {
      id: 'dt2_minyak',
      name: 'Minyak Goreng 2L',
      category: 'Bahan Pokok',
      unit: 'liter',
      quantity: 1,
      originalPrice: 43000,
      discountInput: ''
    },
    {
      id: 'dt2_telur',
      name: 'Telur 1kg',
      category: 'Bahan Pokok',
      unit: 'kg',
      quantity: 1,
      originalPrice: 28000,
      discountInput: ''
    },
    {
      id: 'dt2_garam',
      name: 'Garam 500g',
      category: 'Bumbu Dapur',
      unit: 'bungkus',
      quantity: 1,
      originalPrice: 5000,
      discountInput: ''
    },
    {
      id: 'dt2_wajan',
      name: 'Wajan',
      category: 'Kebutuhan Rumah Tangga',
      unit: 'pcs',
      quantity: 1,
      originalPrice: 100000,
      discountInput: '50% + 20%'
    }
  ];

  render();
  showToast('Skenario Uji DT2 Kasus Rian berhasil dimuat!', 'success');
}

/**
 * Menghubungkan seluruh event listener antarmuka pengguna
 */
function bindEventListeners() {
  // 1. Form submit tambah item (SRS F-01)
  if (dom.itemForm) {
    dom.itemForm.addEventListener('submit', handleAddItem);
  }

  // 2. Realtime preview input form (SRS F-03 & F-04)
  const previewInputs = [dom.itemNameInput, dom.itemPriceInput, dom.itemDiscountInput];
  previewInputs.forEach(input => {
    if (input) {
      input.addEventListener('input', updateFormPreview);
    }
  });

  // 3. Kontrol kuantitas dan hapus di daftar keranjang (SRS F-02 & F-06A)
  if (dom.cartItemsList) {
    dom.cartItemsList.addEventListener('click', handleCartListClick);
    dom.cartItemsList.addEventListener('change', handleQtyInputChange);
  }

  // 4. Ubah limit saldo dompet (SRS F-05)
  if (dom.budgetLimitInput) {
    dom.budgetLimitInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0) {
        state.budgetLimit = val;
        render();
      }
    });
  }

  // 5. Preset chips limit saldo dompet
  const budgetChips = document.querySelectorAll('.chip-budget');
  budgetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const amount = parseFloat(chip.getAttribute('data-amount'));
      if (!isNaN(amount)) {
        state.budgetLimit = amount;
        if (dom.budgetLimitInput) dom.budgetLimitInput.value = amount;
        render();
        showToast(`Batas saldo dompet disetel ke ${formatRupiah(amount)}`, 'info');
      }
    });
  });

  // 6. Ubah Lokasi Toko & Tanggal (SRS F-01)
  if (dom.storeSelect) {
    dom.storeSelect.addEventListener('change', (e) => {
      state.storeName = e.target.value;
      render();
      showToast(`Lokasi belanja diubah ke: ${state.storeName}`, 'info');
    });
  }

  if (dom.dateInput) {
    dom.dateInput.addEventListener('change', (e) => {
      state.shoppingDate = e.target.value;
      render();
    });
  }

  // 7. Tombol Reset / Hapus Seluruh Keranjang dengan Modal Konfirmasi Aman (UX Skenario 8)
  if (dom.btnClearCart) {
    dom.btnClearCart.addEventListener('click', async () => {
      if (state.items.length === 0) {
        showToast('Keranjang belanja sudah kosong.', 'info');
        return;
      }
      const confirmed = await showConfirmModal({
        title: 'Kosongkan Keranjang?',
        message: 'Seluruh barang belanjaan saat ini akan dihapus dari daftar.',
        confirmText: 'Ya, Kosongkan',
        cancelText: 'Batal',
        isDanger: true
      });
      if (confirmed) {
        state.items = [];
        render();
        showToast('Keranjang belanja berhasil dikosongkan.', 'info');
      }
    });
  }

  // 8. Tombol Muat Skenario Uji DT2
  if (dom.btnLoadScenario) {
    dom.btnLoadScenario.addEventListener('click', loadScenarioDT2);
  }

  // 9. Tombol Quick Add Item Uji
  if (dom.btnQuickAddBeras) {
    dom.btnQuickAddBeras.addEventListener('click', () => {
      dom.itemNameInput.value = 'Beras Rojolele';
      dom.itemCategorySelect.value = 'Bahan Pokok';
      dom.itemUnitSelect.value = 'karung/5kg';
      dom.itemQtyInput.value = '1';
      dom.itemPriceInput.value = '74000';
      dom.itemDiscountInput.value = '';
      updateFormPreview();
      dom.itemNameInput.focus();
    });
  }

  if (dom.btnQuickAddMinyak) {
    dom.btnQuickAddMinyak.addEventListener('click', () => {
      dom.itemNameInput.value = 'Minyak Goreng 2L';
      dom.itemCategorySelect.value = 'Bahan Pokok';
      dom.itemUnitSelect.value = 'liter';
      dom.itemQtyInput.value = '1';
      dom.itemPriceInput.value = '43000';
      dom.itemDiscountInput.value = '';
      updateFormPreview();
      dom.itemNameInput.focus();
    });
  }

  // 10. Inisialisasi Sinkronisasi Realtime Antar-Tab (SRS F-06B ready)
  initLocalSync((updatedState) => {
    state = updatedState;
    render();
  });
}

/**
 * Bootstrapping Aplikasi Smart Grocery Tracker
 */
function init() {
  initDomReferences();
  state = loadState();
  populateDropdownOptions();
  bindEventListeners();
  render();

  // Daftarkan Service Worker PWA jika didukung
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('PWA ServiceWorker gagal didaftarkan:', err);
    });
  }
}

// Jalankan saat DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

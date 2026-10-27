/**
 * Smart Grocery & Budget Safety Tracker - Native Mobile PWA Controller
 * Dirancang khusus tampilan smartphone (Mobile UI <= 430px)
 * Mendukung Bottom Navigation Bar melayang (Belanja, Riwayat Toko, Anggaran)
 */

import {
  calculateDiscount,
  calculateSubtotal,
  calculateGrandTotal,
  formatRupiah,
  parseRupiah
} from './calculator.js';

import {
  comparePrice,
  recordPriceHistory,
  getStorePriceCatalog
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
  showConfirmModal,
  showEditItemModal
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
let activeTab = 'tab-belanja';

// Referensi Elemen DOM
let dom = {};

/**
 * Menginisialisasi seluruh referensi elemen DOM
 */
function initDomReferences() {
  dom = {
    // Banner bahaya
    dangerBanner: document.getElementById('danger-banner'),
    dangerBannerText: document.getElementById('danger-banner-text'),

    // Header Sesi Belanja
    storeSelect: document.getElementById('store-select'),
    dateInput: document.getElementById('date-input'),

    // Quick Budget Meter (Tab Belanja)
    qbTotal: document.getElementById('qb-total'),
    qbRemaining: document.getElementById('qb-remaining'),
    budgetProgressFill: document.getElementById('budget-progress-fill'),
    budgetStatusBadge: document.getElementById('budget-status-badge'),

    // Form Input Item
    itemForm: document.getElementById('item-form'),
    itemNameInput: document.getElementById('item-name'),
    itemCategorySelect: document.getElementById('item-category'),
    itemUnitSelect: document.getElementById('item-unit'),
    itemQtyInput: document.getElementById('item-qty'),
    itemPriceInput: document.getElementById('item-price'),
    itemDiscountInput: document.getElementById('item-discount'),
    formPreviewBox: document.getElementById('form-preview-box'),
    btnToggleForm: document.getElementById('btn-toggle-form'),

    // Keranjang Belanja
    cartCountBadge: document.getElementById('cart-count-badge'),
    cartItemsList: document.getElementById('cart-items-list'),
    emptyStateContainer: document.getElementById('empty-state'),
    btnClearCart: document.getElementById('btn-clear-cart'),
    btnLoadScenario: document.getElementById('btn-load-scenario'),
    btnQuickAddBeras: document.getElementById('btn-quick-beras'),
    btnQuickAddMinyak: document.getElementById('btn-quick-minyak'),

    // Tab 2: Riwayat Toko
    riwayatStoreTag: document.getElementById('riwayat-store-tag'),
    compCurrDate: document.getElementById('comp-curr-date'),
    compPastDate: document.getElementById('comp-past-date'),
    historyCatalogContainer: document.getElementById('history-catalog-container'),

    // Tab 3: Anggaran
    tabBudgetBadge: document.getElementById('tab-budget-badge'),
    budgetLimitInput: document.getElementById('budget-limit-input'),
    budgetPercentText: document.getElementById('budget-percent-text'),
    tabBudgetProgressFill: document.getElementById('tab-budget-progress-fill'),
    budgetTotalText: document.getElementById('budget-total-text'),
    budgetRemainingText: document.getElementById('budget-remaining-text'),

    // Bottom Navigation Bar
    navTabBtns: document.querySelectorAll('.nav-tab-btn'),
    navBadgeCount: document.getElementById('nav-badge-count'),
    navBudgetDot: document.getElementById('nav-budget-dot'),
    tabViews: document.querySelectorAll('.tab-view')
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
 * Menghitung ulang seluruh subtotal, grand total, komparasi harga, dan evaluasi anggaran
 */
function recalculateAll() {
  state.items = state.items.map(item => {
    // Diskon kompound (SRS F-03)
    const discountRes = calculateDiscount(item.originalPrice, item.discountInput || '');
    const finalUnitPrice = discountRes.finalPrice;
    const subtotal = calculateSubtotal(finalUnitPrice, item.quantity);

    // Komparasi harga historis (SRS F-04: Price Tracker)
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
 * Merender seluruh tampilan UI aplikasi mobile
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

  // 2. Render Header Sesi Belanja (SRS F-01)
  if (dom.storeSelect && dom.storeSelect.value !== state.storeName) {
    dom.storeSelect.value = state.storeName;
  }
  if (dom.dateInput) {
    dom.dateInput.value = state.shoppingDate;
  }

  // 3. Render Quick Budget Meter (Tab Belanja)
  if (dom.qbTotal) dom.qbTotal.textContent = formatRupiah(grandTotal);
  if (dom.qbRemaining) dom.qbRemaining.textContent = budgetEvaluation.remainingFormatted;
  if (dom.budgetStatusBadge) {
    dom.budgetStatusBadge.textContent = budgetEvaluation.statusLabel;
    dom.budgetStatusBadge.className = `status-badge ${budgetEvaluation.statusClass}`;
  }
  if (dom.budgetProgressFill) {
    dom.budgetProgressFill.style.width = `${budgetEvaluation.progressWidth}%`;
    dom.budgetProgressFill.className = `progress-fill ${budgetEvaluation.barClass}`;
  }

  // 4. Render Tab 3: Anggaran (Full Dashboard)
  if (dom.tabBudgetBadge) {
    dom.tabBudgetBadge.textContent = budgetEvaluation.statusLabel;
    dom.tabBudgetBadge.className = `status-badge ${budgetEvaluation.statusClass}`;
  }
  if (dom.budgetLimitInput && document.activeElement !== dom.budgetLimitInput) {
    dom.budgetLimitInput.value = state.budgetLimit;
  }
  if (dom.budgetPercentText) dom.budgetPercentText.textContent = budgetEvaluation.percentageFormatted;
  if (dom.tabBudgetProgressFill) {
    dom.tabBudgetProgressFill.style.width = `${budgetEvaluation.progressWidth}%`;
    dom.tabBudgetProgressFill.className = `progress-fill ${budgetEvaluation.barClass}`;
  }
  if (dom.budgetTotalText) dom.budgetTotalText.textContent = formatRupiah(grandTotal);
  if (dom.budgetRemainingText) dom.budgetRemainingText.textContent = budgetEvaluation.remainingFormatted;

  // 5. Render Keranjang Belanja (Tab Belanja)
  if (dom.cartCountBadge) {
    dom.cartCountBadge.textContent = `${state.items.length} Barang`;
  }
  if (dom.navBadgeCount) {
    dom.navBadgeCount.textContent = state.items.length;
  }

  // Dot Indikator Status Anggaran di Nav Bawah
  if (dom.navBudgetDot) {
    if (budgetEvaluation.isDanger) {
      dom.navBudgetDot.className = 'nav-dot-danger';
    } else if (budgetEvaluation.isWarning) {
      dom.navBudgetDot.className = 'nav-dot-warn';
    } else {
      dom.navBudgetDot.className = 'nav-dot-safe';
    }
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

  // 6. Render Tab 2: Riwayat Toko (Katalog Fluktuasi Harga Realtime)
  renderHistoryCatalog();

  // Simpan state terkini ke LocalStorage (SRS F-06A)
  saveState(state);
}

/**
 * Merender baris kartu item keranjang belanja mobile
 */
function renderCartItemRow(item, index) {
  const comp = item.comparison || {};
  const disc = item.discountResult || {};

  // Badge komparasi harga dengan nominal, persentase, dan arah perubahan
  let compBadgeHtml = '';
  if (comp.status === 'UP') {
    compBadgeHtml = `<span class="price-comp-badge comp-up" title="${comp.message}">
      <span class="comp-icon">↑</span> ${comp.diffFormatted} (${comp.diffPercentFormatted})
    </span>`;
  } else if (comp.status === 'DOWN') {
    compBadgeHtml = `<span class="price-comp-badge comp-down" title="${comp.message}">
      <span class="comp-icon">↓</span> ${comp.diffFormatted} (${comp.diffPercentFormatted})
    </span>`;
  } else if (comp.status === 'STABLE') {
    compBadgeHtml = `<span class="price-comp-badge comp-stable" title="${comp.message}">
      <span class="comp-icon">=</span> Stabil (0%)
    </span>`;
  } else {
    compBadgeHtml = `<span class="price-comp-badge comp-new">Item Baru</span>`;
  }

  // Info diskon
  let discountHtml = '';
  if (disc.hasDiscount) {
    discountHtml = `
      <div class="item-discount-info">
        <span class="orig-strike">${formatRupiah(item.originalPrice)}</span>
        <span class="disc-pill">Promo ${disc.discountString}</span>
        <span class="final-price-tag">${formatRupiah(item.finalUnitPrice)}/${item.unit}</span>
      </div>
    `;
  } else {
    discountHtml = `
      <div class="final-price-tag">${formatRupiah(item.originalPrice)} / ${item.unit}</div>
    `;
  }

  return `
    <li class="cart-item-card" data-id="${item.id}">
      <div class="cart-item-header">
        <div class="item-identity">
          <span class="item-title">${escapeHtml(item.name)}</span>
          <div class="item-meta-tags">
            <span class="tag-cat">${escapeHtml(item.category)}</span>
            <span class="tag-unit">${escapeHtml(item.unit)}</span>
          </div>
        </div>
        <div>
          ${compBadgeHtml}
        </div>
      </div>

      <div class="cart-item-pricing">
        ${discountHtml}
      </div>

      <div class="cart-item-footer">
        <div class="qty-controller" role="group" aria-label="Kuantitas ${escapeHtml(item.name)}">
          <button type="button" class="btn-qty btn-minus" data-id="${item.id}" aria-label="Kurangi kuantitas">−</button>
          <input 
            type="number" 
            class="input-qty" 
            data-id="${item.id}" 
            value="${item.quantity}" 
            min="1" 
            max="999" 
            inputmode="numeric" 
            aria-label="Jumlah"
          />
          <button type="button" class="btn-qty btn-plus" data-id="${item.id}" aria-label="Tambah kuantitas">+</button>
        </div>

        <div class="item-subtotal-block">
          <span class="subtotal-label">Subtotal</span>
          <span class="subtotal-val">${formatRupiah(item.subtotal)}</span>
        </div>

        <div class="item-actions-group">
          <!-- Tombol Edit Item -->
          <button 
            type="button" 
            class="btn-edit-item" 
            data-id="${item.id}" 
            title="Edit ${escapeHtml(item.name)}"
            aria-label="Edit item ${escapeHtml(item.name)}"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>

          <!-- Tombol Hapus Baris Item -->
          <button 
            type="button" 
            class="btn-delete-item" 
            data-id="${item.id}" 
            data-name="${escapeHtml(item.name)}" 
            title="Hapus ${escapeHtml(item.name)}"
            aria-label="Hapus item ${escapeHtml(item.name)}"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
    </li>
  `;
}

/**
 * Merender daftar fluktuasi harga katalog supermarket di Tab 2 (Riwayat Toko)
 */
function renderHistoryCatalog() {
  if (!dom.historyCatalogContainer) return;

  if (dom.riwayatStoreTag) dom.riwayatStoreTag.textContent = state.storeName;
  if (dom.compCurrDate) dom.compCurrDate.textContent = state.shoppingDate;

  const catalog = getStorePriceCatalog(state.storeName, '2026-09-26');
  if (!catalog || catalog.length === 0) {
    dom.historyCatalogContainer.innerHTML = `
      <div style="text-align:center; padding: 20px; color: var(--neutral-muted);">
        Belum ada katalog harga untuk toko ini.
      </div>
    `;
    return;
  }

  dom.historyCatalogContainer.innerHTML = catalog.map(catItem => {
    // Cari apakah barang ini sudah ada di keranjang sekarang
    const inCart = state.items.find(i => 
      i.name.toLowerCase().includes(catItem.name.toLowerCase()) || 
      catItem.name.toLowerCase().includes(i.name.toLowerCase())
    );

    const currentPrice = inCart ? inCart.originalPrice : catItem.price;
    const comp = comparePrice(catItem.name, currentPrice, state.storeName, '2026-09-26', state.customHistory);

    let badgeHtml = '';
    if (comp.status === 'UP') {
      badgeHtml = `<span class="price-comp-badge comp-up">↑ ${comp.diffFormatted} (${comp.diffPercentFormatted})</span>`;
    } else if (comp.status === 'DOWN') {
      badgeHtml = `<span class="price-comp-badge comp-down">↓ ${comp.diffFormatted} (${comp.diffPercentFormatted})</span>`;
    } else {
      badgeHtml = `<span class="price-comp-badge comp-stable">= Stabil (0%)</span>`;
    }

    return `
      <div class="catalog-item-card">
        <div class="cat-item-left">
          <strong class="cat-item-name">${escapeHtml(catItem.name)}</strong>
          <div class="cat-item-prices">
            <span>Bulan lalu: ${formatRupiah(catItem.price)}</span>
            <span>•</span>
            <span>Satuan: ${escapeHtml(catItem.unit)}</span>
          </div>
        </div>
        <div class="cat-item-right">
          ${badgeHtml}
          <button 
            type="button" 
            class="btn-add-from-catalog" 
            data-name="${escapeHtml(catItem.name)}" 
            data-price="${catItem.price}" 
            data-cat="${escapeHtml(catItem.category)}" 
            data-unit="${escapeHtml(catItem.unit)}"
          >
            + Ke Troli
          </button>
        </div>
      </div>
    `;
  }).join('');
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
 * Mengupdate realtime preview kalkulasi form saat pengguna mengetik
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
          <span class="preview-tag">Bulan Lalu:</span>
          <strong style="color:var(--danger)">↑ ${comp.diffFormatted} (${comp.diffPercentFormatted})</strong> (Histori: ${formatRupiah(comp.historicalPrice)})
        </div>
      `);
    } else if (comp.status === 'DOWN') {
      htmlParts.push(`
        <div class="preview-item preview-down">
          <span class="preview-tag">Bulan Lalu:</span>
          <strong style="color:var(--success)">↓ ${comp.diffFormatted} (${comp.diffPercentFormatted})</strong> (Histori: ${formatRupiah(comp.historicalPrice)})
        </div>
      `);
    } else if (comp.status === 'STABLE') {
      htmlParts.push(`
        <div class="preview-item preview-stable">
          <span class="preview-tag">Bulan Lalu:</span>
          <strong style="color:var(--neutral-muted)">= Stabil (0%)</strong> (Harga sama: ${formatRupiah(comp.historicalPrice)})
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
 * Menangani penambahan item belanja dari form (SRS F-01)
 */
function handleAddItem(event) {
  event.preventDefault();

  const name = dom.itemNameInput?.value.trim() || '';
  const category = dom.itemCategorySelect?.value || 'Bahan Pokok';
  const unit = dom.itemUnitSelect?.value || 'pcs';
  const qtyRaw = dom.itemQtyInput?.value;
  const priceRaw = dom.itemPriceInput?.value;
  const discountInput = dom.itemDiscountInput?.value.trim() || '';

  // VALIDASI FORM WAJIB
  if (!name) {
    showToast('Nama barang wajib diisi!', 'warning');
    dom.itemNameInput?.focus();
    return;
  }

  const price = parseFloat(priceRaw);
  if (isNaN(price) || price <= 0) {
    showToast('Harga barang harus angka positif lebih dari 0! (Tidak boleh minus atau kosong)', 'error');
    dom.itemPriceInput?.focus();
    return;
  }

  const qty = parseInt(qtyRaw, 10);
  if (isNaN(qty) || qty <= 0) {
    showToast('Kuantitas barang minimal 1!', 'warning');
    dom.itemQtyInput?.focus();
    return;
  }

  // Simpan ke histori dinamis
  state.customHistory = recordPriceHistory(name, price, state.storeName, state.shoppingDate, state.customHistory);

  const newItem = {
    id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    name,
    category,
    unit,
    quantity: qty,
    originalPrice: price,
    discountInput
  };

  state.items.push(newItem);

  dom.itemForm.reset();
  if (dom.itemQtyInput) dom.itemQtyInput.value = '1';
  if (dom.formPreviewBox) {
    dom.formPreviewBox.classList.add('hidden');
    dom.formPreviewBox.innerHTML = '';
  }

  render();
  showToast(`"${name}" berhasil dimasukkan ke troli`, 'success');
}

/**
 * Menangani klik kontrol kuantitas (+ / -), tombol edit, dan tombol hapus
 */
async function handleCartListClick(event) {
  const target = event.target;

  // Tombol Plus (+) Kuantitas (SRS F-02)
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

  // Tombol Minus (-) Kuantitas (SRS F-02)
  const btnMinus = target.closest('.btn-minus');
  if (btnMinus) {
    const id = btnMinus.getAttribute('data-id');
    const item = state.items.find(i => i.id === id);
    if (item) {
      if (item.quantity > 1) {
        item.quantity -= 1;
        render();
      } else {
        showToast('Kuantitas minimal 1. Gunakan tombol hapus untuk membuang item.', 'info');
      }
    }
    return;
  }

  // Tombol Edit Item (Prioritas 1: Edit Barang)
  const btnEdit = target.closest('.btn-edit-item');
  if (btnEdit) {
    const id = btnEdit.getAttribute('data-id');
    const item = state.items.find(i => i.id === id);
    if (item) {
      const updated = await showEditItemModal(item);
      if (updated) {
        state.customHistory = recordPriceHistory(
          item.name,
          item.originalPrice,
          state.storeName,
          '2026-09-26',
          state.customHistory
        );
        const index = state.items.findIndex(i => i.id === id);
        if (index !== -1) {
          state.items[index] = updated;
          render();
          showToast(`Item "${updated.name}" berhasil diperbarui`, 'success');
        }
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
 * Menangani perubahan langsung kuantitas pada input number
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
      target.value = item.quantity;
      showToast('Kuantitas harus angka minimal 1!', 'warning');
    }
  }
}

/**
 * Memuat Skenario Uji DT2 Lengkap untuk demonstrasi
 */
function loadScenarioDT2() {
  state.storeName = DEFAULT_STORE;
  state.shoppingDate = DEFAULT_DATE;
  state.budgetLimit = 100000;

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
 * Berpindah tab pada Bottom Navigation Bar
 * @param {string} tabId ID Tab yang dituju (tab-belanja, tab-riwayat, tab-anggaran)
 */
function switchTab(tabId) {
  activeTab = tabId;

  // Update tampilan konten tab
  dom.tabViews.forEach(view => {
    if (view.id === tabId) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  // Update status tombol navigasi bawah
  dom.navTabBtns.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Scroll ke atas dengan halus saat berpindah tab
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // 3. Kontrol kuantitas, edit, dan hapus di daftar troli
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

  // 6. Ubah Lokasi Supermarket & Tanggal Transaksi (Standar Arsitektur 2)
  if (dom.storeSelect) {
    dom.storeSelect.addEventListener('change', (e) => {
      state.storeName = e.target.value;
      render();
      showToast(`Lokasi toko: ${state.storeName}`, 'info');
    });
  }

  if (dom.dateInput) {
    dom.dateInput.addEventListener('change', (e) => {
      state.shoppingDate = e.target.value;
      render();
    });
  }

  // 7. Tombol Kosongkan Troli dengan Modal Konfirmasi Aman
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

  // 10. Tombol Tambah ke Troli dari Tab Riwayat Toko
  if (dom.historyCatalogContainer) {
    dom.historyCatalogContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-add-from-catalog');
      if (btn) {
        const name = btn.getAttribute('data-name');
        const price = parseFloat(btn.getAttribute('data-price')) || 0;
        const category = btn.getAttribute('data-cat') || 'Bahan Pokok';
        const unit = btn.getAttribute('data-unit') || 'pcs';

        dom.itemNameInput.value = name;
        dom.itemCategorySelect.value = category;
        dom.itemUnitSelect.value = unit;
        dom.itemPriceInput.value = price;
        dom.itemQtyInput.value = '1';
        dom.itemDiscountInput.value = '';

        switchTab('tab-belanja');
        updateFormPreview();
        showToast(`Item "${name}" siap dimasukkan ke form`, 'info');
      }
    });
  }

  // 11. Navigasi Bawah (Bottom Navigation Bar)
  dom.navTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab) {
        switchTab(targetTab);
      }
    });
  });

  // 12. Tombol Minimize/Ringkas Form
  if (dom.btnToggleForm) {
    dom.btnToggleForm.addEventListener('click', () => {
      if (dom.itemForm.style.display === 'none') {
        dom.itemForm.style.display = 'block';
        dom.btnToggleForm.textContent = 'Ringkas';
      } else {
        dom.itemForm.style.display = 'none';
        dom.btnToggleForm.textContent = 'Buka Form';
      }
    });
  }

  // 13. Inisialisasi Sinkronisasi Realtime Antar-Tab
  initLocalSync((updatedState) => {
    state = updatedState;
    render();
  });
}

/**
 * Bootstrapping Aplikasi Smart Grocery Tracker PWA
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

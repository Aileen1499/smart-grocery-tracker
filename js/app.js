/**
 * Smart Grocery & Budget Safety Tracker - Native Mobile PWA Controller
 * Dirancang khusus tampilan smartphone (Mobile UI <= 430px)
 * Terintegrasi Cloud Firestore Realtime onSnapshot() & Multi-Device Sync
 */

import {
  calculateDiscount,
  calculateSubtotal,
  calculateGrandTotal,
  formatRupiah,
  parseRupiah,
  formatNumberWithCommas,
  parsePriceInput
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
  initFirestoreRealtimeSync,
  pushStateToFirestore,
  getActiveSessionId,
  setActiveSessionId,
  initLocalSync,
  DEFAULT_SESSION_ID
} from './sync.js';

import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from './firebase-config.js';

import {
  showToast,
  showConfirmModal,
  showEditItemModal,
  showQuickGmailModal
} from './ui.js';

import {
  STORE_OPTIONS,
  CATEGORY_OPTIONS,
  UNIT_OPTIONS,
  DEFAULT_STORE,
  DEFAULT_DATE,
  DEFAULT_BUDGET,
  CURRENT_BENCHMARK_PRICES
} from './history-data.js';

// State aplikasi aktif
let state = getDefaultState();
let activeTab = 'tab-belanja';
let currentSyncStatus = { connected: false, label: 'Menghubungkan...' };

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

    // Auth Screen (KeranjangPintar Login & Sign Up)
    authScreen: document.getElementById('auth-screen'),
    mainAppContent: document.getElementById('main-app-content'),
    tabBtnMasuk: document.getElementById('tab-btn-masuk'),
    tabBtnDaftar: document.getElementById('tab-btn-daftar'),
    formAuthLogin: document.getElementById('form-auth-login'),
    formAuthDaftar: document.getElementById('form-auth-daftar'),
    loginUsername: document.getElementById('login-username'),
    loginPassword: document.getElementById('login-password'),
    btnToggleLoginPass: document.getElementById('btn-toggle-login-pass'),
    btnSubmitMasuk: document.getElementById('btn-submit-masuk'),
    btnAuthGoogleLogin: document.getElementById('btn-auth-google-login'),
    linkForgotPass: document.getElementById('link-forgot-pass'),
    regFullname: document.getElementById('reg-fullname'),
    regUsername: document.getElementById('reg-username'),
    regPassword: document.getElementById('reg-password'),
    btnToggleRegPass: document.getElementById('btn-toggle-reg-pass'),
    btnSubmitDaftar: document.getElementById('btn-submit-daftar'),
    btnAuthGoogleRegister: document.getElementById('btn-auth-google-register'),
    btnAuthSkipGuest: document.getElementById('btn-auth-skip-guest'),
    headerUserBadge: document.getElementById('header-user-badge'),
    headerUserName: document.getElementById('header-user-name'),
    btnHeaderLogout: document.getElementById('btn-header-logout'),

    // Cloud Sync Badge & Session Strip
    cloudSyncBadge: document.getElementById('cloud-sync-badge'),
    syncStatusText: document.getElementById('sync-status-text'),
    currentSessionLabel: document.getElementById('current-session-label'),
    btnChangeSession: document.getElementById('btn-change-session'),

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
    itemPriceHelper: document.getElementById('item-price-helper'),
    itemDiscountInput: document.getElementById('item-discount'),
    formPreviewBox: document.getElementById('form-preview-box'),
    btnAddItem: document.getElementById('btn-add-item'),
    fabAddItem: document.getElementById('fab-add-item'),
    itemNameError: document.getElementById('item-name-error'),
    itemPriceError: document.getElementById('item-price-error'),
    itemQtyError: document.getElementById('item-qty-error'),
    quickBudgetMeter: document.getElementById('quick-budget-meter'),
    cartCardContainer: document.getElementById('cart-card-container'),

    // Keranjang Belanja
    cartCountBadge: document.getElementById('cart-count-badge'),
    cartItemsList: document.getElementById('cart-items-list'),
    emptyStateContainer: document.getElementById('empty-state'),
    btnClearCart: document.getElementById('btn-clear-cart'),
    btnFinishShopping: document.getElementById('btn-finish-shopping'),
    btnLoadScenario: document.getElementById('btn-load-scenario'),
    btnQuickAddBeras: document.getElementById('btn-quick-beras'),
    btnQuickAddMinyak: document.getElementById('btn-quick-minyak'),

    // Tab 2: Riwayat Belanja & Fluktuasi Toko
    subtabBtnAll: document.getElementById('subtab-btn-all'),
    subtabBtnHistory: document.getElementById('subtab-btn-history'),
    subtabBtnFluctuation: document.getElementById('subtab-btn-fluctuation'),
    viewRiwayatBelanja: document.getElementById('view-riwayat-belanja'),
    viewFluktuasiToko: document.getElementById('view-fluktuasi-toko'),
    shoppingHistoryContainer: document.getElementById('shopping-history-container'),
    badgeHistoryCount: document.getElementById('badge-history-count'),
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
 * @param {boolean} pushToCloud Apakah perubahan dipush ke Cloud Firestore (false jika dipicu oleh snapshot)
 */
function render(pushToCloud = true) {
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

  // Update indikator warna kartu belanja (Kuning waspada mendekati limit >=90%, Merah tanda bahaya over budget >100%)
  const budgetCardsToUpdate = [
    dom.quickBudgetMeter || document.getElementById('quick-budget-meter'),
    dom.cartCardContainer || document.getElementById('cart-card-container')
  ];
  budgetCardsToUpdate.forEach(card => {
    if (card) {
      card.classList.remove('card-budget-safe', 'card-budget-warning', 'card-budget-danger');
      if (budgetEvaluation.isDanger) {
        card.classList.add('card-budget-danger');
      } else if (budgetEvaluation.isWarning) {
        card.classList.add('card-budget-warning');
      } else {
        card.classList.add('card-budget-safe');
      }
    }
  });

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

  // 6. Render Tab 2: Riwayat Toko & Fluktuasi Harga Realtime (Hanya jika sedang aktif atau render awal untuk performa kilat)
  if (activeTab === 'tab-riwayat' || !dom.historyCatalogContainer || !dom.historyCatalogContainer.children.length) {
    renderHistoryCatalog();
    renderShoppingHistory();
  }

  // 7. Persistensi Lokal (Tahan F5 saat offline)
  saveState(state);

  // 8. Sinkronisasi Cloud Firestore Multi-Device
  if (pushToCloud) {
    state.grandTotal = grandTotal;
    pushStateToFirestore(state, getActiveSessionId());
  }
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

  const currentBenchmarks = (CURRENT_BENCHMARK_PRICES && CURRENT_BENCHMARK_PRICES[state.storeName]) || {};

  dom.historyCatalogContainer.innerHTML = catalog.map(catItem => {
    const inCart = state.items.find(i => 
      i && i.name && (
        i.name.toLowerCase().includes((catItem.name || '').toLowerCase()) || 
        (catItem.name || '').toLowerCase().includes(i.name.toLowerCase())
      )
    );

    // Prioritas harga sekarang: item di troli > benchmark toko saat ini (26 Okt) > harga histori
    let currentPrice = catItem.price;
    if (inCart) {
      currentPrice = inCart.originalPrice;
    } else if (currentBenchmarks[catItem.name] !== undefined) {
      currentPrice = currentBenchmarks[catItem.name];
    }

    const comp = comparePrice(catItem.name, currentPrice, state.storeName, '2026-09-26', state.customHistory);

    let badgeHtml = '';
    if (comp.status === 'UP') {
      badgeHtml = `<span class="price-comp-badge comp-up">↑ ${comp.diffFormatted} (${comp.diffPercentFormatted}) NAIK</span>`;
    } else if (comp.status === 'DOWN') {
      badgeHtml = `<span class="price-comp-badge comp-down">↓ ${comp.diffFormatted} (${comp.diffPercentFormatted}) TURUN</span>`;
    } else {
      badgeHtml = `<span class="price-comp-badge comp-stable">= Stabil (0%)</span>`;
    }

    const isPriceChanged = currentPrice !== catItem.price;

    return `
      <div class="catalog-item-card">
        <div class="cat-item-left">
          <strong class="cat-item-name">${escapeHtml(catItem.name)}</strong>
          <div class="cat-item-prices">
            <span>Bulan lalu: ${isPriceChanged ? `<del>${formatRupiah(catItem.price)}</del>` : formatRupiah(catItem.price)}</span>
            <span>•</span>
            <span>Sekarang: <strong style="color:var(--neutral-dark)">${formatRupiah(currentPrice)}</strong></span>
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
            data-price="${currentPrice}" 
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
 * Merender daftar struk transaksi belanja yang telah selesai di Tab 2 (Riwayat Belanja)
 */
function renderShoppingHistory() {
  const historyList = Array.isArray(state.shoppingHistory) ? state.shoppingHistory : [];

  if (dom.badgeHistoryCount) {
    dom.badgeHistoryCount.textContent = historyList.length;
  }

  if (!dom.shoppingHistoryContainer) return;

  if (historyList.length === 0) {
    dom.shoppingHistoryContainer.innerHTML = `
      <div class="empty-history-box">
        <div class="empty-history-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        </div>
        <h4 style="font-size: 13.5px; font-weight: 700; color: #334155; margin-bottom: 4px;">Belum Ada Riwayat Belanja</h4>
        <p style="font-size: 12px; color: #64748b; margin: 0;">Selesaikan belanja di tab Belanja dan klik tombol <strong>"Selesaikan Belanja &amp; Simpan Riwayat"</strong> untuk merekam struk di sini.</p>
      </div>
    `;
    return;
  }

  dom.shoppingHistoryContainer.innerHTML = historyList.map((receipt) => {
    const isOver = receipt.isOverBudget || (receipt.budgetLimit && receipt.totalSpent > receipt.budgetLimit);
    const budgetStatusBadge = isOver
      ? `<span class="receipt-budget-badge over">⚠️ Melebihi Anggaran</span>`
      : `<span class="receipt-budget-badge safe">✅ Sesuai Anggaran</span>`;

    const itemsSummary = (receipt.items || []).map(i => `${escapeHtml(i.name)} (${i.quantity} ${escapeHtml(i.unit || 'pcs')})`).join(', ');

    const itemsRowsHtml = (receipt.items || []).map(item => `
      <div class="receipt-item-row">
        <span>${escapeHtml(item.name)} <small style="color:#64748b">× ${item.quantity} ${escapeHtml(item.unit || '')}</small></span>
        <strong>${formatRupiah(item.subtotal || (item.quantity * (item.finalUnitPrice || item.originalPrice || 0)))}</strong>
      </div>
    `).join('');

    return `
      <div class="shopping-receipt-card" data-receipt-id="${receipt.id}">
        <div class="receipt-header-row">
          <div class="receipt-store-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0f766e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
              <path d="M2 7h20"/>
            </svg>
            <span>${escapeHtml(receipt.storeName || 'Supermarket')}</span>
          </div>
          <span class="receipt-date-badge">${escapeHtml(receipt.shoppingDate || 'Hari ini')}</span>
        </div>

        <div class="receipt-stats-row">
          <div class="receipt-total-block">
            <span class="receipt-total-label">Total Belanja</span>
            <span class="receipt-total-val">${formatRupiah(receipt.totalSpent || 0)}</span>
          </div>
          <div>
            ${budgetStatusBadge}
          </div>
        </div>

        <div class="receipt-items-preview">
          <strong>${receipt.itemCount || (receipt.items ? receipt.items.length : 0)} Barang:</strong> ${escapeHtml(itemsSummary)}
        </div>

        <button type="button" class="receipt-items-accordion-btn" data-target="detail-${receipt.id}">
          <span>Tampilkan Rincian Lengkap</span> ▼
        </button>

        <div id="detail-${receipt.id}" class="receipt-items-detail-list hidden">
          ${itemsRowsHtml}
        </div>

        <div class="receipt-actions-row">
          <button type="button" class="btn-receipt-reload" data-id="${receipt.id}" title="Muat barang belanjaan ini ke Troli">
            🔄 Belanja Ulang
          </button>
          <button type="button" class="btn-receipt-delete" data-id="${receipt.id}" title="Hapus catatan ini">
            🗑️ Hapus
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
 * Mengupdate status indikator badge sinkronisasi Cloud Firestore di header
 * Menampilkan pulsing glowing dot minimalis tanpa teks clunky
 */
function updateSyncStatusBadge(status) {
  currentSyncStatus = status;
  if (!dom.cloudSyncBadge) return;

  if (dom.syncStatusText) {
    dom.syncStatusText.textContent = '';
  }
  dom.cloudSyncBadge.className = `sync-indicator-dot ${status.badgeClass || 'badge-live'}`;
  dom.cloudSyncBadge.title = status.details || status.label || 'Tersinkronisasi Realtime';
}

/**
 * Memperbarui teks petunjuk rupiah di bawah input harga
 */
function updatePriceHelper() {
  if (!dom.itemPriceHelper || !dom.itemPriceInput) return;
  const raw = dom.itemPriceInput.value.trim();
  if (!raw) {
    dom.itemPriceHelper.textContent = 'Format: Rp 0';
    dom.itemPriceHelper.className = 'field-helper-hint';
    return;
  }

  const isNeg = raw.includes('-');
  const parsed = parsePriceInput(raw);

  if (isNeg || parsed < 0) {
    dom.itemPriceHelper.textContent = `⚠️ Nilai negatif (${formatRupiah(parsed)}) tidak diperbolehkan`;
    dom.itemPriceHelper.className = 'field-helper-hint hint-error';
  } else if (parsed > 0) {
    dom.itemPriceHelper.textContent = `Format: ${formatRupiah(parsed)}`;
    dom.itemPriceHelper.className = 'field-helper-hint hint-highlight';
  } else {
    dom.itemPriceHelper.textContent = 'Format: Rp 0';
    dom.itemPriceHelper.className = 'field-helper-hint';
  }
}

/**
 * Memformat input harga dengan pemisah ribuan berupa koma (,) secara realtime
 */
function handlePriceInput(e) {
  const input = e.target;
  const val = input.value;

  input.classList.remove('input-error');

  if (val === '' || val === '-') {
    updatePriceHelper();
    updateFormPreview();
    return;
  }

  const isNeg = val.trim().startsWith('-');
  const digits = val.replace(/[^0-9]/g, '');
  if (!digits) {
    input.value = isNeg ? '-' : '';
    updatePriceHelper();
    updateFormPreview();
    return;
  }

  // Format angka dengan koma pemisah ribuan (misal: 74,000 atau 100,000)
  input.value = formatNumberWithCommas(val);

  updatePriceHelper();
  updateFormPreview();
}

/**
 * Mengupdate realtime preview kalkulasi form saat pengguna mengetik
 */
function updateFormPreview() {
  if (!dom.formPreviewBox) return;

  const name = dom.itemNameInput?.value.trim() || '';
  const price = parsePriceInput(dom.itemPriceInput?.value) || 0;
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

let isSubmittingItem = false;

/**
 * Menangani penambahan item belanja dari form (SRS F-01 & Skenario Uji 1)
 * Menolak input kosong atau harga minus (-Rp 15.000) tanpa menambah baris rusak
 */
function handleAddItem(event) {
  if (event) {
    try { event.preventDefault(); } catch (e) {}
  }

  if (isSubmittingItem) return;
  isSubmittingItem = true;
  setTimeout(() => { isSubmittingItem = false; }, 300);

  try {
    const nameInput = dom.itemNameInput;
    const priceInput = dom.itemPriceInput;
    const qtyInput = dom.itemQtyInput;

    const name = nameInput?.value.trim() || '';
    const category = dom.itemCategorySelect?.value || 'Bahan Pokok';
    const unit = dom.itemUnitSelect?.value || 'pcs';
    const priceRaw = priceInput?.value || '';
    const qtyRaw = qtyInput?.value;
    const discountInput = dom.itemDiscountInput?.value.trim() || '';

    // Reset visual error state
    nameInput?.classList.remove('input-error');
    priceInput?.classList.remove('input-error');
    qtyInput?.classList.remove('input-error');
    if (dom.itemNameError) dom.itemNameError.classList.add('hidden');
    if (dom.itemPriceError) dom.itemPriceError.classList.add('hidden');
    if (dom.itemQtyError) dom.itemQtyError.classList.add('hidden');

    // 1. VALIDASI NAMA BARANG KOSONG (Wajib menolak dengan pesan jelas, tidak menambah data)
    if (!name) {
      nameInput?.classList.add('input-error');
      if (dom.itemNameError) {
        dom.itemNameError.textContent = 'Nama barang wajib diisi!';
        dom.itemNameError.classList.remove('hidden');
      }
      nameInput?.focus();
      showToast('⚠️ Nama barang wajib diisi! Harap masukkan nama barang belanjaan.', 'error');
      return;
    }

    // 2. VALIDASI HARGA MINUS / INVALID / KOSONG (Wajib menolak input minus misal: -Rp 15.000)
    const isNegative = String(priceRaw).trim().includes('-');
    const parsedPrice = parsePriceInput(priceRaw);

    if (isNegative || parsedPrice < 0) {
      priceInput?.classList.add('input-error');
      if (dom.itemPriceError) {
        dom.itemPriceError.textContent = 'Harga barang tidak boleh minus (-Rp 15.000)!';
        dom.itemPriceError.classList.remove('hidden');
      }
      priceInput?.focus();
      showToast('⚠️ Input Ditolak: Harga barang tidak boleh bernilai negatif (-Rp 15.000)! Masukkan harga positif.', 'error');
      return;
    }

    if (parsedPrice <= 0) {
      priceInput?.classList.add('input-error');
      if (dom.itemPriceError) {
        dom.itemPriceError.textContent = 'Harga barang harus lebih dari Rp 0!';
        dom.itemPriceError.classList.remove('hidden');
      }
      priceInput?.focus();
      showToast('⚠️ Input Ditolak: Harga barang wajib diisi dengan nominal angka lebih dari Rp 0!', 'error');
      return;
    }

    // 3. VALIDASI KUANTITAS INVALID
    const qty = parseInt(qtyRaw, 10);
    if (isNaN(qty) || qty <= 0) {
      qtyInput?.classList.add('input-error');
      if (dom.itemQtyError) {
        dom.itemQtyError.textContent = 'Kuantitas minimal 1!';
        dom.itemQtyError.classList.remove('hidden');
      }
      qtyInput?.focus();
      showToast('⚠️ Input Ditolak: Kuantitas barang minimal 1!', 'error');
      return;
    }

    // Simpan ke histori dinamis (Price Tracker SRS F-04)
    state.customHistory = recordPriceHistory(name, parsedPrice, state.storeName, state.shoppingDate, state.customHistory);

    const newItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name,
      category,
      unit,
      quantity: qty,
      originalPrice: parsedPrice,
      discountInput
    };

    state.items.push(newItem);
    state.lastUpdated = Date.now();

    // Reset form secara bersih
    if (dom.itemForm) dom.itemForm.reset();
    if (dom.itemNameError) dom.itemNameError.classList.add('hidden');
    if (dom.itemPriceError) dom.itemPriceError.classList.add('hidden');
    if (dom.itemQtyError) dom.itemQtyError.classList.add('hidden');
    if (dom.itemQtyInput) dom.itemQtyInput.value = '1';
    if (dom.itemPriceInput) dom.itemPriceInput.value = '';
    if (dom.itemPriceHelper) {
      dom.itemPriceHelper.textContent = 'Format: Rp 0';
      dom.itemPriceHelper.className = 'field-helper-hint';
    }
    if (dom.formPreviewBox) {
      dom.formPreviewBox.classList.add('hidden');
      dom.formPreviewBox.innerHTML = '';
    }

    render(true);
    showToast(`✅ "${name}" (${formatRupiah(parsedPrice)}) berhasil dimasukkan ke troli`, 'success');
  } catch (err) {
    console.error('Error saat menambah item:', err);
    showToast('Terjadi kendala saat menambahkan barang: ' + err.message, 'error');
  }
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
      render(true);
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
        render(true);
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
          render(true);
          showToast(`Item "${updated.name}" berhasil diperbarui`, 'success');
        }
      }
    }
    return;
  }

  // Tombol Hapus Baris Item (SRS F-06A & UX Konfirmasi Hapus Aman)
  const btnDelete = target.closest('.btn-delete-item');
  if (btnDelete) {
    const id = btnDelete.getAttribute('data-id');
    const name = btnDelete.getAttribute('data-name') || 'barang';
    const confirmed = await showConfirmModal({
      title: 'Hapus Barang Belanjaan?',
      message: `Apakah Anda yakin ingin menghapus "${name}" dari troli belanja?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      isDanger: true
    });
    if (confirmed) {
      const index = state.items.findIndex(i => i.id === id);
      if (index !== -1) {
        state.items.splice(index, 1);
        state.lastUpdated = Date.now();
        render(true);
        showToast(`Item "${name}" berhasil dihapus dari keranjang`, 'info');
      }
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
      render(true);
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

  render(true);
  showToast('Skenario Uji DT2 Kasus Rian berhasil dimuat!', 'success');
}

/**
 * Berpindah tab pada Bottom Navigation Bar
 */
function switchTab(tabId) {
  activeTab = tabId;

  dom.tabViews.forEach(view => {
    if (view.id === tabId) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  dom.navTabBtns.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (tabId === 'tab-riwayat') {
    renderHistoryCatalog();
    renderShoppingHistory();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Menghubungkan seluruh event listener antarmuka pengguna
 */
function bindEventListeners() {
  // 1. Form submit & Klik Tombol Masukkan ke Keranjang (SRS F-01)
  if (dom.itemForm) {
    dom.itemForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAddItem(e);
    });
  }

  // Tombol Masukkan ke Keranjang di Form
  const btnAddItemDirect = dom.btnAddItem || document.getElementById('btn-add-item');
  if (btnAddItemDirect) {
    btnAddItemDirect.addEventListener('click', (e) => {
      e.preventDefault();
      handleAddItem(e);
    });
  }

  // 2. Realtime preview input form (SRS F-03 & F-04) & Format Ribuan Koma
  if (dom.itemNameInput) {
    dom.itemNameInput.addEventListener('input', () => {
      dom.itemNameInput.classList.remove('input-error');
      if (dom.itemNameError) dom.itemNameError.classList.add('hidden');
      updateFormPreview();
    });
  }

  if (dom.itemPriceInput) {
    dom.itemPriceInput.addEventListener('input', (e) => {
      dom.itemPriceInput.classList.remove('input-error');
      if (dom.itemPriceError) dom.itemPriceError.classList.add('hidden');
      handlePriceInput(e);
    });
  }

  if (dom.itemQtyInput) {
    dom.itemQtyInput.addEventListener('input', () => {
      dom.itemQtyInput.classList.remove('input-error');
      if (dom.itemQtyError) dom.itemQtyError.classList.add('hidden');
    });
  }

  if (dom.itemDiscountInput) {
    dom.itemDiscountInput.addEventListener('input', updateFormPreview);
  }

  // Tangani tombol Enter pada seluruh input form secara independen tanpa submit native browser
  [dom.itemNameInput, dom.itemPriceInput, dom.itemQtyInput, dom.itemDiscountInput].forEach(inp => {
    if (inp) {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (!isSubmittingItem) {
            handleAddItem(e);
          }
        }
      });
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
        render(true);
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
        render(true);
        showToast(`Batas saldo dompet disetel ke ${formatRupiah(amount)}`, 'info');
      }
    });
  });

  // 6. Ubah Lokasi Supermarket & Tanggal Transaksi
  if (dom.storeSelect) {
    dom.storeSelect.addEventListener('change', (e) => {
      state.storeName = e.target.value;
      render(true);
      showToast(`Lokasi toko: ${state.storeName}`, 'info');
    });
  }

  if (dom.dateInput) {
    dom.dateInput.addEventListener('change', (e) => {
      state.shoppingDate = e.target.value;
      render(true);
    });
  }

  // 7. Tombol Kosongkan Troli Belanja
  if (dom.btnClearCart) {
    dom.btnClearCart.addEventListener('click', () => {
      if (!state.items || state.items.length === 0) {
        showToast('Keranjang belanja sudah kosong.', 'info');
        return;
      }
      state.items = [];
      state.lastUpdated = Date.now();
      render(true);
      showToast('🗑️ Seluruh isi keranjang belanja berhasil dikosongkan.', 'success');
    });
  }

  // 7b. Tombol Selesaikan Belanja & Simpan Riwayat
  if (dom.btnFinishShopping) {
    dom.btnFinishShopping.addEventListener('click', () => {
      if (!state.items || state.items.length === 0) {
        showToast('⚠️ Troli belanja masih kosong! Tambahkan barang terlebih dahulu.', 'warning');
        return;
      }

      const { grandTotal, budgetEvaluation } = recalculateAll();

      const newReceipt = {
        id: 'receipt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        storeName: String(state.storeName || DEFAULT_STORE),
        shoppingDate: String(state.shoppingDate || DEFAULT_DATE),
        timestamp: Date.now(),
        totalSpent: Number(grandTotal) || 0,
        budgetLimit: Number(state.budgetLimit) || DEFAULT_BUDGET,
        isOverBudget: grandTotal > state.budgetLimit,
        itemCount: state.items.length,
        items: state.items.map(item => ({
          name: String(item.name || ''),
          category: String(item.category || 'Bahan Pokok'),
          unit: String(item.unit || 'pcs'),
          quantity: Number(item.quantity) || 1,
          originalPrice: Number(item.originalPrice) || 0,
          discountInput: String(item.discountInput || ''),
          finalUnitPrice: Number(item.finalUnitPrice) || Number(item.originalPrice) || 0,
          subtotal: Number(item.subtotal) || 0
        }))
      };

      if (!Array.isArray(state.shoppingHistory)) {
        state.shoppingHistory = [];
      }

      state.shoppingHistory.unshift(newReceipt);
      state.lastUpdated = Date.now();
      render(true);

      showToast(`🎉 Struk belanja di ${newReceipt.storeName} (${formatRupiah(grandTotal)}) berhasil dicatat ke Riwayat!`, 'success');

      // Pindahkan langsung ke Tab Riwayat untuk melihat struk
      switchTab('tab-riwayat');
      if (dom.subtabBtnAll) {
        dom.subtabBtnAll.click();
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
      dom.itemNameInput.classList.remove('input-error');
      dom.itemCategorySelect.value = 'Bahan Pokok';
      dom.itemUnitSelect.value = 'karung/5kg';
      dom.itemQtyInput.value = '1';
      dom.itemPriceInput.value = '74,000';
      dom.itemPriceInput.classList.remove('input-error');
      dom.itemDiscountInput.value = '';
      updatePriceHelper();
      updateFormPreview();
      dom.itemNameInput.focus();
    });
  }

  if (dom.btnQuickAddMinyak) {
    dom.btnQuickAddMinyak.addEventListener('click', () => {
      dom.itemNameInput.value = 'Minyak Goreng 2L';
      dom.itemNameInput.classList.remove('input-error');
      dom.itemCategorySelect.value = 'Bahan Pokok';
      dom.itemUnitSelect.value = 'liter';
      dom.itemQtyInput.value = '1';
      dom.itemPriceInput.value = '43,000';
      dom.itemPriceInput.classList.remove('input-error');
      dom.itemDiscountInput.value = '';
      updatePriceHelper();
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

        // Masukkan langsung ke troli belanjaan seketika!
        const existing = state.items.find(i => (i.name || '').toLowerCase() === (name || '').toLowerCase());
        if (existing) {
          existing.quantity += 1;
        } else {
          state.items.push({
            id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name,
            category,
            unit,
            quantity: 1,
            originalPrice: price,
            discountInput: ''
          });
        }

        state.lastUpdated = Date.now();
        render(true);
        switchTab('tab-belanja');
        showToast(`✅ "${name}" (${formatRupiah(price)}) berhasil dimasukkan ke keranjang`, 'success');
      }
    });
  }

  // 10b. Filter Tampilan Riwayat Belanja & Fluktuasi Toko di Tab 2
  const subtabButtons = [dom.subtabBtnAll, dom.subtabBtnHistory, dom.subtabBtnFluctuation].filter(Boolean);
  
  function applyTab2Filter(filterType) {
    subtabButtons.forEach(btn => {
      const match = btn.getAttribute('data-filter') === filterType;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    if (filterType === 'all') {
      if (dom.viewRiwayatBelanja) dom.viewRiwayatBelanja.classList.remove('hidden');
      if (dom.viewFluktuasiToko) dom.viewFluktuasiToko.classList.remove('hidden');
    } else if (filterType === 'history') {
      if (dom.viewRiwayatBelanja) dom.viewRiwayatBelanja.classList.remove('hidden');
      if (dom.viewFluktuasiToko) dom.viewFluktuasiToko.classList.add('hidden');
    } else if (filterType === 'fluctuation') {
      if (dom.viewRiwayatBelanja) dom.viewRiwayatBelanja.classList.add('hidden');
      if (dom.viewFluktuasiToko) dom.viewFluktuasiToko.classList.remove('hidden');
    }
  }

  if (dom.subtabBtnAll) dom.subtabBtnAll.addEventListener('click', () => applyTab2Filter('all'));
  if (dom.subtabBtnHistory) dom.subtabBtnHistory.addEventListener('click', () => applyTab2Filter('history'));
  if (dom.subtabBtnFluctuation) dom.subtabBtnFluctuation.addEventListener('click', () => applyTab2Filter('fluctuation'));

  // 10c. Delegasi Event Kartu Riwayat Belanja (Accordion, Belanja Ulang, Hapus)
  if (dom.shoppingHistoryContainer) {
    dom.shoppingHistoryContainer.addEventListener('click', (e) => {
      // Toggle detail rincian
      const accordionBtn = e.target.closest('.receipt-items-accordion-btn');
      if (accordionBtn) {
        const targetId = accordionBtn.getAttribute('data-target');
        const detailEl = document.getElementById(targetId);
        if (detailEl) {
          const isHidden = detailEl.classList.contains('hidden');
          detailEl.classList.toggle('hidden');
          accordionBtn.innerHTML = isHidden 
            ? '<span>Sembunyikan Rincian</span> ▲' 
            : '<span>Tampilkan Rincian Lengkap</span> ▼';
        }
        return;
      }

      // Tombol Belanja Ulang (Muat kembali ke Troli)
      const reloadBtn = e.target.closest('.btn-receipt-reload');
      if (reloadBtn) {
        const receiptId = reloadBtn.getAttribute('data-id');
        const receipt = (state.shoppingHistory || []).find(r => r.id === receiptId);
        if (receipt && Array.isArray(receipt.items) && receipt.items.length > 0) {
          state.storeName = receipt.storeName || state.storeName;
          state.items = receipt.items.map((i, idx) => ({
            id: 'item_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 5),
            name: i.name,
            category: i.category || 'Bahan Pokok',
            unit: i.unit || 'pcs',
            quantity: Number(i.quantity) || 1,
            originalPrice: Number(i.originalPrice) || Number(i.finalUnitPrice) || 0,
            discountInput: i.discountInput || ''
          }));
          state.lastUpdated = Date.now();
          render(true);
          switchTab('tab-belanja');
          showToast(`🛒 Berhasil memuat ${receipt.items.length} barang dari struk ${receipt.storeName} ke troli!`, 'success');
        } else {
          showToast('⚠️ Data barang pada struk tidak ditemukan.', 'warning');
        }
        return;
      }

      // Tombol Hapus Riwayat
      const delBtn = e.target.closest('.btn-receipt-delete');
      if (delBtn) {
        const receiptId = delBtn.getAttribute('data-id');
        state.shoppingHistory = (state.shoppingHistory || []).filter(r => r.id !== receiptId);
        state.lastUpdated = Date.now();
        render(true);
        showToast('🗑️ Catatan riwayat belanja berhasil dihapus.', 'info');
        return;
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

  // 12. Floating Action Button (FAB) Tambah Barang Mobile
  if (dom.fabAddItem) {
    dom.fabAddItem.addEventListener('click', (e) => {
      switchTab('tab-belanja');
      const nameVal = dom.itemNameInput?.value.trim() || '';
      const priceVal = dom.itemPriceInput?.value.trim() || '';

      // Jika form sudah diisi (ada nama atau harga), langsung eksekusi penambahan ke troli!
      if (nameVal || priceVal) {
        handleAddItem(e);
      } else {
        const formCard = dom.itemForm ? dom.itemForm.closest('.native-card') : null;
        if (formCard) {
          formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          formCard.classList.remove('form-highlight-pulse');
          void formCard.offsetWidth;
          formCard.classList.add('form-highlight-pulse');
        }
        if (dom.itemNameInput) {
          setTimeout(() => dom.itemNameInput.focus(), 250);
        }
        showToast('📝 Form input siap! Ketik nama dan harga barang belanjaan kamu.', 'info');
      }
    });
  }

  // 13. Tombol Ganti Sesi Belanja (Multi-Device Pairing HP & PC)
  if (dom.btnChangeSession) {
    dom.btnChangeSession.addEventListener('click', () => {
      const current = getActiveSessionId();
      const newSession = prompt('Masukkan Kode Sesi Belanja (Gunakan kode yang sama di HP dan PC):', current);
      if (newSession && newSession.trim() && newSession.trim() !== current) {
        const cleanSession = setActiveSessionId(newSession.trim());
        if (dom.currentSessionLabel) dom.currentSessionLabel.textContent = cleanSession;
        
        // Hubungkan ulang listener realtime onSnapshot ke sesi baru
        initFirestoreRealtimeSync(
          cleanSession,
          (cloudState) => {
            state = cloudState;
            render(false);
          },
          (status) => {
            updateSyncStatusBadge(status);
          }
        );

        showToast(`Beralih ke Sesi Cloud: "${cleanSession}"`, 'info');
      }
    });
  }

  // 14. Klik Badge Status Sync untuk informasi detail
  if (dom.cloudSyncBadge) {
    dom.cloudSyncBadge.addEventListener('click', () => {
      showToast(`${currentSyncStatus.label}: ${currentSyncStatus.details || 'Realtime multi-device aktif'}`, 'info');
    });
  }

  // 15. Sinkronisasi Antar-Tab Lokal (BroadcastChannel)
  initLocalSync((updatedState) => {
    state = updatedState;
    render(false);
  });

  // 16. Event Handler Auth Screen (KeranjangPintar Login & Daftar Akun)
  // Toggle Switch Tab Masuk / Daftar Akun
  if (dom.tabBtnMasuk && dom.tabBtnDaftar) {
    dom.tabBtnMasuk.addEventListener('click', () => {
      dom.tabBtnMasuk.classList.add('active');
      dom.tabBtnMasuk.setAttribute('aria-selected', 'true');
      dom.tabBtnDaftar.classList.remove('active');
      dom.tabBtnDaftar.setAttribute('aria-selected', 'false');
      if (dom.formAuthLogin) dom.formAuthLogin.classList.remove('hidden');
      if (dom.formAuthDaftar) dom.formAuthDaftar.classList.add('hidden');
    });

    dom.tabBtnDaftar.addEventListener('click', () => {
      dom.tabBtnDaftar.classList.add('active');
      dom.tabBtnDaftar.setAttribute('aria-selected', 'true');
      dom.tabBtnMasuk.classList.remove('active');
      dom.tabBtnMasuk.setAttribute('aria-selected', 'false');
      if (dom.formAuthDaftar) dom.formAuthDaftar.classList.remove('hidden');
      if (dom.formAuthLogin) dom.formAuthLogin.classList.add('hidden');
    });
  }

  // Toggle Visibility Password
  if (dom.btnToggleLoginPass && dom.loginPassword) {
    dom.btnToggleLoginPass.addEventListener('click', () => {
      const isPass = dom.loginPassword.getAttribute('type') === 'password';
      dom.loginPassword.setAttribute('type', isPass ? 'text' : 'password');
    });
  }

  if (dom.btnToggleRegPass && dom.regPassword) {
    dom.btnToggleRegPass.addEventListener('click', () => {
      const isPass = dom.regPassword.getAttribute('type') === 'password';
      dom.regPassword.setAttribute('type', isPass ? 'text' : 'password');
    });
  }

  // Link Lupa Password
  if (dom.linkForgotPass) {
    dom.linkForgotPass.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('💡 Masukkan Gmail kamu atau gunakan "Lanjutkan dengan Google" untuk login langsung.', 'info');
    });
  }

  // Submit Form Masuk (Login)
  if (dom.formAuthLogin) {
    dom.formAuthLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = dom.loginUsername?.value.trim() || '';
      const password = dom.loginPassword?.value || '';

      if (!username) {
        showToast('⚠️ Harap masukkan Gmail, email, atau username kamu!', 'warning');
        dom.loginUsername?.focus();
        return;
      }
      if (!password) {
        showToast('⚠️ Harap masukkan password akun kamu!', 'warning');
        dom.loginPassword?.focus();
        return;
      }

      const cleanEmail = username.includes('@') ? username.toLowerCase() : `${username.toLowerCase()}@gmail.com`;
      const userObj = {
        uid: 'user_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
        name: username.split('@')[0],
        email: cleanEmail,
        photoURL: ''
      };

      applyUserLogin(userObj);
      showToast(`✅ Berhasil masuk! Selamat berbelanja, ${userObj.name}.`, 'success');
    });
  }

  // Submit Form Daftar Akun (Sign Up)
  if (dom.formAuthDaftar) {
    dom.formAuthDaftar.addEventListener('submit', (e) => {
      e.preventDefault();
      const fullname = dom.regFullname?.value.trim() || '';
      const username = dom.regUsername?.value.trim() || '';
      const password = dom.regPassword?.value || '';

      if (!fullname) {
        showToast('⚠️ Harap masukkan nama user / lengkap kamu!', 'warning');
        dom.regFullname?.focus();
        return;
      }
      if (!username) {
        showToast('⚠️ Harap masukkan alamat Gmail / email kamu!', 'warning');
        dom.regUsername?.focus();
        return;
      }
      if (!password || password.length < 4) {
        showToast('⚠️ Password minimal 4 karakter!', 'warning');
        dom.regPassword?.focus();
        return;
      }

      const cleanEmail = username.includes('@') ? username.toLowerCase() : `${username.toLowerCase()}@gmail.com`;
      const userObj = {
        uid: 'user_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
        name: fullname,
        email: cleanEmail,
        photoURL: ''
      };

      applyUserLogin(userObj);
      showToast(`🎉 Akun berhasil terdaftar! Selamat datang, ${fullname}.`, 'success');
    });
  }

  // Tombol Lanjutkan dengan Google di Form Auth
  if (dom.btnAuthGoogleLogin) {
    dom.btnAuthGoogleLogin.addEventListener('click', handleGoogleLogin);
  }
  if (dom.btnAuthGoogleRegister) {
    dom.btnAuthGoogleRegister.addEventListener('click', handleGoogleLogin);
  }

  // Tombol Lewati / Tamu (Mode Kasus Rian)
  if (dom.btnAuthSkipGuest) {
    dom.btnAuthSkipGuest.addEventListener('click', () => {
      if (dom.authScreen) dom.authScreen.classList.add('hidden');
      if (dom.mainAppContent) dom.mainAppContent.classList.remove('hidden');
      if (dom.headerUserBadge) dom.headerUserBadge.classList.remove('hidden');
      if (dom.headerUserName) dom.headerUserName.textContent = 'Mode Tamu';
      showToast('Masuk dalam mode Tamu (Kasus Belanja Rian)', 'info');
    });
  }

  // Tombol Keluar / Logout di Header Homepage
  if (dom.btnHeaderLogout) {
    dom.btnHeaderLogout.addEventListener('click', handleGoogleLogout);
  }
}

/**
 * Memperbarui tampilan komponen UI status login pengguna
 * - Jika login: Sembunyikan Auth Screen, Tampilkan Homepage, Tampilkan User Badge di Header
 * - Jika logout: Tampilkan Auth Screen, Sembunyikan Homepage
 */
function updateAuthUI(userInfo) {
  if (userInfo && (userInfo.email || userInfo.name)) {
    // Pengguna sudah login: Buka Homepage Utama
    if (dom.authScreen) dom.authScreen.classList.add('hidden');
    if (dom.mainAppContent) dom.mainAppContent.classList.remove('hidden');

    if (dom.headerUserBadge) dom.headerUserBadge.classList.remove('hidden');
    if (dom.headerUserName) dom.headerUserName.textContent = userInfo.name || userInfo.email;
  } else {
    // Pengguna belum login: Tampilkan Layar Auth GroceryTracker
    if (dom.authScreen) dom.authScreen.classList.remove('hidden');
    if (dom.mainAppContent) dom.mainAppContent.classList.add('hidden');

    if (dom.headerUserBadge) dom.headerUserBadge.classList.add('hidden');
  }
}

/**
 * Menerapkan data login pengguna dan mengalihkan sesi sinkronisasi realtime
 */
function applyUserLogin(user) {
  if (!user) return;

  const email = (user.email || 'user@gmail.com').toLowerCase();
  const name = user.displayName || email.split('@')[0];
  const photo = user.photoURL || '';
  const uid = user.uid || ('usr_' + email.replace(/[^a-zA-Z0-9]/g, '_'));

  // Kode sesi konsisten di HP & PC yang terikat ke akun ini
  const cleanSession = 'user_' + email.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  const userInfo = { uid, name, email, photo, cleanSession };
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('sgt_auth_user', JSON.stringify(userInfo));
  }

  updateAuthUI(userInfo);

  // Switch ke Sesi Akun Pengguna & Sambungkan Sinkronisasi Realtime
  setActiveSessionId(cleanSession);
  if (dom.currentSessionLabel) {
    dom.currentSessionLabel.textContent = email;
  }

  initFirestoreRealtimeSync(
    cleanSession,
    (cloudState) => {
      state = cloudState;
      render(false);
    },
    (status) => {
      updateSyncStatusBadge(status);
    }
  );
}

/**
 * Menangani proses login dengan Akun Google (Gmail)
 */
async function handleGoogleLogin() {
  showToast('Menghubungkan ke Akun Google...', 'info');

  try {
    if (!auth) throw new Error('Firebase Auth belum diinisialisasi');
    const result = await signInWithPopup(auth, googleProvider);
    if (result && result.user) {
      applyUserLogin(result.user);
      showToast(`✅ Berhasil masuk sebagai ${result.user.displayName || result.user.email}!`, 'success');
      return;
    }
  } catch (error) {
    console.warn('Google Popup Login note:', error);

    // Jika Google Auth belum diaktifkan di Firebase Console atau popup dibatasi browser:
    const chosenEmail = await showQuickGmailModal();
    if (chosenEmail) {
      const mockUser = {
        uid: 'gmail_' + chosenEmail.replace(/[^a-zA-Z0-9]/g, '_'),
        displayName: chosenEmail.split('@')[0],
        email: chosenEmail,
        photoURL: ''
      };
      applyUserLogin(mockUser);
      showToast(`✅ Berhasil masuk dengan akun ${chosenEmail}! Sesi belanja tersinkron di HP & PC.`, 'success');
    }
  }
}

/**
 * Menangani proses keluar dari akun
 */
async function handleGoogleLogout() {
  try {
    if (auth && typeof signOut === 'function') {
      await signOut(auth);
    }
  } catch (e) {}

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('sgt_auth_user');
  }

  updateAuthUI(null);

  // Kembalikan ke sesi default
  setActiveSessionId(DEFAULT_SESSION_ID);
  if (dom.currentSessionLabel) {
    dom.currentSessionLabel.textContent = DEFAULT_SESSION_ID;
  }

  initFirestoreRealtimeSync(
    DEFAULT_SESSION_ID,
    (cloudState) => {
      state = cloudState;
      render(false);
    },
    (status) => {
      updateSyncStatusBadge(status);
    }
  );

  showToast('Anda telah keluar dari akun.', 'info');
}

/**
 * Bootstrapping Aplikasi Smart Grocery Tracker PWA
 */
function init() {
  initDomReferences();
  state = loadState();
  populateDropdownOptions();
  bindEventListeners();
  render(false); // Render lokal awal tanpa delay

  // Inisialisasi Akun Pengguna & Sinkronisasi Realtime
  let activeSessionId = getActiveSessionId();

  // 1. Pulihkan sesi login pengguna jika tersimpan di localStorage
  let hasRestoredUser = false;
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedUserJson = window.localStorage.getItem('sgt_auth_user');
    if (savedUserJson) {
      try {
        const savedUser = JSON.parse(savedUserJson);
        if (savedUser && savedUser.email) {
          hasRestoredUser = true;
          applyUserLogin(savedUser);
          activeSessionId = savedUser.cleanSession || getActiveSessionId();
        }
      } catch (e) {}
    }
  }

  // 2. Hubungkan listener Firebase Auth State
  if (auth && typeof onAuthStateChanged === 'function') {
    onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        applyUserLogin(firebaseUser);
      }
    });
  }

  if (!hasRestoredUser) {
    // Tampilkan Layar Login KeranjangPintar sebelum masuk ke Homepage
    updateAuthUI(null);

    if (dom.currentSessionLabel) {
      dom.currentSessionLabel.textContent = activeSessionId;
    }

    initFirestoreRealtimeSync(
      activeSessionId,
      (cloudState) => {
        // Data real-time tiba dari HP / PC lain via onSnapshot()!
        state = cloudState;
        render(false); // Render update tanpa push balik secara mulus tanpa notifikasi popup
      },
      (status) => {
        updateSyncStatusBadge(status);
      }
    );
  }

  // Daftarkan Service Worker PWA
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

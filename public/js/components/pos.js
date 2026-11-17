/**
 * BizBook Point of Sale (POS) & Checkout Engine
 * Mobile-First Optimized POS Workstation
 */

let posProducts = [];
let posCategories = [];
let posCustomers = [];
let posSelectedCategory = null;
let posMobileTab = 'catalog'; // 'catalog' or 'cart'
let posSearchTerm = '';
let isAddingToCart = false;
let isProcessingCheckout = false;

async function renderPOS() {
  document.body.classList.add('pos-mode-active');
  const container = document.getElementById('app-view');
  const titleHeading = document.getElementById('page-title-heading');
  if (titleHeading) titleHeading.textContent = 'Point of Sale (POS)';

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #0A58CA; font-weight: 700;">
      <div class="pos-loading-spinner" style="margin: 0 auto 16px;"></div>
      Loading POS register & product catalog...
    </div>
  `;

  try {
    const [prodData, catData, custData] = await Promise.all([
      API.get('/products?limit=200'),
      API.get('/categories'),
      API.get('/customers?limit=100')
    ]);

    posProducts = prodData.products || [];
    posCategories = catData.categories || [];
    posCustomers = custData.customers || [];

    // Ensure walk-in customer is default if no customer selected
    if (!State.cart.customerId && posCustomers.length > 0) {
      const defaultCust = posCustomers.find(c => c.is_default) || posCustomers[0];
      State.cart.customerId = defaultCust.id;
    }

    renderPOSLayout();
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <p style="color: var(--color-danger); font-weight: 700; margin-bottom: 12px;">Failed to initialize POS: ${err.message}</p>
        <button class="btn btn-primary" onclick="renderPOS()">Retry</button>
      </div>
    `;
  }
}

function setPOSMobileTab(tab) {
  posMobileTab = tab;
  const layout = document.querySelector('.pos-layout');
  if (layout) {
    if (tab === 'catalog') {
      layout.classList.add('view-catalog');
      layout.classList.remove('view-cart');
    } else {
      layout.classList.add('view-cart');
      layout.classList.remove('view-catalog');
    }
  }

  // Update tab buttons
  document.querySelectorAll('.pos-mobile-tab-btn').forEach((btn, idx) => {
    if ((idx === 0 && tab === 'catalog') || (idx === 1 && tab === 'cart')) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update floating bar visibility
  const floatingBar = document.getElementById('pos-mobile-floating-bar');
  const cartItemCount = State.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  if (floatingBar) {
    floatingBar.style.display = (window.innerWidth <= 768 && cartItemCount > 0 && tab === 'catalog') ? 'flex' : 'none';
  }
}

function renderPOSLayout() {
  const container = document.getElementById('app-view');
  const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';
  const cartItemCount = State.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = getCartTotal();

  container.innerHTML = `
    <!-- Mobile POS Top Navigation Bar (visible <= 768px) -->
    <div class="pos-mobile-header-bar">
      <div class="pos-mobile-brand-box">
        <button type="button" class="pos-mobile-icon-btn" onclick="toggleMobileSidebar()" aria-label="Open Navigation Menu" title="Menu">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2.2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div class="pos-mobile-titles">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="pos-mobile-title">Point of Sale</span>
          </div>
          <span class="pos-mobile-sub" id="pos-header-summary">
            ${cartItemCount > 0 ? `${cartItemCount} ${cartItemCount === 1 ? 'item' : 'items'} • ${formatCurrency(cartTotal, cur)}` : 'Cart is empty'}
          </span>
        </div>
      </div>
      <div class="pos-mobile-header-actions">
        <button type="button" class="btn btn-outline-primary btn-sm pos-btn-new-sale" onclick="confirmNewSale()" title="Start New Sale">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>New Sale</span>
        </button>
      </div>
    </div>

    <!-- Mobile Segmented Navigation Switcher (visible <= 768px) -->
    <div class="pos-mobile-nav">
      <button type="button" class="pos-mobile-tab-btn ${posMobileTab === 'catalog' ? 'active' : ''}" onclick="setPOSMobileTab('catalog')">
        <svg viewBox="0 0 24 24" style="width: 17px; height: 17px; stroke: currentColor; fill: none; stroke-width: 2;">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
        <span>Products (${posProducts.length})</span>
      </button>
      <button type="button" class="pos-mobile-tab-btn ${posMobileTab === 'cart' ? 'active' : ''}" onclick="setPOSMobileTab('cart')">
        <svg viewBox="0 0 24 24" style="width: 17px; height: 17px; stroke: currentColor; fill: none; stroke-width: 2;">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <span>Order (<strong id="pos-mobile-order-badge">${cartItemCount}</strong>)</span>
        <span class="pos-mobile-cart-badge" id="pos-mobile-order-total">${formatCurrency(cartTotal, cur)}</span>
      </button>
    </div>

    <div class="pos-layout ${posMobileTab === 'catalog' ? 'view-catalog' : 'view-cart'}">
      <!-- Left Column: Catalog & Products Section -->
      <div class="pos-catalog-section">
        <!-- Search & Filter Controls -->
        <div class="pos-catalog-header">
          <div class="search-box" style="flex: 1; position: relative;">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="pos-search-input" class="form-control search-input" placeholder="Search product name, SKU, or barcode..." oninput="handlePOSSearch(this.value)" value="${posSearchTerm}">
            <button type="button" id="pos-search-clear" class="pos-search-clear-btn" onclick="clearPOSSearch()" title="Clear search" style="display: ${posSearchTerm ? 'flex' : 'none'};">
              &times;
            </button>
            <button type="button" class="pos-search-barcode-btn" onclick="openBarcodeScannerPrompt()" title="Scan or enter barcode">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2">
                <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14"></path>
              </svg>
            </button>
          </div>
          <button class="btn btn-secondary pos-add-prod-btn" style="white-space: nowrap;" onclick="showAddProductModal()">
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>+ Add Product</span>
          </button>
        </div>

        <!-- Category Horizontal Pills -->
        <div class="category-pill-row">
          <div class="cat-pill ${posSelectedCategory === null ? 'active' : ''}" data-cat-id="all" onclick="filterPOSCategory(null)">
            All Products (${posProducts.length})
          </div>
          ${posCategories.map(c => `
            <div class="cat-pill ${posSelectedCategory === c.id ? 'active' : ''}" data-cat-id="${c.id}" onclick="filterPOSCategory(${c.id})">
              ${c.name}
            </div>
          `).join('')}
        </div>

        <!-- Product Grid -->
        <div class="pos-product-grid" id="pos-product-grid">
          ${renderPOSProductCards(getFilteredProducts())}
        </div>
      </div>

      <!-- Right Column: Cart & Checkout Panel -->
      <div class="pos-cart-panel">
        <div class="pos-cart-header" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn btn-secondary btn-sm pos-back-btn" onclick="setPOSMobileTab('catalog')" title="Back to Products Catalog">
              &larr; Products
            </button>
            <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--navy-dark); margin: 0;">Current Order</h2>
          </div>
          <button class="btn btn-outline-danger btn-sm pos-clear-cart-btn" onclick="confirmClearCart()" title="Empty shopping cart">Clear Cart</button>
        </div>

        <!-- Customer Selector -->
        <div class="pos-cart-customer">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label class="form-label" style="font-size: 0.78rem; font-weight: 700; margin: 0;">Customer</label>
            <span style="font-size: 0.72rem; color: var(--text-muted);">Default: Walk-in</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <select class="form-control pos-customer-select" style="font-size: 0.85rem; flex: 1;" onchange="State.cart.customerId = this.value; updateCartView();">
              ${posCustomers.map(c => `
                <option value="${c.id}" ${State.cart.customerId == c.id ? 'selected' : ''}>
                  ${c.name} ${c.outstanding_balance > 0 ? `(Owes ${formatCurrency(c.outstanding_balance, cur)})` : ''}
                </option>
              `).join('')}
            </select>
            <button class="btn btn-secondary btn-sm pos-new-customer-btn" onclick="showAddCustomerModal()" title="Register New Customer">+ New</button>
          </div>
        </div>

        <!-- Cart Items List -->
        <div class="cart-items-list" id="pos-cart-items">
          ${renderCartItems(cur)}
        </div>

        <!-- Mobile Return to Catalog Button (visible inside cart view) -->
        <div class="pos-continue-shopping-bar">
          <button type="button" class="btn btn-secondary btn-block btn-sm" onclick="setPOSMobileTab('catalog')">
            &larr; Continue Shopping / Add More Items
          </button>
        </div>

        <!-- Cart Totals & Checkout -->
        <div class="cart-summary">
          <div class="cart-summary-row">
            <span>Subtotal</span>
            <span id="pos-subtotal" style="font-weight: 700;">${formatCurrency(getCartSubtotal(), cur)}</span>
          </div>
          <div class="cart-summary-row">
            <span>Discount</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.8rem; color: var(--text-muted);">${cur}</span>
              <input type="number" min="0" value="${State.cart.discount || 0}" style="width: 85px; text-align: right; padding: 4px 6px; border: 1px solid var(--border-color); border-radius: 4px; font-weight: 600;" onchange="updateCartDiscount(this.value)">
            </div>
          </div>
          <div class="cart-summary-row total">
            <span>Total to Pay</span>
            <span id="pos-total">${formatCurrency(getCartTotal(), cur)}</span>
          </div>

          <!-- Payment Options Grid -->
          <div style="margin: 10px 0;">
            <label class="form-label" style="font-size: 0.78rem; font-weight: 700; margin-bottom: 5px;">Payment Method</label>
            <div class="payment-method-grid">
              <button type="button" class="btn btn-sm pos-payment-card ${State.cart.paymentMethod === 'cash' ? 'btn-primary active' : 'btn-secondary'}" onclick="setPaymentMethod('cash')">
                <span class="pos-pay-icon">💵</span>
                <span>Cash</span>
              </button>
              <button type="button" class="btn btn-sm pos-payment-card ${State.cart.paymentMethod === 'pos' ? 'btn-primary active' : 'btn-secondary'}" onclick="setPaymentMethod('pos')">
                <span class="pos-pay-icon">💳</span>
                <span>POS Terminal</span>
              </button>
              <button type="button" class="btn btn-sm pos-payment-card ${State.cart.paymentMethod === 'bank_transfer' ? 'btn-primary active' : 'btn-secondary'}" onclick="setPaymentMethod('bank_transfer')">
                <span class="pos-pay-icon">🏦</span>
                <span>Bank Transfer</span>
              </button>
              <button type="button" class="btn btn-sm pos-payment-card ${State.cart.paymentMethod === 'credit' ? 'btn-primary active' : 'btn-secondary'}" onclick="setPaymentMethod('credit')">
                <span class="pos-pay-icon">⏳</span>
                <span>Credit / Unpaid</span>
              </button>
            </div>
          </div>

          <!-- Amount Paid & Live Change Indicator -->
          <div class="pos-paid-wrapper" style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <label class="form-label" style="font-size: 0.78rem; font-weight: 700; margin: 0;">Amount Paid Now</label>
              <a href="javascript:void(0)" class="pos-pay-full-link" onclick="setFullPayment()">Pay Full</a>
            </div>
            <input type="number" id="pos-paid-input" class="form-control pos-paid-input" inputmode="decimal" value="${State.cart.paidAmount !== undefined ? State.cart.paidAmount : getCartTotal()}" oninput="handlePaidAmountInput(this.value)">
            <!-- Live Change / Balance Badge -->
            <div id="pos-change-balance-indicator" class="pos-calc-badge full">
              <span>✓ Paid in full</span>
            </div>
          </div>

          <button id="pos-checkout-btn" class="btn btn-primary btn-block pos-checkout-btn" onclick="processCheckout()">
            Complete Sale & Print Receipt
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Floating Order Bar (visible on mobile catalog tab when items present) -->
    <div id="pos-mobile-floating-bar" class="pos-mobile-floating-bar" style="display: ${(window.innerWidth <= 768 && cartItemCount > 0 && posMobileTab === 'catalog') ? 'flex' : 'none'};" onclick="setPOSMobileTab('cart')">
      <div class="pos-floating-left">
        <span class="pos-floating-badge" id="pos-float-count">${cartItemCount} ${cartItemCount === 1 ? 'item' : 'items'}</span>
        <span class="pos-floating-total" id="pos-float-total">${formatCurrency(cartTotal, cur)}</span>
      </div>
      <div class="pos-floating-right">
        <span>Review Order & Pay</span>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </div>
    </div>
  `;

  updateLiveChangeBalance();
}

function getFilteredProducts() {
  const q = posSearchTerm.toLowerCase().trim();
  return posProducts.filter(p => {
    const matchesQuery = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));
    const matchesCategory = posSelectedCategory === null || p.category_id === posSelectedCategory;
    return matchesQuery && matchesCategory;
  });
}

function renderPOSProductCards(products) {
  const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';
  if (products.length === 0) {
    return `
      <div class="pos-empty-state" style="grid-column: 1 / -1; text-align: center; padding: 36px 16px; background: #FFFFFF; border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
        <div style="font-size: 2.2rem; margin-bottom: 8px;">🔍</div>
        <h3 style="font-size: 1rem; font-weight: 800; color: var(--navy-dark); margin-bottom: 6px;">No products match your search</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 14px;">Try searching with another name, SKU, or clear your category filter.</p>
        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm" onclick="clearPOSSearch(); filterPOSCategory(null);">Clear All Filters</button>
          <button class="btn btn-primary btn-sm" onclick="showAddProductModal()">+ Add New Product</button>
        </div>
      </div>
    `;
  }

  return products.map(p => {
    const inCartItem = State.cart.items.find(i => i.productId === p.id);
    const inCartQty = inCartItem ? inCartItem.quantity : 0;
    const isOutOfStock = p.current_stock <= 0;
    const isLowStock = !isOutOfStock && p.current_stock <= p.reorder_level;

    return `
      <div class="pos-product-card ${inCartQty > 0 ? 'in-cart-active' : ''}" onclick="addToCart(${p.id})">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; margin-bottom: 4px;">
            <div class="pos-product-name" title="${p.name}">${p.name}</div>
            ${inCartQty > 0 ? `<span class="pos-card-incart-badge">${inCartQty} in cart</span>` : ''}
          </div>
          <div class="pos-product-stock">
            ${isOutOfStock 
              ? `<span class="stock-badge out-of-stock">Out of stock</span>` 
              : isLowStock 
              ? `<span class="stock-badge low-stock">Low: ${p.current_stock} ${p.unit}</span>` 
              : `<span class="stock-badge in-stock">Stock: ${p.current_stock} ${p.unit}</span>`
            }
          </div>
        </div>
        <div class="pos-product-bottom-row" style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 4px;">
          <span class="pos-product-price">${formatCurrency(p.selling_price, cur)}</span>
          <button type="button" class="btn btn-primary btn-sm pos-card-add-btn" onclick="event.stopPropagation(); addToCart(${p.id})" title="Add to Order" ${isOutOfStock && !State.currentBusiness.allowNegativeStock ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Add</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderCartItems(cur) {
  if (State.cart.items.length === 0) {
    return `
      <div class="pos-cart-empty-box" style="text-align: center; padding: 40px 14px; color: var(--text-muted); font-size: 0.88rem;">
        <div style="font-size: 2.5rem; margin-bottom: 8px;">🛒</div>
        <div style="font-weight: 750; color: var(--navy-dark); font-size: 0.95rem; margin-bottom: 4px;">Your order is empty</div>
        <p style="margin-bottom: 14px; font-size: 0.82rem;">Tap any product in the catalog to add it to this sale.</p>
        <button class="btn btn-secondary btn-sm" onclick="setPOSMobileTab('catalog')">
          Browse Products Catalog
        </button>
      </div>
    `;
  }

  return State.cart.items.map(item => `
    <div class="cart-item-row">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.productName}</div>
        <div class="cart-item-sub">${formatCurrency(item.unitPrice, cur)} each</div>
      </div>
      <div class="cart-qty-ctrl">
        <button type="button" class="cart-qty-btn" onclick="updateItemQty(${item.productId}, -1)" title="Decrease quantity" aria-label="Decrease quantity">-</button>
        <span class="cart-qty-num">${item.quantity}</span>
        <button type="button" class="cart-qty-btn" onclick="updateItemQty(${item.productId}, 1)" title="Increase quantity" aria-label="Increase quantity">+</button>
        <button type="button" class="cart-item-delete-btn" onclick="removeItemFromCart(${item.productId})" title="Remove item" aria-label="Remove item">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
      <div class="cart-item-total">${formatCurrency(item.quantity * item.unitPrice, cur)}</div>
    </div>
  `).join('');
}

function addToCart(productId) {
  if (isAddingToCart) return;
  isAddingToCart = true;
  setTimeout(() => { isAddingToCart = false; }, 180);

  const product = posProducts.find(p => p.id === productId);
  if (!product) return;

  const existing = State.cart.items.find(i => i.productId === productId);
  if (existing) {
    if (existing.quantity + 1 > product.current_stock && !State.currentBusiness.allowNegativeStock) {
      showToast(`Cannot exceed available stock (${product.current_stock} ${product.unit})`, 'warning');
      return;
    }
    existing.quantity++;
  } else {
    if (product.current_stock <= 0 && !State.currentBusiness.allowNegativeStock) {
      showToast(`"${product.name}" is currently out of stock!`, 'warning');
      return;
    }
    State.cart.items.push({
      productId: product.id,
      productName: product.name,
      unitPrice: product.selling_price,
      quantity: 1
    });
  }

  updateCartView();
}

function updateItemQty(productId, change) {
  const item = State.cart.items.find(i => i.productId === productId);
  if (!item) return;

  const product = posProducts.find(p => p.id === productId);
  const newQty = item.quantity + change;

  if (newQty <= 0) {
    removeItemFromCart(productId);
  } else {
    if (product && newQty > product.current_stock && !State.currentBusiness.allowNegativeStock) {
      showToast(`Cannot exceed available stock (${product.current_stock} ${product.unit})`, 'warning');
      return;
    }
    item.quantity = newQty;
    updateCartView();
  }
}

function removeItemFromCart(productId) {
  State.cart.items = State.cart.items.filter(i => i.productId !== productId);
  updateCartView();
}

function clearCart() {
  State.cart.items = [];
  State.cart.discount = 0;
  State.cart.paidAmount = 0;
  updateCartView();
}

function confirmClearCart() {
  if (State.cart.items.length === 0) return;
  openModal(
    'Clear Current Order?',
    '<p style="color: #64748B; font-size: 0.95rem; margin-bottom: 4px;">Are you sure you want to remove all items from this order?</p>',
    `<button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
     <button class="btn btn-danger btn-sm" onclick="closeModal(); clearCart(); showToast('Order cleared.', 'info');">Clear Order</button>`
  );
}

function confirmNewSale() {
  if (State.cart.items.length > 0) {
    const count = State.cart.items.reduce((s, i) => s + i.quantity, 0);
    openModal(
      'Start New Sale?',
      `<p style="color: #64748B; font-size: 0.92rem; margin-bottom: 8px;">
        You have <strong>${count} items</strong> in your current order. Starting a new sale will clear your current cart.
      </p>
      <p style="font-weight: 700; color: #0A2540;">Do you wish to start fresh?</p>`,
      `<button class="btn btn-secondary btn-sm" onclick="closeModal()">Keep Current</button>
       <button class="btn btn-primary btn-sm" onclick="closeModal(); clearCart(); setPOSMobileTab('catalog'); showToast('Started new sale.', 'info');">Start New Sale</button>`
    );
  } else {
    setPOSMobileTab('catalog');
    showToast('Ready for new sale.', 'info');
  }
}

function getCartSubtotal() {
  return State.cart.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
}

function getCartTotal() {
  const sub = getCartSubtotal();
  const disc = Number(State.cart.discount) || 0;
  return Math.max(0, sub - disc);
}

function updateCartDiscount(val) {
  State.cart.discount = Math.max(0, Number(val) || 0);
  updateCartView();
}

function setPaymentMethod(method) {
  State.cart.paymentMethod = method;
  if (method === 'credit') {
    State.cart.paidAmount = 0;
  } else {
    State.cart.paidAmount = getCartTotal();
  }
  renderPOSLayout();
}

function setFullPayment() {
  State.cart.paidAmount = getCartTotal();
  const input = document.getElementById('pos-paid-input');
  if (input) input.value = State.cart.paidAmount;
  updateLiveChangeBalance();
}

function handlePaidAmountInput(val) {
  State.cart.paidAmount = Number(val);
  updateLiveChangeBalance();
}

function updateLiveChangeBalance() {
  const total = getCartTotal();
  const paid = State.cart.paidAmount !== undefined ? Number(State.cart.paidAmount) : total;
  const diff = paid - total;
  const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';
  const ind = document.getElementById('pos-change-balance-indicator');
  if (!ind) return;

  if (State.cart.paymentMethod === 'credit') {
    ind.className = 'pos-calc-badge debt';
    ind.innerHTML = `<span>Balance due / Debt:</span> <strong>${formatCurrency(total, cur)}</strong>`;
  } else if (diff > 0) {
    ind.className = 'pos-calc-badge change';
    ind.innerHTML = `<span>Change to return:</span> <strong>${formatCurrency(diff, cur)}</strong>`;
  } else if (diff < 0) {
    ind.className = 'pos-calc-badge debt';
    ind.innerHTML = `<span>Balance remaining:</span> <strong>${formatCurrency(Math.abs(diff), cur)}</strong>`;
  } else {
    ind.className = 'pos-calc-badge full';
    ind.innerHTML = `<span>✓ Exact amount paid in full</span>`;
  }
}

function updateCartView() {
  const cur = (State.currentBusiness && State.currentBusiness.currency_symbol) || '₦';
  const cartList = document.getElementById('pos-cart-items');
  const subtotalEl = document.getElementById('pos-subtotal');
  const totalEl = document.getElementById('pos-total');
  const paidInput = document.getElementById('pos-paid-input');
  const headerSummary = document.getElementById('pos-header-summary');

  const cartTotal = getCartTotal();
  const cartItemCount = State.cart.items.reduce((sum, item) => sum + item.quantity, 0);

  if (cartList) cartList.innerHTML = renderCartItems(cur);
  if (subtotalEl) subtotalEl.textContent = formatCurrency(getCartSubtotal(), cur);
  if (totalEl) totalEl.textContent = formatCurrency(cartTotal, cur);

  // Update header summary text
  if (headerSummary) {
    headerSummary.textContent = cartItemCount > 0 
      ? `${cartItemCount} ${cartItemCount === 1 ? 'item' : 'items'} • ${formatCurrency(cartTotal, cur)}` 
      : 'Cart is empty';
  }

  // Default paid amount to total if previously matched or credit not chosen
  if (State.cart.paymentMethod !== 'credit' && paidInput) {
    State.cart.paidAmount = cartTotal;
    paidInput.value = State.cart.paidAmount;
  }

  // Update live change/balance badge
  updateLiveChangeBalance();

  // Update mobile tab indicators
  const mobileOrderBadge = document.getElementById('pos-mobile-order-badge');
  if (mobileOrderBadge) mobileOrderBadge.textContent = cartItemCount;

  const mobileOrderTotal = document.getElementById('pos-mobile-order-total');
  if (mobileOrderTotal) mobileOrderTotal.textContent = formatCurrency(cartTotal, cur);

  // Update mobile floating bar
  const floatingBar = document.getElementById('pos-mobile-floating-bar');
  if (floatingBar) {
    floatingBar.style.display = (window.innerWidth <= 768 && cartItemCount > 0 && posMobileTab === 'catalog') ? 'flex' : 'none';
    const floatCount = document.getElementById('pos-float-count');
    if (floatCount) floatCount.textContent = `${cartItemCount} ${cartItemCount === 1 ? 'item' : 'items'}`;
    const floatTotal = document.getElementById('pos-float-total');
    if (floatTotal) floatTotal.textContent = formatCurrency(cartTotal, cur);
  }

  // Refresh in-cart badges on product grid without resetting entire DOM if present
  const grid = document.getElementById('pos-product-grid');
  if (grid) grid.innerHTML = renderPOSProductCards(getFilteredProducts());
}

function filterPOSCategory(catId) {
  posSelectedCategory = catId;
  const grid = document.getElementById('pos-product-grid');
  if (grid) grid.innerHTML = renderPOSProductCards(getFilteredProducts());

  // Update pills active class using data-cat-id
  document.querySelectorAll('.cat-pill').forEach(el => {
    const id = el.getAttribute('data-cat-id');
    if ((catId === null && id === 'all') || String(id) === String(catId)) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

function handlePOSSearch(term) {
  posSearchTerm = term;
  const clearBtn = document.getElementById('pos-search-clear');
  if (clearBtn) clearBtn.style.display = term ? 'flex' : 'none';

  const grid = document.getElementById('pos-product-grid');
  if (grid) grid.innerHTML = renderPOSProductCards(getFilteredProducts());
}

function clearPOSSearch() {
  posSearchTerm = '';
  const input = document.getElementById('pos-search-input');
  if (input) {
    input.value = '';
    input.focus();
  }
  const clearBtn = document.getElementById('pos-search-clear');
  if (clearBtn) clearBtn.style.display = 'none';

  const grid = document.getElementById('pos-product-grid');
  if (grid) grid.innerHTML = renderPOSProductCards(getFilteredProducts());
}

function openBarcodeScannerPrompt() {
  openModal(
    'Barcode Quick Scan',
    `
      <div style="text-align: center; padding: 12px 6px;">
        <div style="width: 54px; height: 54px; background: #EBF3FC; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
          <svg viewBox="0 0 24 24" width="30" height="30" stroke="#0A58CA" fill="none" stroke-width="2">
            <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14"></path>
          </svg>
        </div>
        <h4 style="font-weight: 800; font-size: 1.05rem; margin-bottom: 6px; color: var(--navy-dark);">Scan or Type Barcode</h4>
        <p style="font-size: 0.85rem; color: #64748B; margin-bottom: 14px;">Use a barcode scanner or enter the product barcode or SKU number below:</p>
        <input type="text" id="barcode-scan-input" class="form-control" placeholder="e.g. 890123456789 or SKU-101" autofocus style="font-size: 1.05rem; text-align: center; font-weight: 700; letter-spacing: 1px; padding: 10px;">
      </div>
    `,
    `
      <button class="btn btn-secondary btn-sm" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="handleBarcodeSubmit()">Find & Add Product</button>
    `
  );

  setTimeout(() => {
    const input = document.getElementById('barcode-scan-input');
    if (input) {
      input.focus();
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleBarcodeSubmit();
      });
    }
  }, 100);
}

function handleBarcodeSubmit() {
  const input = document.getElementById('barcode-scan-input');
  if (!input) return;
  const code = input.value.trim().toLowerCase();
  if (!code) return;
  closeModal();

  const match = posProducts.find(p =>
    (p.barcode && p.barcode.toLowerCase() === code) ||
    (p.sku && p.sku.toLowerCase() === code)
  );

  if (match) {
    addToCart(match.id);
    showToast(`Added "${match.name}" to cart!`, 'success');
  } else {
    showToast(`No product matched barcode "${input.value.trim()}". Searching catalog...`, 'info');
    handlePOSSearch(input.value.trim());
    const sInput = document.getElementById('pos-search-input');
    if (sInput) sInput.value = input.value.trim();
  }
}

async function processCheckout() {
  if (isProcessingCheckout) return;

  if (State.cart.items.length === 0) {
    showToast('Please add at least one product to the order.', 'warning');
    return;
  }

  isProcessingCheckout = true;
  const checkoutBtn = document.getElementById('pos-checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = `
      <span class="pos-btn-spinner"></span>
      Processing Sale...
    `;
  }

  const payload = {
    customer_id: State.cart.customerId,
    items: State.cart.items.map(i => ({
      product_id: i.productId,
      quantity: i.quantity,
      unit_price: i.unitPrice
    })),
    discount: State.cart.discount,
    paid_amount: State.cart.paidAmount !== undefined ? State.cart.paidAmount : getCartTotal(),
    payment_method: State.cart.paymentMethod
  };

  try {
    const res = await API.post('/sales', payload);
    showToast(`Sale recorded successfully! Invoice ${res.invoiceNumber}`, 'success');

    // Clear cart
    clearCart();

    // Reset mobile view to catalog tab
    if (posMobileTab !== 'catalog') {
      setPOSMobileTab('catalog');
    }

    // Show Printable Receipt Modal immediately
    showReceiptModal(res.sale.id);

    // Refresh products stock in background
    const prodData = await API.get('/products?limit=200');
    posProducts = prodData.products || [];
    renderPOSLayout();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    isProcessingCheckout = false;
    const btn = document.getElementById('pos-checkout-btn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Complete Sale & Print Receipt';
    }
  }
}

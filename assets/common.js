const MedHub = (() => {
  const PRODUCTS_URL = './products_aesculap.json';
  const STORAGE_KEYS = {
    settings: 'medhub_settings',
    cart: 'medhub_cart',
    compare: 'medhub_compare',
    recent: 'medhub_recent',
    views: 'medhub_views',
    inquiries: 'medhub_inquiries',
  };

  const fetchProducts = async () => {
    const res = await fetch(PRODUCTS_URL, { cache: 'reload' });
    return await res.json();
  };

  const formatPrice = value => {
    if (!value || value === 0) return 'Цена по запросу';
    return `${value.toLocaleString('ru-RU')} ₽`;
  };

  const trimText = (text, max = 92) => {
    if (!text) return '';
    return text.length > max ? text.slice(0, max - 1).trim() + '…' : text;
  };

  const getSettings = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}');
    } catch (err) {
      return {};
    }
  };

  const saveSettings = settings => {
    const current = getSettings();
    const next = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(next));
    return next;
  };

  const getCart = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.cart) || '{"items":[]}');
    } catch (err) {
      return { items: [] };
    }
  };

  const saveCart = cart => {
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
    MedHub.renderCartCounter?.();
    MedHub.renderCartDrawer?.();
    return cart;
  };

  const getCartCount = () => {
    return getCart().items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  };

  const addToCart = product => {
    const cart = getCart();
    const existing = cart.items.find(item => item.sku === product.sku);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.items.push({
        id: product.id,
        sku: product.sku,
        name: product.translations?.ru?.name || product.sku,
        qty: 1,
        price: product.price || 0,
      });
    }
    saveCart(cart);
    showToast('Добавлено в корзину', 'success');
  };

  const removeCartItem = sku => {
    const cart = getCart();
    cart.items = cart.items.filter(item => item.sku !== sku);
    saveCart(cart);
  };

  const updateCartQty = (sku, value) => {
    const cart = getCart();
    const item = cart.items.find(item => item.sku === sku);
    if (!item) return;
    item.qty = Math.max(1, value);
    saveCart(cart);
  };

  const clearCart = () => {
    saveCart({ items: [] });
  };

  const getCompare = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.compare) || '[]');
    } catch (err) {
      return [];
    }
  };

  const saveCompare = list => {
    localStorage.setItem(STORAGE_KEYS.compare, JSON.stringify(list.slice(0, 3)));
    return list;
  };

  const addToCompare = product => {
    const list = getCompare();
    if (list.some(item => item.sku === product.sku)) {
      showToast('Товар уже в сравнении', 'info');
      return;
    }
    if (list.length >= 3) {
      showToast('Можно сравнить до 3 товаров', 'error');
      return;
    }
    saveCompare([...list, { id: product.id, sku: product.sku, name: product.translations?.ru?.name || product.sku, price: product.price, in_stock: product.in_stock }]);
    showToast('Добавлено в сравнение', 'success');
  };

  const removeFromCompare = sku => {
    saveCompare(getCompare().filter(item => item.sku !== sku));
  };

  const clearCompare = () => {
    saveCompare([]);
  };

  const getRecentViews = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.recent) || '[]');
    } catch (err) {
      return [];
    }
  };

  const addRecentView = product => {
    const current = getRecentViews();
    const next = [{
      sku: product.sku,
      slug: product.slug,
      name: product.translations?.ru?.name || product.sku,
      image_url: product.image_url,
    }, ...current.filter(item => item.sku !== product.sku)].slice(0, 6);
    localStorage.setItem(STORAGE_KEYS.recent, JSON.stringify(next));
    return next;
  };

  const getViews = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.views) || '{}');
    } catch (err) {
      return {};
    }
  };

  const getViewCount = sku => {
    const views = getViews();
    return views[sku] || 0;
  };

  const incrementViewCount = sku => {
    const views = getViews();
    views[sku] = (views[sku] || 0) + 1;
    localStorage.setItem(STORAGE_KEYS.views, JSON.stringify(views));
    return views[sku];
  };

  const createToast = (message, status = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast-message ${status}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.right = '22px';
    toast.style.bottom = '22px';
    toast.style.padding = '14px 18px';
    toast.style.borderRadius = '14px';
    toast.style.background = status === 'success' ? '#1a3a5c' : status === 'error' ? '#c0392b' : '#1f2937';
    toast.style.color = '#fff';
    toast.style.zIndex = 9999;
    toast.style.boxShadow = '0 16px 48px rgba(26,58,92,0.16)';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
    return toast;
  };

  const showToast = (message, type = 'success') => {
    if (window.toastTimer) clearTimeout(window.toastTimer);
    createToast(message, type);
  };

  const buildInquiryPayload = async data => {
    const settings = getSettings();
    const payload = {
      name: data.name,
      phone: data.phone,
      email: data.email,
      company: data.company || '',
      lang: data.lang || 'ru',
      source_url: window.location.href,
      product: data.product || '',
      message: data.message || '',
    };
    if (data.cart && Array.isArray(data.cart)) {
      payload.product = data.cart.map(item => `[
SKU: ${item.sku}] ${item.name} × ${item.qty}`).join('\n');
    }
    return payload;
  };

  const submitInquiry = async data => {
    const payload = await buildInquiryPayload(data);
    try {
      const res = await fetch('/api/submit-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Ошибка отправки заявки');
      }
      showToast('Заявка отправлена, спасибо!', 'success');
      return true;
    } catch (err) {
      console.error(err);
      showToast('Ошибка отправки: ' + err.message, 'error');
      return false;
    }
  };

  const openCartDrawer = () => {
    document.querySelector('.cart-drawer')?.classList.add('open');
  };

  const closeCartDrawer = () => {
    document.querySelector('.cart-drawer')?.classList.remove('open');
  };

  const renderCartCounter = () => {
    const counter = document.getElementById('cart-count');
    if (!counter) return;
    const count = getCartCount();
    counter.textContent = count;
    counter.parentElement.style.display = count > 0 ? 'inline-flex' : 'none';
  };

  const renderCartDrawer = () => {
    const container = document.getElementById('cart-items');
    if (!container) return;
    const cart = getCart();
    const total = cart.items.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);
    container.innerHTML = cart.items.length
      ? cart.items.map(item => `
        <div class="cart-item">
          <div class="cart-thumb">
            <div class="product-card__media" style="background:#f3f3f3"></div>
          </div>
          <div class="cart-item__meta">
            <div class="cart-item__name">${item.name}</div>
            <div class="cart-item__sku">SKU: ${item.sku}</div>
            <div class="cart-item__qty">
              <div class="qty-control">
                <button type="button" onclick="MedHub.changeCartQty('${item.sku}', ${item.qty - 1})">−</button>
                <span>${item.qty}</span>
                <button type="button" onclick="MedHub.changeCartQty('${item.sku}', ${item.qty + 1})">+</button>
              </div>
            </div>
            <div class="cart-item__price">${item.price ? formatPrice(item.price * item.qty) : 'Цена по запросу'}</div>
          </div>
        </div>`).join('')
      : '<div style="padding:40px 0;text-align:center;color:var(--text-muted)">Корзина пуста</div>';
    document.getElementById('cart-total')?.textContent = total ? formatPrice(total) : 'Цена по запросу';
  };

  const submitCartOrder = async formData => {
    const cart = getCart();
    if (!cart.items.length) {
      showToast('Корзина пуста', 'info');
      return;
    }
    await submitInquiry({ ...formData, cart: cart.items });
    clearCart();
    renderCartDrawer();
  };

  const buildSearchPlaceholder = () => {
    const searchInput = document.querySelector('[data-search-input]');
    if (!searchInput) return;
    const lang = localStorage.getItem('medhub_lang') || 'ru';
    const labels = {
      ru: 'Поиск по товарам, SKU, категории...',
      en: 'Search products, SKU, category...',
      zh: 'Поиск товаров, артикул, категория...',
    };
    searchInput.placeholder = labels[lang] || labels.ru;
  };

  const getActiveLang = () => localStorage.getItem('medhub_lang') || 'ru';

  const setLanguage = lang => {
    localStorage.setItem('medhub_lang', lang);
    document.documentElement.setAttribute('data-lang', lang);
    document.querySelectorAll('[data-lang-toggle]').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
    buildSearchPlaceholder();
  };

  const initLanguageSwitcher = () => {
    document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
      btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });
    setLanguage(getActiveLang());
  };

  return {
    fetchProducts,
    formatPrice,
    trimText,
    getSettings,
    saveSettings,
    getCart,
    addToCart,
    removeCartItem,
    updateCartQty,
    getCartCount,
    clearCart,
    addToCompare,
    removeFromCompare,
    clearCompare,
    getCompare,
    getRecentViews,
    addRecentView,
    incrementViewCount,
    getViewCount,
    submitInquiry,
    openCartDrawer,
    closeCartDrawer,
    renderCartCounter,
    renderCartDrawer,
    showToast,
    setLanguage,
    initLanguageSwitcher,
    buildSearchPlaceholder,
    changeCartQty: (sku, qty) => {
      if (qty <= 0) {
        removeCartItem(sku);
      } else {
        updateCartQty(sku, qty);
      }
    },
    submitCartOrder,
  };
})();
window.MedHub = MedHub;

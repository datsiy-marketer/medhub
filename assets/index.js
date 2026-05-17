const IndexPage = (() => {
  const state = {
    products: [],
    filtered: [],
    page: 0,
    pageSize: 12,
    activeCategory: 'all',
    activeBrand: 'all',
    searchQuery: '',
    sortBy: 'default',
    availability: 'all',
    priceMin: '',
    priceMax: '',
  };

  const groupKeywords = {
    surgery: ['элеватор', 'распатор', 'кюрет', 'дренаж', 'прибор', 'инструмент'],
    suturing: ['иглодержатель', 'пинцет', 'ножниц', 'шовный материал'],
    kits: ['набор', 'комплект'],
  };

  const getLanguage = () => localStorage.getItem('medhub_lang') || 'ru';

  const getProductLabel = product => {
    const lang = getLanguage();
    const label = product.translations?.[lang]?.name || product.translations?.ru?.name || product.sku;
    return label || product.sku;
  };

  const getProductDescription = product => {
    const lang = getLanguage();
    return product.translations?.[lang]?.description || product.translations?.ru?.description || '';
  };

  const getProductSpecs = product => {
    const lang = getLanguage();
    return product.translations?.[lang]?.specs || product.translations?.ru?.specs || '';
  };

  const loadSettings = () => {
    const settings = MedHub.getSettings();
    return {
      banner_url: settings.banner_url || 'https://images.unsplash.com/photo-1581091870622-9fecd4b5e5d5?auto=format&fit=crop&w=1600&q=80',
      banner_text: settings.banner_text || 'Профессиональные инструменты Aesculap — поставки для клиник',
    };
  };

  const init = async () => {
    MedHub.renderCartCounter();
    MedHub.renderCartDrawer();
    MedHub.initLanguageSwitcher();
    document.querySelector('[data-cart-toggle]')?.addEventListener('click', () => MedHub.openCartDrawer());
    document.querySelector('[data-close-cart]')?.addEventListener('click', () => MedHub.closeCartDrawer());
    document.querySelector('[data-clear-cart]')?.addEventListener('click', () => {
      if (confirm('Очистить корзину?')) MedHub.clearCart();
    });
    document.querySelector('[data-submit-cart]')?.addEventListener('click', openCartInquiryForm);
    document.querySelectorAll('[data-cart-action]')?.forEach(btn => btn.addEventListener('click', () => MedHub.openCartDrawer()));
    document.querySelector('[data-sort]')?.addEventListener('change', e => {
      state.sortBy = e.target.value;
      resetCatalog();
    });
    document.querySelector('[data-filter-brand]')?.addEventListener('change', e => {
      state.activeBrand = e.target.value;
      resetCatalog();
    });
    document.querySelector('[data-filter-availability]')?.addEventListener('change', e => {
      state.availability = e.target.value;
      resetCatalog();
    });
    document.querySelector('[data-filter-min]')?.addEventListener('input', e => { state.priceMin = e.target.value; });
    document.querySelector('[data-filter-max]')?.addEventListener('input', e => { state.priceMax = e.target.value; });
    document.querySelector('[data-filter-apply]')?.addEventListener('click', () => resetCatalog());
    document.querySelector('[data-filter-reset]')?.addEventListener('click', resetFilters);
    document.querySelector('[data-search-input]')?.addEventListener('input', onSearchInput);

    document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        MedHub.setLanguage(btn.dataset.lang);
        renderCatalog();
      });
    });
    document.querySelector('[data-search-form]')?.addEventListener('submit', e => {
      e.preventDefault();
      const query = state.searchQuery.trim();
      if (query) window.location.href = `product.html?sku=${encodeURIComponent(query)}`;
    });
    document.querySelector('[data-close-suggestions]')?.addEventListener('click', hideSuggestions);
    document.getElementById('quick-inquiry-form')?.addEventListener('submit', handleInquirySubmit);
    document.addEventListener('click', event => {
      if (!event.target.closest('.search-bar')) hideSuggestions();
    });

    const settings = loadSettings();
    document.getElementById('hero-banner')?.setAttribute('style', `background-image: linear-gradient(135deg, rgba(26,58,92,0.64), rgba(26,58,92,0.38)), url('${settings.banner_url}')`);
    document.getElementById('hero-headline')?.textContent = settings.banner_text;

    const products = await MedHub.fetchProducts();
    state.products = products.filter(p => p.is_published !== false);
    state.filtered = [...state.products];
    buildSidebar();
    buildCategoryTabs();
    buildBrandFilters();
    renderShelves();
    renderFeatured();
    resetCatalog();
  };

  const toggleActiveCategory = category => {
    state.activeCategory = category;
    document.querySelectorAll('[data-category-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    resetCatalog();
  };

  const buildCategoryTabs = () => {
    const tabs = document.querySelector('.category-tabs');
    if (!tabs) return;
    const categories = Array.from(new Set(state.products.map(p => p.category))).slice(0, 6);
    tabs.innerHTML = `<button class="category-tab active" data-category-tab data-category="all">Все</button>` + categories.map(cat => `
      <button class="category-tab" data-category="${cat}">${cat}</button>
    `).join('');
    tabs.querySelectorAll('[data-category-tab]').forEach(btn => {
      btn.addEventListener('click', () => toggleActiveCategory(btn.dataset.category));
    });
  };

  const buildSidebar = () => {
    const container = document.getElementById('categories-tree');
    const brands = document.getElementById('sidebar-brands');
    if (!container || !brands) return;
    const categories = Array.from(new Set(state.products.map(p => p.category))).sort();
    const treeHtml = categories.map(cat => `
      <li>
        <button class="sidebar-item" data-sidebar-category="${cat}">
          ${cat}
        </button>
      </li>
    `).join('');
    container.innerHTML = `<ul>${treeHtml}</ul>`;
    container.querySelectorAll('[data-sidebar-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleActiveCategory(btn.dataset.sidebarCategory);
        document.querySelector('[data-filter-brand]').value = 'all';
      });
    });
    const uniqueBrands = Array.from(new Set(state.products.map(p => p.brand))).sort();
    brands.innerHTML = uniqueBrands.map(brand => `
      <li><button class="sidebar-item" data-brand-filter="${brand}">${brand}</button></li>
    `).join('');
    brands.querySelectorAll('[data-brand-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelector('[data-filter-brand]').value = btn.dataset.brandFilter;
        state.activeBrand = btn.dataset.brandFilter;
        resetCatalog();
      });
    });
  };

  const buildBrandFilters = () => {
    const filter = document.querySelector('[data-filter-brand]');
    if (!filter) return;
    const options = Array.from(new Set(state.products.map(p => p.brand))).sort();
    filter.innerHTML = `<option value="all">Все бренды</option>` + options.map(brand => `<option value="${brand}">${brand}</option>`).join('');
  };

  const renderShelves = () => {
    renderShelf('Для хирургии', p => groupKeywords.surgery.some(keyword => p.category.toLowerCase().includes(keyword) || getProductLabel(p).toLowerCase().includes(keyword)), 'surgery-shelf');
    renderShelf('Для зашивания', p => groupKeywords.suturing.some(keyword => p.category.toLowerCase().includes(keyword) || getProductLabel(p).toLowerCase().includes(keyword)), 'suturing-shelf');
    renderShelf('Популярные наборы', p => groupKeywords.kits.some(keyword => p.category.toLowerCase().includes(keyword) || getProductLabel(p).toLowerCase().includes(keyword)), 'kits-shelf');
  };

  const renderShelf = (title, predicate, sectionId) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const products = state.products.filter(predicate).slice(0, 10);
    if (!products.length) {
      section.style.display = 'none';
      return;
    }
    section.querySelector('h2').textContent = title;
    section.querySelector('.horizontal-shelf').innerHTML = products.map(productCardHtml).join('');
    section.querySelector('.see-all')?.addEventListener('click', () => {
      state.activeCategory = 'all';
      state.searchQuery = title;
      document.querySelector('[data-search-input]').value = title;
      resetCatalog();
    });
    addShelfButtons(section);
  };

  const renderFeatured = () => {
    const featured = state.products.filter(p => p.is_featured).slice(0, 10);
    const section = document.getElementById('featured-shelf');
    if (!section) return;
    if (!featured.length) {
      section.style.display = 'none';
      return;
    }
    section.querySelector('h2').textContent = 'Специальные предложения';
    section.querySelector('.horizontal-shelf').innerHTML = featured.map(productCardHtml).join('');
    addShelfButtons(section);
  };

  const addShelfButtons = section => {
    section.querySelectorAll('[data-action-add-cart]').forEach(btn => {
      btn.addEventListener('click', () => handleAddToCart(btn.dataset.sku));
    });
    section.querySelectorAll('[data-action-request]').forEach(btn => {
      btn.addEventListener('click', () => openQuickInquiry(btn.dataset.sku));
    });
    section.querySelectorAll('[data-action-compare]').forEach(btn => {
      btn.addEventListener('click', () => handleAddToCompare(btn.dataset.sku));
    });
    section.querySelectorAll('[data-action-quickview]').forEach(btn => {
      btn.addEventListener('click', () => openQuickView(btn.dataset.sku));
    });
  };

  const openQuickView = sku => {
    const product = state.products.find(p => p.sku === sku);
    if (!product) return;
    const modal = document.getElementById('quick-view-modal');
    modal.querySelector('.modal-title').textContent = getProductLabel(product);
    modal.querySelector('.modal-body').innerHTML = `
      <p>${trimText(getProductDescription(product), 280)}</p>
      <p class="product-card__price">${MedHub.formatPrice(product.price)}</p>
      <div class="product-card__meta">SKU: ${product.sku} · ${product.category}</div>
      <div style="margin-top:18px;display:grid;gap:10px;">
        <button class="btn primary" type="button" onclick="MedHub.addToCart({id:${product.id},sku:'${product.sku}',translations:{ru:{name:'${getProductLabel(product).replace(/'/g,"\\'")}' }},price:${product.price||0}})">Добавить в корзину</button>
        <button class="btn secondary" type="button" onclick="openQuickInquiry('${product.sku}')">Запросить цену</button>
      </div>`;
    modal.classList.add('open');
  };

  const closeQuickView = () => {
    document.getElementById('quick-view-modal')?.classList.remove('open');
  };

  const openQuickInquiry = sku => {
    const product = state.products.find(p => p.sku === sku);
    if (!product) return;
    const form = document.getElementById('quick-inquiry-form');
    if (!form) return;
    form.product.value = `${product.sku} — ${getProductLabel(product)}`;
    document.getElementById('inquiry-modal').classList.add('open');
  };

  const closeInquiryModal = () => {
    document.getElementById('inquiry-modal')?.classList.remove('open');
  };

  const handleInquirySubmit = async event => {
    event.preventDefault();
    const form = event.target;
    const payload = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      company: form.company.value.trim(),
      product: form.product.value.trim(),
      message: form.message.value.trim(),
      lang: getLanguage(),
    };
    const success = await MedHub.submitInquiry(payload);
    if (success) {
      form.reset();
      closeInquiryModal();
    }
  };

  const openCartInquiryForm = () => {
    const modal = document.getElementById('cart-inquiry-modal');
    if (!modal) return;
    modal.classList.add('open');
    renderCartInquirySummary();
  };

  const closeCartInquiryForm = () => {
    document.getElementById('cart-inquiry-modal')?.classList.remove('open');
  };

  const renderCartInquirySummary = () => {
    const container = document.getElementById('cart-inquiry-items');
    if (!container) return;
    const cart = MedHub.getCart();
    container.innerHTML = cart.items.length
      ? cart.items.map(item => `
        <div style="display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid rgba(26,58,92,0.08)">
          <div><strong>${item.sku}</strong> ${trimText(item.name, 50)}</div>
          <div>${item.qty} шт.</div>
        </div>`).join('')
      : '<div style="padding:28px 0;color:var(--text-muted)">Корзина пустая</div>';
  };

  const handleCartInquiry = async event => {
    event.preventDefault();
    const form = event.target;
    const data = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      company: form.company.value.trim(),
      message: form.message.value.trim(),
      lang: getLanguage(),
    };
    await MedHub.submitCartOrder(data);
    closeCartInquiryForm();
  };

  const onSearchInput = event => {
    state.searchQuery = event.target.value;
    renderSuggestions();
  };

  const hideSuggestions = () => {
    document.querySelector('.search-suggestions')?.classList.add('hidden');
  };

  const renderSuggestions = () => {
    const query = state.searchQuery.trim().toLowerCase();
    const suggestions = document.querySelector('.search-suggestions');
    if (!suggestions) return;
    if (query.length < 2) {
      suggestions.classList.add('hidden');
      return;
    }
    const matches = state.products.filter(p => {
      const name = getProductLabel(p).toLowerCase();
      return name.includes(query) || p.sku.toLowerCase().includes(query) || p.category.toLowerCase().includes(query);
    }).slice(0, 7);
    if (!matches.length) {
      suggestions.innerHTML = `<div class="search-item" style="padding:14px 18px;color:var(--text-muted)">Ничего не найдено</div>`;
      suggestions.classList.remove('hidden');
      return;
    }
    suggestions.innerHTML = matches.map(product => `
      <button type="button" data-suggestion-sku="${product.sku}">
        <strong>${trimText(getProductLabel(product), 70)}</strong>
        <span class="meta">${product.category} · ${product.sku}</span>
      </button>
    `).join('');
    suggestions.querySelectorAll('[data-suggestion-sku]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.href = `product.html?sku=${encodeURIComponent(btn.dataset.suggestionSku)}`;
      });
    });
    suggestions.classList.remove('hidden');
  };

  const filterProducts = () => {
    const query = state.searchQuery.trim().toLowerCase();
    return state.products.filter(product => {
      if (state.activeCategory !== 'all' && product.category !== state.activeCategory) return false;
      if (state.activeBrand !== 'all' && product.brand !== state.activeBrand) return false;
      if (state.availability === 'in' && !product.in_stock) return false;
      if (state.availability === 'out' && product.in_stock) return false;
      const price = Number(product.price || 0);
      if (state.priceMin && price < Number(state.priceMin)) return false;
      if (state.priceMax && price > Number(state.priceMax)) return false;
      if (query) {
        const target = `${getProductLabel(product)} ${product.sku} ${product.category}`.toLowerCase();
        if (!target.includes(query)) return false;
      }
      return true;
    });
  };

  const sortProducts = products => {
    const list = [...products];
    if (state.sortBy === 'price') {
      return list.sort((a, b) => (Number(a.price || 0) || Infinity) - (Number(b.price || 0) || Infinity));
    }
    if (state.sortBy === 'name') {
      return list.sort((a, b) => getProductLabel(a).localeCompare(getProductLabel(b), 'ru'));
    }
    return list;
  };

  const resetCatalog = () => {
    state.page = 0;
    state.filtered = sortProducts(filterProducts());
    document.getElementById('products-grid').innerHTML = '';
    document.getElementById('catalog-empty').style.display = 'none';
    loadMoreProducts();
  };

  const loadMoreProducts = () => {
    const start = state.page * state.pageSize;
    const slice = state.filtered.slice(start, start + state.pageSize);
    if (!slice.length && state.page === 0) {
      document.getElementById('catalog-empty').style.display = 'block';
      return;
    }
    document.getElementById('catalog-empty').style.display = state.filtered.length ? 'none' : 'block';
    document.getElementById('products-grid').insertAdjacentHTML('beforeend', slice.map(productCardHtml).join(''));
    addGridButtons();
    state.page += 1;
    observeLoadMore();
  };

  const observeLoadMore = () => {
    const sentinel = document.getElementById('catalog-sentinel');
    if (!sentinel) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        observer.disconnect();
        if (state.filtered.length > state.page * state.pageSize) {
          loadMoreProducts();
        }
      }
    }, { rootMargin: '240px' });
    observer.observe(sentinel);
  };

  const productCardHtml = product => {
    const image = product.image_url || '';
    const featuredLabel = product.is_featured ? '<div class="badge-pill" style="background:rgba(200,169,110,0.18);color:#1a3a5c">Рекомендуем</div>' : '';
    const price = product.price_on_request ? '<span class="muted">Цена по запросу</span>' : MedHub.formatPrice(product.price);
    return `
      <article class="product-card">
        <a href="product.html?sku=${encodeURIComponent(product.sku)}" class="product-card__media">
          ${image ? `<img src="${image}" alt="${getProductLabel(product)}">` : `<div class="placeholder" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#e9e6dc,#f7f2e6)"><span style="font-size:30px;color:#8f8f8f">🩺</span></div>`}
          <div class="product-card__sku">${product.sku}</div>
        </a>
        <div class="product-card__body">
          <h3 class="product-card__name">${trimText(getProductLabel(product), 90)}</h3>
          <div class="product-card__price">${price}</div>
          <div class="product-card__meta">${product.category} · ${product.in_stock ? 'В наличии' : 'Нет в наличии'}</div>
          <div class="product-card__actions">
            <button class="btn primary" type="button" data-action-add-cart data-sku="${product.sku}">В корзину</button>
            <button class="btn secondary" type="button" data-action-request data-sku="${product.sku}">Запросить</button>
            <button class="btn outline" type="button" data-action-compare data-sku="${product.sku}">Сравнить</button>
          </div>
        </div>
        <button class="product-card__quickview" type="button" data-action-quickview data-sku="${product.sku}">Быстрый просмотр</button>
      </article>`;
  };

  const addGridButtons = () => {
    document.querySelectorAll('[data-action-add-cart]').forEach(btn => {
      btn.onclick = () => handleAddToCart(btn.dataset.sku);
    });
    document.querySelectorAll('[data-action-request]').forEach(btn => {
      btn.onclick = () => openQuickInquiry(btn.dataset.sku);
    });
    document.querySelectorAll('[data-action-compare]').forEach(btn => {
      btn.onclick = () => handleAddToCompare(btn.dataset.sku);
    });
    document.querySelectorAll('[data-action-quickview]').forEach(btn => {
      btn.onclick = () => openQuickView(btn.dataset.sku);
    });
  };

  const handleAddToCart = sku => {
    const product = state.products.find(item => item.sku === sku);
    if (!product) return;
    MedHub.addToCart(product);
  };

  const handleAddToCompare = sku => {
    const product = state.products.find(item => item.sku === sku);
    if (!product) return;
    MedHub.addToCompare(product);
  };

  const resetFilters = () => {
    state.activeBrand = 'all';
    state.availability = 'all';
    state.priceMin = '';
    state.priceMax = '';
    document.querySelector('[data-filter-brand]').value = 'all';
    document.querySelector('[data-filter-availability]').value = 'all';
    document.querySelector('[data-filter-min]').value = '';
    document.querySelector('[data-filter-max]').value = '';
    resetCatalog();
  };

  return {
    init,
    closeQuickView,
    closeInquiryModal,
    handleInquirySubmit,
    openCartInquiryForm,
    closeCartInquiryForm,
    handleCartInquiry,
    renderCatalog: resetCatalog,
  };
})();
window.IndexPage = IndexPage;
window.addEventListener('DOMContentLoaded', IndexPage.init);

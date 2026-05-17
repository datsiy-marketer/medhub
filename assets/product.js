const ProductPage = (() => {
  let product = null;
  let products = [];

  const getLanguage = () => localStorage.getItem('medhub_lang') || 'ru';
  const getProductLabel = item => {
    const lang = getLanguage();
    return item.translations?.[lang]?.name || item.translations?.ru?.name || item.sku;
  };
  const getProductDescription = item => {
    const lang = getLanguage();
    return item.translations?.[lang]?.description || item.translations?.ru?.description || 'Описание недоступно.';
  };
  const getProductSpecs = item => {
    const lang = getLanguage();
    return item.translations?.[lang]?.specs || item.translations?.ru?.specs || '';
  };

  const parseQuery = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      sku: params.get('sku')?.trim(),
      slug: params.get('slug')?.trim(),
    };
  };

  const init = async () => {
    MedHub.initLanguageSwitcher();
    MedHub.renderCartCounter();
    MedHub.renderCartDrawer();
    document.querySelector('[data-cart-toggle]')?.addEventListener('click', () => MedHub.openCartDrawer());
    document.querySelector('[data-close-cart]')?.addEventListener('click', () => MedHub.closeCartDrawer());
    document.querySelector('[data-submit-cart]')?.addEventListener('click', openCartInquiryForm);
    document.querySelector('[data-close-cart-inquiry]')?.addEventListener('click', closeCartInquiryForm);
    document.querySelector('[data-cart-inquiry-form]')?.addEventListener('submit', handleCartInquiry);
    document.querySelector('[data-toggle-zoom]')?.addEventListener('click', openZoomDialog);
    document.querySelector('[data-zoom-close]')?.addEventListener('click', closeZoomDialog);
    document.querySelector('[data-product-inquiry-form]')?.addEventListener('submit', handleProductInquiry);
    document.querySelector('[data-close-inquiry]')?.addEventListener('click', closeInquiryModal);
    document.querySelector('[data-add-compare]')?.addEventListener('click', addCurrentToCompare);
    document.querySelector('[data-add-cart]')?.addEventListener('click', addCurrentToCart);

    const { sku, slug } = parseQuery();
    products = await MedHub.fetchProducts();
    product = products.find(item => (sku && item.sku === sku) || (slug && item.slug === slug));
    if (!product) {
      document.querySelector('.product-detail')?.innerHTML = '<div style="padding:40px;text-align:center;font-size:18px;color:var(--text-muted)">Товар не найден. Проверьте URL или вернитесь на главную.</div>';
      return;
    }

    renderProduct();
    renderBreadcrumbs();
    renderTabs();
    renderRecentlyViewed();
    updateViewCounter();
    setDocumentMeta();
  };

  const renderProduct = () => {
    const titleEl = document.querySelector('[data-product-title]');
    const skuEl = document.querySelector('[data-product-sku]');
    const brandEl = document.querySelector('[data-product-brand]');
    const priceEl = document.querySelector('[data-product-price]');
    const stockEl = document.querySelector('[data-product-stock]');
    const imageEl = document.querySelector('[data-product-image]');
    const mainImage = document.querySelector('[data-main-image]');
    const productCard = document.querySelector('[data-product-card]');
    const descriptionText = getProductDescription(product);

    titleEl.textContent = getProductLabel(product);
    skuEl.textContent = `Артикул ${product.sku}`;
    brandEl.textContent = product.brand || 'Aesculap';
    priceEl.textContent = product.price_on_request ? 'Цена по запросу' : MedHub.formatPrice(product.price);
    stockEl.textContent = product.in_stock ? 'В наличии' : 'Уточняйте наличие';
    mainImage.src = product.image_url || '';
    mainImage.alt = getProductLabel(product);
    imageEl.innerHTML = product.image_url ? `<img src="${product.image_url}" alt="${getProductLabel(product)}">` : `<div class="placeholder" style="min-height:420px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#e9e6dc,#f7f2e6)"><span style="font-size:40px;color:#8f8f8f">🩺</span></div>`;
    descriptionText && document.querySelector('[data-description-text]')?.textContent === '';

    const inquiryInput = document.querySelector('[name="product"]');
    if (inquiryInput) inquiryInput.value = `${product.sku} — ${getProductLabel(product)}`;
    const viewCount = MedHub.getViewCount(product.sku) || 0;
    productCard.querySelector('[data-view-count]').textContent = `Просмотрено ${viewCount} раз`;
    const specList = parseSpecs(getProductSpecs(product));
    const specBody = document.getElementById('product-specs-body');
    specBody.innerHTML = specList.map(row => `
      <tr><th>${row.name}</th><td>${row.value}</td></tr>
    `).join('');
    document.getElementById('description-tab').textContent = getProductDescription(product);
    renderGallery();
  };

  const parseSpecs = text => {
    if (!text) return [];
    return text.split('|').map(item => {
      const parts = item.split(':');
      return {
        name: parts[0]?.trim() || '',
        value: parts.slice(1).join(':').trim() || '',
      };
    }).filter(item => item.name);
  };

  const renderGallery = () => {
    const thumbs = document.getElementById('gallery-thumbs');
    if (!thumbs) return;
    const images = product.image_url ? [product.image_url] : [];
    thumbs.innerHTML = images.map((src, index) => `
      <button type="button" class="product-gallery__thumb" data-thumb-index="${index}">
        <img src="${src}" alt="${getProductLabel(product)}">
      </button>`).join('');
    thumbs.querySelectorAll('[data-thumb-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelector('[data-main-image]').src = images[Number(btn.dataset.thumbIndex)] || '';
      });
    });
  };

  const renderBreadcrumbs = () => {
    const crumbs = document.getElementById('breadcrumbs');
    if (!crumbs) return;
    crumbs.innerHTML = `
      <a href="/">Главная</a>
      <span>›</span>
      <a href="index.html?category=${encodeURIComponent(product.category)}">${product.category}</a>
      <span>›</span>
      <span>${getProductLabel(product)}</span>`;
  };

  const renderTabs = () => {
    document.querySelectorAll('[data-tab-button]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tabTarget;
        document.querySelectorAll('[data-tab-pane]').forEach(panel => {
          panel.classList.toggle('hidden', panel.dataset.tabPane !== target);
        });
        document.querySelectorAll('[data-tab-button]').forEach(t => t.classList.toggle('active', t === btn));
      });
    });
  };

  const renderRecentlyViewed = () => {
    const list = document.getElementById('recently-viewed-list');
    if (!list) return;
    const items = MedHub.addRecentView(product);
    if (!items.length) {
      document.getElementById('recently-viewed-section').style.display = 'none';
      return;
    }
    list.innerHTML = items.map(item => `
      <article class="recent-card">
        <a href="product.html?sku=${encodeURIComponent(item.sku)}">${item.name}</a>
      </article>`).join('');
  };

  const updateViewCounter = () => {
    const count = MedHub.incrementViewCount(product.sku);
    document.querySelector('[data-view-count]')?.textContent = `Просмотрено ${count} раз`;
  };

  const setDocumentMeta = () => {
    const title = `${getProductLabel(product)} — купить оптом, артикул ${product.sku} | MedHub`;
    document.title = title;
    const description = getProductDescription(product).slice(0, 150) || 'Профессиональный инструмент Aesculap для медицинских организаций.';
    document.querySelector('meta[name="description"]').setAttribute('content', description);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = window.location.href;
    document.querySelector('meta[property="og:title"]').setAttribute('content', title);
    document.querySelector('meta[property="og:description"]').setAttribute('content', description);
    document.querySelector('meta[property="og:url"]').setAttribute('content', window.location.href);
    document.querySelector('meta[property="og:image"]').setAttribute('content', product.image_url || 'https://medhub.ru/og-image.jpg');
    const ld = document.getElementById('product-jsonld');
    if (ld) {
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: getProductLabel(product),
        sku: product.sku,
        brand: { '@type': 'Brand', name: product.brand || 'Aesculap' },
        description: description,
        image: [product.image_url || 'https://medhub.ru/og-image.jpg'],
        offers: {
          '@type': 'Offer',
          priceCurrency: 'RUB',
          price: product.price_on_request ? undefined : product.price,
          availability: product.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: window.location.href,
        },
        category: product.category,
      }, null, 2);
    }
    const breadcrumbsLd = document.getElementById('breadcrumb-jsonld');
    if (breadcrumbsLd) {
      breadcrumbsLd.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Главная',
            item: `${window.location.origin}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: product.category,
            item: `${window.location.origin}/index.html?category=${encodeURIComponent(product.category)}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: getProductLabel(product),
            item: window.location.href,
          },
        ],
      }, null, 2);
    }
  };

  const openInquiryModal = () => {
    document.getElementById('product-inquiry-modal')?.classList.add('open');
  };

  const closeInquiryModal = () => {
    document.getElementById('product-inquiry-modal')?.classList.remove('open');
  };

  const handleProductInquiry = async event => {
    event.preventDefault();
    const form = event.target;
    await MedHub.submitInquiry({
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      company: form.company.value.trim(),
      product: form.product.value.trim(),
      message: form.message.value.trim(),
      lang: getLanguage(),
    });
    closeInquiryModal();
    form.reset();
  };

  const openZoomDialog = () => {
    document.getElementById('zoom-modal')?.classList.add('open');
  };

  const closeZoomDialog = () => {
    document.getElementById('zoom-modal')?.classList.remove('open');
  };

  const addCurrentToCompare = () => {
    MedHub.addToCompare(product);
  };

  const addCurrentToCart = () => {
    MedHub.addToCart(product);
  };

  const openCartInquiryForm = () => {
    document.getElementById('cart-inquiry-modal')?.classList.add('open');
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
          <div><strong>${item.sku}</strong> ${item.name}</div>
          <div>${item.qty} шт.</div>
        </div>`).join('')
      : '<div style="padding:28px 0;color:var(--text-muted)">Корзина пуста</div>';
  };

  const handleCartInquiry = async event => {
    event.preventDefault();
    const form = event.target;
    await MedHub.submitCartOrder({
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      company: form.company.value.trim(),
      message: form.message.value.trim(),
      lang: getLanguage(),
    });
    closeCartInquiryForm();
  };

  return {
    init,
    closeZoomDialog,
    closeInquiryModal,
    handleProductInquiry,
    openCartInquiryForm,
    closeCartInquiryForm,
    handleCartInquiry,
    addCurrentToCompare,
    addCurrentToCart,
  };
})();
window.ProductPage = ProductPage;
window.addEventListener('DOMContentLoaded', ProductPage.init);

/**
 * MedHub Data layer
 * Loads JSON files, provides query helpers.
 * Products can be overridden by admin via localStorage.
 */
const MedData = (() => {
  const PRODUCTS_OVERRIDE_KEY = 'medhub_products_override';
  const PLACEHOLDER_IMAGES_KEY = 'medhub_placeholder_images';
  let _products = [];
  let _categories = [];

  // Default placeholder images per category/key.
  // These are the "admin-level" placeholders — readable/replaceable via admin settings.
  const DEFAULT_PLACEHOLDERS = {
    'surgical':      'https://placehold.co/600x400/eef2f7/1a3a5c?text=Хирургические+инструменты',
    'surgical2':     'https://placehold.co/600x400/eef2f7/1a3a5c?text=Aesculap+Instruments',
    'surgical3':     'https://placehold.co/600x400/eef2f7/1a3a5c?text=Medtronic+Robotic',
    'endoscopy':     'https://placehold.co/600x400/eef2f7/1a3a5c?text=Karl+Storz+Endoscope',
    'anesthesia':    'https://placehold.co/600x400/eef2f7/1a3a5c?text=Dräger+Anesthesia',
    'ventilator':    'https://placehold.co/600x400/eef2f7/1a3a5c?text=ICU+Ventilator',
    'ultrasound':    'https://placehold.co/600x400/eef2f7/1a3a5c?text=Ultrasound+System',
    'monitor':       'https://placehold.co/600x400/eef2f7/1a3a5c?text=Patient+Monitor',
    'ortho':         'https://placehold.co/600x400/eef2f7/1a3a5c?text=Orthopedics',
    'suture':        'https://placehold.co/600x400/eef2f7/1a3a5c?text=Suture+Material',
    'sterilization': 'https://placehold.co/600x400/eef2f7/1a3a5c?text=Sterilizer',
    'lab':           'https://placehold.co/600x400/eef2f7/1a3a5c?text=Lab+Analyzer',
    'default':       'https://placehold.co/600x400/eef2f7/1a3a5c?text=Medical+Equipment'
  };

  function getPlaceholders() {
    try {
      const stored = JSON.parse(localStorage.getItem(PLACEHOLDER_IMAGES_KEY)) || {};
      return { ...DEFAULT_PLACEHOLDERS, ...stored };
    } catch { return DEFAULT_PLACEHOLDERS; }
  }

  // Resolve img:key tokens to actual URLs
  function resolveImage(raw) {
    if (!raw) return getPlaceholders()['default'];
    if (raw.startsWith('img:')) {
      const key = raw.slice(4);
      return getPlaceholders()[key] || getPlaceholders()['default'];
    }
    return raw;
  }

  function resolveImages(images, imageKey) {
    if (images?.length) return images.map(resolveImage);
    return [resolveImage(imageKey)];
  }

  function withResolvedImages(p) {
    return {
      ...p,
      image: resolveImage(p.image),
      images: resolveImages(p.images, p.image)
    };
  }

  function getBase() {
    const parts = location.pathname.split('/').filter(Boolean);
    const depth = parts.length > 0 && parts[parts.length - 1].includes('.') ? parts.length - 1 : parts.length;
    return depth === 0 ? '.' : Array(depth).fill('..').join('/');
  }

  async function init() {
    const base = getBase();
    try {
      const [pRes, cRes, aescRes] = await Promise.all([
        fetch(`${base}/data/products.json`),
        fetch(`${base}/data/categories.json`),
        fetch(`${base}/data/aesculap_products.json`)
      ]);
      const baseProducts = await pRes.json();
      _categories = await cRes.json();
      const aescProducts = aescRes.ok ? await aescRes.json() : [];

      let override = {};
      try { override = JSON.parse(localStorage.getItem(PRODUCTS_OVERRIDE_KEY)) || {}; } catch {}

      const allBase = [...baseProducts, ...aescProducts];
      _products = allBase
        .filter(p => !override[p.id]?._hidden)
        .map(p => withResolvedImages({ ...p, ...(override[p.id] || {}) }));

      const adminNew = Object.values(override).filter(p => p._adminCreated && !p._hidden);
      _products = [..._products, ...adminNew.map(withResolvedImages)];

    } catch (e) {
      console.error('MedData: failed to load', e);
    }
  }

  function getProducts(filters = {}) {
    let list = [..._products];
    if (filters.category) list = list.filter(p => p.category === filters.category);
    if (filters.subcategory) list = list.filter(p => p.subcategory === filters.subcategory);
    if (filters.brand) list = list.filter(p => p.brand === filters.brand);
    if (filters.isNew) list = list.filter(p => p.isNew);
    if (filters.isSale) list = list.filter(p => p.isSale);
    if (filters.isFeatured) list = list.filter(p => p.isFeatured);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(p => {
        const name = window.getProductName ? getProductName(p) : (p.name || p.nameKey || '');
        return p.brand.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          name.toLowerCase().includes(q);
      });
    }
    if (filters.sort === 'name_asc') list.sort((a, b) => {
      const fn = window.getProductName || (p => p.name || p.nameKey || '');
      return fn(a).localeCompare(fn(b));
    });
    if (filters.sort === 'name_desc') list.sort((a, b) => {
      const fn = window.getProductName || (p => p.name || p.nameKey || '');
      return fn(b).localeCompare(fn(a));
    });
    if (filters.sort === 'brand') list.sort((a, b) => a.brand.localeCompare(b.brand));
    if (filters.sort === 'price_asc') list.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
    if (filters.sort === 'price_desc') list.sort((a, b) => (b.price || 0) - (a.price || 0));
    return list;
  }

  function getBySlug(slug) { return _products.find(p => p.slug === slug) || null; }
  function getById(id) { return _products.find(p => p.id === id) || null; }
  function getCategories() { return _categories; }
  function getCategoryById(id) { return _categories.find(c => c.id === id) || null; }
  function getBrands() { return [...new Set(_products.map(p => p.brand))].sort(); }

  function saveProductOverride(id, data) {
    let override = {};
    try { override = JSON.parse(localStorage.getItem(PRODUCTS_OVERRIDE_KEY)) || {}; } catch {}
    override[id] = { ...override[id], ...data };
    localStorage.setItem(PRODUCTS_OVERRIDE_KEY, JSON.stringify(override));
    const idx = _products.findIndex(p => p.id === id);
    const resolved = withResolvedImages(override[id]);
    if (idx >= 0) Object.assign(_products[idx], resolved);
    else _products.push(resolved);
  }

  function deleteProductOverride(id) {
    let override = {};
    try { override = JSON.parse(localStorage.getItem(PRODUCTS_OVERRIDE_KEY)) || {}; } catch {}
    if (override[id]?._adminCreated) {
      delete override[id];
      _products = _products.filter(p => p.id !== id);
    } else {
      override[id] = { ...override[id], _hidden: true };
      _products = _products.filter(p => p.id !== id);
    }
    localStorage.setItem(PRODUCTS_OVERRIDE_KEY, JSON.stringify(override));
  }

  function resetProductOverrides() { localStorage.removeItem(PRODUCTS_OVERRIDE_KEY); }

  // Placeholder images management (for admin)
  function getPlaceholderConfig() { return getPlaceholders(); }

  function savePlaceholderImages(map) {
    localStorage.setItem(PLACEHOLDER_IMAGES_KEY, JSON.stringify(map));
    // Refresh resolved images on all products
    _products = _products.map(p => {
      const raw = p._rawImage || p.image;
      return { ...p, _rawImage: raw, image: resolveImage(raw), images: p.images.map(i => resolveImage(i)) };
    });
  }

  function getDefaultPlaceholders() { return { ...DEFAULT_PLACEHOLDERS }; }

  return {
    init, getProducts, getBySlug, getById, getCategories, getCategoryById,
    getBrands, saveProductOverride, deleteProductOverride, resetProductOverrides,
    getPlaceholderConfig, savePlaceholderImages, getDefaultPlaceholders,
    formatPrice
  };

  function formatPrice(price, unit, lang) {
    if (!price) return null;
    const formatted = new Intl.NumberFormat('ru-RU').format(price);
    return `${formatted} ₽`;
  }
})();

window.MedData = MedData;

// Global price formatter
window.formatPrice = function(price) {
  if (!price) return null;
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
};

/**
 * MedHub Data layer
 * Loads JSON files, provides query helpers.
 * Products can be overridden by admin via localStorage.
 */
const MedData = (() => {
  const PRODUCTS_OVERRIDE_KEY = 'medhub_products_override';
  let _products = [];
  let _categories = [];

  function getBase() {
    const parts = location.pathname.split('/').filter(Boolean);
    const depth = parts.length > 0 && parts[parts.length - 1].includes('.') ? parts.length - 1 : parts.length;
    return depth === 0 ? '.' : Array(depth).fill('..').join('/');
  }

  async function init() {
    const base = getBase();
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(`${base}/data/products.json`),
        fetch(`${base}/data/categories.json`)
      ]);
      const baseProducts = await pRes.json();
      _categories = await cRes.json();

      // Admin overrides stored in localStorage
      let override = {};
      try { override = JSON.parse(localStorage.getItem(PRODUCTS_OVERRIDE_KEY)) || {}; } catch {}

      _products = baseProducts.map(p => ({
        ...p,
        ...(override[p.id] || {})
      }));

      // Add admin-created products
      const adminNew = Object.values(override).filter(p => p._adminCreated);
      _products = [..._products, ...adminNew];

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
      list = list.filter(p =>
        p.brand.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (window.I18n?.t(p.nameKey) || p.nameKey).toLowerCase().includes(q)
      );
    }
    if (filters.sort === 'name_asc') list.sort((a, b) => I18n.t(a.nameKey).localeCompare(I18n.t(b.nameKey)));
    if (filters.sort === 'name_desc') list.sort((a, b) => I18n.t(b.nameKey).localeCompare(I18n.t(a.nameKey)));
    if (filters.sort === 'brand') list.sort((a, b) => a.brand.localeCompare(b.brand));
    return list;
  }

  function getBySlug(slug) {
    return _products.find(p => p.slug === slug) || null;
  }

  function getById(id) {
    return _products.find(p => p.id === id) || null;
  }

  function getCategories() { return _categories; }

  function getCategoryById(id) { return _categories.find(c => c.id === id) || null; }

  function getBrands() {
    return [...new Set(_products.map(p => p.brand))].sort();
  }

  function saveProductOverride(id, data) {
    let override = {};
    try { override = JSON.parse(localStorage.getItem(PRODUCTS_OVERRIDE_KEY)) || {}; } catch {}
    override[id] = { ...override[id], ...data };
    localStorage.setItem(PRODUCTS_OVERRIDE_KEY, JSON.stringify(override));
    // Update in memory
    const idx = _products.findIndex(p => p.id === id);
    if (idx >= 0) Object.assign(_products[idx], data);
    else _products.push({ id, ...data });
  }

  function deleteProductOverride(id) {
    let override = {};
    try { override = JSON.parse(localStorage.getItem(PRODUCTS_OVERRIDE_KEY)) || {}; } catch {}
    if (override[id]?._adminCreated) {
      delete override[id];
      _products = _products.filter(p => p.id !== id);
    } else {
      override[id] = { ...override[id], _hidden: true };
      const idx = _products.findIndex(p => p.id === id);
      if (idx >= 0) _products[idx]._hidden = true;
    }
    localStorage.setItem(PRODUCTS_OVERRIDE_KEY, JSON.stringify(override));
  }

  function resetProductOverrides() {
    localStorage.removeItem(PRODUCTS_OVERRIDE_KEY);
  }

  return { init, getProducts, getBySlug, getById, getCategories, getCategoryById, getBrands, saveProductOverride, deleteProductOverride, resetProductOverrides };
})();

window.MedData = MedData;

/**
 * MedHub Cart — localStorage-based cart state
 */
const Cart = (() => {
  const STORAGE_KEY = 'medhub_cart';

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  }

  function save(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    _notify();
  }

  function add(product, qty = 1) {
    const items = getAll();
    const idx = items.findIndex(i => i.id === product.id);
    if (idx >= 0) {
      items[idx].qty = Math.min(items[idx].qty + qty, 99);
    } else {
      items.push({
        id: product.id,
        slug: product.slug,
        nameKey: product.nameKey,
        brand: product.brand,
        sku: product.sku,
        image: product.images?.[0] || product.image,
        qty
      });
    }
    save(items);
  }

  function remove(productId) {
    save(getAll().filter(i => i.id !== productId));
  }

  function setQty(productId, qty) {
    const items = getAll();
    const idx = items.findIndex(i => i.id === productId);
    if (idx < 0) return;
    if (qty <= 0) { remove(productId); return; }
    items[idx].qty = Math.min(qty, 99);
    save(items);
  }

  function clear() { save([]); }

  function count() {
    return getAll().reduce((s, i) => s + i.qty, 0);
  }

  function _notify() {
    document.dispatchEvent(new CustomEvent('cartUpdate', { detail: { count: count() } }));
    _updateBadge();
  }

  function _updateBadge() {
    const n = count();
    document.querySelectorAll('.cart-badge').forEach(el => {
      el.textContent = n;
      el.classList.toggle('hidden', n === 0);
    });
    document.querySelectorAll('.cart-count-label').forEach(el => {
      el.textContent = n;
    });
  }

  function init() {
    _updateBadge();
  }

  return { add, remove, setQty, clear, getAll, count, init };
})();

window.Cart = Cart;

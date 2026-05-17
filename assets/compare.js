const ComparePage = (() => {
  let products = [];

  const init = async () => {
    MedHub.initLanguageSwitcher();
    MedHub.renderCartCounter();
    MedHub.renderCartDrawer();
    document.querySelector('[data-cart-toggle]')?.addEventListener('click', () => MedHub.openCartDrawer());
    document.querySelector('[data-close-cart]')?.addEventListener('click', () => MedHub.closeCartDrawer());
    document.querySelector('[data-clear-compare]')?.addEventListener('click', () => {
      if (confirm('Очистить список сравнения?')) {
        MedHub.clearCompare();
        render();
      }
    });
    document.querySelector('[data-submit-cart]')?.addEventListener('click', () => document.getElementById('cart-inquiry-modal')?.classList.add('open'));
    document.querySelector('[data-clear-cart]')?.addEventListener('click', () => {
      if (confirm('Очистить корзину?')) {
        MedHub.clearCart();
        MedHub.renderCartDrawer();
      }
    });
    document.querySelectorAll('[data-close-cart-inquiry]').forEach(btn => btn.addEventListener('click', () => document.getElementById('cart-inquiry-modal')?.classList.remove('open')));
    document.querySelector('[data-cart-inquiry-form]')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.target;
      await MedHub.submitCartOrder({
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        company: form.company.value.trim(),
        message: form.message.value.trim(),
        lang: localStorage.getItem('medhub_lang') || 'ru',
      });
      document.getElementById('cart-inquiry-modal')?.classList.remove('open');
    });
    products = await MedHub.fetchProducts();
    render();
  };

  const getCompared = () => MedHub.getCompare();
  const getProductLabel = item => item.name || item.sku;

  const render = () => {
    const list = getCompared();
    const container = document.getElementById('compare-list');
    const table = document.getElementById('compare-table');
    const empty = document.getElementById('compare-empty');
    if (!container || !table || !empty) return;
    if (!list.length) {
      container.style.display = 'none';
      table.style.display = 'none';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    container.style.display = 'grid';
    table.style.display = 'table';
    container.innerHTML = list.map(item => {
      const product = products.find(p => p.sku === item.sku) || {};
      return `
        <article class="product-card">
          <div class="product-card__media">${product.image_url ? `<img src="${product.image_url}" alt="${getProductLabel(item)}">` : `<div class="placeholder" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#e9e6dc,#f7f2e6)"><span style="font-size:30px;color:#8f8f8f">🩺</span></div>`}</div>
          <div class="product-card__body">
            <h3 class="product-card__name"><a href="product.html?sku=${encodeURIComponent(item.sku)}">${trim(item.name)}</a></h3>
            <div class="product-card__price">${item.price ? MedHub.formatPrice(item.price) : 'Цена по запросу'}</div>
            <div class="product-card__meta">${item.in_stock ? 'В наличии' : 'Уточняйте'}</div>
            <button class="btn outline" type="button" onclick="MedHub.removeFromCompare('${item.sku}'); ComparePage.render();">Удалить</button>
          </div>
        </article>`;
    }).join('');

    const details = ['sku', 'brand', 'category', 'price', 'availability'];
    const rows = {
      sku: { label: 'Артикул', values: list.map(item => item.sku) },
      brand: { label: 'Бренд', values: list.map(item => (products.find(p => p.sku === item.sku)?.brand || 'Aesculap')) },
      category: { label: 'Категория', values: list.map(item => (products.find(p => p.sku === item.sku)?.category || '—')) },
      price: { label: 'Цена', values: list.map(item => item.price ? MedHub.formatPrice(item.price) : 'Цена по запросу') },
      availability: { label: 'Наличие', values: list.map(item => (item.in_stock ? 'В наличии' : 'Уточняйте')) },
    };

    table.innerHTML = `
      <thead><tr><th>Характеристика</th>${list.map(item => `<th>${item.sku}</th>`).join('')}</tr></thead>
      <tbody>${Object.values(rows).map(row => `
        <tr>
          <th>${row.label}</th>
          ${row.values.map(value => `<td>${value}</td>`).join('')}
        </tr>
      `).join('')}</tbody>`;
  };

  const trim = text => text?.length > 70 ? text.slice(0, 67) + '…' : text || '—';

  return { init, render };
})();
window.ComparePage = ComparePage;
window.addEventListener('DOMContentLoaded', ComparePage.init);

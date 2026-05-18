/**
 * MedHub — Global JS
 * Runs on every page.
 */

// Toast notification helper
function showToast(msg, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
window.showToast = showToast;

// Resolve product name — supports translation keys AND direct name_ru/name_en/name_zh fields
function getProductName(product) {
  const lang = window.I18n?.currentLang() || 'ru';
  // Language-specific direct field (e.g. name_en, name_zh)
  if (lang !== 'ru') {
    const direct = product[`name_${lang}`];
    if (direct) return direct;
  }
  // Russian direct field or fallback
  if (product.name) return product.name;
  // Translation key system
  if (!product.nameKey) return 'Товар';
  const translated = window.I18n?.t(product.nameKey);
  return (!translated || translated === product.nameKey) ? (product.name || product.nameKey) : translated;
}
window.getProductName = getProductName;

// Resolve product description — same multilingual logic
function getProductDesc(product) {
  const lang = window.I18n?.currentLang() || 'ru';
  if (lang !== 'ru') {
    const direct = product[`description_${lang}`];
    if (direct) return direct;
  }
  if (product.description) return product.description;
  if (!product.descriptionKey) return '';
  const translated = window.I18n?.t(product.descriptionKey);
  return (!translated || translated === product.descriptionKey) ? (product.description || '') : translated;
}
window.getProductDesc = getProductDesc;

// Render product card HTML
function renderProductCard(product) {
  const name = getProductName(product);
  const badges = [];
  if (product.isNew) badges.push(`<span class="badge badge-new">${I18n.t('label_new')}</span>`);
  if (product.isSale) badges.push(`<span class="badge badge-sale">${I18n.t('label_sale')}</span>`);

  const priceStr = window.formatPrice ? formatPrice(product.price) : null;
  const unit = product.unit ? `<span class="product-card__unit">/ ${product.unit}</span>` : '';

  const priceBlock = priceStr
    ? `<div class="product-card__price">${priceStr}${unit}</div>`
    : `<div class="product-card__price product-card__price--request">По запросу</div>`;

  const productJson = JSON.stringify({ id: product.id, slug: product.slug, nameKey: product.nameKey, brand: product.brand, sku: product.sku, image: product.image }).replace(/"/g, '&quot;');

  return `
    <article class="product-card" onclick="location.href='${getBase()}/product.html?slug=${product.slug}'" role="link" tabindex="0">
      <div class="product-card__image">
        <img src="${product.image}" alt="${name}" loading="lazy" onerror="this.src='https://placehold.co/600x400/eef2f7/1a3a5c?text=${encodeURIComponent(product.brand)}'">
        ${badges.length ? `<div class="product-card__badges">${badges.join('')}</div>` : ''}
      </div>
      <div class="product-card__body">
        <div class="product-card__brand">${product.brand}</div>
        <div class="product-card__name">${name}</div>
        <div class="product-card__sku">SKU: ${product.sku}</div>
        ${priceBlock}
      </div>
      <div class="product-card__footer">
        <button class="btn btn-green btn-sm" onclick="event.stopPropagation(); Cart.add(${productJson}); showToast(I18n.t('btn_add_cart'))">${I18n.t('btn_add_cart')}</button>
        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); openInquiryModal(${productJson})">${priceStr ? I18n.t('btn_inquiry').slice(0,8) : I18n.t('btn_request_product')}</button>
      </div>
    </article>`;
}
window.renderProductCard = renderProductCard;

function getBase() {
  return window.I18n?.getBase ? window.I18n.getBase() : '.';
}
window.getBase = getBase;

// Inquiry modal (quick inquiry from product page)
function openInquiryModal(product) {
  const existing = document.getElementById('inquiry-modal');
  if (existing) existing.remove();

  const name = window.I18n?.t(product.nameKey) || product.nameKey;
  const modal = document.createElement('div');
  modal.id = 'inquiry-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal__header">
        <div class="modal__title">${I18n.t('btn_request_product')}</div>
        <button class="modal__close" onclick="document.getElementById('inquiry-modal').remove()" aria-label="Close">✕</button>
      </div>
      <div class="modal__body">
        <div style="background:var(--color-bg-light);border-radius:10px;padding:14px 16px;margin-bottom:20px;font-size:14px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:4px;">${product.brand}</div>
          <div style="font-weight:600;">${name}</div>
          <div style="font-size:12px;color:var(--color-text-light);margin-top:4px;">SKU: ${product.sku}</div>
        </div>
        <form id="quick-inquiry-form">
          <div class="form-group">
            <label class="form-label" data-i18n="form_company">${I18n.t('form_company')} <span>*</span></label>
            <input class="form-input" name="company" required data-i18n-placeholder="form_company_placeholder" placeholder="${I18n.t('form_company_placeholder')}">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group">
              <label class="form-label" data-i18n="form_contact_name">${I18n.t('form_contact_name')} <span>*</span></label>
              <input class="form-input" name="contact" required data-i18n-placeholder="form_contact_placeholder" placeholder="${I18n.t('form_contact_placeholder')}">
            </div>
            <div class="form-group">
              <label class="form-label" data-i18n="form_phone">${I18n.t('form_phone')} <span>*</span></label>
              <input class="form-input" name="phone" type="tel" required data-i18n-placeholder="form_phone_placeholder" placeholder="${I18n.t('form_phone_placeholder')}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" data-i18n="form_email">${I18n.t('form_email')}</label>
            <input class="form-input" name="email" type="email" placeholder="email@clinic.ru">
          </div>
          <div class="form-group">
            <label class="form-label" data-i18n="form_message">${I18n.t('form_message')}</label>
            <textarea class="form-textarea" name="message" rows="3" data-i18n-placeholder="form_message_placeholder" placeholder="${I18n.t('form_message_placeholder')}"></textarea>
          </div>
          <input type="hidden" name="productId" value="${product.id}">
          <input type="hidden" name="productName" value="${name}">
          <input type="hidden" name="productSku" value="${product.sku}">
        </form>
      </div>
      <div class="modal__footer">
        <button class="btn btn-ghost" onclick="document.getElementById('inquiry-modal').remove()">${I18n.t('btn_save') !== 'btn_save' ? 'Отмена' : 'Cancel'}</button>
        <button class="btn btn-primary" onclick="submitQuickInquiry()">${I18n.t('btn_submit')}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}
window.openInquiryModal = openInquiryModal;

function submitQuickInquiry() {
  const form = document.getElementById('quick-inquiry-form');
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  saveInquiry(data);
  document.getElementById('inquiry-modal').remove();
  showToast(I18n.t('form_success'));
}
window.submitQuickInquiry = submitQuickInquiry;

function saveInquiry(data) {
  const STORAGE_KEY = 'medhub_inquiries';
  let inquiries = [];
  try { inquiries = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch {}
  inquiries.unshift({
    id: `inq-${Date.now()}`,
    date: new Date().toISOString(),
    status: 'new',
    ...data
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inquiries));
}
window.saveInquiry = saveInquiry;

// Init on every page
async function initPage() {
  await I18n.init();
  Cart.init();

  // Language switcher buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => I18n.switchTo(btn.dataset.lang));
  });

  // Cart button link
  document.querySelectorAll('.header__cart-btn').forEach(btn => {
    btn.addEventListener('click', () => location.href = `${getBase()}/cart.html`);
  });

  // Header inquiry button
  document.querySelectorAll('.header__inquiry-btn').forEach(btn => {
    btn.addEventListener('click', () => location.href = `${getBase()}/cart.html`);
  });

  // Search form
  const searchInput = document.querySelector('.header__search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && searchInput.value.trim()) {
        location.href = `${getBase()}/catalog.html?search=${encodeURIComponent(searchInput.value.trim())}`;
      }
    });
  }

  // Re-apply i18n on lang change
  document.addEventListener('langChange', () => {
    I18n.applyToPage();
    // Pages can listen for this to re-render dynamic content
  });
}

document.addEventListener('DOMContentLoaded', initPage);

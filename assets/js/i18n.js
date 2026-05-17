/**
 * MedHub i18n module
 * Supported: ru | en | zh
 */
const I18n = (() => {
  const SUPPORTED = ['ru', 'en', 'zh'];
  const DEFAULT = 'ru';
  const STORAGE_KEY = 'medhub_lang';
  let _translations = {};
  let _lang = DEFAULT;

  function getStoredLang() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }
  function setStoredLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }

  async function load(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT;
    try {
      const base = getBase();
      const res = await fetch(`${base}/data/translations/${lang}.json`);
      if (!res.ok) throw new Error('404');
      _translations = await res.json();
      _lang = lang;
    } catch (e) {
      console.warn('i18n: failed to load', lang, e);
    }
  }

  function getBase() {
    // Works from any subfolder depth
    const parts = location.pathname.split('/').filter(Boolean);
    // Count depth from root (how many dirs deep we are)
    // index.html is at root → base is '.'
    // admin/index.html → base is '..'
    const depth = parts.length > 0 && parts[parts.length - 1].includes('.') ? parts.length - 1 : parts.length;
    return depth === 0 ? '.' : Array(depth).fill('..').join('/');
  }

  function t(key, vars = {}) {
    let str = _translations[key] || key;
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, v);
    }
    return str;
  }

  function currentLang() { return _lang; }

  async function init() {
    const stored = getStoredLang();
    const browserLang = navigator.language?.slice(0, 2);
    const detected = SUPPORTED.includes(stored) ? stored
      : SUPPORTED.includes(browserLang) ? browserLang
      : DEFAULT;
    await load(detected);
    applyToPage();
    updateLangButtons();
    return _lang;
  }

  async function switchTo(lang) {
    await load(lang);
    setStoredLang(lang);
    applyToPage();
    updateLangButtons();
    // Fire event for dynamic re-render
    document.dispatchEvent(new CustomEvent('langChange', { detail: { lang } }));
  }

  function applyToPage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
    // Update html lang attribute
    document.documentElement.lang = _lang === 'zh' ? 'zh-CN' : _lang;
  }

  function updateLangButtons() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === _lang);
    });
  }

  return { init, switchTo, t, currentLang, applyToPage, getBase };
})();

window.I18n = I18n;

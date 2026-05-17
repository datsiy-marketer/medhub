const fs = require('fs');
const path = require('path');
const products = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../products_aesculap.json'), 'utf8'));
const site = 'https://medhub.ru';
const pages = [
  '/',
  '/index.html',
  '/compare.html',
  '/product.html',
];
const urls = new Set(pages);
products.forEach(p => {
  if (p.is_published !== false) {
    urls.add(`/product.html?sku=${encodeURIComponent(p.sku)}`);
    if (p.slug) urls.add(`/product.html?slug=${encodeURIComponent(p.slug)}`);
  }
});
const now = new Date().toISOString();
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].map(u => `  <url>\n    <loc>${site}${u}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${u === '/' ? '1.0' : '0.7'}</priority>\n  </url>`).join('\n')}\n</urlset>`;
fs.writeFileSync(path.resolve(__dirname, '../sitemap.xml'), xml, 'utf8');
console.log('sitemap.xml generated with', urls.size, 'entries');

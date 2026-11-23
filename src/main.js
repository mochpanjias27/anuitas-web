import './styles.css';
import { renderHome } from './views/home.js';
import { renderCase } from './views/case.js';
import { renderRumus } from './views/rumus.js';
import { renderQuiz } from './views/quiz.js';
import { store } from './lib/store.js';

const app = document.getElementById('app');
let cleanup = () => {};

// Navigasi ringkas untuk layar kecil
const mnav = document.createElement('nav');
mnav.className = 'mnav'; mnav.setAttribute('aria-label', 'Navigasi');
mnav.innerHTML = document.querySelector('.nav-links').innerHTML;
document.querySelector('.nav').after(mnav);

function route() {
  const h = location.hash.replace(/^#/, '') || '/';
  cleanup();
  let key = 'home';
  const m = h.match(/^\/kasus\/(\d+)/);
  if (m) { key = 'kasus'; cleanup = renderCase(app, Number(m[1])); }
  else if (h.startsWith('/rumus')) { key = 'rumus'; cleanup = renderRumus(app); }
  else if (h.startsWith('/latihan')) { key = 'latihan'; cleanup = renderQuiz(app); }
  else cleanup = renderHome(app);
  document.querySelectorAll('[data-nav]').forEach(a => {
    if (a.dataset.nav === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const titles = { home: 'Anuitas Lab', kasus: 'Studi Kasus', rumus: 'Ringkasan Rumus', latihan: 'Uji Pemahaman' };
  document.title = `${titles[key]} · Anuitas Lab · Matematika Keuangan Unpad`;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ---------- Identitas (nama & NPM) ---------- */
const whoBtn = document.getElementById('whoBtn');
const modal = document.getElementById('modal');
const paintWho = () => { const w = store.who(); whoBtn.textContent = w?.name ? `${w.name} · ${w.npm}` : 'Isi Nama & NPM'; };
whoBtn.addEventListener('click', () => {
  const w = store.who() || {};
  document.getElementById('fName').value = w.name || '';
  document.getElementById('fNpm').value = w.npm || '';
  modal.classList.add('show'); document.getElementById('fName').focus();
});
const closeModal = () => { modal.classList.remove('show'); whoBtn.focus(); };
document.getElementById('mClose').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('show')) closeModal(); });
document.getElementById('whoForm').addEventListener('submit', e => {
  e.preventDefault();
  store.setWho({ name: document.getElementById('fName').value.trim(), npm: document.getElementById('fNpm').value.trim() });
  paintWho(); closeModal();
  window.dispatchEvent(new Event('who-changed'));
});
paintWho();

// Tunggu font (tekstur "Rp" pada koin digambar dengan Unbounded), maksimal 1,5 detik
Promise.race([
  document.fonts ? document.fonts.load('800 64px Unbounded').then(() => document.fonts.ready) : Promise.resolve(),
  new Promise(r => setTimeout(r, 1500)),
]).finally(() => {
  window.addEventListener('hashchange', route);
  route();
});

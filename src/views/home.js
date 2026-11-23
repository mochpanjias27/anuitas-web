// Beranda: hero 3D, katalog studi kasus dengan progres, pintu ke Ringkasan Rumus & Uji Pemahaman.
import { CASES, UPCOMING, levelTone } from '../data/cases.js';
import { pad2 } from '../lib/format.js';
import { store } from '../lib/store.js';
import { act, it, frac } from '../lib/math.js';
import { createHero } from '../three/hero.js';
import { registerView, unregisterView, webglAvailable } from '../three/common.js';

export function renderHome(app) {
  const done = CASES.filter(c => store.caseState(c.id).done).length;
  const next = CASES.find(c => !store.caseState(c.id).done) || CASES[0];
  app.innerHTML = `
  <header class="hero">
    <div>
      <span class="tag"><i></i>Anuitas · Nilai Sekarang</span>
      <h1>Anuitas di periode mendatang,<br><span class="hl">berapa nilainya saat ini?</span></h1>
      <p class="lead">Lihat setiap pembayaran meluncur dari periode mendatang ke saat ini dan menyusut karena bunga. Lalu putuskan pilihan yang paling menguntungkan dalam studi kasus nyata.</p>
      <div class="hero-cta">
        <a class="btn btn-volt" href="#/kasus/${next.id}">${done ? 'Lanjutkan' : 'Mulai'} Studi Kasus ${pad2(next.id)} <span class="arr">→</span></a>
        <a class="btn btn-glass" href="#/latihan">Uji Pemahaman</a>
      </div>
      <div class="specs">
        <div><b>${done}/${CASES.length}</b><span>kasus selesai</span></div>
        <div><b>5</b><span>alat interaktif</span></div>
        <div><b>4</b><span>jenis anuitas</span></div>
      </div>
    </div>
    <div class="stage">
      <div class="hero-canvas" id="heroCanvas" aria-hidden="true"></div>
      <div class="holo holo-pv hud">
        <span class="mono-label">Nilai sekarang · live</span>
        <div class="big" id="hpv">Rp0</div>
        <div class="terms" id="hterms"></div>
        <div class="meta"><span class="pill">A = 4 jt</span><span class="pill c">i = 5%</span><span class="pill">n = 5</span></div>
      </div>
      <div class="holo holo-f hud">
        <span class="mono-label">Rumus</span>
        <div class="f" style="margin-top:6px">${it('PV')} = ${it('A')} · ${act('a', 'n')} = ${it('A')} · ${frac(`1 − ${it('v')}<sup>n</sup>`, it('i'))}</div>
      </div>
    </div>
  </header>

  <section id="daftar">
    <div class="sec-head">
      <div><span class="mono-label">Katalog</span><h2>Studi kasus</h2></div>
      <p>Bebas dipilih. Kalau baru mulai, ikuti urutannya dari Kasus 01. Setiap kasus berisi situasi, tebakan, lintasan waktu 3D, Mesin Hitung, dan eksperimen.</p>
    </div>
    <div class="grid">
      ${CASES.map(c => {
        const d = store.caseState(c.id).done;
        return `<a class="card ccard ${d ? 'done' : ''}" href="#/kasus/${c.id}">
          <span class="mono-label">Kasus ${pad2(c.id)}</span><h3>${c.title}</h3><p>${c.short}</p>
          <div class="chips"><span class="chip ${levelTone(c.level)}">${c.level}</span>${d ? '<span class="chip ink">Selesai</span>' : ''}</div></a>`;
      }).join('')}
      ${UPCOMING.map(c => `<div class="card ccard soon"><span class="mono-label">Kasus ${pad2(c.id)}</span><h3>${c.title}</h3><p>${c.short}</p>
          <div class="chips"><span class="chip ${levelTone(c.level)}">${c.level}</span><span class="chip g">Segera</span></div></div>`).join('')}
    </div>
  </section>

  <section>
    <div class="entry">
      <div class="card hud"><span class="mono-label">Pelengkap</span><h3>Ringkasan Rumus</h3>
        <p>Semua rumus anuitas dalam satu halaman, plus penurunan rumus nilai sekarang dari deret geometri langkah demi langkah.</p>
        <a class="btn btn-glass" href="#/rumus">Buka ringkasan <span class="arr">→</span></a></div>
      <div class="card hud"><span class="mono-label">Refleksi</span><h3>Uji Pemahaman</h3>
        <p>10 soal acak dengan pembahasan sesuai angka soalmu, deteksi kesalahan umum, dan skor per topik. Ulangi sesering yang kamu mau.</p>
        <a class="btn btn-volt" href="#/latihan">Mulai latihan <span class="arr">→</span></a></div>
    </div>
  </section>`;

  let hero = null;
  if (webglAvailable()) {
    try { hero = createHero(app.querySelector('#heroCanvas'), { pv: app.querySelector('#hpv'), terms: app.querySelector('#hterms') }); registerView(hero); }
    catch (e) { console.error(e); hero = null; }
  }
  return () => { if (hero) { unregisterView(hero); hero.destroy(); } };
}

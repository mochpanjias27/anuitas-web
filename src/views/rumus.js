// Ringkasan rumus + penurunan nilai sekarang anuitas biasa dari deret geometri.
import { act, it, frac } from '../lib/math.js';
import { rp } from '../lib/format.js';
import { aAngle } from '../lib/finance.js';

const v = it('v'), A = it('A'), i = it('i'), n = it('n'), m = it('m'), PV = it('PV');
const CARDS = [
  { t: 'Faktor diskon', f: `${v} = ${frac('1', `1 + ${i}`)}`, d: `Nilai hari ini dari Rp1 yang diterima satu periode lagi. Rp1 di akhir periode ke-${it('t')} bernilai ${v}<sup>t</sup> hari ini.`, link: 2 },
  { t: 'Anuitas biasa', f: `${PV} = ${A}·${act('a', 'n')} = ${A}·${frac(`1 − ${v}<sup>n</sup>`, i)}`, d: 'Pembayaran di akhir setiap periode, mulai periode pertama.', link: 1 },
  { t: 'Anuitas di muka', f: `${PV} = ${A}·${act('ä', 'n')} = ${A}·${act('a', 'n')}·(1 + ${i})`, d: 'Pembayaran di awal setiap periode, mulai hari ini. Setiap pembayaran maju satu periode, jadi nilainya dikali (1 + i).', link: 5 },
  { t: 'Anuitas ditunda', f: `${PV} = ${A}·${v}<sup>m</sup>·${act('a', 'n')}`, d: `Ditunda ${m} periode: pembayaran pertama di akhir periode ke-(${m} + 1). Hitung seperti anuitas biasa, lalu diskontokan ${m} periode lagi.`, link: 6 },
  { t: 'Perpetuitas', f: `${act('a', '∞')} = ${frac('1', i)}, &nbsp; ${PV} = ${frac(A, i)}`, d: `Pembayaran tanpa akhir. Karena ${v}<sup>n</sup> → 0 untuk ${n} → ∞, faktor anuitas mendekati 1/${i}.` },
  { t: 'Mencari angsuran', f: `${A} = ${frac(PV, act('a', 'n'))} = ${frac(`${PV}·${i}`, `1 − ${v}<sup>n</sup>`)}`, d: 'Dipakai untuk cicilan pinjaman: nilai sekarang semua angsuran harus sama dengan pokok pinjaman.', link: 3 },
  { t: 'Mencari jumlah periode', f: `${n} = ${frac(`−ln(1 − ${PV}·${i}/${A})`, `ln(1 + ${i})`)}`, d: 'Diperoleh dengan menyelesaikan PV = A·(1 − vⁿ)/i untuk n. Untuk i, gunakan pendekatan numerik.' },
  { t: 'Bunga nominal', f: `${i} = ${frac(`${it('j')}<sub>m</sub>`, m)}`, d: 'j₁₂ = 12% artinya bunga 1% per bulan. Satuan periode i harus sama dengan jarak antarpembayaran.', link: 1 },
  { t: 'Nilai akan datang', f: `${act('s', 'n')} = ${frac(`(1 + ${i})<sup>n</sup> − 1`, i)}, &nbsp; ${act('s̈', 'n')} = ${act('s', 'n')}·(1 + ${i})`, d: 'Akumulasi tabungan berkala di akhir periode ke-n. Kaitannya dengan PV: s = a·(1 + i)ⁿ.' },
];

const STEPS = [
  { m: `${PV} = ${A}${v} + ${A}${v}<sup>2</sup> + ${A}${v}<sup>3</sup> + … + ${A}${v}<sup>n</sup>`, p: 'Tulis nilai sekarang setiap pembayaran, lalu jumlahkan. Ini deret geometri dengan suku pertama Av dan rasio v.' },
  { m: `${v}·${PV} = ${A}${v}<sup>2</sup> + ${A}${v}<sup>3</sup> + … + ${A}${v}<sup>n</sup> + ${A}${v}<sup>n+1</sup>`, p: 'Kalikan kedua ruas dengan rasio v. Semua suku bergeser satu pangkat.' },
  { m: `${PV} − ${v}·${PV} = ${A}${v} <span class="strike">+ ${A}${v}<sup>2</sup> + … + ${A}${v}<sup>n</sup></span> − ${A}${v}<sup>n+1</sup>`, p: 'Kurangkan persamaan kedua dari persamaan pertama. Suku-suku di tengah saling menghapus.' },
  { m: `${PV}(1 − ${v}) = ${A}${v}(1 − ${v}<sup>n</sup>)`, p: 'Faktorkan kedua ruas.' },
  { m: `1 − ${v} = ${i}${v} &nbsp;⇒&nbsp; ${PV} = ${A}·${frac(`1 − ${v}<sup>n</sup>`, i)} = ${A}·${act('a', 'n')}`, p: 'Karena 1 − v = 1 − 1/(1+i) = i/(1+i) = iv, faktor v di kedua ruas saling menghapus. Selesai.' },
  { m: `4.000.000 · ${frac('1 − 1,05<sup>−5</sup>', '0,05')} = <b>${rp(4e6 * aAngle(5, 0.05), 0)}</b>`, p: 'Cek dengan Proyek C (Rp4 jt per tahun, 5 tahun, i = 5%): hasilnya sama dengan menjumlah kelima suku satu per satu.' },
];

export function renderRumus(app) {
  app.innerHTML = `
  <section class="page-top">
    <div class="sec-head">
      <div><span class="mono-label">Pelengkap</span><h1>Ringkasan rumus anuitas</h1></div>
      <p>Notasi aktuaria: ${act('a', 'n')} dibaca "a angle n pada i", nilai sekarang anuitas Rp1 per periode selama n periode.</p>
    </div>
    <div class="rgrid">
      ${CARDS.map(c => `<div class="card rcard"><span class="mono-label">${c.t}</span><div class="big-f"><span class="f">${c.f}</span></div><p>${c.d}</p>${c.link ? `<a class="link-btn" href="#/kasus/${c.link}">Lihat di Studi Kasus ${String(c.link).padStart(2, '0')}</a>` : ''}</div>`).join('')}
    </div>

    <div class="card derive hud">
      <span class="mono-label">Dari deret ke rumus</span>
      <h2 style="font-size:24px;margin-top:8px">Mengapa ${PV} = ${A}·(1 − ${v}<sup>n</sup>)/${i}?</h2>
      <div class="dsteps" id="dsteps"></div>
      <div class="chips" style="gap:8px">
        <button class="btn btn-volt" type="button" id="dNext">Langkah berikutnya <span class="arr">→</span></button>
        <button class="btn btn-glass" type="button" id="dAll">Tampilkan semua</button>
        <button class="btn btn-glass" type="button" id="dReset">Ulangi</button>
      </div>
    </div>
  </section>`;
  let k = 0;
  const box = app.querySelector('#dsteps'), next = app.querySelector('#dNext');
  const paint = () => {
    box.innerHTML = STEPS.slice(0, k).map((s, j) => `<div class="dstep"><div class="k">${String(j + 1).padStart(2, '0')}</div><div><div class="math"><span class="f">${s.m}</span></div><p>${s.p}</p></div></div>`).join('') ||
      '<p class="note">Tekan "Langkah berikutnya" untuk mulai dari penjumlahan suku-suku nilai sekarang.</p>';
    next.disabled = k >= STEPS.length;
  };
  next.addEventListener('click', () => { k = Math.min(STEPS.length, k + 1); paint(); });
  app.querySelector('#dAll').addEventListener('click', () => { k = STEPS.length; paint(); });
  app.querySelector('#dReset').addEventListener('click', () => { k = 0; paint(); });
  paint();
  return () => {};
}

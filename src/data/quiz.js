// Generator soal Uji Pemahaman. Angka diacak setiap percobaan; pembahasan memakai angka soal tersebut.
import { aAngle, aDue, disc } from '../lib/finance.js';
import { fmt, rp, near } from '../lib/format.js';
import { act, it, frac } from '../lib/math.js';

export const TOPICS = {
  biasa: { label: 'PV anuitas biasa', link: '#/kasus/1' },
  konversi: { label: 'Bunga nominal j12', link: '#/kasus/1' },
  cariA: { label: 'Mencari angsuran', link: '#/kasus/3' },
  dimuka: { label: 'Anuitas di muka', link: '#/kasus/5' },
  ditunda: { label: 'Anuitas ditunda', link: '#/kasus/6' },
  perpetuitas: { label: 'Perpetuitas', link: '#/rumus' },
  konsep: { label: 'Konsep', link: '#/kasus/2' },
  struktur: { label: 'Soal struktur', link: '#/rumus' },
};

const pick = a => a[Math.floor(Math.random() * a.length)];
const rint = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const shuffle = a => { const b = [...a]; for (let k = b.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [b[k], b[j]] = [b[j], b[k]]; } return b; };
const REL = 0.003; // toleransi pembulatan 0,3%
const chip = (k, v) => `<span class="pill">${k} = ${v}</span>`;
const pctS = x => fmt(x * 100, x * 100 % 1 ? 2 : 0) + '%';
const iTxt = i => fmt(i, 4);

/** Diagnosis: daftar [nilaiSalah, pesan]; dicocokkan dengan jawaban mahasiswa */
const diagnose = (x, list) => { for (const [val, msg] of list) if (Number.isFinite(val) && near(x, val, REL)) return msg; return null; };

const GEN = {
  biasa() {
    const A = pick([1, 2, 2.5, 4, 5, 10]) * 1e6, i = pick([0.04, 0.05, 0.06, 0.08, 0.1, 0.12]), n = rint(4, 12);
    const ans = A * aAngle(n, i);
    return {
      topic: 'biasa',
      text: `Pembayaran ${rp(A, 0)} diterima setiap <b>akhir</b> tahun selama ${n} tahun. Dengan bunga efektif ${pctS(i)} per tahun, berapa nilai sekarangnya?`,
      given: [chip('A', rp(A, 0)), chip('i', pctS(i)), chip('n', n)],
      answer: ans,
      explain: `${it('PV')} = ${it('A')}·${act('a', n)} = ${fmt(A, 0)} · ${frac(`1 − (1 + ${iTxt(i)})<sup>−${n}</sup>`, iTxt(i))} = ${fmt(A, 0)} · ${fmt(aAngle(n, i), 4)} = <b>${rp(ans)}</b>`,
      diag: x => diagnose(x, [[A * aDue(n, i), 'Itu nilai anuitas di muka. Pembayaran di akhir periode memakai a, bukan ä.'], [A * n, 'Itu jumlah nominal tanpa diskonto. Setiap pembayaran perlu dikali vᵗ.'], [A * aAngle(n - 1, i), 'Banyak pembayaran tertukar: periksa lagi n.']]),
    };
  },
  konversi() {
    const A = pick([150, 250, 300, 500, 750, 1000]) * 1000, j = pick([0.06, 0.09, 0.12, 0.18, 0.24]), y = pick([1, 2, 3]), n = y * 12, i = j / 12;
    const ans = A * aAngle(n, i);
    return {
      topic: 'konversi',
      text: `Cicilan ${rp(A, 0)} dibayar setiap akhir bulan selama ${y} tahun. Bunga j<sub>12</sub> = ${pctS(j)}. Berapa nilai sekarang seluruh cicilan?`,
      given: [chip('A', rp(A, 0)), chip('j₁₂', pctS(j)), chip('lama', `${y} tahun`)],
      answer: ans,
      explain: `i = ${pctS(j)} ÷ 12 = ${fmt(i * 100, 2)}% per bulan, n = ${y} × 12 = ${n}.<br><span class="f">${it('PV')} = ${fmt(A, 0)} · ${frac(`1 − (1 + ${iTxt(i)})<sup>−${n}</sup>`, iTxt(i))} = <b>${rp(ans)}</b></span>`,
      diag: x => diagnose(x, [[A * aAngle(n, j), 'Tampaknya j₁₂ dipakai langsung sebagai bunga per bulan. Bagi dulu dengan 12.'], [A * aAngle(y, i), 'n harus dalam bulan: lama tahun × 12.'], [A * aAngle(y, j), 'Satuan periode tertukar: pakai i per bulan dan n dalam bulan.'], [A * n, 'Itu jumlah nominal tanpa diskonto.']]),
    };
  },
  cariA() {
    const P = pick([5, 10, 15, 20, 25, 30]) * 1e6, j = pick([0.06, 0.09, 0.12, 0.15, 0.18]), n = pick([12, 18, 24, 36, 48]), i = j / 12;
    const a = aAngle(n, i), ans = P / a;
    return {
      topic: 'cariA',
      text: `Pinjaman ${rp(P, 0)} dilunasi dengan ${n} angsuran bulanan yang sama, dibayar setiap akhir bulan. Bunga j<sub>12</sub> = ${pctS(j)}. Berapa besar angsurannya?`,
      given: [chip('PV', rp(P, 0)), chip('j₁₂', pctS(j)), chip('n', n)],
      answer: ans,
      explain: `i = ${fmt(i * 100, 2)}% per bulan, ${act('a', n)} = ${fmt(a, 4)}.<br><span class="f">${it('A')} = ${frac(it('PV'), act('a', n))} = ${frac(fmt(P, 0), fmt(a, 4))} = <b>${rp(ans)}</b></span>`,
      diag: x => diagnose(x, [[P / n, 'Itu pinjaman dibagi rata tanpa bunga. Bagi dengan faktor anuitas, bukan dengan n.'], [P * a, 'Terbalik: A = PV ÷ a, bukan PV × a.'], [P / aAngle(n, j), 'j₁₂ harus dibagi 12 dulu.']]),
    };
  },
  dimuka() {
    const A = pick([500, 800, 1000, 1500, 2000]) * 1000, j = pick([0.06, 0.09, 0.12]), n = pick([12, 24, 36, 48]), i = j / 12;
    const ans = A * aDue(n, i);
    return {
      topic: 'dimuka',
      text: `Sewa ${rp(A, 0)} dibayar di <b>awal</b> setiap bulan selama ${n} bulan, mulai hari ini. Bunga j<sub>12</sub> = ${pctS(j)}. Berapa nilai sekarang seluruh sewa?`,
      given: [chip('A', rp(A, 0)), chip('j₁₂', pctS(j)), chip('n', n)],
      answer: ans,
      explain: `i = ${fmt(i * 100, 2)}%. ${act('ä', n)} = ${act('a', n)}·(1 + i) = ${fmt(aAngle(n, i), 4)} × ${fmt(1 + i, 4)} = ${fmt(aDue(n, i), 4)}.<br><span class="f">${it('PV')} = ${fmt(A, 0)} · ${fmt(aDue(n, i), 4)} = <b>${rp(ans)}</b></span>`,
      diag: x => diagnose(x, [[A * aAngle(n, i), 'Itu nilai anuitas biasa. Pembayaran di awal periode perlu dikali (1 + i).'], [A * aDue(n, j), 'j₁₂ harus dibagi 12 dulu.'], [A * n, 'Itu jumlah nominal tanpa diskonto.']]),
    };
  },
  ditunda() {
    const A = pick([1, 2, 3, 5]) * 1e6, i = pick([0.05, 0.06, 0.08, 0.1]), n = rint(4, 10), m = rint(2, 5);
    const ans = A * disc(i, m) * aAngle(n, i);
    return {
      topic: 'ditunda',
      text: `Sebuah beasiswa membayar ${rp(A, 0)} per tahun sebanyak ${n} kali. Pembayaran pertama diterima di akhir tahun ke-${m + 1}. Dengan bunga efektif ${pctS(i)} per tahun, berapa nilai sekarangnya?`,
      given: [chip('A', rp(A, 0)), chip('i', pctS(i)), chip('n', n), chip('pertama', `akhir tahun ke-${m + 1}`)],
      answer: ans,
      explain: `Pembayaran pertama di akhir tahun ke-${m + 1}, jadi ditunda m = ${m}.<br><span class="f">${it('PV')} = ${it('A')}·${it('v')}<sup>${m}</sup>·${act('a', n)} = ${fmt(A, 0)} · ${fmt(disc(i, m), 6)} · ${fmt(aAngle(n, i), 4)} = <b>${rp(ans)}</b></span>`,
      diag: x => diagnose(x, [[A * aAngle(n, i), 'Faktor penundaan vᵐ terlupa.'], [A * disc(i, m + 1) * aAngle(n, i), `Penundaannya m = ${m}, bukan ${m + 1}: pembayaran pertama di akhir periode ke-(m + 1).`], [A * disc(i, m - 1) * aAngle(n, i), `Penundaannya m = ${m}, bukan ${m - 1}.`]]),
    };
  },
  perpetuitas() {
    const A = pick([12, 24, 30, 60, 90]) * 1e6, i = pick([0.04, 0.05, 0.0575, 0.06, 0.08]);
    const ans = A / i;
    return {
      topic: 'perpetuitas',
      text: `Sebuah yayasan ingin memberikan beasiswa ${rp(A, 0)} setiap akhir tahun untuk selamanya. Dengan bunga efektif ${pctS(i)} per tahun, berapa dana abadi yang harus disiapkan hari ini?`,
      given: [chip('A', rp(A, 0)), chip('i', pctS(i)), chip('n', '∞')],
      answer: ans,
      explain: `Untuk n → ∞, ${act('a', '∞')} = 1/i.<br><span class="f">${it('PV')} = ${frac(it('A'), it('i'))} = ${frac(fmt(A, 0), fmt(i, 4))} = <b>${rp(ans)}</b></span>`,
      diag: x => diagnose(x, [[A * i, 'Terbalik: PV = A ÷ i.'], [A / (i * 100), 'i harus ditulis sebagai desimal, bukan persen.']]),
    };
  },
  struktur() {
    const A = pick([1, 2, 5]) * 1e6, i = pick([0.05, 0.06, 0.08]), n = rint(3, 6);
    const v = 1 / (1 + i);
    let ans = 0; for (let k = 0; k < n; k++) ans += A * Math.pow(v, 2 * k + 1);
    return {
      topic: 'struktur',
      text: `Pembayaran ${rp(A, 0)} dilakukan di akhir setiap tahun <b>ganjil</b> (tahun 1, 3, 5, …) sebanyak ${n} kali. Bunga efektif ${pctS(i)} per tahun. Berapa nilai sekarangnya?`,
      given: [chip('A', rp(A, 0)), chip('i', pctS(i)), chip('banyak bayar', n)],
      answer: ans,
      explain: `Deret geometri dengan suku pertama Av dan rasio v²: ${it('PV')} = ${it('A')}${it('v')} + ${it('A')}${it('v')}<sup>3</sup> + … + ${it('A')}${it('v')}<sup>${2 * n - 1}</sup>.<br><span class="f">${it('PV')} = ${frac(`${it('A')}${it('v')}(1 − ${it('v')}<sup>${2 * n}</sup>)`, `1 − ${it('v')}<sup>2</sup>`)} = <b>${rp(ans)}</b></span>`,
      diag: x => diagnose(x, [[A * aAngle(n, i), 'Itu anuitas biasa n tahun berturut-turut. Di sini jarak antarpembayaran 2 tahun.'], [A * aAngle(2 * n - 1, i), 'Hanya tahun ganjil yang dibayar, bukan setiap tahun.']]),
    };
  },
  konsep() {
    const bank = [
      ['Jika tingkat bunga naik sementara A dan n tetap, nilai sekarang anuitas biasa…', [['turun', 'Turun'], ['naik', 'Naik'], ['tetap', 'Tetap']], 'turun', 'Bunga lebih tinggi berarti setiap pembayaran didiskontokan lebih besar, sehingga PV turun.'],
      ['Hubungan anuitas di muka dan anuitas biasa yang benar adalah…', [['a', 'ä = a · (1 + i)'], ['b', 'ä = a ÷ (1 + i)'], ['c', 'ä = a + i']], 'a', 'Setiap pembayaran anuitas di muka terjadi satu periode lebih awal, jadi nilainya dikali (1 + i).'],
      ['Proyek A memberi 6, 5, 4, 3, 2 juta dan Proyek B memberi 2, 3, 4, 5, 6 juta (akhir tahun 1–5). Untuk i > 0…', [['A', 'PV A lebih besar'], ['B', 'PV B lebih besar'], ['S', 'PV keduanya sama']], 'A', 'Total nominal sama, tetapi uang Proyek A datang lebih awal sehingga didiskontokan lebih sedikit.'],
      ['Faktor diskon v didefinisikan sebagai…', [['a', '1 ÷ (1 + i)'], ['b', '1 + i'], ['c', '1 − i']], 'a', 'v = 1/(1 + i): nilai hari ini dari Rp1 yang diterima satu periode lagi.'],
      ['Pada anuitas biasa, pembayaran pertama terjadi…', [['a', 'Di akhir periode pertama'], ['b', 'Hari ini (t = 0)'], ['c', 'Setelah n periode']], 'a', 'Anuitas biasa dibayar di akhir setiap periode, jadi pembayaran pertama di t = 1.'],
      ['Untuk n → ∞, faktor anuitas a_n|i mendekati…', [['a', '1 ÷ i'], ['b', 'Tak hingga'], ['c', '0']], 'a', 'vⁿ → 0, sehingga (1 − vⁿ)/i → 1/i.'],
      ['Anuitas ditunda m periode. Pembayaran pertama terjadi di…', [['a', 'Akhir periode ke-(m + 1)'], ['b', 'Akhir periode ke-m'], ['c', 'Awal periode ke-m']], 'a', 'Anuitas biasa mulai di akhir periode 1; digeser m periode menjadi akhir periode m + 1.'],
      ['Bunga j₁₂ = 12% per tahun berarti bunga per bulan…', [['a', '1%'], ['b', '12%'], ['c', '0,12%']], 'a', 'Bunga nominal dibagi banyaknya konversi: 12% ÷ 12 = 1%.'],
      ['Cicilan 24 × Rp1 juta dengan bunga positif. Nilai sekarangnya…', [['a', 'Kurang dari Rp24 juta'], ['b', 'Tepat Rp24 juta'], ['c', 'Lebih dari Rp24 juta']], 'a', 'Setiap cicilan didiskontokan, jadi jumlah nilai sekarangnya lebih kecil dari total nominal.'],
    ];
    const [q, choices, ans, why] = pick(bank);
    return { topic: 'konsep', text: q, choices: shuffle(choices), answer: ans, explain: why, diag: () => null, key: q };
  },
};

/** Susun satu sesi soal dari topik yang dipilih */
export function buildQuiz(topics, count = 10) {
  const order = [];
  for (let k = 0; k < count; k++) order.push(topics[k % topics.length]);
  const qs = [], seen = new Set();
  shuffle(order).forEach(t => {
    let q = GEN[t](), guard = 0;
    while (q.key && seen.has(q.key) && guard++ < 10) q = GEN[t]();
    if (q.key) seen.add(q.key);
    qs.push(q);
  });
  return qs;
}
export const isCorrect = (q, x) => (q.choices ? x === q.answer : near(x, q.answer, REL));

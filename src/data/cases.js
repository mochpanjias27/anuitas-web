// Definisi studi kasus. Setiap angka di teks dihitung dari parameter, jadi narasi selalu cocok dengan hasil.
import { aAngle, aDue, disc, sAngle, annuityFlows, pvFlows, crossRate } from '../lib/finance.js';
import { fmt, rp, rpShort, pct } from '../lib/format.js';
import { frac, it, act } from '../lib/math.js';

/* ---------- Pembantu ---------- */
export const iOf = (p, conv) => p.j / 100 / conv;
const lump = amt => [{ t: 0, amt }];

/** Rumus PV anuitas tetap lengkap dengan angka */
export function annuityFormula({ A, n, i, type = 'biasa', m = 0 }) {
  if (i === 0) return `${it('PV')} = ${it('A')} · ${it('n')} = ${fmt(A, 0)} · ${n} = <b class="num">${rp(A * n)}</b> <span class="note">(tanpa bunga)</span>`;
  const iT = fmt(i, i < 0.01 ? 4 : 3);
  const core = frac(`1 − (1 + ${iT})<sup>−${n}</sup>`, iT);
  const pv = type === 'dimuka' ? A * aDue(n, i) : type === 'ditunda' ? A * disc(i, m) * aAngle(n, i) : A * aAngle(n, i);
  if (type === 'dimuka') return `${it('PV')} = ${it('A')}·${act('ä', n)} = ${fmt(A, 0)} · ${core} · (1 + ${iT}) = <b class="num">${rp(pv)}</b>`;
  if (type === 'ditunda') return `${it('PV')} = ${it('A')}·${it('v')}<sup>${m}</sup>${act('a', n)} = ${fmt(A, 0)} · (1 + ${iT})<sup>−${m}</sup> · ${core} = <b class="num">${rp(pv)}</b>`;
  return `${it('PV')} = ${it('A')}·${act('a', n)} = ${fmt(A, 0)} · ${core} = <b class="num">${rp(pv)}</b>`;
}
function flowsFormula(flows, i) {
  const parts = flows.map(f => `${fmt(f.amt / 1e6, 0)} jt·${it('v')}<sup>${f.t}</sup>`);
  return `${it('PV')} = ${parts.join(' + ')} = <b class="num">${rp(pvFlows(flows, i))}</b>`;
}
const lumpFormula = (amt, word) => `${it('PV')} = <b class="num">${rp(amt)}</b> <span class="note">(${word} di ${it('t')} = 0, tidak didiskontokan)</span>`;

/** Ringkasan pembanding generik: pilih PV terkecil (membayar) atau terbesar (menerima) */
function compare(streams, pvs, goal, tag = 'PV', when = 'hari ini') {
  const ranked = streams.map(s => ({ s, pv: pvs[s.key] })).sort((a, b) => (goal === 'min' ? a.pv - b.pv : b.pv - a.pv));
  const best = ranked[0], second = ranked[1];
  const diff = Math.abs(best.pv - second.pv);
  return {
    kpis: streams.map(s => [`${tag} ${s.label}`, rpShort(pvs[s.key])]),
    best: best.s, diff,
    decision: {
      tone: best.s.tone,
      text: goal === 'min'
        ? `${best.s.label} lebih murah ${rp(diff, 0)} dalam nilai ${when}. Pilih ${best.s.label}.`
        : `${best.s.label} lebih bernilai ${rp(diff, 0)} dalam nilai ${when}. Pilih ${best.s.label}.`,
    },
  };
}
const choiceStep = (q, choices, answer, ok, hint) => ({ title: 'Keputusan', q, choices, check: v => v === answer, ok, hint });
const numStep = (title, q, target, ok, hint, rel = 0.002) => ({ title, q, target, rel, ok, hint });
const typeStep = (q, answer, ok, hint) => ({
  title: 'Jenis anuitas', q,
  choices: [['biasa', 'Anuitas biasa'], ['dimuka', 'Anuitas di muka'], ['ditunda', 'Anuitas ditunda']],
  check: v => v === answer, ok, hint,
});

/* ================= KASUS 1 — Toko Oren vs Toko Hijau ================= */
const kasus1 = {
  id: 1, level: 'Dasar', title: 'Kalkulator Sains: Toko Oren atau Toko Hijau?', short: 'PV anuitas biasa, bunga nominal j12',
  unit: 'bulan', conv: 12, goal: 'min', rateLabel: 'j<sub>12</sub>',
  params: [
    { key: 'A', label: 'Cicilan A', min: 10000, max: 60000, step: 500, unit: 'rp' },
    { key: 'j', label: 'j<sub>12</sub> (% p.a.)', min: 0.5, max: 60, step: 0.5, unit: 'pct' },
    { key: 'n', label: 'n (bulan)', min: 1, max: 36, step: 1, unit: 'int' },
    { key: 'L', label: 'Harga tunai', min: 100000, max: 600000, step: 5000, unit: 'rp' },
  ],
  defaults: { A: 28000, j: 12, n: 12, L: 320000 },
  storyTitle: 'Nadia butuh kalkulator sains',
  story: p => `<p>Nadia, mahasiswi baru Matematika FMIPA Unpad, harus membeli kalkulator sains untuk kuliah. Ada dua toko di dekat kampus Jatinangor yang menjual model yang sama.</p>
    <p>Bunga yang berlaku ${fmt(p.j, 0)}% per tahun dikonversi bulanan (j<sub>12</sub> = ${fmt(p.j, 0)}%).</p>`,
  options: p => [
    { tone: 'o', name: 'Toko Oren', value: `${rp(p.A, 0)}/bln`, detail: `Diangsur setiap akhir bulan selama ${p.n} bulan. Total ${rp(p.A * p.n, 0)}.` },
    { tone: 'v', name: 'Toko Hijau', value: rp(p.L, 0), detail: 'Dibayar tunai hari ini.' },
  ],
  guess: { q: 'Sebelum menghitung, mana yang menurutmu lebih murah?', choices: [['oren', 'Toko Oren', 'cicilan'], ['hijau', 'Toko Hijau', 'tunai']] },
  streams: (p, i) => [
    { key: 'oren', label: 'Toko Oren', tone: 'o', flows: annuityFlows({ A: p.A, n: p.n }), timeline: true, formula: annuityFormula({ A: p.A, n: p.n, i }) },
    { key: 'hijau', label: 'Toko Hijau', tone: 'v', flows: lump(p.L), formula: lumpFormula(p.L, 'dibayar') },
  ],
  guessAnswer: (p, r) => r.best.key,
  summarize: (p, i, s, pvs) => compare(s, pvs, 'min'),
  steps: p => {
    const i = p.j / 1200, a = aAngle(p.n, i), pv = p.A * a;
    return [
      typeStep('Angsuran Toko Oren dibayar setiap akhir bulan. Termasuk jenis anuitas apa?', 'biasa',
        'Tepat. Pembayaran di akhir setiap periode berarti anuitas biasa.', 'Perhatikan kapan pembayaran pertama terjadi: di awal bulan pertama atau di akhirnya?'),
      { ...numStep('Bunga per periode', `Periode pembayaran bulanan dengan j12 = ${fmt(p.j, 0)}%. Berapa tingkat bunga per bulan i (dalam persen)?`, i * 100,
        `Benar, i = ${fmt(p.j, 0)}% ÷ 12 = ${fmt(i * 100, 0)}% per bulan.`, 'Bunga nominal j12 dibagi banyaknya konversi dalam setahun.', 0.001), alt: i },
      numStep('Faktor anuitas', `Hitung a${p.n}|${fmt(i * 100, 0)}% = (1 − ${fmt(1 + i, 2)}^−${p.n}) ÷ ${fmt(i, 2)}. Tulis sampai 4 desimal.`, a,
        `Benar, a${p.n}|${fmt(i * 100, 0)}% ≈ ${fmt(a, 4)}. Artinya Rp1 per bulan selama ${p.n} bulan bernilai Rp${fmt(a, 4)} hari ini.`,
        `Hitung dulu ${fmt(1 + i, 2)}^−${p.n} ≈ ${fmt(disc(i, p.n), 4)}, kurangkan dari 1, lalu bagi ${fmt(i, 2)}.`, 0.0005),
      numStep('Nilai sekarang', `Hitung PV = ${fmt(p.A, 0)} × a${p.n}|${fmt(i * 100, 0)}%. Tulis dalam rupiah.`, pv,
        `Benar, PV ≈ ${rp(pv)}.`, 'Kalikan angsuran dengan faktor anuitas dari tahap sebelumnya.'),
      choiceStep(`Nilai cicilan hari ini ${rp(pv, 0)}, harga tunai ${rp(p.L, 0)}. Toko mana yang dipilih?`,
        [['oren', 'Toko Oren'], ['hijau', 'Toko Hijau']], pv < p.L ? 'oren' : 'hijau',
        'Tepat. Pilih yang nilai hari ininya paling kecil, karena Nadia yang membayar.', 'Nadia membayar, jadi cari nilai sekarang yang paling kecil.'),
    ];
  },
  conclusion: p => {
    const i = p.j / 1200, pv = p.A * aAngle(p.n, i);
    return `<p>Kalau hanya dijumlah, cicilan tampak lebih mahal (${rp(p.A * p.n, 0)}). Setelah tiap angsuran didiskontokan ke hari ini, nilainya hanya ${rp(pv, 0)}, lebih murah ${rp(p.L - pv, 0)} dari harga tunai.</p>
      <p><b>Refleksi:</b> pada tingkat bunga berapa keputusan ini berbalik? Cari jawabannya di eksperimen di atas yang kini terbuka.</p>`;
  },
};

/* ================= KASUS 2 — Tiga Proyek Bisnis ================= */
const P2 = {
  A: [6, 5, 4, 3, 2], B: [2, 3, 4, 5, 6], C: [4, 4, 4, 4, 4],
};
const flows2 = arr => arr.map((x, k) => ({ t: k + 1, amt: x * 1e6 }));
const kasus2 = {
  id: 2, level: 'Dasar', title: 'Tiga Proyek Bisnis: Total Sama, Nilai Berbeda', short: 'PV arus kas tidak sama, time value of money',
  unit: 'tahun', conv: 1, goal: 'max', rateLabel: 'i',
  params: [{ key: 'j', label: 'i (% per tahun)', min: 0, max: 30, step: 0.5, unit: 'pct' }],
  defaults: { j: 5 },
  storyTitle: 'Raka memilih proyek usaha',
  story: p => `<p>Raka, alumni Matematika Unpad, ditawari tiga proyek usaha. Ketiganya menghasilkan keuntungan total Rp20 juta selama 5 tahun, diterima setiap akhir tahun. Bedanya hanya pola waktunya.</p>
    <p>Tingkat bunga efektif ${fmt(p.j, 0)}% per tahun. Proyek mana yang paling menguntungkan dinilai hari ini?</p>`,
  options: () => [
    { tone: 'o', name: 'Proyek A', value: '6 · 5 · 4 · 3 · 2 jt', detail: 'Keuntungan besar di awal, lalu menurun.' },
    { tone: 'c', name: 'Proyek B', value: '2 · 3 · 4 · 5 · 6 jt', detail: 'Keuntungan kecil di awal, lalu naik.' },
    { tone: 'v', name: 'Proyek C', value: '4 jt × 5 tahun', detail: 'Keuntungan tetap setiap tahun (anuitas).' },
  ],
  guess: { q: 'Totalnya sama-sama Rp20 juta. Menurutmu proyek mana yang paling bernilai hari ini?', choices: [['A', 'Proyek A', 'menurun'], ['B', 'Proyek B', 'naik'], ['C', 'Proyek C', 'tetap'], ['sama', 'Sama saja', 'total sama']] },
  streams: (p, i) => [
    { key: 'A', label: 'Proyek A', tone: 'o', flows: flows2(P2.A), timeline: true, formula: flowsFormula(flows2(P2.A), i) },
    { key: 'B', label: 'Proyek B', tone: 'c', flows: flows2(P2.B), timeline: true, formula: flowsFormula(flows2(P2.B), i) },
    { key: 'C', label: 'Proyek C', tone: 'v', flows: flows2(P2.C), timeline: true, formula: annuityFormula({ A: 4e6, n: 5, i }) },
  ],
  guessAnswer: (p, r) => (p.j === 0 ? 'sama' : r.best.key),
  summarize: (p, i, s, pvs) => {
    const r = compare(s, pvs, 'max');
    if (p.j === 0) r.decision = { tone: 'c', text: 'Pada i = 0 ketiga proyek bernilai sama, Rp20 juta, karena uang tidak berubah nilai terhadap waktu.' };
    r.insight = 'Untuk setiap i > 0 urutannya selalu A > C > B: uang yang datang lebih awal didiskontokan lebih sedikit. Geser i ke 0 untuk melihat ketiganya sama.';
    return r;
  },
  steps: p => {
    const i = p.j / 100, v = 1 / (1 + i);
    const pvA = pvFlows(flows2(P2.A), i), pvC = 4e6 * aAngle(5, i);
    return [
      numStep('Faktor diskon', `Pada i = ${fmt(p.j, 0)}%, berapa faktor diskon v = 1/(1 + i)? Tulis sampai 6 desimal.`, v,
        `Benar, v ≈ ${fmt(v, 6)}. Uang Rp1 tahun depan bernilai Rp${fmt(v, 4)} hari ini.`, 'Bagi 1 dengan 1,05.', 0.0002),
      numStep('Satu suku', 'Berapa nilai sekarang keuntungan tahun ke-1 Proyek A (Rp6 juta)?', 6e6 * v,
        `Benar, 6 jt × v ≈ ${rp(6e6 * v)}.`, 'Kalikan 6.000.000 dengan v dari tahap sebelumnya.'),
      numStep('PV Proyek A', 'Jumlahkan kelima suku Proyek A: 6 jt·v + 5 jt·v² + 4 jt·v³ + 3 jt·v⁴ + 2 jt·v⁵.', pvA,
        `Benar, PV Proyek A ≈ ${rp(pvA)}.`, `Suku-sukunya ≈ ${[6, 5, 4, 3, 2].map((x, k) => fmt(x * 1e6 * Math.pow(v, k + 1), 0)).join(' + ')}.`),
      numStep('PV Proyek C', 'Proyek C adalah anuitas tetap. Hitung PV = 4 jt × a5|5%.', pvC,
        `Benar, PV Proyek C ≈ ${rp(pvC)}. Rumus anuitas memberi hasil yang sama dengan menjumlah suku satu per satu.`, 'a5|5% = (1 − 1,05^−5) ÷ 0,05 ≈ 4,3295.'),
      choiceStep(`PV Proyek B ≈ ${rp(pvFlows(flows2(P2.B), i), 0)}. Proyek mana yang dipilih Raka?`,
        [['A', 'Proyek A'], ['B', 'Proyek B'], ['C', 'Proyek C']], 'A',
        'Tepat. Raka menerima uang, jadi pilih PV terbesar: Proyek A.', 'Raka menerima keuntungan, jadi cari nilai sekarang yang paling besar.'),
    ];
  },
  conclusion: p => {
    const i = p.j / 100;
    return `<p>Total nominal ketiganya sama, Rp20 juta, tetapi nilai hari ininya berbeda: A ${rp(pvFlows(flows2(P2.A), i), 0)}, C ${rp(4e6 * aAngle(5, i), 0)}, B ${rp(pvFlows(flows2(P2.B), i), 0)}. Uang yang diterima lebih awal bisa segera diinvestasikan, sehingga lebih bernilai. Inilah inti <i>time value of money</i>.</p>
      <p><b>Refleksi:</b> buka eksperimen, lalu geser i dari 0% ke 30%. Apa yang terjadi pada selisih PV Proyek A dan B?</p>`;
  },
};

/* ================= KASUS 3 — Cicilan Pinjaman ================= */
const installment = p => { const i = p.j / 1200; return p.P / aAngle(p.n, i); };
const kasus3 = {
  id: 3, level: 'Dasar', title: 'Cicilan Pinjaman 20 Juta: Berapa Angsurannya?', short: 'Mencari angsuran A dari PV',
  unit: 'bulan', conv: 12, goal: 'solve', rateLabel: 'j<sub>12</sub>',
  params: [
    { key: 'P', label: 'Pinjaman', min: 5e6, max: 50e6, step: 500000, unit: 'rp' },
    { key: 'j', label: 'j<sub>12</sub> (% p.a.)', min: 0.5, max: 36, step: 0.5, unit: 'pct' },
    { key: 'n', label: 'n (bulan)', min: 6, max: 60, step: 1, unit: 'int' },
  ],
  defaults: { P: 20e6, j: 12, n: 24 },
  storyTitle: 'Sinta meminjam untuk laptop kerja',
  story: p => `<p>Sinta baru diterima kerja dan meminjam ${rp(p.P, 0)} untuk membeli laptop. Pinjaman dilunasi dengan ${p.n} kali angsuran bulanan yang sama besar, dibayar setiap akhir bulan.</p>
    <p>Bunga pinjaman j<sub>12</sub> = ${fmt(p.j, 0)}% per tahun. Berapa angsuran yang harus Sinta siapkan setiap bulan?</p>`,
  options: p => [
    { tone: 'c', name: 'Pinjaman', value: rp(p.P, 0), detail: 'Diterima hari ini (t = 0).' },
    { tone: 'v', name: 'Angsuran', value: `${p.n} × A`, detail: 'Dibayar setiap akhir bulan. Nilai sekarangnya harus sama dengan pinjaman.' },
  ],
  guess: { q: `Kalau tanpa bunga, angsurannya ${rp(20e6 / 24, 0)} (20 jt ÷ 24). Dengan bunga 12%, angsurannya…`, choices: [['lebih', 'Lebih besar', `> ${rp(20e6 / 24, 0)}`], ['sama', 'Sama saja', `≈ ${rp(20e6 / 24, 0)}`], ['kurang', 'Lebih kecil', `< ${rp(20e6 / 24, 0)}`]] },
  streams: (p, i) => {
    const A = installment(p);
    return [
      { key: 'ang', label: 'Angsuran', tone: 'v', flows: annuityFlows({ A, n: p.n }), timeline: true, formula: annuityFormula({ A, n: p.n, i }) },
      { key: 'pin', label: 'Pinjaman', tone: 'c', flows: lump(p.P), formula: lumpFormula(p.P, 'diterima') },
    ];
  },
  guessAnswer: () => 'lebih',
  summarize: p => {
    const i = p.j / 1200, A = installment(p), tot = A * p.n;
    const p2 = { ...p, n: p.n + 12 }, A2 = installment(p2);
    return {
      kpis: [['Faktor a', fmt(aAngle(p.n, i), 4)], ['Angsuran A', rp(A)], ['Total dibayar', rpShort(tot)], ['Total bunga', rpShort(tot - p.P)]],
      decision: { tone: 'v', text: `Angsuran Sinta ${rp(A)} per bulan. Nilai sekarang seluruh angsuran tepat sama dengan pinjaman ${rp(p.P, 0)}.` },
      insight: `Jika tenor diperpanjang menjadi ${p2.n} bulan, angsuran turun menjadi ${rp(A2, 0)}, tetapi total bunga naik menjadi ${rp(A2 * p2.n - p.P, 0)}.`,
    };
  },
  pvText: p => `PV = ${rp(p.P, 0)}`,
  steps: p => {
    const i = p.j / 1200, a = aAngle(p.n, i), A = p.P / a;
    return [
      typeStep('Angsuran dibayar setiap akhir bulan mulai bulan pertama. Jenis anuitas apa?', 'biasa', 'Tepat, anuitas biasa.', 'Kapan angsuran pertama dibayar?'),
      { ...numStep('Bunga per periode', `j12 = ${fmt(p.j, 0)}%. Berapa bunga per bulan i (dalam persen)?`, i * 100, `Benar, i = ${fmt(i * 100, 0)}% per bulan.`, 'Bagi j12 dengan 12.', 0.001), alt: i },
      numStep('Faktor anuitas', `Hitung a${p.n}|${fmt(i * 100, 0)}%. Tulis sampai 4 desimal.`, a, `Benar, a${p.n}|${fmt(i * 100, 0)}% ≈ ${fmt(a, 4)}.`,
        `(1 − ${fmt(1 + i, 2)}^−${p.n}) ÷ ${fmt(i, 2)}, dengan ${fmt(1 + i, 2)}^−${p.n} ≈ ${fmt(disc(i, p.n), 4)}.`, 0.0005),
      numStep('Angsuran', `Karena PV = A · a${p.n}|, maka A = PV ÷ a${p.n}|. Hitung A.`, A, `Benar, A ≈ ${rp(A)} per bulan.`, `Bagi ${fmt(p.P, 0)} dengan faktor anuitas dari tahap sebelumnya.`),
    ];
  },
  conclusion: p => {
    const A = installment(p);
    return `<p>Angsuran ${rp(A)} lebih besar dari ${rp(p.P / p.n, 0)} karena setiap angsuran yang dibayar belakangan bernilai lebih kecil hari ini. Agar nilai sekarang semua angsuran tetap ${rp(p.P, 0)}, angsurannya harus lebih besar.</p>
      <p><b>Refleksi:</b> di eksperimen, perpanjang tenor. Angsuran turun, tetapi apa yang terjadi pada total bunga?</p>`;
  },
};

/* ================= KASUS 4 — Dana Pensiun ================= */
const kasus4 = {
  id: 4, level: 'Menengah', title: 'Dana Pensiun: Sekaligus atau Bulanan?', short: 'PV anuitas vs lump sum',
  unit: 'bulan', conv: 12, goal: 'max', rateLabel: 'j<sub>12</sub>',
  params: [
    { key: 'L', label: 'Sekaligus', min: 200e6, max: 800e6, step: 5e6, unit: 'rp' },
    { key: 'A', label: 'Bulanan A', min: 1e6, max: 10e6, step: 100000, unit: 'rp' },
    { key: 'y', label: 'Lama (tahun)', min: 5, max: 30, step: 1, unit: 'int' },
    { key: 'j', label: 'j<sub>12</sub> (% p.a.)', min: 0.5, max: 15, step: 0.25, unit: 'pct' },
  ],
  defaults: { L: 500e6, A: 4e6, y: 20, j: 6 },
  scenarios: [
    { label: 'Kasus 1', values: { L: 500e6, A: 4e6, y: 20 } },
    { label: 'Kasus 2', values: { L: 550e6, A: 4.5e6, y: 15 } },
    { label: 'Kasus 3', values: { L: 450e6, A: 5e6, y: 10 } },
  ],
  storyTitle: 'Bu Sari memasuki masa pensiun',
  story: p => `<p>Bu Sari, dosen yang akan pensiun, boleh memilih cara menerima manfaat dana pensiunnya: sekaligus di hari pensiun, atau bulanan setiap akhir bulan dalam jangka waktu tertentu.</p>
    <p>Tingkat bunga diasumsikan stabil pada j<sub>12</sub> = ${fmt(p.j, 0)}%. Ada tiga penawaran berbeda; mulai dari Kasus 1.</p>
    <div class="tbl-wrap scen-table"><table><thead><tr><th>KASUS</th><th>SEKALIGUS</th><th>BULANAN</th><th>LAMA</th></tr></thead><tbody>
    <tr><td>1</td><td>Rp500 jt</td><td>Rp4 jt</td><td>20 tahun</td></tr><tr><td>2</td><td>Rp550 jt</td><td>Rp4,5 jt</td><td>15 tahun</td></tr><tr><td>3</td><td>Rp450 jt</td><td>Rp5 jt</td><td>10 tahun</td></tr></tbody></table></div>`,
  options: p => [
    { tone: 'c', name: 'Sekaligus', value: rpShort(p.L), detail: 'Diterima penuh di hari pensiun.' },
    { tone: 'v', name: 'Bulanan', value: `${rpShort(p.A)}/bln`, detail: `Selama ${p.y} tahun (${p.y * 12} kali), setiap akhir bulan. Total ${rpShort(p.A * p.y * 12)}.` },
  ],
  guess: { q: 'Untuk Kasus 1, menurutmu mana yang lebih bernilai?', choices: [['L', 'Sekaligus', 'Rp500 jt'], ['A', 'Bulanan', 'Rp4 jt × 240']] },
  streams: (p, i) => [
    { key: 'L', label: 'Sekaligus', tone: 'c', flows: lump(p.L), formula: lumpFormula(p.L, 'diterima') },
    { key: 'A', label: 'Bulanan', tone: 'v', flows: annuityFlows({ A: p.A, n: p.y * 12 }), timeline: true, formula: annuityFormula({ A: p.A, n: p.y * 12, i }) },
  ],
  guessAnswer: (p, r) => r.best.key,
  summarize: (p, i, s, pvs) => compare(s, pvs, 'max'),
  steps: p => {
    const i = p.j / 1200, n = p.y * 12, a = aAngle(n, i), pv = p.A * a;
    return [
      { ...numStep('Bunga per periode', `Manfaat dibayar bulanan dengan j12 = ${fmt(p.j, 0)}%. Berapa i per bulan (dalam persen)?`, i * 100, `Benar, i = ${fmt(i * 100, 1)}% per bulan.`, 'Bagi j12 dengan 12.', 0.001), alt: i },
      numStep('Banyak pembayaran', `Manfaat diterima setiap bulan selama ${p.y} tahun. Berapa n?`, n, `Benar, n = ${p.y} × 12 = ${n} kali.`, 'Ubah tahun menjadi bulan.', 0),
      numStep('Faktor anuitas', `Hitung a${n}|${fmt(i * 100, 1)}%. Tulis sampai 4 desimal.`, a, `Benar, a${n}| ≈ ${fmt(a, 4)}.`,
        `(1 − ${fmt(1 + i, 3)}^−${n}) ÷ ${fmt(i, 3)}, dengan ${fmt(1 + i, 3)}^−${n} ≈ ${fmt(disc(i, n), 4)}.`, 0.0005),
      numStep('Nilai sekarang', `Hitung PV manfaat bulanan = ${fmt(p.A, 0)} × a${n}|.`, pv, `Benar, PV ≈ ${rp(pv)}.`, 'Kalikan A dengan faktor anuitas.'),
      choiceStep(`PV bulanan ${rpShort(pv)}, sekaligus ${rpShort(p.L)}. Mana yang dipilih Bu Sari?`, [['L', 'Sekaligus'], ['A', 'Bulanan']], pv > p.L ? 'A' : 'L',
        'Tepat. Bu Sari menerima uang, jadi pilih PV terbesar.', 'Bu Sari menerima manfaat, jadi cari nilai sekarang yang paling besar.'),
    ];
  },
  conclusion: p => {
    const pv = p.A * aAngle(p.y * 12, p.j / 1200);
    return `<p>Untuk Kasus 1, manfaat bulanan bernilai ${rpShort(pv)} hari ini, ${pv > p.L ? 'lebih besar' : 'lebih kecil'} dari Rp500 jt sekaligus.</p>
      <p><b>Tantangan:</b> buka eksperimen dan pilih Kasus 2 serta Kasus 3. Tebak dulu sebelum melihat hasilnya. Salah satunya sangat tipis selisihnya. Pada j<sub>12</sub> berapa keputusannya berbalik?</p>`;
  },
};

/* ================= KASUS 5 — Sewa Kos (anuitas di muka) ================= */
const kasus5 = {
  id: 5, level: 'Menengah', title: 'Sewa Kos di Jatinangor: Bulanan atau Kontrak Penuh?', short: 'Anuitas di muka',
  unit: 'bulan', conv: 12, goal: 'min', rateLabel: 'j<sub>12</sub>',
  params: [
    { key: 'A', label: 'Sewa bulanan', min: 300000, max: 4e6, step: 50000, unit: 'rp' },
    { key: 'L', label: 'Kontrak penuh', min: 10e6, max: 200e6, step: 500000, unit: 'rp' },
    { key: 'n', label: 'n (bulan)', min: 12, max: 60, step: 1, unit: 'int' },
    { key: 'j', label: 'j<sub>12</sub> (% p.a.)', min: 0.5, max: 24, step: 0.25, unit: 'pct' },
  ],
  defaults: { A: 800000, L: 34e6, n: 48, j: 6 },
  scenarios: [
    { label: 'Standar', values: { A: 800000, L: 34e6, n: 48 } },
    { label: 'Deluxe', values: { A: 1.5e6, L: 63e6, n: 48 } },
    { label: 'Premium', values: { A: 2.5e6, L: 108e6, n: 48 } },
  ],
  storyTitle: 'Mahasiswa baru mencari kos',
  story: p => `<p>Kamu mahasiswa baru yang akan menyewa kos di sekitar kampus Unpad Jatinangor selama 4 tahun studi. Pemilik kos menawarkan dua cara bayar: sewa bulanan yang dibayar <b>di awal setiap bulan</b>, atau kontrak penuh dibayar sekaligus hari ini.</p>
    <p>Tingkat bunga diasumsikan stabil pada j<sub>12</sub> = ${fmt(p.j, 0)}%. Ada tiga tipe kamar; mulai dari Tipe Standar.</p>
    <div class="tbl-wrap scen-table"><table><thead><tr><th>TIPE</th><th>BULANAN</th><th>KONTRAK PENUH</th></tr></thead><tbody>
    <tr><td>Standar</td><td>Rp800.000</td><td>Rp34 jt</td></tr><tr><td>Deluxe</td><td>Rp1.500.000</td><td>Rp63 jt</td></tr><tr><td>Premium</td><td>Rp2.500.000</td><td>Rp108 jt</td></tr></tbody></table></div>`,
  options: p => [
    { tone: 'o', name: 'Bulanan', value: `${rp(p.A, 0)}/bln`, detail: `Dibayar di awal setiap bulan, ${p.n} kali. Total ${rpShort(p.A * p.n)}.` },
    { tone: 'v', name: 'Kontrak penuh', value: rpShort(p.L), detail: 'Dibayar sekaligus hari ini.' },
  ],
  guess: { q: 'Untuk Tipe Standar, mana yang lebih murah bagi penyewa?', choices: [['A', 'Bulanan', 'Rp800 rb × 48'], ['L', 'Kontrak penuh', 'Rp34 jt']] },
  streams: (p, i) => [
    { key: 'A', label: 'Bulanan', tone: 'o', flows: annuityFlows({ A: p.A, n: p.n, type: 'dimuka' }), timeline: true, formula: annuityFormula({ A: p.A, n: p.n, i, type: 'dimuka' }) },
    { key: 'L', label: 'Kontrak penuh', tone: 'v', flows: lump(p.L), formula: lumpFormula(p.L, 'dibayar') },
  ],
  guessAnswer: (p, r) => r.best.key,
  summarize: (p, i, s, pvs) => compare(s, pvs, 'min'),
  steps: p => {
    const i = p.j / 1200, a = aAngle(p.n, i), ad = aDue(p.n, i), pv = p.A * ad;
    return [
      typeStep('Sewa bulanan dibayar di awal setiap bulan, dimulai hari ini. Jenis anuitas apa?', 'dimuka', 'Tepat. Pembayaran di awal setiap periode berarti anuitas di muka.', 'Pembayaran pertama terjadi hari ini, bukan di akhir bulan pertama.'),
      { ...numStep('Bunga per periode', `j12 = ${fmt(p.j, 0)}%. Berapa i per bulan (dalam persen)?`, i * 100, `Benar, i = ${fmt(i * 100, 1)}% per bulan.`, 'Bagi j12 dengan 12.', 0.001), alt: i },
      numStep('Faktor anuitas di muka', `Hitung ä${p.n}| = a${p.n}| × (1 + i). Tulis sampai 4 desimal.`, ad, `Benar, ä${p.n}| ≈ ${fmt(ad, 4)} (a${p.n}| ≈ ${fmt(a, 4)}).`,
        `Hitung dulu a${p.n}| = (1 − ${fmt(1 + i, 3)}^−${p.n}) ÷ ${fmt(i, 3)} ≈ ${fmt(a, 4)}, lalu kalikan ${fmt(1 + i, 3)}.`, 0.0005),
      numStep('Nilai sekarang', `Hitung PV sewa bulanan = ${fmt(p.A, 0)} × ä${p.n}|.`, pv, `Benar, PV ≈ ${rp(pv)}.`, 'Kalikan sewa bulanan dengan faktor dari tahap sebelumnya.'),
      choiceStep(`PV sewa bulanan ${rpShort(pv)}, kontrak penuh ${rpShort(p.L)}. Mana yang dipilih?`, [['A', 'Bulanan'], ['L', 'Kontrak penuh']], pv < p.L ? 'A' : 'L',
        'Tepat. Penyewa membayar, jadi pilih PV terkecil.', 'Kamu yang membayar, jadi cari nilai sekarang yang paling kecil.'),
    ];
  },
  conclusion: p => {
    const pv = p.A * aDue(p.n, p.j / 1200);
    return `<p>Untuk Tipe Standar, sewa bulanan bernilai ${rpShort(pv)} hari ini, ${pv < p.L ? 'lebih murah' : 'lebih mahal'} dari kontrak penuh Rp34 jt. Perhatikan bahwa pembayaran di awal bulan membuat nilainya ${fmt((aDue(p.n, p.j / 1200) / aAngle(p.n, p.j / 1200) - 1) * 100, 1)}% lebih besar daripada jika dibayar di akhir bulan.</p>
      <p><b>Tantangan:</b> pilih Tipe Deluxe dan Premium di eksperimen. Apakah keputusannya sama? Tukar juga ke "Anuitas biasa" di benakmu: berapa selisihnya?</p>`;
  },
};

/* ================= KASUS 6 — Beasiswa & Tunjangan (anuitas ditunda) ================= */
const kasus6 = {
  id: 6, level: 'Menengah', title: 'Beasiswa dan Tunjangan: Sekarang atau Nanti?', short: 'Anuitas ditunda',
  unit: 'bulan', conv: 12, goal: 'max', rateLabel: 'j<sub>12</sub>',
  params: [
    { key: 'L', label: 'Tunai sekarang', min: 5e6, max: 60e6, step: 500000, unit: 'rp' },
    { key: 'A', label: 'Tunjangan A', min: 200000, max: 3e6, step: 50000, unit: 'rp' },
    { key: 'n', label: 'n (bulan)', min: 6, max: 60, step: 1, unit: 'int' },
    { key: 'm', label: 'Tunda m', min: 0, max: 24, step: 1, unit: 'int' },
    { key: 'j', label: 'j<sub>12</sub> (% p.a.)', min: 0.5, max: 24, step: 0.25, unit: 'pct' },
  ],
  defaults: { L: 15e6, A: 750000, n: 24, m: 6, j: 6 },
  scenarios: [
    { label: 'Beasiswa', values: { L: 15e6, A: 750000, n: 24, m: 6 } },
    { label: 'Tunjangan kerja', values: { L: 30e6, A: 1.2e6, n: 36, m: 3 } },
  ],
  storyTitle: 'Dua tawaran untuk Dina',
  story: p => `<p>Dina mendapat dua tawaran beasiswa. <b>Beasiswa A</b>: uang tunai Rp15 juta sekarang. <b>Beasiswa B</b>: tunjangan Rp750.000 per bulan selama 24 bulan, tetapi baru dibayarkan setelah proses administrasi 6 bulan. Tunjangan pertama diterima di akhir bulan ke-7.</p>
    <p>Setelah lulus, Dina juga akan memilih antara bonus tanda tangan kontrak Rp30 juta atau tunjangan Rp1,2 juta per bulan selama 36 bulan yang dimulai setelah masa probasi 3 bulan (mulai akhir bulan ke-4). Tingkat bunga j<sub>12</sub> = ${fmt(p.j, 0)}%.</p>`,
  options: p => [
    { tone: 'c', name: 'Tunai sekarang', value: rpShort(p.L), detail: 'Diterima hari ini.' },
    { tone: 'v', name: 'Tunjangan', value: `${rp(p.A, 0)}/bln`, detail: `${p.n} kali, ditunda ${p.m} bulan (pertama di akhir bulan ke-${p.m + 1}). Total ${rpShort(p.A * p.n)}.` },
  ],
  guess: { q: 'Untuk pilihan beasiswa, mana yang lebih bernilai bagi Dina?', choices: [['L', 'Beasiswa A', 'Rp15 jt sekarang'], ['A', 'Beasiswa B', 'Rp750 rb × 24, ditunda']] },
  streams: (p, i) => [
    { key: 'L', label: 'Tunai sekarang', tone: 'c', flows: lump(p.L), formula: lumpFormula(p.L, 'diterima') },
    { key: 'A', label: 'Tunjangan', tone: 'v', flows: annuityFlows({ A: p.A, n: p.n, type: 'ditunda', m: p.m }), timeline: true, defer: p.m, formula: annuityFormula({ A: p.A, n: p.n, i, type: 'ditunda', m: p.m }) },
  ],
  guessAnswer: (p, r) => r.best.key,
  summarize: (p, i, s, pvs) => compare(s, pvs, 'max'),
  steps: p => {
    const i = p.j / 1200, a = aAngle(p.n, i), vm = disc(i, p.m), pv = p.A * vm * a;
    return [
      typeStep(`Tunjangan baru dibayar mulai akhir bulan ke-${p.m + 1}. Jenis anuitas apa?`, 'ditunda', 'Tepat, anuitas ditunda.', 'Ada masa tunggu sebelum pembayaran pertama.'),
      numStep('Masa tunda', `Pembayaran pertama di akhir bulan ke-${p.m + 1}. Berapa periode penundaan m?`, p.m, `Benar, m = ${p.m}. Pada anuitas ditunda m periode, pembayaran pertama terjadi di akhir periode ke-(m + 1).`, 'Pembayaran pertama anuitas biasa di akhir periode ke-1. Berapa periode digeser?', 0),
      numStep('Faktor anuitas', `Hitung a${p.n}|${fmt(i * 100, 1)}%. Tulis sampai 4 desimal.`, a, `Benar, a${p.n}| ≈ ${fmt(a, 4)}.`, `(1 − ${fmt(1 + i, 3)}^−${p.n}) ÷ ${fmt(i, 3)}.`, 0.0005),
      numStep('Faktor tunda', `Hitung v^${p.m} = (1 + ${fmt(i, 3)})^−${p.m}. Tulis sampai 6 desimal.`, vm, `Benar, v^${p.m} ≈ ${fmt(vm, 6)}.`, `Pangkat negatif: 1 ÷ ${fmt(1 + i, 3)}^${p.m}.`, 0.0002),
      numStep('Nilai sekarang', `Hitung PV = ${fmt(p.A, 0)} × v^${p.m} × a${p.n}|.`, pv, `Benar, PV ≈ ${rp(pv)}.`, 'Kalikan ketiga bilangan tersebut.'),
      choiceStep(`PV tunjangan ${rpShort(pv)}, tunai ${rpShort(p.L)}. Pilih yang mana?`, [['L', 'Beasiswa A (tunai)'], ['A', 'Beasiswa B (tunjangan)']], pv > p.L ? 'A' : 'L',
        'Tepat. Dina menerima uang, jadi pilih PV terbesar.', 'Dina menerima, jadi cari nilai sekarang yang paling besar.'),
    ];
  },
  conclusion: p => {
    const pv = p.A * disc(p.j / 1200, p.m) * aAngle(p.n, p.j / 1200);
    return `<p>Meski harus menunggu ${p.m} bulan, tunjangan Beasiswa B bernilai ${rpShort(pv)} hari ini, ${pv > p.L ? 'lebih besar' : 'lebih kecil'} dari Rp15 jt tunai. Penundaan memang mengurangi nilai (dikali v<sup>${p.m}</sup>), tetapi tidak selalu cukup untuk membalik keputusan.</p>
      <p><b>Tantangan:</b> pilih skenario "Tunjangan kerja" di eksperimen, lalu geser masa tunda m. Berapa bulan penundaan yang membuat bonus Rp30 jt lebih menarik?</p>`;
  },
};

/* ---------- Pembantu FV ---------- */
const fvAnnuityFormula = ({ A, n, i, due = false }) => {
  const iT = fmt(i, i < 0.01 ? 4 : 3);
  const core = frac(`(1 + ${iT})<sup>${n}</sup> − 1`, iT);
  const fv = A * sAngle(n, i) * (due ? 1 + i : 1);
  return due
    ? `${it('FV')} = ${it('A')}·${act('s̈', n)} = ${fmt(A, 0)} · ${core} · (1 + ${iT}) = <b class="num">${rp(fv)}</b>`
    : `${it('FV')} = ${it('A')}·${act('s', n)} = ${fmt(A, 0)} · ${core} = <b class="num">${rp(fv)}</b>`;
};
const fvLumpFormula = (L, i, H) => `${it('FV')} = ${it('L')}·(1 + ${it('i')})<sup>${H}</sup> = ${fmt(L, 0)} · ${fmt(1 + i, 4)}<sup>${H}</sup> = <b class="num">${rp(L * Math.pow(1 + i, H))}</b>`;

/* ================= KASUS 7 — Tabungan Deposito (FV) ================= */
const kasus7 = {
  id: 7, level: 'Menengah', title: 'Tabungan Deposito: Simpan Sekaligus atau Menabung Rutin?', short: 'FV anuitas biasa dan di muka',
  unit: 'bulan', conv: 12, goal: 'max', rateLabel: 'j<sub>12</sub>',
  horizon: p => p.y * 12,
  params: [
    { key: 'L', label: 'Simpan sekaligus', min: 10e6, max: 150e6, step: 1e6, unit: 'rp' },
    { key: 'A', label: 'Setoran rutin', min: 100000, max: 2e6, step: 50000, unit: 'rp' },
    { key: 'y', label: 'Lama (tahun)', min: 1, max: 30, step: 1, unit: 'int' },
    { key: 'j', label: 'j<sub>12</sub> (% p.a.)', min: 0.5, max: 12, step: 0.1, unit: 'pct' },
  ],
  defaults: { L: 50e6, A: 500000, y: 10, j: 6 },
  scenarios: [
    { label: 'Tabungan A · 6%', values: { L: 50e6, A: 500000, y: 10, j: 6 } },
    { label: 'Tabungan B · 3,6%', values: { L: 50e6, A: 500000, y: 10, j: 3.6 } },
    { label: 'Tabungan C · 4,8%', values: { L: 50e6, A: 500000, y: 10, j: 4.8 } },
  ],
  storyTitle: 'Tiga tawaran tabungan untuk Bu Rina',
  story: () => `<p>Bu Rina, staf administrasi FMIPA, ingin menyiapkan dana 10 tahun lagi. Ia punya dua cara: menyimpan <b>Rp50 juta sekarang</b> lalu membiarkannya berkembang, atau <b>menabung rutin Rp500.000 per bulan</b> selama 10 tahun (total Rp60 juta).</p>
    <p>Tiga bank menawarkan bunga berbeda. Mana yang menghasilkan dana terbesar di akhir tahun ke-10? Mulai dari Tabungan A.</p>
    <div class="tbl-wrap scen-table"><table><thead><tr><th>TABUNGAN</th><th>BUNGA j<sub>12</sub></th></tr></thead><tbody>
    <tr><td>A</td><td>6%</td></tr><tr><td>B</td><td>3,6%</td></tr><tr><td>C</td><td>4,8%</td></tr></tbody></table></div>`,
  options: p => [
    { tone: 'c', name: 'Sekaligus', value: rpShort(p.L), detail: `Disetor hari ini, dibiarkan ${p.y} tahun.` },
    { tone: 'v', name: 'Rutin akhir bulan', value: `${rp(p.A, 0)}/bln`, detail: `${p.y * 12} kali setoran di akhir bulan. Total ${rpShort(p.A * p.y * 12)}.` },
    { tone: 'o', name: 'Rutin awal bulan', value: `${rp(p.A, 0)}/bln`, detail: 'Sama, tetapi disetor di awal bulan (anuitas di muka).' },
  ],
  guess: { q: 'Untuk Tabungan A (6%), mana yang menghasilkan dana lebih besar di akhir tahun ke-10?', choices: [['L', 'Sekaligus', 'Rp50 jt sekarang'], ['R', 'Rutin', 'Rp500 rb × 120']] },
  streams: (p, i) => {
    const H = p.y * 12;
    return [
      { key: 'L', label: 'Sekaligus', tone: 'c', flows: lump(p.L), formula: fvLumpFormula(p.L, i, H) },
      { key: 'R', label: 'Rutin akhir bulan', tone: 'v', flows: annuityFlows({ A: p.A, n: H }), timeline: true, formula: fvAnnuityFormula({ A: p.A, n: H, i }) },
      { key: 'D', label: 'Rutin awal bulan', tone: 'o', flows: annuityFlows({ A: p.A, n: H, type: 'dimuka' }), timeline: true, formula: fvAnnuityFormula({ A: p.A, n: H, i, due: true }) },
    ];
  },
  guessAnswer: (p, r) => (r.best.key === 'L' ? 'L' : 'R'),
  summarize: (p, i, s, v) => {
    const r = compare(s, v, 'max', 'FV', `akhir tahun ke-${p.y}`);
    const f = ii => p.L * Math.pow(1 + ii, p.y * 12) - p.A * sAngle(p.y * 12, ii);
    const cr = crossRate(f, 1e-6, 0.05);
    r.insight = (cr == null ? 'Pada rentang bunga ini urutan sekaligus vs rutin tidak berubah.' : `Sekaligus dan rutin akhir bulan bernilai sama ketika j12 ≈ ${fmt(cr * 1200, 2)}%. Di atas itu, simpan sekaligus lebih unggul.`) + ' Rutin awal bulan selalu (1 + i) kali rutin akhir bulan.';
    return r;
  },
  pvText: (p, shown) => `FV = ${rp(shown.key === 'D' ? p.A * sAngle(p.y * 12, p.j / 1200) * (1 + p.j / 1200) : p.A * sAngle(p.y * 12, p.j / 1200), 0)}`,
  steps: p => {
    const i = p.j / 1200, n = p.y * 12, sn = sAngle(n, i), fvR = p.A * sn, fvL = p.L * Math.pow(1 + i, n);
    return [
      { ...numStep('Bunga per periode', `j12 = ${fmt(p.j, 0)}%. Berapa i per bulan (dalam persen)?`, i * 100, `Benar, i = ${fmt(i * 100, 1)}% per bulan.`, 'Bagi j12 dengan 12.', 0.001), alt: i },
      numStep('Faktor akumulasi', `Hitung s${n}|${fmt(i * 100, 1)}% = ((1 + ${fmt(i, 3)})^${n} − 1) ÷ ${fmt(i, 3)}. Tulis sampai 4 desimal.`, sn,
        `Benar, s${n}| ≈ ${fmt(sn, 4)}. Rp1 per bulan selama ${n} bulan terkumpul menjadi Rp${fmt(sn, 2)}.`, `Hitung dulu ${fmt(1 + i, 3)}^${n} ≈ ${fmt(Math.pow(1 + i, n), 4)}.`, 0.0005),
      numStep('FV menabung rutin', `Hitung FV setoran rutin di akhir bulan = ${fmt(p.A, 0)} × s${n}|.`, fvR, `Benar, FV ≈ ${rp(fvR)}.`, 'Kalikan setoran dengan faktor akumulasi.'),
      numStep('FV simpan sekaligus', `Hitung FV Rp50 juta setelah ${n} bulan: 50.000.000 × (1 + ${fmt(i, 3)})^${n}.`, fvL, `Benar, FV ≈ ${rp(fvL)}.`, `(1 + ${fmt(i, 3)})^${n} ≈ ${fmt(Math.pow(1 + i, n), 4)}.`),
      choiceStep(`FV sekaligus ${rpShort(fvL)}, FV rutin ${rpShort(fvR)}. Mana yang dipilih untuk Tabungan A?`, [['L', 'Sekaligus'], ['R', 'Rutin']], fvL > fvR ? 'L' : 'R',
        'Tepat. Pilih dana akhir yang paling besar.', 'Bandingkan nilai di akhir tahun ke-10.'),
    ];
  },
  conclusion: p => {
    const i = p.j / 1200, n = p.y * 12;
    return `<p>Pada Tabungan A, Rp50 juta yang disimpan sekarang tumbuh menjadi ${rpShort(p.L * Math.pow(1 + i, n))}, lebih besar dari tabungan rutin ${rpShort(p.A * sAngle(n, i))} walaupun total setoran rutin lebih besar (Rp60 juta). Uang yang masuk lebih awal punya lebih banyak waktu untuk berbunga.</p>
      <p><b>Tantangan:</b> pilih Tabungan B (3,6%) di eksperimen. Keputusannya berbalik. Kenapa bunga yang lebih kecil membuat menabung rutin unggul?</p>`;
  },
};

/* ================= KASUS 8 — Raka dan Dani (FV ditunda) ================= */
const monthsToTarget = (A, i, target) => { for (let n = 1; n <= 600; n++) if (A * sAngle(n, i) >= target) return n; return null; };
const kasus8 = {
  id: 8, level: 'Lanjut', title: 'Raka dan Dani: Menabung Setelah Menunggu', short: 'FV anuitas ditunda, biaya penundaan',
  unit: 'bulan', conv: 12, goal: 'max', rateLabel: 'j<sub>12</sub>',
  horizon: p => p.m + p.n,
  params: [
    { key: 'A', label: 'Setoran A', min: 100000, max: 3e6, step: 50000, unit: 'rp' },
    { key: 'm', label: 'Tunda m', min: 0, max: 24, step: 1, unit: 'int' },
    { key: 'n', label: 'n setoran', min: 6, max: 60, step: 1, unit: 'int' },
    { key: 'T', label: 'Target', min: 5e6, max: 150e6, step: 1e6, unit: 'rp' },
    { key: 'j', label: 'j<sub>12</sub> (% p.a.)', min: 0.5, max: 15, step: 0.25, unit: 'pct' },
  ],
  defaults: { A: 800000, m: 6, n: 24, T: 20e6, j: 6 },
  scenarios: [
    { label: 'Raka', values: { A: 800000, m: 6, n: 24, T: 20e6 } },
    { label: 'Dani', values: { A: 1.5e6, m: 3, n: 36, T: 60e6 } },
  ],
  storyTitle: 'Dua lulusan, dua masa tunggu',
  story: () => `<p><b>Raka</b> langsung bekerja setelah lulus, tetapi 6 bulan pertama gajinya habis untuk melunasi KTA biaya kuliah. Setelah itu ia menabung Rp800.000 setiap akhir bulan selama 24 bulan untuk modal usaha.</p>
    <p><b>Dani</b> menjalani masa probasi 3 bulan dengan gaji dipotong, jadi belum bisa menabung. Setelah diangkat, ia menabung Rp1.500.000 setiap akhir bulan selama 36 bulan untuk dana pernikahan dengan target Rp60 juta. Bunga investasi j<sub>12</sub> = 6%.</p>`,
  options: p => [
    { tone: 'v', name: 'Raka', value: `${rp(p.A, 0)}/bln`, detail: `Tunda ${p.m} bulan, lalu ${p.n} setoran. Dana dihitung di akhir bulan ke-${p.m + p.n}.` },
    { tone: 'c', name: 'Dani', value: 'Rp1.500.000/bln', detail: 'Tunda 3 bulan, lalu 36 setoran. Target Rp60 jt di akhir bulan ke-39.' },
  ],
  guess: { q: `Andai Raka bisa menabung sejak bulan pertama (30 setoran), tabungannya bertambah 6 setoran. Selisih dananya di akhir bulan ke-30…`, choices: [['sama', 'Sekitar Rp4,8 jt', '6 × Rp800 rb'], ['lebih', 'Lebih dari Rp4,8 jt', ''], ['kurang', 'Kurang dari Rp4,8 jt', '']] },
  streams: (p, i) => {
    const H = p.m + p.n;
    return [
      { key: 'T', label: 'Setelah menunggu', tone: 'v', flows: annuityFlows({ A: p.A, n: p.n, type: 'ditunda', m: p.m }), timeline: true, defer: p.m, formula: fvAnnuityFormula({ A: p.A, n: p.n, i }) },
      { key: 'L', label: 'Tanpa menunggu', tone: 'c', flows: annuityFlows({ A: p.A, n: H }), timeline: true, formula: fvAnnuityFormula({ A: p.A, n: H, i }) },
    ];
  },
  guessAnswer: () => 'lebih',
  summarize: (p, i, s, v) => {
    const H = p.m + p.n, cost = v.L - v.T, need = monthsToTarget(p.A, i, p.T);
    return {
      kpis: [['FV setelah menunggu', rpShort(v.T)], ['FV tanpa menunggu', rpShort(v.L)], ['Biaya penundaan', rpShort(cost)], ['Target', rpShort(p.T)]],
      decision: { tone: v.T >= p.T ? 'v' : 'o', text: v.T >= p.T ? `Target ${rpShort(p.T)} tercapai di akhir bulan ke-${H}: dana terkumpul ${rp(v.T, 0)}.` : `Target ${rpShort(p.T)} belum tercapai di akhir bulan ke-${H}: dana baru ${rp(v.T, 0)}, kurang ${rp(p.T - v.T, 0)}.` },
      insight: `Penundaan ${p.m} bulan mengurangi dana akhir sebesar ${rp(cost, 0)}, lebih dari ${p.m} × setoran (${rp(p.m * p.A, 0)}) karena bunga yang hilang. ${need ? `Dengan setoran ini, target butuh ${need} setoran (selesai di akhir bulan ke-${p.m + need}).` : ''}`,
    };
  },
  steps: p => {
    const i = p.j / 1200, H = p.m + p.n, sn = sAngle(p.n, i), fvT = p.A * sn, fvL = p.A * sAngle(H, i);
    return [
      typeStep('Raka baru mulai menabung setelah 6 bulan. Jenis anuitas apa?', 'ditunda', 'Tepat, anuitas ditunda 6 bulan.', 'Ada masa tunggu sebelum setoran pertama.'),
      numStep('Faktor akumulasi', `Dana dihitung tepat saat setoran terakhir (akhir bulan ke-${H}). Hitung s${p.n}|0,5%.`, sn,
        `Benar, s${p.n}| ≈ ${fmt(sn, 4)}. Masa tunda tidak mengubah rumus FV di akhir setoran: yang dihitung hanya ${p.n} setoran.`, `((1,005)^${p.n} − 1) ÷ 0,005, dengan 1,005^${p.n} ≈ ${fmt(Math.pow(1 + i, p.n), 4)}.`, 0.0005),
      numStep('FV setelah menunggu', `Hitung FV tabungan Raka = ${fmt(p.A, 0)} × s${p.n}|.`, fvT, `Benar, FV ≈ ${rp(fvT)}.`, 'Kalikan setoran dengan faktor akumulasi.'),
      numStep('FV tanpa menunggu', `Seandainya Raka menabung sejak bulan pertama: ${fmt(p.A, 0)} × s${H}|.`, fvL, `Benar, FV ≈ ${rp(fvL)}.`, `s${H}| = ((1,005)^${H} − 1) ÷ 0,005 ≈ ${fmt(sAngle(H, i), 4)}.`),
      numStep('Biaya penundaan', 'Berapa selisih kedua dana tersebut?', fvL - fvT, `Benar, selisihnya ≈ ${rp(fvL - fvT)}, lebih dari 6 × Rp800.000 = Rp4.800.000.`, 'Kurangkan hasil tahap 3 dari tahap 4.'),
    ];
  },
  conclusion: p => {
    const i = p.j / 1200, cost = p.A * (sAngle(p.m + p.n, i) - sAngle(p.n, i));
    return `<p>Enam setoran yang hilang bernilai ${rp(cost, 0)} di akhir bulan ke-30, bukan sekadar Rp4,8 juta, karena setoran awal paling lama berbunga. Menunda menabung selalu lebih mahal dari jumlah setoran yang dilewatkan.</p>
      <p><b>Tantangan:</b> pilih skenario Dani di eksperimen. Apakah target Rp60 juta tercapai di akhir bulan ke-39? Kalau belum, butuh berapa setoran lagi?</p>`;
  },
};

/* ================= KASUS 9 — Asuransi Pendidikan ================= */
const k9 = p => {
  const i = p.j / 1200, nPrem = p.yp * 12, start = nPrem + p.yt * 12, nBen = p.yk * 12;
  const pvBen = p.B * aDue(nBen, i) * disc(i, start);
  return { i, nPrem, start, nBen, pvBen, P: pvBen / aAngle(nPrem, i) };
};
const kasus9 = {
  id: 9, level: 'Lanjut', title: 'Asuransi Pendidikan Anak: Berapa Preminya?', short: 'Gabungan anuitas biasa, ditunda, dan di muka',
  unit: 'bulan', conv: 12, goal: 'solve', rateLabel: 'j<sub>12</sub>',
  params: [
    { key: 'B', label: 'Manfaat/bulan', min: 1e6, max: 15e6, step: 250000, unit: 'rp' },
    { key: 'yk', label: 'Kuliah (tahun)', min: 1, max: 6, step: 1, unit: 'int' },
    { key: 'yp', label: 'Bayar premi (thn)', min: 3, max: 15, step: 1, unit: 'int' },
    { key: 'yt', label: 'Masa tunda (thn)', min: 0, max: 10, step: 1, unit: 'int' },
    { key: 'j', label: 'j<sub>12</sub> (% p.a.)', min: 0.5, max: 12, step: 0.25, unit: 'pct' },
  ],
  defaults: { B: 5e6, yk: 4, yp: 9, yt: 3, j: 6 },
  storyTitle: 'Pak Budi menyiapkan dana kuliah',
  story: () => `<p>Pak Budi mendaftarkan anaknya yang baru masuk kelas 1 SD ke asuransi dana pendidikan tinggi. Premi dibayar <b>setiap akhir bulan selama 9 tahun</b> (kelas 1 SD sampai kelas 3 SMP).</p>
    <p>Setelah premi lunas, ada <b>masa tunda 3 tahun</b> (SMA). Lalu anaknya menerima manfaat <b>Rp5.000.000 di awal setiap bulan selama 4 tahun kuliah</b>. Dengan j<sub>12</sub> = 6%, berapa premi bulanan yang adil?</p>`,
  options: () => [
    { tone: 'o', name: 'Premi', value: 'P × 108', detail: 'Akhir bulan ke-1 sampai ke-108 (anuitas biasa).' },
    { tone: 'v', name: 'Manfaat', value: 'Rp5 jt × 48', detail: 'Awal bulan ke-145 sampai ke-192, yaitu t = 144 … 191 (di muka dan ditunda).' },
  ],
  guess: { q: 'Total manfaat 48 × Rp5 jt = Rp240 jt. Total premi yang dibayar Pak Budi selama 9 tahun kira-kira…', choices: [['lebih', 'Lebih dari Rp240 jt', ''], ['sama', 'Sekitar Rp240 jt', ''], ['kurang', 'Kurang dari Rp240 jt', '']] },
  streams: (p, i) => {
    const k = k9(p), ben = [];
    for (let t = 0; t < k.nBen; t++) ben.push({ t: k.start + t, amt: p.B });
    return [
      { key: 'P', label: 'Premi', tone: 'o', flows: annuityFlows({ A: k.P, n: k.nPrem }), timeline: true, formula: annuityFormula({ A: k.P, n: k.nPrem, i }) },
      { key: 'B', label: 'Manfaat', tone: 'v', flows: ben, timeline: true,
        formula: `${it('PV')} = ${it('B')}·${it('v')}<sup>${k.start}</sup>·${act('ä', k.nBen)} = ${fmt(p.B, 0)} · ${fmt(disc(i, k.start), 6)} · ${fmt(aDue(k.nBen, i), 4)} = <b class="num">${rp(k.pvBen)}</b>` },
    ];
  },
  guessAnswer: () => 'kurang',
  summarize: p => {
    const k = k9(p);
    return {
      kpis: [['Premi P', rp(k.P, 0)], ['PV manfaat', rpShort(k.pvBen)], ['Total premi', rpShort(k.P * k.nPrem)], ['Total manfaat', rpShort(p.B * k.nBen)]],
      decision: { tone: 'v', text: `Premi bulanan ${rp(k.P)} selama ${p.yp} tahun. Nilai sekarang premi tepat sama dengan nilai sekarang manfaat, ${rp(k.pvBen, 0)}.` },
      insight: `Total premi ${rpShort(k.P * k.nPrem)} jauh lebih kecil dari total manfaat ${rpShort(p.B * k.nBen)}, karena premi sempat berbunga bertahun-tahun sebelum manfaat mulai dibayarkan.`,
    };
  },
  pvText: p => `PV = ${rp(k9(p).pvBen, 0)}`,
  steps: p => {
    const k = k9(p), ad = aDue(k.nBen, k.i), atStart = p.B * ad, vS = disc(k.i, k.start), a = aAngle(k.nPrem, k.i);
    return [
      { ...numStep('Bunga per periode', 'j12 = 6%. Berapa i per bulan (dalam persen)?', 0.5, 'Benar, i = 0,5% per bulan.', 'Bagi j12 dengan 12.', 0.001), alt: 0.005 },
      numStep('Manfaat di awal kuliah', `Nilai seluruh manfaat tepat di awal kuliah (t = ${k.start}) = 5.000.000 × ä48|0,5%. Hitung.`, atStart,
        `Benar, ≈ ${rp(atStart)} (ä48| ≈ ${fmt(ad, 4)}).`, `ä48| = a48| × 1,005, dengan a48| ≈ ${fmt(aAngle(k.nBen, k.i), 4)}.`),
      numStep('Diskon ke hari ini', `Diskontokan ke t = 0: kalikan dengan v^${k.start} = 1,005^−${k.start}. Berapa v^${k.start}? (6 desimal)`, vS,
        `Benar, v^${k.start} ≈ ${fmt(vS, 6)}, sehingga PV manfaat ≈ ${rp(k.pvBen)}.`, `Masa premi 108 bulan + tunda 36 bulan = ${k.start} bulan.`, 0.0005),
      numStep('Faktor premi', `Premi dibayar akhir bulan selama ${k.nPrem} bulan. Hitung a${k.nPrem}|0,5%.`, a, `Benar, a${k.nPrem}| ≈ ${fmt(a, 4)}.`, `(1 − 1,005^−${k.nPrem}) ÷ 0,005.`, 0.0005),
      numStep('Premi bulanan', 'Prinsip keadilan: PV premi = PV manfaat. Hitung P = PV manfaat ÷ a108|.', k.P, `Benar, premi ≈ ${rp(k.P)} per bulan.`, 'Bagi PV manfaat dengan faktor premi.'),
    ];
  },
  conclusion: p => {
    const k = k9(p);
    return `<p>Pak Budi cukup membayar ${rp(k.P, 0)} per bulan. Total premi ${rpShort(k.P * k.nPrem)} lebih kecil dari total manfaat Rp240 jt karena setiap premi berbunga lama sebelum dipakai. Kasus ini menggabungkan tiga jenis anuitas: premi (biasa), masa SMA (penundaan), dan uang kuliah (di muka).</p>
      <p><b>Refleksi:</b> di eksperimen, perpendek masa bayar premi menjadi 6 tahun. Berapa premi yang dibutuhkan, dan kenapa naiknya lebih dari 9/6 kali?</p>`;
  },
};

/* ================= KASUS 10 — Analisis Brosur Kredit ================= */
const k10 = p => {
  const P = p.H - p.D, C = (P * (1 + (p.f / 100) * p.n)) / p.n;
  const i = p.f === 0 ? 0 : crossRate(ii => C * aAngle(p.n, ii) - P, 1e-7, 0.2) || 0;
  return { P, C, i };
};
const kasus10 = {
  id: 10, level: 'Lanjut', title: 'Analisis Brosur Kredit: Bunga Flat yang Menipu', short: 'Bunga efektif tersembunyi di balik bunga flat',
  unit: 'bulan', conv: 12, goal: 'solve', rateLabel: 'i',
  rate: p => k10(p).i,
  params: [
    { key: 'H', label: 'Harga tunai', min: 5e6, max: 60e6, step: 500000, unit: 'rp' },
    { key: 'D', label: 'Uang muka', min: 0, max: 20e6, step: 250000, unit: 'rp' },
    { key: 'f', label: 'Bunga flat %/bln', min: 0, max: 3, step: 0.05, unit: 'pct' },
    { key: 'n', label: 'Tenor (bulan)', min: 6, max: 48, step: 1, unit: 'int' },
  ],
  defaults: { H: 20e6, D: 2e6, f: 1, n: 24 },
  storyTitle: 'Brosur motor di depan kampus',
  story: () => `<p>Sebuah dealer di Jatinangor membagikan brosur kredit motor: harga tunai <b>Rp20.000.000</b>, uang muka <b>Rp2.000.000</b>, tenor <b>24 bulan</b>, dan tertulis besar-besar <b>"bunga hanya 1% per bulan"</b>.</p>
    <p>Di bawahnya ada catatan kecil: <i>bunga flat</i>. Artinya bunga dihitung dari pokok awal sepanjang tenor, lalu dibagi rata ke setiap cicilan akhir bulan. Benarkah bunganya hanya 1% per bulan?</p>`,
  options: p => {
    const k = k10(p);
    return [
      { tone: 'c', name: 'Pokok kredit', value: rp(k.P, 0), detail: 'Harga tunai dikurangi uang muka.' },
      { tone: 'o', name: 'Cicilan brosur', value: `${rp(k.C, 0)}/bln`, detail: `(${rpShort(k.P)} + ${p.n} × 1% × ${rpShort(k.P)}) ÷ ${p.n}.` },
    ];
  },
  guess: { q: 'Bunga efektif yang sebenarnya dibayar per bulan…', choices: [['sama', 'Tepat 1%', 'sesuai brosur'], ['lebih', 'Lebih dari 1%', ''], ['kurang', 'Kurang dari 1%', '']] },
  streams: (p, i) => {
    const k = k10(p);
    return [
      { key: 'C', label: 'Cicilan', tone: 'o', flows: annuityFlows({ A: k.C, n: p.n }), timeline: true, formula: annuityFormula({ A: k.C, n: p.n, i }) },
      { key: 'P', label: 'Pokok kredit', tone: 'c', flows: lump(k.P), formula: lumpFormula(k.P, 'diterima') },
    ];
  },
  guessAnswer: () => 'lebih',
  summarize: p => {
    const k = k10(p), eff = Math.pow(1 + k.i, 12) - 1;
    return {
      kpis: [['Cicilan', rp(k.C, 0)], ['Total bunga', rpShort(k.C * p.n - k.P)], ['j12 efektif', fmt(k.i * 1200, 2) + '%'], ['Bunga efektif/thn', fmt(eff * 100, 2) + '%']],
      decision: { tone: 'o', text: `Brosur menulis ${fmt(p.f, 2)}% flat per bulan, tetapi bunga efektif sebenarnya ${fmt(k.i * 100, 3)}% per bulan (setara ${fmt(eff * 100, 2)}% per tahun).` },
      insight: `Bunga flat dihitung dari pokok awal selama seluruh tenor, padahal sisa pokok terus berkurang setiap kali mencicil. ${p.f > 0 ? `Akibatnya bunga efektif ${fmt((k.i * 100) / p.f, 2)} kali bunga flat. ` : ''}Isi slider dengan data brosur kelompokmu untuk tugas studi kasus.`,
    };
  },
  pvText: p => `PV = ${rp(k10(p).P, 0)}`,
  steps: p => {
    const k = k10(p), pv1 = k.C * aAngle(p.n, 0.01);
    return [
      numStep('Pokok kredit', 'Berapa pokok kredit (harga tunai − uang muka)?', k.P, `Benar, pokok ${rp(k.P, 0)}.`, '20.000.000 − 2.000.000.', 0.0001),
      numStep('Cicilan flat', 'Bunga flat: total bunga = pokok × 1% × 24. Cicilan = (pokok + total bunga) ÷ 24. Berapa cicilannya?', k.C,
        `Benar, cicilan ${rp(k.C, 0)} per bulan.`, `Total bunga = 18.000.000 × 0,01 × 24 = ${fmt(k.P * 0.01 * p.n, 0)}.`, 0.001),
      numStep('Uji di 1%', `Kalau bunganya benar 1% per bulan, PV cicilan = ${fmt(k.C, 0)} × a24|1%. Hitung.`, pv1,
        `Benar, ≈ ${rp(pv1, 0)}. Hasilnya lebih besar dari pokok ${rp(k.P, 0)}.`, 'a24|1% ≈ 21,2434.'),
      choiceStep('PV cicilan pada 1% lebih besar dari pokok. Artinya bunga efektif yang membuat PV = pokok…', [['lebih', 'Lebih dari 1%'], ['kurang', 'Kurang dari 1%']], 'lebih',
        'Tepat. PV turun ketika bunga naik, jadi untuk menurunkan PV ke pokok, bunganya harus lebih dari 1%.', 'Ingat: semakin besar i, semakin kecil PV.'),
      { ...numStep('Bunga efektif', 'Cari i per bulan (dalam persen) sehingga 930.000 × a24|i = 18.000.000. Coba-coba beberapa nilai, tulis sampai 2 desimal.', k.i * 100,
        `Benar, i efektif ≈ ${fmt(k.i * 100, 3)}% per bulan, hampir dua kali bunga di brosur.`, `Coba i = 1,7% dan 1,9%: hitung a24|i lalu bandingkan dengan 18.000.000 ÷ 930.000 ≈ ${fmt(k.P / k.C, 4)}.`, 0.02), alt: k.i },
    ];
  },
  conclusion: p => {
    const k = k10(p), eff = Math.pow(1 + k.i, 12) - 1;
    return `<p>"1% per bulan" di brosur adalah bunga flat. Bunga efektifnya ${fmt(k.i * 100, 2)}% per bulan atau ${fmt(eff * 100, 1)}% per tahun. Nilai sekarang cicilan baru sama dengan pokok kredit pada bunga efektif itu, bukan pada 1%.</p>
      <p><b>Tugas kelompok:</b> buka eksperimen, isi harga tunai, uang muka, bunga flat, dan tenor dari brosur yang kalian temukan, lalu bandingkan bunga efektifnya dengan klaim di brosur.</p>`;
  },
};

export const CASES = [kasus1, kasus2, kasus3, kasus4, kasus5, kasus6, kasus7, kasus8, kasus9, kasus10];
export const UPCOMING = [];

export const levelTone = lv => (lv === 'Dasar' ? '' : lv === 'Menengah' ? 'c' : 'o');
export { pct };

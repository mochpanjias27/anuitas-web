// Fungsi matematika keuangan untuk anuitas. Semua tingkat bunga i adalah bunga efektif per periode.

export const disc = (i, t) => Math.pow(1 + i, -t);

/** a_{n|i} : nilai sekarang anuitas biasa 1 satuan selama n periode */
export const aAngle = (n, i) => (i === 0 ? n : (1 - Math.pow(1 + i, -n)) / i);

/** ä_{n|i} : nilai sekarang anuitas di muka */
export const aDue = (n, i) => aAngle(n, i) * (1 + i);

/** s_{n|i} : nilai akan datang anuitas biasa */
export const sAngle = (n, i) => (i === 0 ? n : (Math.pow(1 + i, n) - 1) / i);

/** Arus kas anuitas tetap. type: 'biasa' | 'dimuka' | 'ditunda' (m = periode penundaan) */
export function annuityFlows({ A, n, type = 'biasa', m = 0 }) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const t = type === 'biasa' ? k + 1 : type === 'dimuka' ? k : m + k + 1;
    out.push({ t, amt: A });
  }
  return out;
}

/** Nilai sekarang dari daftar arus kas {t, amt} */
export const pvFlows = (flows, i) => flows.reduce((s, f) => s + f.amt * Math.pow(1 + i, -f.t), 0);

/** PV anuitas tetap dalam bentuk tertutup */
export function pvAnnuity({ A, n, i, type = 'biasa', m = 0 }) {
  if (type === 'dimuka') return A * aDue(n, i);
  if (type === 'ditunda') return A * disc(i, m) * aAngle(n, i);
  return A * aAngle(n, i);
}

/**
 * Cari tingkat bunga per periode di mana selisih f(i) berganti tanda.
 * Memindai [lo, hi] lalu biseksi. Mengembalikan null bila tidak ada titik balik.
 */
export function crossRate(f, lo = 1e-6, hi = 0.2, steps = 400) {
  let a = lo, fa = f(a);
  for (let k = 1; k <= steps; k++) {
    const b = lo + (hi - lo) * k / steps, fb = f(b);
    if (fa === 0) return a;
    if (fa * fb < 0) {
      let x0 = a, x1 = b, f0 = fa;
      for (let it = 0; it < 80; it++) {
        const mid = (x0 + x1) / 2, fm = f(mid);
        if (f0 * fm <= 0) x1 = mid; else { x0 = mid; f0 = fm; }
      }
      return (x0 + x1) / 2;
    }
    a = b; fa = fb;
  }
  return null;
}

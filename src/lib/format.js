export const fmt = (x, d = 2) =>
  Number(x).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
export const rp = (x, d = 2) => (x < 0 ? '−Rp' : 'Rp') + fmt(Math.abs(x), d);
/** Rupiah ringkas: 1.250.000 → Rp1,25 jt; 2.500.000.000 → Rp2,5 M */
export function rpShort(x) {
  const a = Math.abs(x), s = x < 0 ? '−' : '';
  const f2 = x => Number(x).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  if (a >= 1e9) return `${s}Rp${f2(a / 1e9)} M`;
  if (a >= 1e6) return `${s}Rp${f2(a / 1e6)} jt`;
  return `${s}Rp${fmt(a, 0)}`;
}
export const pct = (x, d = 2) => fmt(x * 100, d) + '%';
export const pad2 = k => String(k).padStart(2, '0');

/** Baca angka gaya Indonesia: "Rp 315.142,17", "11,2551", "1%", "0.01", "315142.17" */
export function parseNum(s) {
  let t = String(s).trim().replace(/\s/g, '').replace(/^rp/i, '').replace(/%$/, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  return t === '' ? NaN : Number(t);
}
export const near = (x, target, rel, abs = 0) =>
  Number.isFinite(x) && Math.abs(x - target) <= Math.max(Math.abs(target) * rel, abs);

export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

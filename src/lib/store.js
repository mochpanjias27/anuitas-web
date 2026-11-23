// Penyimpanan lokal (hanya di browser mahasiswa). Semua akses dibungkus try/catch.
const KEY = 'anuitasLab.v1';
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(d) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* penyimpanan tidak tersedia */ }
}
export const store = {
  who() { return load().who || null; },
  setWho(w) { const d = load(); d.who = w; save(d); },
  caseState(id) { return (load().cases || {})[id] || {}; },
  setCase(id, patch) {
    const d = load(); d.cases = d.cases || {};
    d.cases[id] = { ...(d.cases[id] || {}), ...patch }; save(d);
  },
  quizHistory() { return load().quiz || []; },
  addQuiz(r) { const d = load(); d.quiz = [r, ...(d.quiz || [])].slice(0, 20); save(d); },
};

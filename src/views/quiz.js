// Uji Pemahaman: pilih topik → 10 soal acak dengan umpan balik → hasil per topik + riwayat (lokal).
import { TOPICS, buildQuiz, isCorrect } from '../data/quiz.js';
import { parseNum, esc, pad2 } from '../lib/format.js';
import { store } from '../lib/store.js';

const DEFAULT = ['biasa', 'konversi', 'cariA', 'dimuka', 'ditunda', 'konsep'];

export function renderQuiz(app, ctx) {
  let qs = [], k = 0, answers = [];

  function setup() {
    const who = store.who();
    const hist = store.quizHistory();
    app.innerHTML = `
    <section class="page-top">
      <div class="sec-head">
        <div><span class="mono-label">Refleksi</span><h1>Uji Pemahaman</h1></div>
        <p>10 soal dengan angka acak. Setiap jawaban langsung diperiksa, lengkap dengan pembahasan dan petunjuk kesalahan yang umum. Skor hanya untuk refleksimu dan disimpan di browser ini.</p>
      </div>
      <div class="card quiz hud">
        <span class="mono-label">Pilih topik</span>
        <div class="setup">${Object.entries(TOPICS).map(([key, t]) => `<label><input type="checkbox" value="${key}" ${DEFAULT.includes(key) ? 'checked' : ''}><span><b>${t.label}</b></span></label>`).join('')}</div>
        <div class="chips" style="gap:10px;align-items:center">
          <button class="btn btn-volt" id="start" type="button">Mulai 10 soal <span class="arr">→</span></button>
          <span class="note" id="whoNote">${who ? `Mengerjakan sebagai <b>${esc(who.name)}</b> (${esc(who.npm)}).` : 'Belum mengisi nama dan NPM. Isi lewat tombol di kanan atas agar riwayatmu tertandai.'}</span>
        </div>
      </div>
      ${hist.length ? `<div class="card quiz" style="margin-top:16px"><span class="mono-label">Riwayat percobaan</span><div class="hist" style="margin-top:12px">${hist.map(h => `<div><span>${new Date(h.at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}${h.who ? ` · ${esc(h.who.name)}` : ''}</span><b>${h.score}/${h.total}</b></div>`).join('')}</div></div>` : ''}
    </section>`;
    app.querySelector('#start').addEventListener('click', () => {
      const topics = [...app.querySelectorAll('.setup input:checked')].map(x => x.value);
      if (!topics.length) { app.querySelector('#whoNote').textContent = 'Pilih minimal satu topik.'; return; }
      qs = buildQuiz(topics, 10); k = 0; answers = [];
      ask();
    });
  }

  function ask() {
    const q = qs[k];
    app.innerHTML = `
    <section class="page-top">
      <div class="card quiz hud">
        <div class="qhead">
          <span class="mono-label">Soal ${pad2(k + 1)} / ${pad2(qs.length)} · ${TOPICS[q.topic].label}</span>
          <div class="qbar" aria-hidden="true"><i style="width:${(k / qs.length) * 100}%"></i></div>
          <span class="mono-label">Benar ${answers.filter(a => a.ok).length}</span>
        </div>
        <div class="qtext">${q.text}${q.given ? `<div class="given">${q.given.join('')}</div>` : ''}</div>
        ${q.choices
          ? `<div class="answer-row" id="choices">${q.choices.map(([v, l]) => `<button class="opt" type="button" data-v="${v}">${l}</button>`).join('')}</div>`
          : `<form class="answer-row" id="ansForm"><input type="text" id="ans" inputmode="decimal" autocomplete="off" placeholder="contoh: 17317907,07" aria-label="Jawaban"><button class="btn btn-volt" type="submit">Periksa</button></form>
             <p class="note" style="margin-top:8px">Toleransi pembulatan 0,3%. Tulis angka saja, boleh dengan titik ribuan dan koma desimal.</p>`}
        <div id="feedback"></div>
      </div>
    </section>`;
    const done = (x, btn) => {
      const ok = isCorrect(q, x);
      const diag = !ok && !q.choices ? q.diag(x) : null;
      answers.push({ topic: q.topic, ok, diag });
      app.querySelectorAll('#choices button, #ansForm input, #ansForm button').forEach(e => { e.disabled = true; });
      if (q.choices) app.querySelectorAll('#choices button').forEach(b => {
        if (b.dataset.v === q.answer) b.setAttribute('aria-pressed', 'true');
        else if (b === btn) b.classList.add('wrong');
      });
      app.querySelector('#feedback').innerHTML = `
        <div class="fb ${ok ? 'ok' : 'no'}">${ok ? 'Benar.' : 'Belum tepat.'}</div>
        ${diag ? `<div class="diag">${diag}</div>` : ''}
        <div class="explain ${ok ? '' : 'bad'}"><span class="mono-label">Pembahasan</span><div style="margin-top:6px">${q.explain}</div></div>
        <div style="margin-top:16px"><button class="btn btn-volt" id="next" type="button">${k + 1 < qs.length ? 'Soal berikutnya' : 'Lihat hasil'} <span class="arr">→</span></button></div>`;
      const nx = app.querySelector('#next'); nx.focus();
      nx.addEventListener('click', () => { k++; k < qs.length ? ask() : result(); });
    };
    if (q.choices) app.querySelectorAll('#choices button').forEach(b => b.addEventListener('click', () => done(b.dataset.v, b)));
    else {
      app.querySelector('#ans').focus();
      app.querySelector('#ansForm').addEventListener('submit', e => {
        e.preventDefault();
        const x = parseNum(app.querySelector('#ans').value);
        if (!Number.isFinite(x)) { app.querySelector('#feedback').innerHTML = '<div class="fb no">Tulis jawaban berupa angka.</div>'; return; }
        done(x);
      });
    }
  }

  function result() {
    const score = answers.filter(a => a.ok).length;
    const who = store.who();
    store.addQuiz({ at: Date.now(), score, total: answers.length, who });
    const byTopic = {};
    answers.forEach(a => { const t = (byTopic[a.topic] ||= { n: 0, ok: 0 }); t.n++; if (a.ok) t.ok++; });
    const diags = {};
    answers.forEach(a => { if (a.diag) diags[a.diag] = (diags[a.diag] || 0) + 1; });
    const weak = Object.entries(byTopic).filter(([, t]) => t.ok / t.n < 0.7).map(([key]) => key);
    const msg = score >= 9 ? 'Pemahamanmu sudah sangat kuat.' : score >= 7 ? 'Sudah baik. Rapikan topik yang masih kurang.' : score >= 5 ? 'Dasarnya sudah ada. Ulangi studi kasus pada topik yang lemah.' : 'Mulai lagi dari studi kasus dasar, lalu coba latihan ini sekali lagi.';
    app.innerHTML = `
    <section class="page-top">
      <div class="card result hud">
        <span class="mono-label">Hasil Uji Pemahaman · ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</span>
        ${who ? `<p style="margin-top:8px"><b>${esc(who.name)}</b> · NPM ${esc(who.npm)}</p>` : ''}
        <div style="display:flex;align-items:flex-end;gap:16px;margin:18px 0 6px;flex-wrap:wrap"><div class="score">${score}<span style="font-size:28px;color:var(--muted)">/${answers.length}</span></div><p style="max-width:40ch;color:var(--text)">${msg}</p></div>
        <div style="margin-top:20px"><span class="mono-label">Skor per topik</span>
          ${Object.entries(byTopic).map(([key, t]) => `<div class="topic-row"><span>${TOPICS[key].label}</span><div class="qbar"><i style="width:${(t.ok / t.n) * 100}%"></i></div><span class="mono">${t.ok}/${t.n}</span></div>`).join('')}
        </div>
        ${Object.keys(diags).length ? `<div style="margin-top:20px"><span class="mono-label">Kesalahan yang terdeteksi</span>${Object.entries(diags).map(([d, c]) => `<div class="diag">${c}× ${d}</div>`).join('')}</div>` : ''}
        ${weak.length ? `<div style="margin-top:20px"><span class="mono-label">Saran belajar</span><div class="chips" style="margin-top:10px;gap:8px">${weak.map(key => `<a class="btn btn-glass" href="${TOPICS[key].link}">Ulangi: ${TOPICS[key].label}</a>`).join('')}</div></div>` : ''}
        <div class="chips" style="margin-top:24px;gap:8px"><button class="btn btn-volt" id="again" type="button">Coba lagi dengan soal baru</button><a class="btn btn-glass" href="#/">Kembali ke beranda</a></div>
      </div>
    </section>`;
    app.querySelector('#again').addEventListener('click', setup);
    window.scrollTo({ top: 0 });
  }

  setup();
  const onWho = () => { if (!qs.length) setup(); };
  window.addEventListener('who-changed', onWho);
  return () => window.removeEventListener('who-changed', onWho);
}

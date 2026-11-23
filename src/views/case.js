// Halaman studi kasus: Situasi → Tebakan → Lintasan waktu → Mesin Hitung → Keputusan → Eksperimen.
import { CASES, levelTone, iOf } from '../data/cases.js';
import { pvFlows, crossRate, aAngle } from '../lib/finance.js';
import { fmt, rp, pad2, parseNum, near, esc } from '../lib/format.js';
import { store } from '../lib/store.js';
import { createTimeline } from '../three/timeline.js';
import { registerView, unregisterView, webglAvailable } from '../three/common.js';

const rateOf = (def, p) => (def.rate ? def.rate(p) : iOf(p, def.conv));
const horizonOf = (def, p) => (def.horizon ? def.horizon(p) : 0);
/** Nilai tiap pilihan: PV di t = 0, atau FV di t = H untuk kasus akumulasi */
function valuesOf(def, p, i, streams) {
  const H = horizonOf(def, p), g = Math.pow(1 + i, H);
  return Object.fromEntries(streams.map(s => [s.key, pvFlows(s.flows, i) * g]));
}
const fmtParam = (p, x) => (p.unit === 'rp' ? fmt(x, 0) : p.unit === 'pct' ? fmt(x, 2).replace(/,?0+$/, '') + '%' : String(x));

export function renderCase(app, id) {
  const def = CASES.find(c => c.id === id);
  if (!def) { app.innerHTML = '<section class="page-top"><h1>Kasus tidak ditemukan</h1><p><a class="link-btn" href="#/">Kembali ke beranda</a></p></section>'; return () => {}; }
  const saved = store.caseState(id);
  const st = {
    p: { ...def.defaults },
    scen: 0,
    unlocked: !!saved.done,
    guess: saved.guess || null,
    streamKey: null,
    step: saved.done ? Infinity : 0,
  };
  const idx = CASES.indexOf(def);
  const prev = CASES[idx - 1], next = CASES[idx + 1];

  const defaultsP = { ...def.defaults };
  const di = rateOf(def, defaultsP);
  const dStreams = def.streams(defaultsP, di);
  const dPvs = valuesOf(def, defaultsP, di, dStreams);
  const dSummary = def.summarize(defaultsP, di, dStreams, dPvs);
  const guessKey = def.guessAnswer(defaultsP, dSummary);
  const steps = def.steps(defaultsP);
  const tlStreams = () => def.streams(st.p, rateOf(def, st.p)).filter(s => s.timeline);
  const fvCase = !!def.horizon;

  app.innerHTML = `
  <section class="page-top">
    <div class="sec-head">
      <div>
        <div class="chips"><span class="chip">Studi kasus ${pad2(def.id)}</span><span class="chip ${levelTone(def.level)}">${def.level}</span></div>
        <h1>${def.title}</h1>
      </div>
      <p>${def.short}. Periode dalam ${def.unit}.</p>
    </div>

    <div class="case-top">
      <article class="card story hud">
        <span class="mono-label">01 · Situasi</span>
        <h3>${def.storyTitle}</h3>
        ${def.story(defaultsP)}
        <div class="options">${def.options(defaultsP).map(o => `
          <div class="option ${o.tone}"><span class="chip ${o.tone === 'v' ? '' : o.tone}">${o.name}</span><b>${o.value}</b><small>${o.detail}</small></div>`).join('')}
        </div>
      </article>
      <aside class="card guess">
        <span class="mono-label">02 · Tebakan awal</span>
        <h3>${def.guess.q}</h3>
        <div class="guess-opts">${def.guess.choices.map(([k, l, s]) => `<button class="opt" type="button" data-guess="${k}" aria-pressed="false">${l}<br><small class="note">${s}</small></button>`).join('')}</div>
        <p class="note" id="guessNote">Tebakanmu disimpan dan dibandingkan dengan hasil hitungan di akhir.</p>
      </aside>
    </div>

    <div class="card tl-card">
      <div class="tl-head">
        <div><span class="mono-label">03 · Eksplorasi</span><h3>Lintasan waktu arus kas</h3></div>
        <div class="chips" style="gap:8px">
          ${def.scenarios ? `<div class="seg" role="group" aria-label="Skenario" id="scenSeg">${def.scenarios.map((s, k) => `<button type="button" data-scen="${k}" aria-pressed="${k === 0}">${s.label}</button>`).join('')}</div>` : ''}
          <div class="seg" role="group" aria-label="Arus kas yang ditampilkan" id="streamSeg"></div>
        </div>
      </div>
      <div class="tl-stage">
        <div class="tl-canvas" id="tlCanvas"></div>
        <div class="tl-legend holo hud" id="tlLegend"></div>
        <div class="tl-actions">
          <button class="btn btn-volt" type="button" id="discBtn">${fvCase ? 'Akumulasikan ke akhir' : 'Diskontokan ke t = 0'}</button>
          <button class="btn btn-glass" type="button" id="resetBtn">Ulangi</button>
        </div>
      </div>
      <div class="tl-body locked" id="explorer">
        <div class="lock-veil" id="veil">
          <b>Eksperimen "bagaimana jika" masih terkunci</b>
          <p>Selesaikan Mesin Hitung di bawah untuk membuka slider, tabel per suku, skenario lain, dan titik balik keputusan.</p>
          <button class="link-btn" type="button" id="skipLock">Buka sekarang tanpa mengerjakan</button>
        </div>
        <div class="panel">
          <span class="mono-label">Parameter</span>
          ${def.params.map(pr => `<div class="ctrl"><label for="in_${pr.key}">${pr.label}</label><input type="range" id="in_${pr.key}" data-key="${pr.key}" min="${pr.min}" max="${pr.max}" step="${pr.step}" value="${defaultsP[pr.key]}"><output id="out_${pr.key}"></output></div>`).join('')}
          <div class="formula" id="formula"></div>
        </div>
        <div class="panel">
          <span class="mono-label">Hasil</span>
          <div class="kpis" id="kpis"></div>
          <div class="decision" id="decision"></div>
          <p class="note" id="insight" style="margin-bottom:12px"></p>
          <div class="tbl-wrap">
            <table>
              <thead><tr><th>t</th><th>ARUS KAS</th><th id="thF">v<sup>t</sup></th><th id="thV">NILAI DI t = 0</th></tr></thead>
              <tbody id="tbody"></tbody>
              <tfoot><tr><td colspan="3" style="text-align:right" id="tfootLabel">Σ = PV</td><td id="tsum"></td></tr></tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="card machine" id="mesin">
      <div class="chips" style="justify-content:space-between;align-items:center">
        <span class="mono-label">04 · Mesin Hitung</span>
        <button class="link-btn" type="button" id="restartMachine">Ulangi dari awal</button>
      </div>
      <div class="track" id="track">${steps.map((s, k) => `<div class="stg"><div class="node">${pad2(k + 1)}</div><span>${s.title}</span></div>`).join('')}</div>
      <div class="step-box" id="stepBox" aria-live="polite"></div>
    </div>

    <nav class="case-nav" aria-label="Navigasi kasus">
      ${prev ? `<a class="btn btn-glass" href="#/kasus/${prev.id}"><span class="arr">←</span> Kasus ${pad2(prev.id)}</a>` : '<a class="btn btn-glass" href="#/">← Beranda</a>'}
      ${next ? `<a class="btn btn-volt" href="#/kasus/${next.id}">Kasus ${pad2(next.id)}: ${next.title.split(':')[0]} <span class="arr">→</span></a>` : '<a class="btn btn-volt" href="#/latihan">Lanjut ke Uji Pemahaman <span class="arr">→</span></a>'}
    </nav>
  </section>`;

  const $ = s => app.querySelector(s);

  /* ---------- 3D ---------- */
  let tl = null;
  if (webglAvailable()) {
    try { tl = createTimeline($('#tlCanvas')); registerView(tl); }
    catch (e) { console.error(e); tl = null; }
  }
  if (!tl) $('#tlCanvas').innerHTML = '<p class="note fallback">Tampilan 3D tidak didukung di perangkat ini. Tabel per suku di bawah tetap menunjukkan nilai setiap arus kas.</p>';

  /* ---------- Pembaruan ---------- */
  function paintStreamSeg() {
    const ts = tlStreams();
    if (!st.streamKey || !ts.find(s => s.key === st.streamKey)) st.streamKey = ts[0]?.key;
    $('#streamSeg').innerHTML = ts.length > 1 ? ts.map(s => `<button type="button" data-stream="${s.key}" aria-pressed="${s.key === st.streamKey}">${s.label}</button>`).join('') : '';
    $('#streamSeg').classList.toggle('hidden', ts.length < 2);
  }
  function update(rebuild = true) {
    const p = st.p, i = rateOf(def, p), H = horizonOf(def, p);
    const streams = def.streams(p, i);
    const pvs = valuesOf(def, p, i, streams);
    const sum = def.summarize(p, i, streams, pvs);
    def.params.forEach(pr => { $(`#out_${pr.key}`).textContent = fmtParam(pr, p[pr.key]); });

    $('#formula').innerHTML = streams.map(s => `<div class="fl"><span class="chip ${s.tone === 'v' ? '' : s.tone}">${s.label}</span><span class="f">${s.formula}</span></div>`).join('');
    $('#kpis').innerHTML = [[`i per ${def.unit}`, fmt(i * 100, 3) + '%'], ...sum.kpis].map(([l, v]) => `<div class="kpi"><span>${l}</span><b>${v}</b></div>`).join('');
    const dec = $('#decision'); dec.className = 'decision ' + sum.decision.tone; dec.textContent = sum.decision.text;

    let insight = sum.insight || '';
    if (!insight && streams.length === 2 && def.goal !== 'solve' && !def.rate) {
      const f = ii => { const ss = def.streams(p, ii); return pvFlows(ss[0].flows, ii) - pvFlows(ss[1].flows, ii); };
      const cr = crossRate(f, 1e-6, 0.2);
      insight = cr == null ? `Pada rentang ${def.rateLabel.replace(/<[^>]+>/g, '')} 0–${fmt(20 * def.conv, 0)}% per tahun keputusan ini tidak berubah.`
        : `Keputusan berbalik ketika ${def.rateLabel.replace(/<[^>]+>/g, '')} melewati ${fmt(cr * def.conv * 100, 2)}% per tahun.`;
    }
    $('#insight').textContent = insight;

    const ts = streams.filter(s => s.timeline);
    const shown = ts.find(s => s.key === st.streamKey) || ts[0];
    if (shown) {
      $('#thF').innerHTML = H ? `(1+i)<sup>${H}−t</sup>` : 'v<sup>t</sup>';
      $('#thV').textContent = H ? `NILAI DI t = ${H}` : 'NILAI DI t = 0';
      $('#tbody').innerHTML = shown.flows.map(f => { const v = Math.pow(1 + i, H - f.t); return `<tr><td>${f.t}</td><td>${fmt(f.amt, 0)}</td><td>${fmt(v, 5)}</td><td>${fmt(f.amt * v)}</td></tr>`; }).join('');
      $('#tsum').textContent = fmt(pvs[shown.key]);
      $('#tfootLabel').textContent = `Σ = ${H ? 'FV' : 'PV'} ${shown.label}`;
      if (tl) {
        const tag = H ? 'FV' : 'PV';
        const pvText = def.pvText ? def.pvText(p, shown) : `${tag} = ${rp(pvs[shown.key], 0)}`;
        tl.setPvText(st.unlocked ? pvText : `${tag} = ?`);
        if (rebuild) {
          const { group } = tl.build({ flows: shown.flows, i, defer: shown.defer || 0, horizon: H });
          const how = H
            ? `Tekan <b>Akumulasikan</b>: koin meluncur ke t = ${H} dan membesar sebesar faktor (1 + <span class="it">i</span>)<sup>${H}−<span class="it">t</span></sup>.`
            : 'Tekan <b>Diskontokan</b>: koin meluncur ke t = 0 dan menyusut sebesar faktor <span class="it">v</span><sup><span class="it">t</span></sup>.';
          $('#tlLegend').innerHTML = `Setiap koin adalah ${group > 1 ? `gabungan ${group} pembayaran` : 'satu pembayaran'} <b>${shown.label}</b>; sumbu waktu dalam ${def.unit}. ${how}`;
        }
      }
    }
  }

  /* ---------- Interaksi eksperimen ---------- */
  app.querySelectorAll('input[type=range][data-key]').forEach(inp => inp.addEventListener('input', () => {
    st.p[inp.dataset.key] = +inp.value;
    update(true);
  }));
  const scenSeg = $('#scenSeg');
  if (scenSeg) scenSeg.addEventListener('click', e => {
    const b = e.target.closest('[data-scen]'); if (!b || !st.unlocked) return;
    st.scen = +b.dataset.scen;
    Object.assign(st.p, def.scenarios[st.scen].values);
    def.params.forEach(pr => { $(`#in_${pr.key}`).value = st.p[pr.key]; });
    scenSeg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    paintStreamSeg(); update(true);
  });
  $('#streamSeg').addEventListener('click', e => {
    const b = e.target.closest('[data-stream]'); if (!b) return;
    st.streamKey = b.dataset.stream;
    $('#streamSeg').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    update(true);
  });
  $('#discBtn').addEventListener('click', () => tl && tl.discount());
  $('#resetBtn').addEventListener('click', () => tl && tl.reset());

  function setLock() {
    $('#veil').classList.toggle('hidden', st.unlocked);
    if (scenSeg) scenSeg.querySelectorAll('button').forEach(b => { b.disabled = !st.unlocked; });
  }
  function unlock() { if (st.unlocked) return; st.unlocked = true; setLock(); update(false); }
  $('#skipLock').addEventListener('click', unlock);

  /* ---------- Tebakan ---------- */
  function paintGuess() {
    app.querySelectorAll('[data-guess]').forEach(b => b.setAttribute('aria-pressed', b.dataset.guess === st.guess));
    if (st.guess) {
      const label = def.guess.choices.find(c => c[0] === st.guess)?.[1];
      $('#guessNote').textContent = `Tebakanmu: ${label}. Lanjutkan ke lintasan waktu dan Mesin Hitung.`;
    }
  }
  app.querySelectorAll('[data-guess]').forEach(b => b.addEventListener('click', () => {
    st.guess = b.dataset.guess; store.setCase(id, { guess: st.guess }); paintGuess();
  }));

  /* ---------- Mesin Hitung ---------- */
  let advanceTimer = null;
  function renderStep() {
    const cur = Math.min(st.step, steps.length);
    app.querySelectorAll('#track .stg').forEach((s, k) => { s.classList.toggle('done', k < cur); s.classList.toggle('active', k === cur); });
    const box = $('#stepBox');
    if (cur >= steps.length) {
      const right = st.guess ? st.guess === guessKey : null;
      const guessLabel = def.guess.choices.find(c => c[0] === guessKey)?.[1];
      box.innerHTML = `<span class="mono-label">05 · Keputusan</span>
        <h4>Mesin menyala penuh. ${esc(dSummary.decision.text)}</h4>
        <div class="reveal">${dSummary.kpis.map(([l, v]) => `<div class="kpi"><span>${l}</span><b>${v}</b></div>`).join('')}</div>
        <div class="reflect">${right === null ? '' : `<p>${right ? 'Tebakan awalmu tepat.' : `Tebakan awalmu berbeda dengan hasil hitungan (jawaban: ${guessLabel}).`}</p>`}${def.conclusion(defaultsP)}</div>`;
      store.setCase(id, { done: true });
      unlock();
      return;
    }
    const s = steps[cur];
    const input = s.choices
      ? `<div class="answer-row">${s.choices.map(([v, l]) => `<button class="opt" type="button" data-v="${v}">${l}</button>`).join('')}</div>`
      : `<form class="answer-row" id="ansForm"><input type="text" id="ans" inputmode="decimal" autocomplete="off" placeholder="jawaban" aria-label="Jawaban tahap ${cur + 1}"><button class="btn btn-volt" type="submit">Periksa</button></form>`;
    box.innerHTML = `<span class="mono-label">Tahap ${pad2(cur + 1)} dari ${pad2(steps.length)}</span><h4>${s.title}</h4><p class="q">${s.q}</p>${input}
      <div class="fb" id="fb"></div>
      <button class="link-btn" type="button" id="hintBtn">Butuh petunjuk?</button><div class="hint hidden" id="hint">${s.hint}</div>`;
    const judge = (ok, btn) => {
      const fb = $('#fb');
      if (ok) {
        fb.className = 'fb ok'; fb.textContent = s.ok;
        box.querySelectorAll('button, input').forEach(x => { if (x.id !== 'hintBtn') x.disabled = true; });
        advanceTimer = setTimeout(() => { st.step = cur + 1; renderStep(); }, 1500);
      } else {
        fb.className = 'fb no'; fb.textContent = 'Belum tepat. Coba lagi atau buka petunjuk.';
        if (btn) btn.classList.add('wrong');
      }
    };
    if (s.choices) box.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => judge(s.check(b.dataset.v), b)));
    else $('#ansForm').addEventListener('submit', e => {
      e.preventDefault();
      const x = parseNum($('#ans').value);
      const abs = s.rel === 0 ? 0.01 : 0;
      judge(near(x, s.target, s.rel, abs) || (s.alt != null && near(x, s.alt, s.rel || 0.001)));
    });
    $('#hintBtn').addEventListener('click', () => $('#hint').classList.toggle('hidden'));
  }
  $('#restartMachine').addEventListener('click', () => { clearTimeout(advanceTimer); st.step = 0; renderStep(); });

  paintStreamSeg();
  setLock();
  paintGuess();
  update(true);
  renderStep();

  return () => { clearTimeout(advanceTimer); if (tl) { unregisterView(tl); tl.destroy(); } };
}

export { aAngle };

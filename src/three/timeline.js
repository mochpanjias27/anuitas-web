// Lintasan waktu interaktif: setiap koin = satu arus kas; tombol "Diskontokan" membawa koin ke t = 0
// sambil menyusut sebesar faktor diskon, lalu menumpuk menjadi nilai sekarang.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { makeRenderer, studioEnv, addLights, shadowFloor, mats, makeCoin, makePortal, disposeScene, clamp01, ease, lerp, reduceMotion } from './common.js';

const MAX_COINS = 30;

/** Kelompokkan arus kas bila terlalu banyak koin (mis. 240 bulan) */
export function groupFlows(flows, i) {
  const sorted = [...flows].sort((a, b) => a.t - b.t);
  const g = Math.max(1, Math.ceil(sorted.length / MAX_COINS));
  const out = [];
  for (let k = 0; k < sorted.length; k += g) {
    const part = sorted.slice(k, k + g);
    const amt = part.reduce((s, f) => s + f.amt, 0);
    const pv = part.reduce((s, f) => s + f.amt * Math.pow(1 + i, -f.t), 0);
    out.push({ t: part.reduce((s, f) => s + f.t, 0) / part.length, tEnd: part[part.length - 1].t, amt, pv, v: amt ? pv / amt : 1 });
  }
  return { coins: out, group: g };
}

export function createTimeline(el) {
  const m = mats();
  const renderer = makeRenderer(el);
  const labels = new CSS2DRenderer();
  Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
  el.appendChild(labels.domElement);
  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  addLights(scene, 14);
  scene.add(shadowFloor(-0.02, 120, 0.13));
  const L = 14;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 300);
  const target = new THREE.Vector3(L / 2 - 0.4, 1.9, 0);

  const sub = new THREE.Mesh(new RoundedBoxGeometry(L + 2.6, 0.34, 1.9, 4, 0.1), m.graphite);
  sub.position.set(L / 2 + 0.3, 0.17, 0); sub.castShadow = true; sub.receiveShadow = true; scene.add(sub);
  const deck = new THREE.Mesh(new RoundedBoxGeometry(L + 1.2, 0.14, 2.3, 4, 0.06), m.ceramic);
  deck.position.set(L / 2 + 0.9, 0.4, 0); deck.receiveShadow = true; deck.castShadow = true; scene.add(deck);
  [-1.18, 1.18].forEach(z => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(L + 1.1, 0.05, 0.06), m.neon);
    s.position.set(L / 2 + 0.9, 0.47, z); scene.add(s);
  });
  const portal = makePortal(1.0); scene.add(portal);
  const t0Div = document.createElement('div'); t0Div.className = 'tl-label t0'; t0Div.textContent = 't = 0 · hari ini';
  const t0Lab = new CSS2DObject(t0Div); t0Lab.position.set(0, 0.3, 1.7); scene.add(t0Lab);
  const pvDiv = document.createElement('div'); pvDiv.className = 'pv-tag';
  const pvLab = new CSS2DObject(pvDiv); pvLab.visible = false; scene.add(pvLab);

  const world = new THREE.Group(); scene.add(world);
  const deckTop = 0.47, baseStack = 0.36;
  let runId = 0, coins = [], anims = [], pvText = 'PV = ?';

  function clear() {
    world.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isSprite) o.material.dispose(); });
    world.children.slice().forEach(o => world.remove(o));
    coins = []; anims = []; runId++; pvLab.visible = false;
  }

  /**
   * @param {{flows:{t:number,amt:number}[], i:number, defer?:number}} data
   * @returns {{group:number}} jumlah periode per koin
   */
  function build({ flows, i, defer = 0 }) {
    clear();
    if (!flows.length) return { group: 1 };
    const { coins: cs, group } = groupFlows(flows, i);
    const lastT = Math.max(1, ...flows.map(f => f.t));
    const sp = L / lastT;
    const maxAmt = Math.max(...cs.map(c => c.amt));
    const cw = Math.min(L / Math.max(cs.length, 1), sp * group);
    const r = Math.min(0.6, cw * 0.42), th = r * 0.22;
    const every = Math.ceil(lastT / 12);
    for (let t = 1; t <= lastT; t++) {
      const labeled = t % every === 0 || t === lastT;
      if (lastT <= 60 || labeled) {
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.45), m.graphite);
        tick.position.set(t * sp, deckTop + 0.01, 0.85); world.add(tick);
      }
      if (labeled) {
        const d = document.createElement('div'); d.className = 'tl-label'; d.textContent = t;
        const o = new CSS2DObject(d); o.position.set(t * sp, 0.4, 1.6); world.add(o);
      }
    }
    if (defer > 0) {
      const gate = new THREE.Mesh(new THREE.BoxGeometry(defer * sp, 0.02, 2.1), m.amber);
      gate.position.set((defer * sp) / 2 + 0.55, deckTop + 0.012, 0); world.add(gate);
      const d = document.createElement('div'); d.className = 'delay-tag'; d.textContent = `masa tunda ${defer} periode`;
      const o = new CSS2DObject(d); o.position.set((defer * sp) / 2 + 0.55, deckTop + 0.1, -1.5); world.add(o);
    }
    cs.forEach(c => {
      const s0 = Math.max(0.35, c.amt / maxAmt);
      const coin = makeCoin(r, th, cs.length <= 16);
      const home = { x: c.t * sp, y: (c.t < 0.5 ? baseStack : deckTop) + r * s0 + 0.02, s: s0, rx: Math.PI / 2 };
      coin.position.set(home.x, home.y, 0); coin.rotation.x = home.rx; coin.scale.setScalar(s0);
      world.add(coin);
      coins.push({ obj: coin, home, info: c, th });
    });
    return { group };
  }
  function reset(silent) {
    anims = []; pvLab.visible = false; if (!silent) runId++;
    coins.forEach(c => {
      c.obj.position.set(c.home.x, c.home.y, 0); c.obj.rotation.set(c.home.rx, 0, 0); c.obj.scale.setScalar(c.home.s);
    });
  }
  function discount() {
    reset(true);
    let stack = baseStack;
    const now = performance.now();
    const gap = Math.max(40, Math.min(140, 2200 / Math.max(coins.length, 1)));
    coins.slice().sort((a, b) => a.info.t - b.info.t).forEach((c, k) => {
      const s = c.home.s * c.info.v, y = stack + (c.th * s) / 2; stack += c.th * s;
      anims.push({ c, t0: now + k * (reduceMotion ? 0 : gap), dur: reduceMotion ? 1 : 950, from: { ...c.home }, to: { x: 0, y, s, rx: 0 } });
    });
    const lastA = anims[anims.length - 1];
    pvLab.position.set(0, stack + 1.3, 0);
    const run = ++runId;
    setTimeout(() => { if (run !== runId) return; pvDiv.textContent = pvText; pvLab.visible = true; }, lastA ? lastA.t0 - now + lastA.dur : 0);
  }
  function resize() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h); labels.setSize(w, h);
    camera.aspect = w / h;
    const dist = 18.5 * Math.max(1, 2.1 / camera.aspect);
    camera.position.set(target.x + 2.5, target.y + dist * 0.42, dist * 0.9);
    camera.lookAt(target); camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(el); resize();

  return {
    el, build, discount, reset: () => reset(),
    setPvText(s) { pvText = s; if (pvLab.visible) pvDiv.textContent = s; },
    tick(t, now, dt) {
      portal.userData.tick(t, dt);
      anims.forEach(a => {
        const p = clamp01((now - a.t0) / a.dur);
        if (p <= 0) return;
        const e = ease(p), f = a.from, to = a.to, o = a.c.obj;
        o.position.x = lerp(f.x, to.x, e);
        o.position.y = lerp(f.y, to.y, e) + Math.sin(e * Math.PI) * (1.3 + f.x * 0.06);
        o.rotation.x = lerp(f.rx, to.rx, e);
        o.scale.setScalar(lerp(f.s, to.s, e));
      });
      if (!reduceMotion && !anims.length) coins.forEach((c, k) => { c.obj.position.y = c.home.y + Math.sin(t * 2 + k * 0.5) * 0.04; });
      renderer.render(scene, camera); labels.render(scene, camera);
    },
    destroy() {
      ro.disconnect();
      clear();
      disposeScene(scene, renderer);
      labels.domElement.remove();
    },
  };
}

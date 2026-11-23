// Adegan hero: koin pembayaran di lintasan waktu → portal t = 0 (menyusut sebesar v^t) → brankas Σ PV.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { makeRenderer, studioEnv, addLights, shadowFloor, mats, makeCoin, makePortal, disposeScene, clamp01, ease, lerp, reduceMotion } from './common.js';
import { rp, fmt } from '../lib/format.js';

/**
 * @param {HTMLElement} el wadah kanvas
 * @param {{pv: HTMLElement, terms: HTMLElement}} hud elemen panel PV live
 */
export function createHero(el, hud) {
  const m = mats();
  const renderer = makeRenderer(el);
  const labels = new CSS2DRenderer();
  Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
  el.appendChild(labels.domElement);

  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer);
  addLights(scene, 9);
  scene.add(shadowFloor(-0.02, 80, 0.14));
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
  const root = new THREE.Group(); scene.add(root);
  const rig = new THREE.Group(); rig.rotation.y = -0.52; root.add(rig);

  // Anuitas C dari materi kuliah: A = 4 juta, i = 5%, n = 5
  const SP = 1.9, N = 5, A = 4e6, I = 0.05;
  const sub = new THREE.Mesh(new RoundedBoxGeometry(SP * N + 1.6, 0.34, 1.7, 4, 0.1), m.graphite);
  sub.position.set(SP * N / 2 + 0.6, 0.17, 0); sub.castShadow = true; sub.receiveShadow = true; rig.add(sub);
  for (let k = 0; k < N; k++) {
    const x = SP * (k + 1);
    const seg = new THREE.Mesh(new RoundedBoxGeometry(SP - 0.08, 0.14, 2.1, 4, 0.06), m.ceramic);
    seg.position.set(x - 0.02, 0.4, 0); seg.castShadow = true; seg.receiveShadow = true; rig.add(seg);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 64), m.chrome);
    pad.position.set(x, 0.49, 0); pad.receiveShadow = true; rig.add(pad);
    const pr = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.018, 8, 64), m.neon);
    pr.rotation.x = Math.PI / 2; pr.position.set(x, 0.51, 0); rig.add(pr);
    const d = document.createElement('div'); d.className = 'tl-label'; d.textContent = `t = ${k + 1}`;
    const lab = new CSS2DObject(d); lab.position.set(x, 0.45, 1.35); rig.add(lab);
  }
  [-1.08, 1.08].forEach(z => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(SP * N + 0.2, 0.05, 0.06), m.neon);
    s.position.set(SP * N / 2 + 0.9, 0.47, z); rig.add(s);
  });
  const portal = makePortal(1.1); rig.add(portal);
  const d0 = document.createElement('div'); d0.className = 'tl-label t0'; d0.textContent = 't = 0 · hari ini';
  const l0 = new CSS2DObject(d0); l0.position.set(0, 0.3, 1.75); rig.add(l0);

  // Brankas kaca tempat PV menumpuk
  const VX = -0.2, VZ = -2.9;
  const vault = new THREE.Group(); vault.position.set(VX, 0, VZ); rig.add(vault);
  const vb = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.3, 80), m.graphite); vb.position.y = 0.15; vb.castShadow = true; vault.add(vb);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 2.4, 80, 1, true),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, roughness: 0.02, metalness: 0, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.y = 1.5; vault.add(glass);
  const cap = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.04, 12, 96), m.chrome); cap.rotation.x = Math.PI / 2; cap.position.y = 2.7; vault.add(cap);
  [0.34, 2.66].forEach(y => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.02, 8, 96), y < 1 ? m.neon : m.cyan);
    r.rotation.x = Math.PI / 2; r.position.y = y; vault.add(r);
  });
  const dv = document.createElement('div'); dv.className = 'tl-label'; dv.textContent = 'Σ PV';
  const lv = new CSS2DObject(dv); lv.position.set(0, 3.05, 0); vault.add(lv);

  // Aksen krom melayang
  const deco = [];
  const decoGeo = [new THREE.OctahedronGeometry(0.32), new THREE.TorusGeometry(0.3, 0.09, 16, 48), new THREE.IcosahedronGeometry(0.26, 0), new RoundedBoxGeometry(0.4, 0.4, 0.4, 4, 0.08)];
  [[6.5, 3.6, -3.2], [-2.6, 3.4, 1.6], [10.6, 2.2, 1.4], [3.2, 4.4, -4.6]].forEach((p, k) => {
    const mesh = new THREE.Mesh(decoGeo[k], k === 3 ? m.neon : m.chrome);
    mesh.position.set(...p); mesh.castShadow = true; rig.add(mesh);
    deco.push({ mesh, y: p[1], ph: k * 1.7 });
  });

  const R = 0.62, TH = 0.14;
  const coins = [];
  for (let k = 0; k < N; k++) {
    const t = k + 1, c = makeCoin(R, TH);
    rig.add(c);
    coins.push({ c, t, v: Math.pow(1 + I, -t), pv: A * Math.pow(1 + I, -t), home: new THREE.Vector3(SP * t, 0.51 + R + 0.03, 0) });
  }

  const HOLD = 2600, DUR = 2300, GAP = 900;
  const cycle = N * GAP + DUR + HOLD;
  let t0 = performance.now(), landed = 0;
  const termRow = c => `<span>4 jt · v<sup>${c.t}</sup></span><b>${fmt(c.pv, 0)}</b>`;
  function resetCycle(now) { t0 = now; landed = 0; hud.pv.textContent = 'Rp0'; hud.terms.innerHTML = ''; }
  function coinPose(c, p, k) {
    // Tahap A meluncur & menyusut, B naik di berkas portal, C jatuh ke brankas
    const o = c.c, h = c.home;
    let stackY = 0.32;
    for (let j = 0; j < k; j++) stackY += TH * coins[j].v;
    const eA = ease(clamp01(p / 0.42)), eB = ease(clamp01((p - 0.42) / 0.26)), eC = ease(clamp01((p - 0.68) / 0.32));
    let x = lerp(h.x, 0, eA), y = h.y + Math.sin(eA * Math.PI) * 0.25, z = 0;
    y = lerp(y, 2.6, eB);
    x = lerp(x, VX, eC); z = lerp(0, VZ, eC);
    y = lerp(y, stackY + (TH * c.v) / 2, eC);
    o.position.set(x, y, z);
    o.rotation.x = lerp(Math.PI / 2, 0, eB);
    o.rotation.y = eB * Math.PI * 2;
    o.scale.setScalar(lerp(1, c.v, eA));
    if (o.userData.halo) o.userData.halo.material.opacity = 1 - eC * 0.7;
    return p >= 1;
  }
  function resize() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h); labels.setSize(w, h);
    camera.aspect = w / h;
    const k = Math.max(1, 1.25 / camera.aspect);
    camera.position.set(14 * k, 11.5 * k, 19 * k);
    camera.lookAt(3.4, 1.2, -1.2); camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(el); resize();
  let mx = 0, my = 0;
  const onMove = e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; };
  window.addEventListener('pointermove', onMove);

  if (reduceMotion) {
    let s = 0; coins.forEach((c, k) => { coinPose(c, 1, k); s += c.pv; });
    hud.pv.textContent = rp(s, 0);
    hud.terms.innerHTML = coins.map(c => `<div>${termRow(c)}</div>`).join('');
  }

  return {
    el,
    tick(t, now, dt) {
      portal.userData.tick(t, dt);
      if (!reduceMotion) {
        deco.forEach(d => { d.mesh.position.y = d.y + Math.sin(t * 0.8 + d.ph) * 0.2; d.mesh.rotation.x = t * 0.4 + d.ph; d.mesh.rotation.y = t * 0.3; });
        rig.rotation.y += (-0.52 + mx * 0.18 - rig.rotation.y) * 0.05;
        root.rotation.x += (my * 0.05 - root.rotation.x) * 0.05;
        const e = now - t0;
        if (e > cycle) resetCycle(now);
        let done = 0;
        coins.forEach((c, k) => {
          const p = clamp01((e - k * GAP) / DUR);
          if (p <= 0) {
            c.c.position.copy(c.home); c.c.position.y += Math.sin(t * 2 + k) * 0.05;
            c.c.rotation.set(Math.PI / 2, 0, 0); c.c.scale.setScalar(1);
            if (c.c.userData.halo) c.c.userData.halo.material.opacity = 1;
          } else if (coinPose(c, p, k)) done++;
        });
        const back = clamp01((e - (cycle - 500)) / 500);
        if (back > 0) coins.forEach(c => { c.c.position.copy(c.home); c.c.rotation.set(Math.PI / 2, 0, 0); c.c.scale.setScalar(ease(back)); });
        while (landed < done) {
          const c = coins[landed]; landed++;
          const sum = coins.slice(0, landed).reduce((s, x) => s + x.pv, 0);
          hud.pv.textContent = rp(sum, 0);
          hud.pv.classList.add('pulse'); setTimeout(() => hud.pv.classList.remove('pulse'), 350);
          const row = document.createElement('div'); row.innerHTML = termRow(c);
          hud.terms.appendChild(row);
        }
      }
      renderer.render(scene, camera); labels.render(scene, camera);
    },
    destroy() {
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      disposeScene(scene, renderer);
      labels.domElement.remove();
    },
  };
}

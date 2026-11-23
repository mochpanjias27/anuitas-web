// Bahan bersama untuk semua adegan 3D: renderer, lingkungan studio, material krom/neon, koin, portal.
import * as THREE from 'three';

export const VOLT = 0x00e07a;
export const CYAN = 0x19c2ff;
export const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const clamp01 = x => Math.min(1, Math.max(0, x));
export const ease = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const lerp = (a, b, t) => a + (b - a) * t;

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

export function makeRenderer(el) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(r.domElement);
  return r;
}

/** Lingkungan studio buatan: panel cahaya putih + strip volt & sian supaya krom memantulkan nuansa futuristik. */
const envCache = new WeakMap();
export function studioEnv(renderer) {
  if (envCache.has(renderer)) return envCache.get(renderer);
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: 0xdfe6ee, side: THREE.BackSide })));
  const panel = (hex, k, w, h, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(0xffffff, 4, 14, 10, [0, 14, 2]);
  panel(0xffffff, 2.2, 16, 4, [-14, 4, 6]);
  panel(0xffffff, 1.6, 10, 10, [8, 4, 14]);
  panel(VOLT, 3.2, 18, 1.2, [12, 2, -8]);
  panel(CYAN, 2.6, 1.2, 18, [-8, 5, -12]);
  panel(0x1a2230, 1, 40, 5, [0, -10, -6]);
  panel(0x1a2230, 1, 4, 30, [16, 0, 4]);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.02).texture;
  pm.dispose();
  envCache.set(renderer, tex);
  return tex;
}

export function addLights(scene, size) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd6e0ea, 0.55));
  const d = new THREE.DirectionalLight(0xffffff, 1.8);
  d.position.set(5, 12, 7);
  d.castShadow = true;
  d.shadow.mapSize.set(2048, 2048);
  d.shadow.radius = 8;
  d.shadow.bias = -0.0004;
  Object.assign(d.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: 1, far: 60 });
  d.target.position.set(size * 0.4, 0, 0);
  scene.add(d, d.target);
  return d;
}

export function shadowFloor(y, w = 60, op = 0.16) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.ShadowMaterial({ opacity: op }));
  p.rotation.x = -Math.PI / 2; p.position.y = y; p.receiveShadow = true;
  return p;
}

function canvasTex(size, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function dial(g, s, withText) {
  const c = s / 2;
  const base = g.createRadialGradient(c * 0.7, c * 0.6, 10, c, c, c);
  base.addColorStop(0, '#ffffff'); base.addColorStop(0.6, '#e6ecf2'); base.addColorStop(1, '#b9c5d2');
  g.fillStyle = base; g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(10,15,26,.18)'; g.lineWidth = 2;
  [c * 0.93, c * 0.7].forEach(r => { g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); });
  g.strokeStyle = 'rgba(10,15,26,.45)';
  for (let k = 0; k < 60; k++) {
    const a = (k / 60) * Math.PI * 2, r1 = c * 0.86, r2 = c * (k % 5 ? 0.82 : 0.78);
    g.lineWidth = k % 5 ? 2 : 4;
    g.beginPath(); g.moveTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.lineTo(c + Math.cos(a) * r2, c + Math.sin(a) * r2); g.stroke();
  }
  if (withText) {
    // Tekstur tutup silinder: diputar -90° agar "Rp" tegak saat koin menghadap kamera (rotation.x = +90°)
    g.save(); g.translate(c, c); g.rotate(-Math.PI / 2);
    g.fillStyle = '#0a0f1a'; g.font = `800 ${s * 0.27}px Unbounded, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Rp', 0, s * 0.02);
    g.restore();
  }
}

let M = null;
/** Material dibuat sekali, setelah font siap (tekstur "Rp" digambar di kanvas). */
export function mats() {
  if (M) return M;
  const glowTex = canvasTex(256, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(0,224,122,.55)'); r.addColorStop(0.35, 'rgba(0,224,122,.22)'); r.addColorStop(1, 'rgba(0,224,122,0)');
    g.fillStyle = r; g.fillRect(0, 0, s, s);
  });
  const faceGlow = canvasTex(512, (g, s) => {
    const c = s / 2; g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
    g.strokeStyle = '#00e07a'; g.lineWidth = s * 0.035; g.beginPath(); g.arc(c, c, c * 0.9, 0, Math.PI * 2); g.stroke();
  });
  const faceFront = canvasTex(512, (g, s) => dial(g, s, true));
  const faceBack = canvasTex(512, (g, s) => dial(g, s, false));
  M = {
    glowTex,
    chrome: new THREE.MeshPhysicalMaterial({ color: 0xe9eef4, metalness: 1, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05 }),
    front: new THREE.MeshPhysicalMaterial({ map: faceFront, emissiveMap: faceGlow, emissive: 0xffffff, emissiveIntensity: 1.1, metalness: 0.55, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.05 }),
    back: new THREE.MeshPhysicalMaterial({ map: faceBack, emissiveMap: faceGlow, emissive: 0xffffff, emissiveIntensity: 1.1, metalness: 0.55, roughness: 0.24, clearcoat: 1 }),
    neon: new THREE.MeshStandardMaterial({ color: 0xb8ffd9, emissive: VOLT, emissiveIntensity: 1.4, roughness: 0.3 }),
    cyan: new THREE.MeshStandardMaterial({ color: 0xc6f0ff, emissive: CYAN, emissiveIntensity: 1.3, roughness: 0.3 }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.32, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    graphite: new THREE.MeshPhysicalMaterial({ color: 0x1b2330, roughness: 0.35, metalness: 0.7, clearcoat: 0.6 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xffd9a8, transparent: true, opacity: 0.85 }),
  };
  return M;
}

export function makeCoin(r = 1, th = 0.18, halo = true) {
  const m = mats();
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, th, 96, 1), [m.chrome, m.front, m.back]);
  body.castShadow = true; g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 1.005, th * 0.22, 12, 120), m.neon);
  rim.rotation.x = Math.PI / 2; g.add(rim);
  if (halo) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: m.glowTex, transparent: true, depthWrite: false }));
    sp.scale.setScalar(r * 3.6); sp.renderOrder = -1; g.add(sp); g.userData.halo = sp;
  }
  return g;
}

function beamMaterial(color = VOLT) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float fade = pow(1.0 - vUv.y, 1.8);
        float scan = 0.55 + 0.45 * step(0.55, fract(vUv.y * 18.0 - uTime * 1.6));
        float edge = 0.6 + 0.4 * sin(vUv.x * 6.2831 * 3.0 + uTime);
        gl_FragColor = vec4(uColor, fade * scan * edge * 0.42);
      }`,
  });
}

export function makePortal(radius = 1.15) {
  const m = mats();
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.25, radius * 1.35, 0.28, 96), m.graphite);
  base.position.y = 0.14; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.12, radius * 1.12, 0.06, 96), m.chrome);
  plate.position.y = 0.3; plate.receiveShadow = true; g.add(plate);
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.05, 16, 128), m.neon);
  r1.rotation.x = Math.PI / 2; r1.position.y = 0.34; g.add(r1);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, 0.025, 12, 100, Math.PI * 1.4), m.cyan);
  r2.rotation.x = Math.PI / 2; r2.position.y = 0.34; g.add(r2);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, 4, 64, 1, true), beamMaterial());
  beam.position.y = 2.34; g.add(beam);
  const N = 70, pos = new Float32Array(N * 3), spd = [];
  for (let k = 0; k < N; k++) {
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * radius * 0.85;
    pos.set([Math.cos(a) * rr, 0.4 + Math.random() * 3.8, Math.sin(a) * rr], k * 3); spd.push(0.4 + Math.random() * 0.9);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x00c96d, size: 0.07, transparent: true, opacity: 0.85, depthWrite: false })));
  g.userData.tick = (t, dt) => {
    r1.rotation.z = t * 0.5; r2.rotation.z = -t * 1.1;
    beam.material.uniforms.uTime.value = t;
    if (reduceMotion) return;
    const a = geo.attributes.position.array;
    for (let k = 0; k < N; k++) { a[k * 3 + 1] += spd[k] * dt; if (a[k * 3 + 1] > 4.2) a[k * 3 + 1] = 0.4; }
    geo.attributes.position.needsUpdate = true;
  };
  return g;
}

/** Lepaskan geometri & renderer saat halaman berganti. Material bersama tidak dihapus. */
export function disposeScene(scene, renderer) {
  scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.isSprite && o.material) o.material.dispose();
    if (o.material && o.material.isShaderMaterial) o.material.dispose();
  });
  renderer.dispose();
  renderer.forceContextLoss();
  renderer.domElement.remove();
}

/* ---------- Pengelola loop animasi: hanya merender adegan yang terlihat ---------- */
const views = new Set();
const visible = new WeakMap();
let io = null, running = false, last = 0;
const clock = new THREE.Clock();
function frame(now) {
  const t = clock.getElapsedTime(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  views.forEach(v => { if (visible.get(v.el) !== false) v.tick(t, now, dt); });
  if (views.size) requestAnimationFrame(frame); else running = false;
}
export function registerView(v) {
  if (!io) io = new IntersectionObserver(es => es.forEach(e => visible.set(e.target, e.isIntersecting)));
  views.add(v); io.observe(v.el);
  if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
}
export function unregisterView(v) {
  views.delete(v);
  if (io) io.unobserve(v.el);
}

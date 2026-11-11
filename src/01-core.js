import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

/* ============================================================
   UTILIDADES
   ============================================================ */
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;
let _uid = 1;
const uid = (p = 'o') => p + Date.now().toString(36) + (_uid++).toString(36);
function mulberry(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// ruído de valor 2D simples (procedural)
function hash2(x, y, s) { let h = x * 374761393 + y * 668265263 + s * 982451653; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s); return lerp(lerp(a, b, u), lerp(c, d, u), v); }
function fbm(x, y, s, oct = 4) { let a = 0, amp = 0.5, f = 1; for (let i = 0; i < oct; i++) { a += amp * vnoise(x * f, y * f, s + i * 17); f *= 2; amp *= 0.5; } return a; }
// ruído 1D suave para tremor de câmera
function noise1(t, s) { const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return lerp(hash2(i, 0, s), hash2(i + 1, 0, s), u) * 2 - 1; }
function toast(msg, ms = 2200) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms); }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function fmt(v, d = 3) { if (!isFinite(v)) return '0'; return (Math.round(v * 10 ** d) / 10 ** d).toString(); }

/* ============================================================
   CANAIS
   ============================================================ */
const CH = {
  px: { g: 'pos', lb: 'X', col: '#e8584f' }, py: { g: 'pos', lb: 'Y', col: '#6cc86a' }, pz: { g: 'pos', lb: 'Z', col: '#4f9cf0' },
  rx: { g: 'rot', lb: 'X', col: '#ff8a7a' }, ry: { g: 'rot', lb: 'Y', col: '#9be08f' }, rz: { g: 'rot', lb: 'Z', col: '#86bdf7' },
  sx: { g: 'scl', lb: 'X', col: '#c0605a' }, sy: { g: 'scl', lb: 'Y', col: '#5aa058' }, sz: { g: 'scl', lb: 'Z', col: '#4a80c0' },
  focal: { g: 'lens', lb: 'Focal', col: '#f2c14e' },
};
const GROUPS = { pos: { lb: 'Posição', ch: ['px', 'py', 'pz'], unit: 'm' }, rot: { lb: 'Rotação', ch: ['rx', 'ry', 'rz'], unit: '°' }, scl: { lb: 'Escala', ch: ['sx', 'sy', 'sz'], unit: '' }, lens: { lb: 'Lente', ch: ['focal'], unit: 'mm' } };
const chLabel = (c) => GROUPS[CH[c].g].lb + ' ' + CH[c].lb;
function channelsOf(o) { const c = ['px', 'py', 'pz', 'rx', 'ry', 'rz', 'sx', 'sy', 'sz']; if (o.type === 'camera') c.push('focal'); return c; }

/* ============================================================
   KEYFRAMES / CURVAS BEZIER (modelo estilo AE/Blender)
   key = {f, v, ii, oi, li:{x,y}, ro:{x,y}, h:'auto'|'free'}
   ii/oi: 'bezier' | 'linear' | 'hold'
   ============================================================ */
function mkKey(f, v, interp = 'bezier') { return { f, v, ii: interp === 'hold' ? 'bezier' : interp, oi: interp, li: { x: -1, y: 0 }, ro: { x: 1, y: 0 }, h: 'auto' }; }
function sortKeys(keys) { keys.sort((a, b) => a.f - b.f); for (let i = keys.length - 1; i > 0; i--) if (Math.abs(keys[i].f - keys[i - 1].f) < 1e-6) keys.splice(i - 1, 1); }
function autoHandles(keys) {
  const n = keys.length;
  for (let i = 0; i < n; i++) {
    const k = keys[i], p = keys[i - 1], q = keys[i + 1];
    const dl = p ? (k.f - p.f) / 3 : 1, dr = q ? (q.f - k.f) / 3 : 1;
    if (k.h === 'auto') {
      let s = 0;
      if (p && q) { if (!((k.v >= p.v && k.v >= q.v) || (k.v <= p.v && k.v <= q.v))) { s = (q.v - p.v) / (q.f - p.f); const s1 = (k.v - p.v) / (k.f - p.f), s2 = (q.v - k.v) / (q.f - k.f); const m = Math.min(Math.abs(s1), Math.abs(s2)) * 3; s = clamp(s, -m, m); } }
      else if (q && !p) s = (q.v - k.v) / (q.f - k.f) * 0.5; else if (p && !q) s = (k.v - p.v) / (k.f - p.f) * 0.5;
      k.li = { x: -dl, y: -s * dl }; k.ro = { x: dr, y: s * dr };
    } else {
      // mantém inclinação mas reescala o comprimento x para o segmento atual quando necessário
      if (p) { const sl = k.li.x !== 0 ? k.li.y / k.li.x : 0; const fx = clamp(-k.li.x, 0.01, k.f - p.f); k.li = { x: -fx, y: -sl * fx }; }
      if (q) { const sr = k.ro.x !== 0 ? k.ro.y / k.ro.x : 0; const fx = clamp(k.ro.x, 0.01, q.f - k.f); k.ro = { x: fx, y: sr * fx }; }
    }
    // lados lineares: handle aponta para o vizinho
    if (p && k.ii === 'linear') k.li = { x: -dl, y: (p.v - k.v) / 3 };
    if (q && k.oi === 'linear') k.ro = { x: dr, y: (q.v - k.v) / 3 };
  }
}
function bez(a, b, c, d, t) { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; }
function bezD(a, b, c, d, t) { const u = 1 - t; return 3 * u * u * (b - a) + 6 * u * t * (c - b) + 3 * t * t * (d - c); }
function segEval(k0, k1, f) {
  if (k0.oi === 'hold') return k0.v;
  const x0 = k0.f, x3 = k1.f;
  if (k0.oi === 'linear' && k1.ii === 'linear') return lerp(k0.v, k1.v, (f - x0) / (x3 - x0));
  const x1 = clamp(x0 + k0.ro.x, x0, x3), x2 = clamp(x3 + k1.li.x, x0, x3);
  const y0 = k0.v, y1 = k0.v + k0.ro.y * ((x1 - x0) / (k0.ro.x || 1)), y2 = k1.v + k1.li.y * ((x2 - x3) / (k1.li.x || -1)), y3 = k1.v;
  let t = (f - x0) / (x3 - x0);
  for (let i = 0; i < 8; i++) { const x = bez(x0, x1, x2, x3, t) - f, dx = bezD(x0, x1, x2, x3, t); if (Math.abs(x) < 1e-5) break; if (Math.abs(dx) < 1e-6) break; t = clamp(t - x / dx, 0, 1); }
  // refinamento por bisseção se necessário
  if (Math.abs(bez(x0, x1, x2, x3, t) - f) > 1e-3) { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { t = (lo + hi) / 2; if (bez(x0, x1, x2, x3, t) < f) lo = t; else hi = t; } }
  return bez(y0, y1, y2, y3, t);
}
function evalKeys(keys, f) {
  const n = keys.length; if (!n) return undefined;
  if (f <= keys[0].f) return keys[0].v; if (f >= keys[n - 1].f) return keys[n - 1].v;
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (keys[m].f <= f) lo = m; else hi = m; }
  return segEval(keys[lo], keys[hi], f);
}
// Ramer-Douglas-Peucker para simplificar amostras gravadas
function rdp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let dm = 0, im = -1;
    for (let i = a + 1; i < b; i++) { const t = (pts[i].f - pts[a].f) / (pts[b].f - pts[a].f); const d = Math.abs(pts[i].v - lerp(pts[a].v, pts[b].v, t)); if (d > dm) { dm = d; im = i; } }
    if (dm > eps && im > 0) { keep[im] = 1; stack.push([a, im], [im, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/* ============================================================
   PROJETO
   ============================================================ */
let project = null;
let animVer = 1;            // incrementa quando qualquer curva muda (invalida caches)
const bump = () => { animVer++; };
function newProject() {
  return {
    version: 2, name: 'Sem título', fps: 24, duration: 240, aspect: '16:9', activeCamera: null, shots: [],
    settings: { sky: '#151516', bg2: '#1d1d1f', ground: '#232325', fog: 0, sunAz: 35, sunEl: 55, sunInt: 1.8, grid: true, groundSize: 600, groundShow: true, groundOpacity: 1, exposure: 1 },
    objects: [],
  };
}
function getObj(id) { return project.objects.find(o => o.id === id); }
function getVal(o, ch, f) { const k = o.tracks[ch]; if (k && k.length) return evalKeys(k, f); return o.base[ch]; }
function hasAnim(o, ch) { return !!(o.tracks[ch] && o.tracks[ch].length); }
function keyAt(o, ch, f) { const k = o.tracks[ch]; if (!k) return null; return k.find(x => Math.abs(x.f - f) < 0.001) || null; }
function setKey(o, ch, f, v, interp) {
  if (!o.tracks[ch]) o.tracks[ch] = [];
  const ks = o.tracks[ch]; let k = keyAt(o, ch, f);
  if (k) k.v = v; else { const prev = ks.filter(x => x.f < f).pop(); k = mkKey(f, v, interp || (prev ? prev.oi : 'bezier')); ks.push(k); sortKeys(ks); }
  autoHandles(ks); bump(); return k;
}
// define valor respeitando lógica do AE: se o canal está animado, cria/atualiza key; senão altera o valor base
function setChannel(o, ch, f, v) { if (hasAnim(o, ch)) setKey(o, ch, f, v); else { o.base[ch] = v; bump(); } }
function removeKeysIn(o, ch, f0, f1) { const k = o.tracks[ch]; if (!k) return; o.tracks[ch] = k.filter(x => x.f < f0 - 1e-6 || x.f > f1 + 1e-6); }
function writeSamples(o, ch, samples, mode, eps) {
  // samples: [{f,v}] contínuos — substitui keys no intervalo
  if (!samples.length) return;
  const f0 = samples[0].f, f1 = samples[samples.length - 1].f;
  removeKeysIn(o, ch, f0, f1);
  if (!o.tracks[ch]) o.tracks[ch] = [];
  const pts = mode === 'every' ? samples : rdp(samples, eps);
  const idx = new Map(samples.map((s, i) => [s.f, i]));
  for (const p of pts) {
    const k = mkKey(p.f, p.v, mode === 'every' ? 'linear' : 'bezier');
    if (mode !== 'every') { // tangente medida nas amostras: a curva reproduz a velocidade real (sem ease falso nas pontas)
      const i = idx.get(p.f), a = samples[Math.max(0, i - 1)], b = samples[Math.min(samples.length - 1, i + 1)];
      const sl = b.f !== a.f ? (b.v - a.v) / (b.f - a.f) : 0; k.h = 'free'; k.li = { x: -1, y: -sl }; k.ro = { x: 1, y: sl };
    }
    o.tracks[ch].push(k);
  }
  sortKeys(o.tracks[ch]); autoHandles(o.tracks[ch]); bump();
}

/* ---------- desfazer / refazer ---------- */
const undoStack = [], redoStack = [];
let lastSnap = null;
function snapshot() { return JSON.stringify(project); }
function commit() { const s = snapshot(); if (s === lastSnap) return; if (lastSnap) undoStack.push(lastSnap); if (undoStack.length > 80) undoStack.shift(); redoStack.length = 0; lastSnap = s; autosave(); }
function undo() { if (!undoStack.length) return toast('Nada para desfazer'); redoStack.push(lastSnap); lastSnap = undoStack.pop(); loadProjectData(JSON.parse(lastSnap), true); toast('Desfeito'); }
function redo() { if (!redoStack.length) return; undoStack.push(lastSnap); lastSnap = redoStack.pop(); loadProjectData(JSON.parse(lastSnap), true); toast('Refeito'); }
let _asT = 0;
function autosave() { clearTimeout(_asT); _asT = setTimeout(() => { try { localStorage.setItem('layout3d.autosave', lastSnap || snapshot()); } catch (e) { } }, 600); }

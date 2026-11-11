/* ============================================================
   BIBLIOTECA DE ASSETS PROCEDURAIS
   Convenção: frente = +Z, chão em y=0 na origem do objeto.
   Câmeras olham para -Z.
   ============================================================ */
const _mats = new Map();
// Shader único estilo playblast: lambert-like liso (sem facetado, sem metal), mesma resposta de luz para tudo.
function M(color, o = {}) {
  const glass = (o.r ?? 1) < 0.3;
  const key = color + '|' + (glass ? 'g' : '') + '|' + (o.e || '') + '|' + (o.side || 0);
  let m = _mats.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: glass ? 0.45 : 0.9, metalness: 0, flatShading: false, side: o.side ? THREE.DoubleSide : THREE.FrontSide }); if (o.e) { m.emissive = new THREE.Color(o.e); m.emissiveIntensity = 0.8; } _mats.set(key, m); }
  return m;
}
function mesh(geo, mat, x = 0, y = 0, z = 0, parent) { const me = new THREE.Mesh(geo, mat); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; if (parent) parent.add(me); return me; }
const box = (w, h, d, m, x, y, z, p) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, p);
const sph = (r, m, x, y, z, p, ws = 20, hs = 14) => mesh(new THREE.SphereGeometry(r, Math.max(ws, 18), Math.max(hs, 12)), m, x, y, z, p);
const cyl = (rt, rb, h, m, x, y, z, p, s = 20) => mesh(new THREE.CylinderGeometry(rt, rb, h, Math.max(s, 16)), m, x, y, z, p);
// elipsoide: semi-eixos rx, ry, rz
const ell = (rx, ry, rz, m, x, y, z, p) => { const e = mesh(new THREE.SphereGeometry(1, 22, 16), m, x, y, z, p); e.scale.set(rx, ry, rz); return e; };
// membro: cápsula pendurada do pivô para baixo, comprimento L (ponta a ponta ≈ L)
const limb = (r, L, m, p, r2) => { const g = new THREE.CapsuleGeometry(r, Math.max(0.001, L - r), 6, 14); if (r2 && r2 !== r) { const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const t = clamp((pos.getY(i) + L / 2) / L, 0, 1); const s = lerp(r2 / r, 1, t); pos.setX(i, pos.getX(i) * s); pos.setZ(i, pos.getZ(i) * s); } g.computeVertexNormals(); } return mesh(g, m, 0, -L / 2, 0, p); };
// casco extrudado a partir de um perfil lateral (z,y) com largura W ao longo de X
function profileMesh(pts, W, mat, parent, bevel = 0.04) {
  const s = new THREE.Shape(); pts.forEach(([z, y], i) => i ? s.lineTo(z, y) : s.moveTo(z, y)); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, W - bevel * 2), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8 });
  geo.rotateY(-Math.PI / 2); geo.translate(W / 2 - bevel, 0, 0); geo.computeVertexNormals();
  return mesh(geo, mat, 0, 0, 0, parent);
}
const grp = (x = 0, y = 0, z = 0, p) => { const g = new THREE.Group(); g.position.set(x, y, z); if (p) p.add(g); return g; };
const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
const PALETTE = ['#c94b3c', '#2f6db5', '#e8e6e1', '#24262b', '#8a9099', '#d9a441', '#3d7a4f', '#6b4a8a', '#b8b2a6', '#1f4e6e'];
const SKIN = ['#f1c7a6', '#d9a07a', '#b97a52', '#8a5636', '#5e3a24'];

const ASSETS = {};
const def = (type, d) => { ASSETS[type] = Object.assign({ type, params: [] }, d); };
const P = (k, lb, t, d, extra = {}) => Object.assign({ k, lb, t, def: d }, extra);
function defaultParams(type) { const o = {}; for (const p of ASSETS[type].params) o[p.k] = p.def; return o; }

/* ---------------- VEÍCULOS ---------------- */
// perfis laterais reais (metros) — y a partir do chão, z: traseira (−) → frente (+)
const CAR_STYLES = {
  sedan: { L: 4.7, H: 1.45, r: 0.33, wb: 2.8, fo: 0.95,
    top: [[-2.35, 0.30], [-2.38, 0.62], [-2.32, 0.93], [-2.05, 1.0], [-1.6, 1.02], [1.25, 0.98], [1.6, 0.92], [2.1, 0.84], [2.33, 0.70], [2.37, 0.45], [2.34, 0.30]],
    glass: [[-1.72, 0.97], [-0.8, 1.40], [0.35, 1.42], [1.32, 0.95]] },
  suv: { L: 4.8, H: 1.75, r: 0.37, wb: 2.85, fo: 0.95,
    top: [[-2.4, 0.42], [-2.43, 0.75], [-2.42, 1.12], [1.3, 1.12], [1.75, 1.06], [2.2, 0.98], [2.38, 0.85], [2.42, 0.6], [2.4, 0.42]],
    glass: [[-2.38, 1.08], [-2.22, 1.70], [0.55, 1.72], [1.35, 1.08]] },
  sport: { L: 4.5, H: 1.25, r: 0.34, wb: 2.62, fo: 0.98,
    top: [[-2.25, 0.24], [-2.28, 0.55], [-2.2, 0.86], [-1.75, 0.93], [1.0, 0.83], [1.5, 0.76], [2.0, 0.66], [2.24, 0.52], [2.26, 0.36], [2.22, 0.24]],
    glass: [[-1.85, 0.89], [-0.65, 1.22], [0.1, 1.23], [1.05, 0.80]] },
};
function buildCar(p) {
  const g = new THREE.Group(), rig = { wheels: [], steer: [] };
  const S = CAR_STYLES[p.style] || CAR_STYLES.sedan, L = p.length, W = p.width, H = p.height;
  const sz = L / S.L, sy = H / S.H, r = S.r * Math.min(1.15, Math.max(0.85, sy)), ra = r + 0.05;
  const body = M(p.color), glass = M('#2b3540', { r: .1 }), dark = M('#1e1f22'), tire = M('#1c1c1c'), rim = M('#b9bdc4');
  const zf = L / 2 - S.fo * sz, zr = zf - S.wb * sz;
  const top = S.top.map(([z, y]) => [z * sz, y * sy]);
  const yb = top[0][1];
  const arch = (zc) => { const out = []; const t0 = yb > r ? Math.asin(clamp((yb - r) / ra, 0, 1)) : 0; if (yb < r) out.push([zc + ra, yb]); for (let i = 0; i <= 12; i++) { const t = t0 + (Math.PI - 2 * t0) * i / 12; out.push([zc + ra * Math.cos(t), r + ra * Math.sin(t)]); } if (yb < r) out.push([zc - ra, yb]); return out; };
  const lower = [...top, ...arch(zf), ...arch(zr)];
  profileMesh(lower, W, body, g, 0.05);
  const gl = S.glass.map(([z, y]) => [z * sz, y * sy]);
  profileMesh(gl, W * 0.84, glass, g, 0.03);
  const [a, b, c2, d] = gl;
  profileMesh([[a[0] + (b[0] - a[0]) * 0.92, a[1] + (b[1] - a[1]) * 0.92], [b[0], b[1] + 0.012], [c2[0], c2[1] + 0.012], [c2[0] + (d[0] - c2[0]) * 0.08, c2[1] + (d[1] - c2[1]) * 0.08]], W * 0.82, body, g, 0.015);
  // colunas B e retrovisores
  box(W * 0.845, (b[1] + c2[1]) / 2 - a[1], 0.08, body, 0, (a[1] + (b[1] + c2[1]) / 2) / 2, (b[0] + c2[0]) / 2 - 0.1, g);
  for (const sx of [-1, 1]) box(0.18, 0.1, 0.12, body, sx * (W / 2 + 0.05), d[1] + 0.06, d[0] - 0.15, g);
  // faróis, lanternas, grade
  const fz = top[top.length - 3], rz = top[2];
  for (const sx of [-1, 1]) { box(W * 0.2, 0.08, 0.05, M('#f4f1e6', { e: '#9a9580' }), sx * W * 0.32, fz[1] - 0.04, fz[0] + 0.0, g); box(W * 0.22, 0.07, 0.05, M('#9a1c1c', { e: '#4a0808' }), sx * W * 0.33, rz[1] - 0.08, rz[0] - 0.01, g); }
  box(W * 0.42, 0.13, 0.04, dark, 0, top[top.length - 2][1] - 0.02, top[top.length - 2][0] - 0.02, g);
  // rodas (pneu real ~225 mm)
  rig.wb = zf - zr; rig.r = r;
  const wgeo = new THREE.CylinderGeometry(r, r, 0.225, 28); wgeo.rotateZ(Math.PI / 2);
  const rgeo = new THREE.CylinderGeometry(r * 0.62, r * 0.62, 0.232, 20); rgeo.rotateZ(Math.PI / 2);
  for (const [sx, z] of [[-1, zf], [1, zf], [-1, zr], [1, zr]]) {
    const piv = grp(sx * (W / 2 - 0.16), r, z, g);
    const w = new THREE.Group(); piv.add(w); mesh(wgeo, tire, 0, 0, 0, w); mesh(rgeo, rim, 0, 0, 0, w);
    box(0.236, r * 0.18, r * 1.15, M('#7d828a'), 0, 0, 0, w); box(0.236, r * 1.15, r * 0.18, M('#7d828a'), 0, 0, 0, w);
    rig.wheels.push(w); if (z === zf) rig.steer.push(piv);
  }
  g.userData.rig = rig; return g;
}
function animVehicle(rig, c) {
  for (const w of rig.wheels) w.rotation.x = c.dist / rig.r;
  const s = Math.abs(c.speed) > 0.3 ? clamp(Math.atan(c.yawRate * rig.wb / c.speed), -0.6, 0.6) : 0;
  for (const s2 of rig.steer) s2.rotation.y = s;
}
const carParams = (st, col, L, W, H) => [P('style', 'Estilo', 'select', st, { opts: [['sedan', 'Sedã'], ['suv', 'SUV'], ['sport', 'Esportivo']] }), P('color', 'Cor', 'color', col), P('length', 'Comprimento (m)', 'num', L, { min: 3.4, max: 5.6, step: .05 }), P('width', 'Largura (m)', 'num', W, { min: 1.6, max: 2.1, step: .01 }), P('height', 'Altura (m)', 'num', H, { min: 1.1, max: 2.0, step: .01 }), P('vmax', 'Vel. máx (km/h)', 'num', 180, { min: 20, max: 350, step: 5 })];
def('car', { cat: 'Veículos', label: 'Carro sedã', icon: '🚗', pilot: 'car', params: carParams('sedan', '#b03a2e', 4.7, 1.83, 1.45), build: buildCar, anim: animVehicle });
def('suv', { cat: 'Veículos', label: 'SUV', icon: '🚙', pilot: 'car', params: carParams('suv', '#3b3f46', 4.8, 1.95, 1.75), build: buildCar, anim: animVehicle });
def('sportcar', { cat: 'Veículos', label: 'Esportivo', icon: '🏎️', pilot: 'car', params: carParams('sport', '#d9a441', 4.5, 1.94, 1.25), build: buildCar, anim: animVehicle });
def('truck', {
  cat: 'Veículos', label: 'Caminhão', icon: '🚚', pilot: 'car', params: [P('color', 'Cabine', 'color', '#e8e6e1'), P('cargo', 'Baú', 'color', '#b8b2a6'), P('length', 'Comprimento', 'num', 9, { min: 6, max: 16, step: .5 }), P('vmax', 'Vel. máx (km/h)', 'num', 110, { min: 20, max: 200, step: 5 })],
  build(p) {
    const g = new THREE.Group(), rig = { wheels: [], steer: [] }, L = p.length, r = 0.5;
    const cab = M(p.color, { r: .4, m: .3 }), tire = M('#1a1a1a'), glass = M('#1b2430', { r: .1, m: .6 });
    box(2.4, 2.2, 2.2, cab, 0, 1.1 + 0.7, L / 2 - 1.1, g); box(2.2, 0.9, 0.05, glass, 0, 2.35, L / 2 + 0.01, g);
    box(2.5, 2.8, L - 2.5, M(p.cargo), 0, 0.8 + 1.4 + 0.1, -1.25, g); box(2.3, 0.3, L, M('#2a2b2e'), 0, 0.75, 0, g);
    for (const sx of [-1, 1]) box(0.3, 0.2, 0.05, M('#fff6dc', { e: '#fff1c4' }), sx * 0.9, 1.1, L / 2 + .01, g);
    const wgeo = new THREE.CylinderGeometry(r, r, 0.35, 16); wgeo.rotateZ(Math.PI / 2);
    const zs = [L / 2 - 1.3, -L / 2 + 2.2, -L / 2 + 1.1]; rig.wb = zs[0] - (zs[1] + zs[2]) / 2; rig.r = r;
    zs.forEach((z, i) => { for (const sx of [-1, 1]) { const piv = grp(sx * 1.05, r, z, g); const w = new THREE.Group(); piv.add(w); mesh(wgeo, tire, 0, 0, 0, w); box(0.36, .08, r * 1.2, M('#888'), 0, 0, 0, w); rig.wheels.push(w); if (i === 0) rig.steer.push(piv); } });
    g.userData.rig = rig; return g;
  }, anim: animVehicle
});
def('bus', {
  cat: 'Veículos', label: 'Ônibus', icon: '🚌', pilot: 'car', params: [P('color', 'Cor', 'color', '#2f6db5'), P('length', 'Comprimento', 'num', 12, { min: 8, max: 18, step: .5 }), P('vmax', 'Vel. máx (km/h)', 'num', 90, { min: 20, max: 150, step: 5 })],
  build(p) {
    const g = new THREE.Group(), rig = { wheels: [], steer: [] }, L = p.length, r = 0.5;
    box(2.55, 2.6, L, M(p.color, { r: .4, m: .2 }), 0, 1.75, 0, g);
    for (const sx of [-1, 1]) box(0.02, 0.9, L * 0.86, M('#1b2430', { r: .1, m: .6 }), sx * 1.28, 2.2, -0.2, g);
    box(2.3, 1.2, 0.03, M('#1b2430', { r: .1, m: .6 }), 0, 2.2, L / 2 + .01, g);
    const wgeo = new THREE.CylinderGeometry(r, r, 0.3, 16); wgeo.rotateZ(Math.PI / 2);
    rig.wb = L * 0.58; rig.r = r;
    for (const sz of [1, -1]) for (const sx of [-1, 1]) { const piv = grp(sx * 1.1, r, sz * rig.wb / 2 + (sz > 0 ? L * 0.06 : -L * 0.02), g); const w = new THREE.Group(); piv.add(w); mesh(wgeo, M('#1a1a1a'), 0, 0, 0, w); box(.31, .08, r * 1.2, M('#999'), 0, 0, 0, w); rig.wheels.push(w); if (sz > 0) rig.steer.push(piv); }
    g.userData.rig = rig; return g;
  }, anim: animVehicle
});
def('moto', {
  cat: 'Veículos', label: 'Moto + piloto', icon: '🏍️', pilot: 'car', params: [P('color', 'Cor', 'color', '#c94b3c'), P('rider', 'Roupa piloto', 'color', '#24262b'), P('vmax', 'Vel. máx (km/h)', 'num', 200, { min: 20, max: 320, step: 5 })],
  build(p) {
    const g = new THREE.Group(), rig = { wheels: [], steer: [], lean: null }, r = 0.32;
    const lean = grp(0, 0, 0, g); rig.lean = lean;
    const wgeo = new THREE.CylinderGeometry(r, r, 0.14, 18); wgeo.rotateZ(Math.PI / 2);
    const fp = grp(0, r, 0.72, lean), bp = grp(0, r, -0.72, lean);
    for (const piv of [fp, bp]) { const w = new THREE.Group(); piv.add(w); mesh(wgeo, M('#1a1a1a'), 0, 0, 0, w); box(.15, .05, r * 1.3, M('#aaa'), 0, 0, 0, w); rig.wheels.push(w); }
    rig.steer.push(fp); rig.wb = 1.44; rig.r = r;
    box(0.3, 0.35, 1.0, M(p.color, { r: .35, m: .4 }), 0, 0.7, 0.1, lean); box(0.28, 0.2, 0.6, M('#222'), 0, 0.85, -0.3, lean);
    box(0.5, 0.05, 0.05, M('#333'), 0, 1.0, 0.55, lean);
    const rd = M(p.rider), sk = M('#222');
    box(0.36, 0.55, 0.25, rd, 0, 1.2, -0.15, lean).rotation.x = 0.5; sph(0.14, M('#d9d9d9', { r: .2, m: .3 }), 0, 1.55, 0.05, lean);
    for (const sx of [-1, 1]) { box(0.1, 0.1, 0.55, rd, sx * 0.18, 1.2, 0.25, lean).rotation.x = 0.4; box(0.12, 0.12, 0.5, sk, sx * 0.17, 0.8, -0.05, lean).rotation.x = -0.6; }
    g.userData.rig = rig; return g;
  }, anim(rig, c) { animVehicle(rig, c); rig.lean.rotation.z = clamp(-c.yawRate * c.speed * 0.06, -0.7, 0.7); }
});

/* ---------------- PESSOAS ---------------- */
// Proporções antropométricas (frações da altura H, adulto médio)
function buildPerson(p) {
  const H = p.height, g = new THREE.Group(), rig = {};
  const mq = p.look === 'mannequin';
  const shirt = M(mq ? '#cbb193' : p.shirt), pants = M(mq ? '#c3a887' : p.pants), skin = M(mq ? '#d2b999' : p.skin), shoe = M(mq ? '#a98d6c' : '#26272b'), hair = M(mq ? '#d2b999' : (p.hair || '#2a1d14'));
  const kid = H < 1.45 ? clamp((1.45 - H) / 0.6, 0, 1) : 0;       // crianças: cabeça proporcionalmente maior, pernas menores
  const headH = H * (0.13 + kid * 0.04), b = p.build;              // b: 0 = estreito/feminino … 1 = largo
  const hipY = H * (0.52 - kid * 0.04), shY = H * (0.818 - kid * 0.03);
  const torsoL = shY - hipY, shW = H * (0.105 + b * 0.025), hipW = H * (0.088 - b * 0.004);
  const thigh = hipY * 0.5, shin = hipY * 0.425, ankH = hipY - thigh - shin;
  const uArm = H * 0.186, fArm = H * 0.146, hand = H * 0.095;
  const hips = grp(0, hipY, 0, g); rig.hips = hips; rig.hipY = hipY;
  ell(hipW * 1.15, H * 0.055, H * 0.06, pants, 0, H * 0.01, 0, hips);
  const torso = grp(0, H * 0.02, 0, hips); rig.torso = torso;
  ell(hipW * 1.05, torsoL * 0.32, H * 0.058, shirt, 0, torsoL * 0.25, 0, torso);                 // abdômen
  ell(shW * 0.98, torsoL * 0.36, H * (0.066 + b * 0.006), shirt, 0, torsoL * 0.62, 0, torso);   // tórax
  ell(shW * 1.05, H * 0.03, H * 0.05, shirt, 0, torsoL * 0.92, 0, torso);                        // ombros
  cyl(H * 0.024, H * 0.028, H * 0.06, skin, 0, torsoL + H * 0.015, 0, torso, 16);
  const head = grp(0, torsoL + H * 0.035 + headH * 0.5, 0, torso); rig.head = head;
  ell(headH * 0.34, headH * 0.5, headH * 0.42, skin, 0, 0, 0.005 * H, head);
  ell(headH * 0.36, headH * 0.36, headH * 0.44, hair, 0, headH * 0.14, -headH * 0.04, head);
  ell(headH * 0.06, headH * 0.09, headH * 0.08, skin, 0, -headH * 0.02, headH * 0.42, head);    // nariz
  for (const sx of [1, -1]) ell(headH * 0.05, headH * 0.11, headH * 0.06, skin, sx * headH * 0.34, -headH * 0.02, 0, head); // orelhas
  rig.arms = []; rig.legs = [];
  for (const sx of [1, -1]) {
    const shd = grp(sx * shW, torsoL * 0.9, 0, torso);
    limb(H * 0.03, uArm, shirt, shd, H * 0.026);
    const elb = grp(0, -uArm, 0, shd);
    limb(H * 0.022, fArm, skin, elb, H * 0.018);
    const wr = grp(0, -fArm, 0, elb);
    const hd = ell(H * 0.012, hand * 0.5, H * 0.026, skin, 0, -hand * 0.45, 0, wr);
    rig.arms.push({ s: shd, e: elb, side: sx });
    const hipJ = grp(sx * hipW * 0.55, 0, 0, hips);
    limb(H * 0.045, thigh, pants, hipJ, H * 0.034);
    const knee = grp(0, -thigh, 0, hipJ);
    limb(H * 0.032, shin, pants, knee, H * 0.024);
    const ankle = grp(0, -shin, 0, knee);
    const ft = box(H * 0.055, ankH * 1.0, H * 0.152, shoe, 0, -ankH * 0.5, H * 0.045, ankle);
    rig.legs.push({ h: hipJ, k: knee, a: ankle, side: sx });
  }
  rig.H = H; g.userData.rig = rig; return g;
}
function animPerson(rig, c, p, phaseOff = 0) {
  const H = rig.H, sp = Math.abs(c.speed);
  const wb = clamp(sp / 1.1, 0, 1), rb = clamp((sp - 2.3) / 1.8, 0, 1);
  const cycle = (0.82 + 0.55 * rb) * H;
  const ph = c.dist / cycle * Math.PI * 2 + phaseOff;
  const tA = 0.42 * wb + 0.4 * rb, kA = 0.55 * wb + 0.95 * rb, aA = 0.32 * wb + 0.55 * rb;
  let pose = p.pose || 'stand';
  const idle = 1 - wb;
  rig.hips.position.y = rig.hipY + Math.abs(Math.sin(ph)) * 0.025 * H * wb * (1 + rb) - 0.02 * H * rb;
  rig.hips.rotation.set(0, Math.sin(ph) * 0.12 * wb, 0);
  rig.torso.rotation.set(0.05 * wb + 0.22 * rb, -Math.sin(ph) * 0.18 * wb, 0);
  rig.head.rotation.set(-0.05 * wb - 0.15 * rb, Math.sin(c.t * 0.5 + phaseOff) * 0.15 * idle, 0);
  rig.legs.forEach((L, i) => { const q = ph + (i ? Math.PI : 0); L.h.rotation.set(-Math.sin(q) * tA, 0, 0); L.k.rotation.set(kA * Math.max(0, Math.cos(q)) + 0.05 * wb, 0, 0); L.a.rotation.set(-0.1 * wb * Math.cos(q), 0, 0); });
  rig.arms.forEach((A, i) => { const q = ph + (i ? 0 : Math.PI); A.s.rotation.set(-Math.sin(q) * aA, 0, A.side * 0.06); A.e.rotation.set(-0.15 - 0.2 * wb - 1.0 * rb, 0, 0); });
  if (idle > 0.5) {
    const breath = Math.sin(c.t * 2 + phaseOff) * 0.01;
    rig.torso.rotation.x += breath;
    if (pose === 'sit') {
      rig.hips.position.y = rig.hipY * 0.5 + 0.02 * H; rig.torso.rotation.x = -0.05;
      rig.legs.forEach(L => { L.h.rotation.x = -Math.PI / 2; L.k.rotation.x = Math.PI / 2; L.a.rotation.x = 0; });
      rig.arms.forEach(A => { A.s.rotation.x = -0.35; A.e.rotation.x = -0.9; });
    } else if (pose === 'wave') {
      const A = rig.arms[1]; A.s.rotation.set(0, 0, -2.6); A.e.rotation.set(0, 0, -0.4 + Math.sin(c.t * 9) * 0.45);
    } else if (pose === 'phone') {
      const A = rig.arms[0]; A.s.rotation.set(-0.5, 0, 0.35); A.e.rotation.set(-2.4, 0, 0);
    } else if (pose === 'cross') {
      rig.arms.forEach(A => { A.s.rotation.set(-0.35, 0, A.side * 0.15); A.e.rotation.set(-1.9, A.side * -0.6, 0); });
    } else if (pose === 'point') {
      const A = rig.arms[1]; A.s.rotation.set(-1.5, 0, 0); A.e.rotation.set(-0.05, 0, 0);
    }
  }
}
const personParams = (h, shirt, pants, skin) => [P('look', 'Visual', 'select', 'mannequin', { opts: [['mannequin', 'Manequim'], ['clothes', 'Roupas']] }), P('height', 'Altura (m)', 'num', h, { min: 0.8, max: 2.2, step: .01 }), P('build', 'Porte', 'num', 0.5, { min: 0, max: 1, step: .05 }), P('shirt', 'Camisa', 'color', shirt), P('pants', 'Calça', 'color', pants), P('skin', 'Pele', 'color', skin), P('hair', 'Cabelo', 'color', '#2a1d14'), P('pose', 'Pose parado', 'select', 'stand', { opts: [['stand', 'Em pé'], ['sit', 'Sentado'], ['wave', 'Acenando'], ['phone', 'Ao telefone'], ['cross', 'Braços cruzados'], ['point', 'Apontando']] }), P('walk', 'Vel. andar (m/s)', 'num', 1.4, { min: .3, max: 3, step: .1 }), P('run', 'Vel. correr (m/s)', 'num', 4.5, { min: 2, max: 10, step: .1 })];
def('person', { cat: 'Pessoas', label: 'Pessoa', icon: '🧍', pilot: 'walker', params: personParams(1.75, '#2f6db5', '#3a3d45', '#d9a07a'), build: buildPerson, anim: animPerson });
def('woman', { cat: 'Pessoas', label: 'Mulher', icon: '🧍‍♀️', pilot: 'walker', params: personParams(1.65, '#c94b3c', '#24262b', '#f1c7a6').map(x => x.k === 'build' ? { ...x, def: 0.2 } : x.k === 'hair' ? { ...x, def: '#6b3f1f' } : x), build: buildPerson, anim: animPerson });
def('child', { cat: 'Pessoas', label: 'Criança', icon: '🧒', pilot: 'walker', params: personParams(1.15, '#d9a441', '#2f6db5', '#d9a07a').map(x => x.k === 'build' ? { ...x, def: 0.3 } : x.k === 'walk' ? { ...x, def: 1.1 } : x), build: buildPerson, anim: animPerson });
def('crowd', {
  cat: 'Pessoas', label: 'Multidão', icon: '👥', pilot: 'walker',
  params: [P('count', 'Quantidade', 'int', 16, { min: 1, max: 120, step: 1 }), P('spread', 'Área (m)', 'num', 8, { min: 1, max: 60, step: .5 }), P('seed', 'Semente', 'int', 7, { min: 1, max: 9999, step: 1 }), P('jitter', 'Variação de passo', 'num', 0.3, { min: 0, max: 1, step: .05 }), P('pose', 'Pose parado', 'select', 'stand', { opts: [['stand', 'Em pé'], ['phone', 'Ao telefone'], ['cross', 'Braços cruzados'], ['wave', 'Acenando']] }), P('walk', 'Vel. andar (m/s)', 'num', 1.3, { min: .3, max: 3, step: .1 }), P('run', 'Vel. correr (m/s)', 'num', 4, { min: 2, max: 10, step: .1 })],
  build(p) {
    const g = new THREE.Group(), r = mulberry(p.seed), members = [];
    for (let i = 0; i < p.count; i++) {
      const pp = { height: 1.55 + r() * 0.35, build: r(), shirt: PALETTE[(r() * PALETTE.length) | 0], pants: ['#24262b', '#3a3d45', '#1f4e6e', '#6b5a48', '#8a9099'][(r() * 5) | 0], skin: SKIN[(r() * SKIN.length) | 0], hair: ['#2a1d14', '#6b3f1f', '#111', '#b08a4a'][(r() * 4) | 0], pose: r() < 0.6 ? 'stand' : p.pose };
      const m = buildPerson(pp); const a = r() * Math.PI * 2, d = Math.sqrt(r()) * p.spread / 2;
      m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); m.rotation.y = (r() - 0.5) * 0.5; g.add(m);
      members.push({ rig: m.userData.rig, pp, off: r() * 10, spd: 1 + (r() - 0.5) * p.jitter });
    }
    g.userData.rig = { members }; return g;
  },
  anim(rig, c) { for (const m of rig.members) animPerson(m.rig, { ...c, dist: c.dist * m.spd, t: c.t + m.off }, m.pp, m.off); }
});

/* ---------------- ANIMAIS ---------------- */
// medidas reais: Hw = altura na cernelha, L = comprimento do corpo, bd = altura do tronco, bw = largura
const SPECIES = {
  dog: { Hw: .57, L: .75, bd: .3, bw: .25, neck: .22, neckA: .7, head: .24, headDown: .1, snout: .5, tail: .32, tailA: 1.7, ear: 'flop', color: '#b07a3e', walk: 1.2, run: 7, trot: 2.2 },
  cat: { Hw: .25, L: .45, bd: .15, bw: .12, neck: .08, neckA: .7, head: .1, headDown: 0, snout: .25, tail: .32, tailA: 2.5, ear: 'up', color: '#7a7a7a', walk: .8, run: 5, trot: 1.6 },
  horse: { Hw: 1.6, L: 1.55, bd: .72, bw: .5, neck: .85, neckA: .55, head: .6, headDown: .75, snout: .55, tail: .75, tailA: .4, ear: 'up', color: '#6b4a2b', walk: 1.7, run: 14, trot: 4 },
  cow: { Hw: 1.4, L: 1.7, bd: .8, bw: .6, neck: .45, neckA: 1.1, head: .5, headDown: .35, snout: .4, tail: .8, tailA: .15, ear: 'side', color: '#e8e6e1', walk: 1.1, run: 6, trot: 2.5 },
  deer: { Hw: 1.0, L: 1.0, bd: .4, bw: .28, neck: .45, neckA: .45, head: .3, headDown: .3, snout: .45, tail: .12, tailA: 2.3, ear: 'up', color: '#9a6a3c', walk: 1.4, run: 13, trot: 3.5 },
};
function buildQuad(p) {
  const S = SPECIES[p.species] || SPECIES.dog, k = p.scale, g = new THREE.Group(), rig = { legs: [] };
  const L = S.L * k, bd = S.bd * k, bw = S.bw * k, mc = M(p.color), dk = M(shade(p.color, 0.55)), hoof = M('#2a2522');
  const by = S.Hw * k - bd / 2;
  const body = grp(0, by, 0, g); rig.body = body; rig.by = by;
  ell(bw / 2, bd / 2, L / 2, mc, 0, 0, 0, body);
  ell(bw * 0.48, bd * 0.47, L * 0.22, mc, 0, bd * 0.03, L * 0.3, body);   // peito
  ell(bw * 0.5, bd * 0.46, L * 0.22, mc, 0, bd * 0.02, -L * 0.3, body);   // garupa
  const neck = grp(0, bd * 0.22, L * 0.4, body); rig.neck = neck; rig.neckA = S.neckA; neck.rotation.x = S.neckA;
  const nl = S.neck * k, nr = bw * 0.27;
  mesh(new THREE.CapsuleGeometry(nr, nl, 6, 14), mc, 0, nl / 2, 0, neck);
  const hl = S.head * k, head = grp(0, nl + nr * 0.4, 0, neck); rig.head = head; head.rotation.x = -S.neckA + S.headDown;
  ell(hl * 0.26, hl * 0.3, hl * 0.36, mc, 0, 0, hl * 0.12, head);
  ell(hl * 0.18, hl * 0.18, hl * 0.32, mc, 0, -hl * 0.08, hl * (0.2 + S.snout * 0.6), head);
  ell(hl * 0.12, hl * 0.1, hl * 0.06, dk, 0, -hl * 0.08, hl * (0.2 + S.snout * 0.6) + hl * 0.3, head);
  for (const sx of [-1, 1]) {
    const e = mesh(new THREE.ConeGeometry(hl * 0.1, hl * 0.3, 10), S.ear === 'flop' ? dk : mc, sx * hl * 0.18, hl * 0.3, hl * 0.02, head);
    if (S.ear === 'flop') { e.rotation.z = sx * 2.4; e.position.y = hl * 0.12; e.position.x = sx * hl * 0.27; }
    else if (S.ear === 'side') { e.rotation.z = -sx * 1.5; e.position.y = hl * 0.12; e.position.x = sx * hl * 0.36; }
    else e.rotation.z = -sx * 0.25;
    if (p.species === 'deer' || p.species === 'cow') { const hn = cyl(0.008 * k, 0.025 * k, hl * (p.species === 'deer' ? 1.4 : 0.45), M('#d8cbb0'), sx * hl * 0.12, hl * (p.species === 'deer' ? 0.9 : 0.42), hl * 0.05, head, 10); hn.rotation.z = -sx * 0.4; }
  }
  const tail = grp(0, bd * 0.25, -L * 0.48, body); rig.tail = tail; tail.rotation.x = S.tailA;
  const tr = (S.Hw > 0.9 ? 0.1 : 0.075) * bw; limb(Math.max(0.01 * k, tr), S.tail * k, dk, tail, Math.max(0.006 * k, tr * (S.Hw > 0.9 ? 1.5 : 0.5)));
  const legTop = -bd * 0.12, legLen = by + legTop;
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const up = grp(sx * bw * 0.3, legTop, sz * L * 0.34, body);
    limb(bw * 0.16, legLen * 0.52, mc, up, bw * 0.1);
    const lo = grp(0, -legLen * 0.5, 0, up);
    limb(bw * 0.09, legLen * 0.5, mc, lo, bw * 0.07);
    ell(bw * 0.09, legLen * 0.04, bw * 0.12, S.Hw > 0.9 ? hoof : dk, 0, -legLen * 0.48, bw * 0.03, lo);
    rig.legs.push({ up, lo, front: sz > 0, side: sx });
  }
  rig.S = S; rig.k = k; rig.species = p.species; g.userData.rig = rig; return g;
}
function animQuad(rig, c) {
  const S = rig.S, k = rig.k, sp = Math.abs(c.speed);
  const wb = clamp(sp / (S.walk * 0.8), 0, 1), gb = clamp((sp - S.trot) / (S.trot * 0.8), 0, 1);
  const cyc = S.L * k * (1.6 + 1.6 * gb);
  const ph = c.dist / cyc * Math.PI * 2;
  const trot = [0, Math.PI, Math.PI, 0], gal = [0, 0.6, Math.PI, Math.PI + 0.6];
  rig.legs.forEach((l, i) => {
    const q = ph + lerp(trot[i], gal[i], gb), A = (0.4 + 0.35 * gb) * wb;
    l.up.rotation.x = -Math.sin(q) * A;
    l.lo.rotation.x = (l.front ? 1 : -1) * Math.max(0, Math.cos(q)) * (0.5 + 0.6 * gb) * wb;
  });
  rig.body.position.y = rig.by + Math.abs(Math.sin(ph)) * 0.03 * S.L * k * wb;
  rig.body.rotation.x = Math.sin(ph) * 0.08 * gb;
  rig.neck.rotation.x = rig.neckA + Math.sin(ph * 2) * 0.05 * wb + (1 - wb) * Math.sin(c.t * 0.7) * 0.06;
  rig.head.rotation.y = (1 - wb) * Math.sin(c.t * 0.45) * 0.35;
  rig.tail.rotation.z = rig.species === 'dog' ? Math.sin(c.t * 11) * 0.5 : Math.sin(c.t * 2) * 0.12;
}
const quadDef = (sp, label, icon, sc = 1) => def(sp, { cat: 'Animais', label, icon, pilot: 'walker', params: [P('species', 'Espécie', 'select', sp, { opts: [['dog', 'Cachorro'], ['cat', 'Gato'], ['horse', 'Cavalo'], ['cow', 'Vaca'], ['deer', 'Cervo']] }), P('color', 'Cor', 'color', SPECIES[sp].color), P('scale', 'Tamanho', 'num', sc, { min: .3, max: 3, step: .05 }), P('walk', 'Vel. andar (m/s)', 'num', SPECIES[sp].walk, { min: .3, max: 5, step: .1 }), P('run', 'Vel. correr (m/s)', 'num', SPECIES[sp].run, { min: 1, max: 20, step: .5 })], build: buildQuad, anim: animQuad });
quadDef('dog', 'Cachorro', '🐕'); quadDef('cat', 'Gato', '🐈'); quadDef('horse', 'Cavalo', '🐎'); quadDef('cow', 'Vaca', '🐄'); quadDef('deer', 'Cervo', '🦌');

/* ---------------- AVES / VOADORES ---------------- */
function buildBird(p) {
  const s = p.span, g = new THREE.Group(), rig = { wings: [] }, mc = M(p.color), dk = M(shade(p.color, 0.6)), lt = M(p.belly || shade(p.color, 1.4));
  const body = grp(0, 0, 0, g); rig.body = body;
  const b = sph(s * 0.09, mc, 0, 0, 0, body, 10, 8); b.scale.set(1, 0.9, 2.1);
  const h = sph(s * 0.065, mc, 0, s * 0.04, s * 0.2, body, 10, 8);
  const bk = mesh(new THREE.ConeGeometry(s * 0.025, s * 0.09, 6), M('#e0a420'), 0, s * 0.03, s * 0.29, body); bk.rotation.x = Math.PI / 2;
  const tl = box(s * 0.12, s * 0.01, s * 0.16, dk, 0, 0, -s * 0.24, body);
  for (const sx of [1, -1]) {
    const w = grp(sx * s * 0.06, s * 0.03, 0.02 * s, body);
    box(s * 0.24, s * 0.012, s * 0.16, mc, sx * s * 0.12, 0, 0, w);
    const o = grp(sx * s * 0.24, 0, 0, w);
    const ob = box(s * 0.22, s * 0.01, s * 0.12, dk, sx * s * 0.11, 0, -0.02 * s, o);
    rig.wings.push({ w, o, side: sx });
  }
  g.userData.rig = rig; return g;
}
function animBird(rig, c, p) {
  const fly = Math.abs(c.speed) > 0.4 || c.y > 0.3;
  const glide = c.vy < -0.8 ? 0.2 : 1;
  const ph = c.t * p.flap * Math.PI * 2 + (c.off || 0);
  rig.wings.forEach(W => {
    if (fly) { W.w.rotation.set(0, 0, W.side * Math.sin(ph) * 0.75 * glide + W.side * 0.1); W.o.rotation.set(0, 0, W.side * Math.sin(ph - 0.7) * 0.5 * glide); }
    else { W.w.rotation.set(0, W.side * 1.25, W.side * -0.15); W.o.rotation.set(0, W.side * 0.3, 0); }
  });
  rig.body.position.y = fly ? -Math.sin(ph) * 0.015 * p.span * glide : 0;
}
const birdDef = (t, label, icon, span, color, flap, speed) => def(t, { cat: 'Aves & voadores', label, icon, pilot: 'bird', params: [P('span', 'Envergadura (m)', 'num', span, { min: .1, max: 3, step: .05 }), P('color', 'Cor', 'color', color), P('flap', 'Batidas/s', 'num', flap, { min: .5, max: 15, step: .5 }), P('speed', 'Velocidade (m/s)', 'num', speed, { min: 1, max: 40, step: .5 })], build: buildBird, anim: animBird });
birdDef('bird', 'Pássaro', '🐦', 0.3, '#5a6b8a', 8, 8); birdDef('gull', 'Gaivota', '🕊️', 1.2, '#e8e6e1', 3, 11); birdDef('eagle', 'Águia', '🦅', 2.0, '#5b3c22', 1.6, 14);
def('flock', {
  cat: 'Aves & voadores', label: 'Bando de pássaros', icon: '🐦‍⬛', pilot: 'bird',
  params: [P('count', 'Quantidade', 'int', 18, { min: 1, max: 150, step: 1 }), P('spread', 'Dispersão (m)', 'num', 6, { min: .5, max: 50, step: .5 }), P('span', 'Envergadura (m)', 'num', 0.35, { min: .1, max: 2, step: .05 }), P('color', 'Cor', 'color', '#2b2f36'), P('flap', 'Batidas/s', 'num', 7, { min: .5, max: 15, step: .5 }), P('swirl', 'Ondulação', 'num', 1, { min: 0, max: 4, step: .1 }), P('seed', 'Semente', 'int', 3, { min: 1, max: 9999, step: 1 }), P('speed', 'Velocidade (m/s)', 'num', 9, { min: 1, max: 30, step: .5 })],
  build(p) {
    const g = new THREE.Group(), r = mulberry(p.seed), mem = [];
    for (let i = 0; i < p.count; i++) { const b = buildBird({ ...p, span: p.span * (0.85 + r() * 0.3) }); const off = new THREE.Vector3((r() - .5) * p.spread, (r() - .5) * p.spread * 0.4, (r() - .5) * p.spread); b.position.copy(off); g.add(b); mem.push({ g: b, rig: b.userData.rig, off, ph: r() * 10, fr: 0.3 + r() * 0.5 }); }
    g.userData.rig = { mem }; return g;
  },
  anim(rig, c, p) {
    for (const m of rig.mem) { const s = p.swirl; m.g.position.set(m.off.x + Math.sin(c.t * m.fr + m.ph) * s, m.off.y + Math.sin(c.t * m.fr * 1.3 + m.ph * 2) * s * 0.5, m.off.z + Math.cos(c.t * m.fr * 0.8 + m.ph) * s); m.g.rotation.z = Math.cos(c.t * m.fr + m.ph) * 0.3 * s; animBird(m.rig, { ...c, off: m.ph, speed: Math.max(1, c.speed), y: 1 }, p); }
  }
});
def('drone', {
  cat: 'Aves & voadores', label: 'Drone', icon: '🛸', pilot: 'bird',
  params: [P('color', 'Cor', 'color', '#2a2c31'), P('size', 'Tamanho', 'num', 0.5, { min: .2, max: 2, step: .05 }), P('speed', 'Velocidade (m/s)', 'num', 10, { min: 1, max: 40, step: .5 })],
  build(p) {
    const g = new THREE.Group(), s = p.size, rig = { props: [] }, mc = M(p.color, { r: .4, m: .3 });
    box(s * 0.35, s * 0.12, s * 0.45, mc, 0, 0, 0, g);
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const a = box(s * 0.5, s * 0.04, s * 0.04, mc, sx * s * 0.3, 0, sz * s * 0.3, g); a.rotation.y = sx * sz * Math.PI / 4; cyl(s * .04, s * .04, s * .08, mc, sx * s * 0.47, s * 0.05, sz * s * 0.47, g, 8); const pr = box(s * 0.5, s * 0.008, s * 0.05, M('#9aa0aa'), sx * s * 0.47, s * 0.1, sz * s * 0.47, g); rig.props.push(pr); }
    box(s * .1, s * .08, s * .1, M('#111'), 0, -s * 0.1, s * 0.18, g);
    g.userData.rig = rig; return g;
  }, anim(rig, c) { rig.props.forEach((p, i) => p.rotation.y = c.t * 60 * (i % 2 ? 1 : -1)); }
});
def('heli', {
  cat: 'Aves & voadores', label: 'Helicóptero', icon: '🚁', pilot: 'bird',
  params: [P('color', 'Cor', 'color', '#c94b3c'), P('speed', 'Velocidade (m/s)', 'num', 30, { min: 1, max: 80, step: 1 })],
  build(p) {
    const g = new THREE.Group(), rig = {}, mc = M(p.color, { r: .35, m: .3 });
    const b = sph(1.3, mc, 0, 1.6, 0.4, g, 14, 10); b.scale.set(0.95, 0.95, 1.45);
    sph(1.0, M('#1b2430', { r: .1, m: .6 }), 0, 1.75, 1.3, g, 12, 8).scale.set(0.85, 0.75, 0.7);
    box(0.35, 0.4, 5, mc, 0, 1.9, -3, g); box(0.1, 1.2, 0.6, mc, 0, 2.4, -5.3, g);
    for (const sx of [-1, 1]) box(0.08, 0.08, 3, M('#333'), sx * 0.9, 0.05, 0.4, g);
    cyl(.12, .12, .5, M('#333'), 0, 3.0, 0.4, g, 8);
    rig.rot = grp(0, 3.25, 0.4, g); box(10, 0.04, 0.3, M('#222'), 0, 0, 0, rig.rot); box(0.3, 0.04, 10, M('#222'), 0, 0, 0, rig.rot);
    rig.tr = grp(0.2, 2.4, -5.3, g); box(0.04, 1.6, 0.15, M('#222'), 0, 0, 0, rig.tr);
    g.userData.rig = rig; return g;
  }, anim(rig, c) { rig.rot.rotation.y = c.t * 35; rig.tr.rotation.x = c.t * 60; }
});

/* ---------------- CENÁRIO ---------------- */
function buildBuilding(p, parent, x = 0, z = 0) {
  const g = grp(x, 0, z, parent), H = p.floors * p.floorH, wall = M(p.color), gl = M(p.glass, { r: .15, m: .5 });
  box(p.width, H, p.depth, wall, 0, H / 2, 0, g);
  for (let i = 0; i < p.floors; i++) { const y = (i + 0.55) * p.floorH; box(p.width + 0.04, p.floorH * 0.48, p.depth * (p.style === 'grade' ? 0.7 : 1) + 0.04, gl, 0, y, 0, g); if (p.style === 'grade') box(p.width * 0.7, p.floorH * 0.48, p.depth + 0.04, gl, 0, y, 0, g); }
  box(p.width + 0.3, 0.5, p.depth + 0.3, M(shade(p.color, 0.8)), 0, H + 0.25, 0, g);
  return g;
}
def('building', { cat: 'Cenário', label: 'Prédio', icon: '🏢', params: [P('width', 'Largura', 'num', 14, { min: 3, max: 80, step: .5 }), P('depth', 'Profundidade', 'num', 14, { min: 3, max: 80, step: .5 }), P('floors', 'Andares', 'int', 8, { min: 1, max: 80, step: 1 }), P('floorH', 'Pé-direito', 'num', 3.2, { min: 2.5, max: 6, step: .1 }), P('color', 'Fachada', 'color', '#b8b2a6'), P('glass', 'Vidro', 'color', '#2a3746'), P('style', 'Estilo', 'select', 'faixas', { opts: [['faixas', 'Faixas'], ['grade', 'Grade']] })], build(p) { const g = new THREE.Group(); buildBuilding(p, g); return g; } });
def('house', {
  cat: 'Cenário', label: 'Casa', icon: '🏠', params: [P('width', 'Largura', 'num', 9, { min: 4, max: 30, step: .5 }), P('depth', 'Profundidade', 'num', 8, { min: 4, max: 30, step: .5 }), P('height', 'Altura parede', 'num', 3, { min: 2.4, max: 8, step: .1 }), P('wall', 'Parede', 'color', '#e8e1d4'), P('roof', 'Telhado', 'color', '#9a4a32')],
  build(p) {
    const g = new THREE.Group(); box(p.width, p.height, p.depth, M(p.wall), 0, p.height / 2, 0, g);
    const rg = new THREE.CylinderGeometry(1, 1, p.width + 0.6, 3); rg.rotateZ(Math.PI / 2); const r = mesh(rg, M(p.roof), 0, p.height + 0.5 * 0.9, 0, g); r.rotation.x = Math.PI; r.scale.set(1, 1.6, (p.depth + 0.6) / 1.73); r.position.y = p.height + 0.8;
    box(1.1, 2.1, 0.08, M('#5a3a22'), 0, 1.05, p.depth / 2 + 0.03, g);
    for (const sx of [-1, 1]) box(1.3, 1.2, 0.06, M('#2a3746', { r: .15, m: .5 }), sx * p.width * 0.3, 1.7, p.depth / 2 + 0.03, g);
    return g;
  }
});
function buildRoad(p, g) {
  const W = p.lanes * 3.5, L = p.length;
  box(W, 0.04, L, M('#3a3c40', { r: .95 }), 0, 0.02, 0, g).castShadow = false;
  const white = M('#e8e6e1', { r: .8 }), yel = M('#e0b030', { r: .8 });
  for (const sx of [-1, 1]) box(0.15, 0.01, L, white, sx * (W / 2 - 0.3), 0.045, 0, g).castShadow = false;
  for (let i = 1; i < p.lanes; i++) { const x = -W / 2 + i * 3.5, center = i === p.lanes / 2; if (center && p.lanes > 1) { box(0.12, 0.01, L, yel, x - 0.12, 0.046, 0, g).castShadow = false; box(0.12, 0.01, L, yel, x + 0.12, 0.046, 0, g).castShadow = false; } else for (let z = -L / 2 + 1.5; z < L / 2; z += 9) box(0.12, 0.01, 3, white, x, 0.046, z + 1.5, g).castShadow = false; }
  if (p.sidewalk) for (const sx of [-1, 1]) { box(4, 0.16, L, M('#a7a49d'), sx * (W / 2 + 2), 0.08, 0, g); box(0.2, 0.18, L, M('#c7c4bd'), sx * (W / 2 + 0.1), 0.09, 0, g); }
  return W;
}
def('road', { cat: 'Cenário', label: 'Estrada', icon: '🛣️', params: [P('length', 'Comprimento', 'num', 200, { min: 10, max: 2000, step: 10 }), P('lanes', 'Faixas', 'int', 2, { min: 1, max: 8, step: 1 }), P('sidewalk', 'Calçada', 'bool', false)], build(p) { const g = new THREE.Group(); buildRoad(p, g); return g; } });
function buildLamp(h, g, x, z, ry = 0) { const l = grp(x, 0, z, g); l.rotation.y = ry; const m = M('#4a4d52', { r: .5, m: .5 }); cyl(0.07, 0.1, h, m, 0, h / 2, 0, l, 8); box(0.08, 0.08, 1.4, m, 0, h, 0.65, l); box(0.3, 0.1, 0.5, M('#fff6dc', { e: '#fff1c4' }), 0, h - 0.06, 1.3, l); return l; }
def('street', {
  cat: 'Cenário', label: 'Rua com prédios', icon: '🏙️',
  params: [P('length', 'Comprimento', 'num', 160, { min: 20, max: 800, step: 10 }), P('lanes', 'Faixas', 'int', 2, { min: 1, max: 6, step: 1 }), P('minF', 'Andares mín', 'int', 3, { min: 1, max: 60, step: 1 }), P('maxF', 'Andares máx', 'int', 16, { min: 1, max: 80, step: 1 }), P('lamps', 'Postes', 'bool', true), P('trees', 'Árvores', 'bool', true), P('seed', 'Semente', 'int', 12, { min: 1, max: 9999, step: 1 })],
  build(p) {
    const g = new THREE.Group(), r = mulberry(p.seed), W = buildRoad({ ...p, sidewalk: true }, g), cols = ['#b8b2a6', '#d6d0c4', '#8a8f96', '#c9b49a', '#9a9387', '#e0dcd2', '#6e737a'];
    for (const sx of [-1, 1]) {
      let z = -p.length / 2;
      while (z < p.length / 2 - 4) { const w = 8 + r() * 14, d = 10 + r() * 12; buildBuilding({ width: d, depth: Math.min(w, p.length / 2 - z), floors: (p.minF + r() * (p.maxF - p.minF + 1)) | 0, floorH: 3.2, color: cols[(r() * cols.length) | 0], glass: r() < .5 ? '#2a3746' : '#3a4450', style: r() < .5 ? 'faixas' : 'grade' }, g, sx * (W / 2 + 4 + d / 2 + 0.5), z + Math.min(w, p.length / 2 - z) / 2); z += w + 0.3; }
      for (let z2 = -p.length / 2 + 8; z2 < p.length / 2; z2 += 22) { if (p.lamps) buildLamp(7, g, sx * (W / 2 + 0.6), z2, sx > 0 ? -Math.PI / 2 : Math.PI / 2); if (p.trees) buildTree({ height: 5 + r() * 2, kind: 'leafy', color: '#3d7a4f', seed: (r() * 999) | 0 }, g, sx * (W / 2 + 2.5), z2 + 11); }
    }
    return g;
  }
});
function buildTree(p, parent, x = 0, z = 0) {
  const g = grp(x, 0, z, parent), r = mulberry(p.seed), h = p.height, trunk = M('#5a3e2a');
  if (p.kind === 'pine') { cyl(h * 0.03, h * 0.045, h * 0.3, trunk, 0, h * 0.15, 0, g, 7); const n = 4; for (let i = 0; i < n; i++) { const rr = h * (0.3 - i * 0.055); mesh(new THREE.ConeGeometry(rr, h * 0.35, 18), M(p.color), 0, h * (0.32 + i * 0.17), 0, g).rotation.y = r() * 3; } }
  else if (p.kind === 'palm') { const segs = 8; let px = 0, py = 0; const lean = (r() - .5) * 0.3; for (let i = 0; i < segs; i++) { const s = cyl(h * 0.03, h * 0.035, h / segs, trunk, px, py + h / segs / 2, 0, g, 6); s.rotation.z = lean * i / segs; px += Math.sin(-lean * i / segs) * h / segs; py += h / segs; } for (let i = 0; i < 7; i++) { const lf = grp(px, py, 0, g); lf.rotation.y = i / 7 * Math.PI * 2 + r(); const b = box(0.4, 0.04, h * 0.35, M(p.color, { side: 1 }), 0, 0, h * 0.16, lf); lf.rotation.x = 0.5 + r() * 0.3; } }
  else { cyl(h * 0.035, h * 0.05, h * 0.5, trunk, 0, h * 0.25, 0, g, 7); for (let i = 0; i < 5; i++) { const s = mesh(new THREE.IcosahedronGeometry(h * (0.18 + r() * 0.1), 3), M(i % 2 ? p.color : shade(p.color, 0.85)), (r() - .5) * h * 0.3, h * (0.55 + r() * 0.3), (r() - .5) * h * 0.3, g); s.rotation.set(r() * 3, r() * 3, 0); } }
  return g;
}
const treeParams = (kind, h, col) => [P('kind', 'Tipo', 'select', kind, { opts: [['leafy', 'Folhosa'], ['pine', 'Pinheiro'], ['palm', 'Palmeira']] }), P('height', 'Altura', 'num', h, { min: 1, max: 40, step: .5 }), P('color', 'Folhas', 'color', col), P('seed', 'Semente', 'int', 1, { min: 1, max: 9999, step: 1 })];
def('tree', { cat: 'Natureza', label: 'Árvore', icon: '🌳', params: treeParams('leafy', 7, '#3d7a4f'), build(p) { const g = new THREE.Group(); buildTree(p, g); return g; } });
def('pine', { cat: 'Natureza', label: 'Pinheiro', icon: '🌲', params: treeParams('pine', 10, '#2c5a3c'), build(p) { const g = new THREE.Group(); buildTree(p, g); return g; } });
def('palm', { cat: 'Natureza', label: 'Palmeira', icon: '🌴', params: treeParams('palm', 8, '#4f8a3a'), build(p) { const g = new THREE.Group(); buildTree(p, g); return g; } });
def('forest', {
  cat: 'Natureza', label: 'Floresta', icon: '🏞️',
  params: [P('radius', 'Raio (m)', 'num', 60, { min: 5, max: 400, step: 5 }), P('count', 'Árvores', 'int', 80, { min: 1, max: 600, step: 1 }), P('clear', 'Clareira central (m)', 'num', 10, { min: 0, max: 100, step: 1 }), P('mix', 'Mistura', 'select', 'mix', { opts: [['mix', 'Misto'], ['pine', 'Pinheiros'], ['leafy', 'Folhosas'], ['palm', 'Palmeiras']] }), P('stripe', 'Faixa livre (estrada)', 'bool', false), P('seed', 'Semente', 'int', 5, { min: 1, max: 9999, step: 1 })],
  build(p) {
    const g = new THREE.Group(), r = mulberry(p.seed); let n = 0, guard = 0;
    while (n < p.count && guard++ < p.count * 20) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * p.radius, x = Math.cos(a) * d, z = Math.sin(a) * d; if (d < p.clear) continue; if (p.stripe && Math.abs(x) < 8) continue; const kind = p.mix === 'mix' ? (r() < 0.5 ? 'pine' : 'leafy') : p.mix; buildTree({ kind, height: 5 + r() * 9, color: kind === 'pine' ? '#2c5a3c' : kind === 'palm' ? '#4f8a3a' : ['#3d7a4f', '#4a8a45', '#5b8a3a'][(r() * 3) | 0], seed: (r() * 9999) | 0 }, g, x, z); n++; }
    return g;
  }
});
def('terrain', {
  cat: 'Natureza', label: 'Terreno', icon: '⛰️',
  params: [P('size', 'Tamanho (m)', 'num', 300, { min: 20, max: 2000, step: 10 }), P('height', 'Altura (m)', 'num', 30, { min: 0, max: 300, step: 1 }), P('feature', 'Escala do relevo', 'num', 120, { min: 10, max: 1000, step: 5 }), P('flat', 'Área plana central (m)', 'num', 40, { min: 0, max: 500, step: 5 }), P('color', 'Cor', 'color', '#6f7d5a'), P('seed', 'Semente', 'int', 9, { min: 1, max: 9999, step: 1 })],
  build(p) {
    const g = new THREE.Group(), seg = 140, geo = new THREE.PlaneGeometry(p.size, p.size, seg, seg); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z); const m = p.flat > 0 ? clamp((d - p.flat / 2) / (p.flat * 0.8 + 1), 0, 1) : 1; const s = m * m * (3 - 2 * m); pos.setY(i, (fbm(x / p.feature + 50, z / p.feature + 50, p.seed, 5) - 0.35) * p.height * 2 * s - 0.05); }
    geo.computeVertexNormals(); const me = mesh(geo, M(p.color, { r: .95 }), 0, 0, 0, g); return g;
  }
});
def('rock', { cat: 'Natureza', label: 'Rocha', icon: '🪨', params: [P('size', 'Tamanho', 'num', 1.5, { min: .1, max: 30, step: .1 }), P('color', 'Cor', 'color', '#7d7a74'), P('seed', 'Semente', 'int', 2, { min: 1, max: 9999, step: 1 })], build(p) { const g = new THREE.Group(), r = mulberry(p.seed), geo = new THREE.IcosahedronGeometry(p.size / 2, 1), pos = geo.attributes.position; const cache = {}; for (let i = 0; i < pos.count; i++) { const k = [pos.getX(i), pos.getY(i), pos.getZ(i)].map(v => v.toFixed(3)).join(); if (!cache[k]) cache[k] = 0.75 + r() * 0.5; const s = cache[k]; pos.setXYZ(i, pos.getX(i) * s, pos.getY(i) * s * 0.7, pos.getZ(i) * s); } geo.computeVertexNormals(); mesh(geo, M(p.color, { r: 1 }), 0, p.size * 0.25, 0, g); return g; } });

/* ---------------- PROPS ---------------- */
def('lamp', { cat: 'Props', label: 'Poste', icon: '💡', params: [P('height', 'Altura', 'num', 7, { min: 2, max: 15, step: .5 })], build(p) { const g = new THREE.Group(); buildLamp(p.height, g, 0, 0); return g; } });
def('cone', { cat: 'Props', label: 'Cone', icon: '🔶', params: [P('color', 'Cor', 'color', '#f06a1f')], build(p) { const g = new THREE.Group(); box(0.4, 0.04, 0.4, M('#222'), 0, 0.02, 0, g); mesh(new THREE.ConeGeometry(0.16, 0.7, 14), M(p.color), 0, 0.39, 0, g); cyl(0.09, 0.11, 0.1, M('#eee'), 0, 0.42, 0, g); return g; } });
def('bench', { cat: 'Props', label: 'Banco', icon: '🪑', params: [P('length', 'Comprimento', 'num', 1.8, { min: .5, max: 6, step: .1 }), P('color', 'Cor', 'color', '#8a5a34')], build(p) { const g = new THREE.Group(), w = M(p.color), m = M('#333'); box(p.length, 0.06, 0.45, w, 0, 0.45, 0, g); box(p.length, 0.4, 0.05, w, 0, 0.7, -0.22, g).rotation.x = -0.15; for (const sx of [-1, 1]) box(0.06, 0.45, 0.45, m, sx * (p.length / 2 - 0.15), 0.22, 0, g); return g; } });
def('barrier', { cat: 'Props', label: 'Barreira', icon: '🚧', params: [P('length', 'Comprimento', 'num', 4, { min: 1, max: 40, step: .5 }), P('color', 'Cor', 'color', '#c9c5bd')], build(p) { const g = new THREE.Group(); box(0.6, 0.3, p.length, M(p.color), 0, 0.15, 0, g); box(0.25, 0.55, p.length, M(p.color), 0, 0.55, 0, g); return g; } });
def('wall', { cat: 'Props', label: 'Parede', icon: '🧱', params: [P('length', 'Comprimento', 'num', 6, { min: .5, max: 100, step: .5 }), P('height', 'Altura', 'num', 3, { min: .2, max: 30, step: .1 }), P('thick', 'Espessura', 'num', 0.2, { min: .05, max: 3, step: .05 }), P('color', 'Cor', 'color', '#d8d2c6')], build(p) { const g = new THREE.Group(); box(p.length, p.height, p.thick, M(p.color), 0, p.height / 2, 0, g); return g; } });
def('stairs', { cat: 'Props', label: 'Escada', icon: '📶', params: [P('steps', 'Degraus', 'int', 10, { min: 2, max: 60, step: 1 }), P('width', 'Largura', 'num', 2, { min: .5, max: 20, step: .1 }), P('rise', 'Altura degrau', 'num', 0.18, { min: .05, max: .5, step: .01 }), P('run', 'Piso', 'num', 0.3, { min: .1, max: 1, step: .01 }), P('color', 'Cor', 'color', '#b8b2a6')], build(p) { const g = new THREE.Group(); for (let i = 0; i < p.steps; i++) box(p.width, p.rise * (i + 1), p.run, M(p.color), 0, p.rise * (i + 1) / 2, i * p.run, g); return g; } });
def('ramp', { cat: 'Props', label: 'Rampa', icon: '📐', params: [P('length', 'Comprimento', 'num', 6, { min: 1, max: 50, step: .5 }), P('width', 'Largura', 'num', 3, { min: .5, max: 20, step: .5 }), P('height', 'Altura', 'num', 1.5, { min: .1, max: 20, step: .1 }), P('color', 'Cor', 'color', '#9a9387')], build(p) { const g = new THREE.Group(); const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(p.length, 0); sh.lineTo(p.length, p.height); sh.closePath(); const geo = new THREE.ExtrudeGeometry(sh, { depth: p.width, bevelEnabled: false }); geo.translate(-p.length / 2, 0, -p.width / 2); geo.rotateY(-Math.PI / 2); mesh(geo, M(p.color), 0, 0, 0, g); return g; } });
def('stage', { cat: 'Props', label: 'Plataforma', icon: '⬛', params: [P('width', 'Largura', 'num', 6, { min: .5, max: 100, step: .5 }), P('depth', 'Profundidade', 'num', 4, { min: .5, max: 100, step: .5 }), P('height', 'Altura', 'num', 0.5, { min: .02, max: 10, step: .05 }), P('color', 'Cor', 'color', '#4a4d52')], build(p) { const g = new THREE.Group(); box(p.width, p.height, p.depth, M(p.color), 0, p.height / 2, 0, g); return g; } });
def('parked', {
  cat: 'Props', label: 'Carros estacionados', icon: '🅿️', params: [P('count', 'Quantidade', 'int', 6, { min: 1, max: 40, step: 1 }), P('gap', 'Espaçamento', 'num', 6, { min: 4.5, max: 15, step: .5 }), P('seed', 'Semente', 'int', 4, { min: 1, max: 9999, step: 1 })],
  build(p) { const g = new THREE.Group(), r = mulberry(p.seed); for (let i = 0; i < p.count; i++) { const st = ['sedan', 'suv', 'sport'][(r() * 3) | 0]; const c = buildCar({ style: st, color: PALETTE[(r() * PALETTE.length) | 0], length: 4.3 + r() * 0.6, width: 1.85, height: st === 'suv' ? 1.75 : st === 'sport' ? 1.2 : 1.45 }); c.position.z = (i - (p.count - 1) / 2) * p.gap; if (r() < 0.2) c.rotation.y = Math.PI; g.add(c); } return g; }
});
/* produtos (comercial) */
def('can', { cat: 'Produto', label: 'Lata', icon: '🥫', params: [P('scale', 'Escala', 'num', 1, { min: .1, max: 50, step: .1 }), P('color', 'Cor', 'color', '#c94b3c')], build(p) { const g = new THREE.Group(), k = p.scale; cyl(0.033 * k, 0.033 * k, 0.115 * k, M(p.color, { r: .3, m: .6, flat: 0 }), 0, 0.0575 * k + 0.005 * k, 0, g, 32); cyl(0.029 * k, 0.033 * k, 0.01 * k, M('#c9ccd1', { r: .2, m: .9, flat: 0 }), 0, 0.125 * k, 0, g, 32); cyl(0.033 * k, 0.029 * k, 0.006 * k, M('#c9ccd1', { r: .2, m: .9, flat: 0 }), 0, 0.003 * k, 0, g, 32); return g; } });
def('bottle', { cat: 'Produto', label: 'Garrafa', icon: '🍾', params: [P('scale', 'Escala', 'num', 1, { min: .1, max: 50, step: .1 }), P('color', 'Cor', 'color', '#2f6b3a'), P('cap', 'Tampa', 'color', '#d9a441')], build(p) { const g = new THREE.Group(), k = p.scale; const pts = [[0, 0], [0.037, 0], [0.038, 0.01], [0.038, 0.17], [0.03, 0.2], [0.014, 0.24], [0.013, 0.29], [0, 0.29]].map(([x, y]) => new THREE.Vector2(x * k, y * k)); mesh(new THREE.LatheGeometry(pts, 32), M(p.color, { r: .1, m: .2, flat: 0 }), 0, 0, 0, g); cyl(0.015 * k, 0.015 * k, 0.025 * k, M(p.cap, { r: .3, m: .7, flat: 0 }), 0, 0.3 * k, 0, g, 20); cyl(0.0385 * k, 0.0385 * k, 0.07 * k, M('#e8e6e1', { flat: 0 }), 0, 0.1 * k, 0, g, 32); return g; } });
def('box', { cat: 'Produto', label: 'Caixa / embalagem', icon: '📦', params: [P('w', 'Largura', 'num', 0.3, { min: .01, max: 20, step: .01 }), P('h', 'Altura', 'num', 0.4, { min: .01, max: 20, step: .01 }), P('d', 'Profundidade', 'num', 0.12, { min: .01, max: 20, step: .01 }), P('color', 'Cor', 'color', '#e8e6e1')], build(p) { const g = new THREE.Group(); box(p.w, p.h, p.d, M(p.color, { r: .5 }), 0, p.h / 2, 0, g); return g; } });
def('phone', { cat: 'Produto', label: 'Smartphone', icon: '📱', params: [P('scale', 'Escala', 'num', 1, { min: .1, max: 50, step: .1 }), P('color', 'Cor', 'color', '#24262b')], build(p) { const g = new THREE.Group(), k = p.scale; box(0.075 * k, 0.155 * k, 0.008 * k, M(p.color, { r: .3, m: .6 }), 0, 0.0775 * k, 0, g); box(0.07 * k, 0.148 * k, 0.001 * k, M('#0d1117', { r: .05, m: .5 }), 0, 0.0775 * k, 0.0045 * k, g); return g; } });
/* primitivas */
def('cube', { cat: 'Primitivas', label: 'Cubo', icon: '◼', params: [P('size', 'Tamanho', 'num', 1, { min: .01, max: 100, step: .1 }), P('color', 'Cor', 'color', '#8a9099')], build(p) { const g = new THREE.Group(); box(p.size, p.size, p.size, M(p.color), 0, p.size / 2, 0, g); return g; } });
def('sphere', { cat: 'Primitivas', label: 'Esfera', icon: '●', params: [P('size', 'Diâmetro', 'num', 1, { min: .01, max: 100, step: .1 }), P('color', 'Cor', 'color', '#8a9099')], build(p) { const g = new THREE.Group(); sph(p.size / 2, M(p.color, { flat: 0 }), 0, p.size / 2, 0, g, 32, 20); return g; } });
def('cylinder', { cat: 'Primitivas', label: 'Cilindro', icon: '▮', params: [P('size', 'Diâmetro', 'num', 1, { min: .01, max: 100, step: .1 }), P('height', 'Altura', 'num', 2, { min: .01, max: 100, step: .1 }), P('color', 'Cor', 'color', '#8a9099')], build(p) { const g = new THREE.Group(); cyl(p.size / 2, p.size / 2, p.height, M(p.color, { flat: 0 }), 0, p.height / 2, 0, g, 28); return g; } });
def('plane', { cat: 'Primitivas', label: 'Plano', icon: '▭', params: [P('width', 'Largura', 'num', 10, { min: .1, max: 1000, step: .5 }), P('depth', 'Profundidade', 'num', 10, { min: .1, max: 1000, step: .5 }), P('color', 'Cor', 'color', '#9a9387')], build(p) { const g = new THREE.Group(); box(p.width, 0.02, p.depth, M(p.color), 0, 0.01, 0, g); return g; } });
/* utilitários */
def('null', {
  cat: 'Câmera & utilitários', label: 'Alvo / Null', icon: '✛', helperOnly: true, params: [P('size', 'Tamanho', 'num', 0.6, { min: .05, max: 10, step: .05 })],
  build(p) { const g = new THREE.Group(); const s = p.size; const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-s, 0, 0), new THREE.Vector3(s, 0, 0), new THREE.Vector3(0, -s, 0), new THREE.Vector3(0, s, 0), new THREE.Vector3(0, 0, -s), new THREE.Vector3(0, 0, s)]); const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#f2a33a' })); l.userData.helper = true; g.add(l); const sp = new THREE.Mesh(new THREE.SphereGeometry(s * 0.25, 10, 6), new THREE.MeshBasicMaterial({ color: '#f2a33a', wireframe: true })); sp.userData.helper = true; g.add(sp); return g; }
});
def('camera', {
  cat: 'Câmera & utilitários', label: 'Câmera', icon: '🎥', pilot: 'camera', helperOnly: true, params: [],
  build() {
    const g = new THREE.Group(), cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 3000); g.add(cam);
    const vis = new THREE.Group(); vis.userData.helper = true; g.add(vis);
    const mb = new THREE.MeshBasicMaterial({ color: '#3a3e46' }), ma = new THREE.MeshBasicMaterial({ color: '#f2a33a' });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.36), mb); b.position.z = 0.2; vis.add(b);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.14, 12), mb); l.rotation.x = Math.PI / 2; l.position.z = -0.04; vis.add(l);
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.08, 3), ma); t.position.set(0, 0.16, 0.2); vis.add(t);
    const fr = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#f2a33a' })); vis.add(fr);
    g.userData.rig = { cam, vis, fr, body: b }; return g;
  }
});
function updateFrustum(rig, fovDeg, aspect, active, focusD) {
  if (focusD > 0) {
    if (!rig.fp) { rig.fp = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#7aa7ff', transparent: true, opacity: 0.8 })); rig.vis.add(rig.fp); }
    const hh = Math.tan(fovDeg * DEG / 2) * focusD, ww = hh * aspect, z = -focusD, c = [[-ww, -hh], [ww, -hh], [ww, hh], [-ww, hh]].map(([x, y]) => new THREE.Vector3(x, y, z));
    const pts = []; for (let i = 0; i < 4; i++) pts.push(c[i], c[(i + 1) % 4]); pts.push(new THREE.Vector3(-ww * .15, 0, z), new THREE.Vector3(ww * .15, 0, z), new THREE.Vector3(0, -hh * .15, z), new THREE.Vector3(0, hh * .15, z));
    rig.fp.geometry.setFromPoints(pts); rig.fp.visible = true;
  } else if (rig.fp) rig.fp.visible = false;
  const d = 1.6, h = Math.tan(fovDeg * DEG / 2) * d, w = h * aspect, c = [new THREE.Vector3(-w, -h, -d), new THREE.Vector3(w, -h, -d), new THREE.Vector3(w, h, -d), new THREE.Vector3(-w, h, -d)], o = new THREE.Vector3(0, 0, -0.1);
  const pts = []; for (let i = 0; i < 4; i++) { pts.push(o, c[i], c[i], c[(i + 1) % 4]); }
  pts.push(new THREE.Vector3(-w * 0.4, h * 1.08, -d), new THREE.Vector3(0, h * 1.35, -d), new THREE.Vector3(0, h * 1.35, -d), new THREE.Vector3(w * 0.4, h * 1.08, -d));
  rig.fr.geometry.setFromPoints(pts); rig.fr.material.color.set(active ? '#f2a33a' : '#7c828c');
}
const PILOT_INFO = {
  car: { keys: '<kbd>W</kbd> acelerar · <kbd>S</kbd> frear/ré · <kbd>A</kbd><kbd>D</kbd> virar · <kbd>Espaço</kbd> freio de mão', ch: ['px', 'pz', 'ry'] },
  walker: { keys: '<kbd>W</kbd> andar · <kbd>Shift</kbd> correr · <kbd>S</kbd> ré · <kbd>A</kbd><kbd>D</kbd> virar', ch: ['px', 'pz', 'ry'] },
  bird: { keys: '<kbd>W</kbd>/<kbd>S</kbd> mais/menos rápido · <kbd>A</kbd><kbd>D</kbd> curva · <kbd>Espaço</kbd> subir · <kbd>C</kbd> descer', ch: ['px', 'py', 'pz', 'rx', 'ry', 'rz'] },
  camera: { keys: '<kbd>WASD</kbd> mover · <kbd>Q</kbd>/<kbd>E</kbd> descer/subir · arraste o mouse para olhar · <kbd>Z</kbd>/<kbd>X</kbd> roll · roda = zoom · <kbd>Shift</kbd> rápido · <kbd>Alt</kbd> lento', ch: ['px', 'py', 'pz', 'rx', 'ry', 'rz', 'focal'] },
  prop: { keys: '<kbd>W</kbd>/<kbd>S</kbd> frente/trás · <kbd>A</kbd><kbd>D</kbd> girar · <kbd>Q</kbd>/<kbd>E</kbd> descer/subir · <kbd>Shift</kbd> rápido', ch: ['px', 'py', 'pz', 'ry'] },
};

ASSETS.drone.hover = true; ASSETS.heli.hover = true;

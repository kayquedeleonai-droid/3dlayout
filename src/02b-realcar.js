/* ============================================================
   CARRO DE MODELO REAL — blocking preciso a partir de ficha técnica
   Medidas em metros (fontes: fichas técnicas oficiais / bases de specs,
   pesquisadas nov/2026). Balanços marcados ~ são estimados quando a ficha não traz.
   ============================================================ */
const CAR_DB = {
  p911: { name: 'Porsche 911 Carrera (992)', body: 'coupe', L: 4.519, W: 1.852, H: 1.298, wb: 2.450, fo: 0.84, tf: 1.591, tr: 1.557, clr: 0.118, tireF: '235/40R19', tireR: '295/35R20', color: '#b8bcc2' },
  taycan: { name: 'Porsche Taycan', body: 'fastback', L: 4.963, W: 1.966, H: 1.379, wb: 2.900, fo: 0.95, tf: 1.690, tr: 1.655, clr: 0.128, tireF: '245/45R20', tireR: '285/40R20', color: '#2a3d5c' },
  cayenne: { name: 'Porsche Cayenne (2024)', body: 'suv', L: 4.930, W: 1.983, H: 1.698, wb: 2.895, fo: 0.98, tf: 1.687, tr: 1.670, clr: 0.190, tireF: '255/55R19', tireR: '275/50R19', color: '#24262b' },
  model3: { name: 'Tesla Model 3 (Highland)', body: 'fastback', L: 4.720, W: 1.850, H: 1.441, wb: 2.875, fo: 0.868, tf: 1.584, tr: 1.584, clr: 0.138, tireF: '235/45R18', tireR: '235/45R18', color: '#e9e8e4' },
  modely: { name: 'Tesla Model Y (Juniper)', body: 'suv', L: 4.790, W: 1.920, H: 1.624, wb: 2.890, fo: 0.889, tf: 1.636, tr: 1.636, clr: 0.167, tireF: '255/45R19', tireR: '255/45R19', color: '#7d8288' },
  corolla: { name: 'Toyota Corolla sedã (BR)', body: 'sedan', L: 4.630, W: 1.780, H: 1.455, wb: 2.700, fo: 0.935, tf: 1.530, tr: 1.530, clr: 0.130, tireF: '205/55R16', tireR: '205/55R16', color: '#b8bcc2' },
  hilux: { name: 'Toyota Hilux cabine dupla', body: 'pickup', L: 5.325, W: 1.855, H: 1.815, wb: 3.085, fo: 0.985, tf: 1.540, tr: 1.550, clr: 0.286, tireF: '265/65R17', tireR: '265/65R17', color: '#e9e8e4' },
  compass: { name: 'Jeep Compass (BR)', body: 'suv', L: 4.404, W: 1.819, H: 1.632, wb: 2.636, fo: 0.88, tf: 1.550, tr: 1.545, clr: 0.198, tireF: '225/55R18', tireR: '225/55R18', color: '#3b3f46' },
  polo: { name: 'VW Polo (BR)', body: 'hatch', L: 4.074, W: 1.751, H: 1.471, wb: 2.566, fo: 0.80, tf: 1.524, tr: 1.506, clr: 0.149, tireF: '195/55R16', tireR: '195/55R16', color: '#2456a6' },
  strada: { name: 'Fiat Strada cabine dupla', body: 'pickup', L: 4.480, W: 1.732, H: 1.595, wb: 2.737, fo: 0.78, tf: 1.457, tr: 1.480, clr: 0.209, tireF: '205/55R16', tireR: '205/55R16', color: '#b3261e' },
  dolphin: { name: 'BYD Dolphin', body: 'hatch', L: 4.290, W: 1.770, H: 1.570, wb: 2.700, fo: 0.830, tf: 1.530, tr: 1.530, clr: 0.130, tireF: '205/55R16', tireR: '205/55R16', color: '#cfd8dc' },
  gclass: { name: 'Mercedes Classe G (W465)', body: 'boxy', L: 4.825, W: 1.931, H: 1.969, wb: 2.890, fo: 0.885, tf: 1.638, tr: 1.638, clr: 0.241, tireF: '265/60R18', tireR: '265/60R18', color: '#1d1e21' },
};
const CAR_SOURCES = 'Porsche newsroom / CarExpert (911, Taycan, Cayenne), auto-data.net e manual Tesla (Model 3, Model Y), Toyota Brasil (Corolla, Hilux), Webmotors / carro.blog.br (Compass, Polo, Strada), CarExpert / evspecifications (Dolphin), autotijd / Mercedes (Classe G).';

/* Silhuetas-base por carroceria. u: 0 = para-choque traseiro … 1 = dianteiro; y: fração da altura total.
   a_r / a_f: posição dos eixos no template (o perfil é remapeado aos balanços reais do carro).
   lower = carroceria até a linha de cintura; cabin = área envidraçada; skins = teto/colunas na cor do carro. B = ponto baixo do para-choque */
const BODY_TPL = {
  coupe: { a_r: .272, a_f: .814, lower: [[0, 'B'], [.004, .40], [.015, .58], [.05, .66], [.25, .665], [.62, .665], [.67, .62], [.80, .53], [.94, .47], [.99, .40], [1, .30], [.995, 'B']], cabin: [[.05, .655], [.20, .80], [.36, .95], [.47, 1], [.56, .99], [.67, .64]], skins: [[[.05, .655], [.20, .80], [.33, .925], [.37, .66]]], roof: [2, 4] },
  fastback: { a_r: .21, a_f: .80, lower: [[0, 'B'], [.005, .42], [.02, .62], [.05, .68], [.18, .69], [.66, .68], [.70, .66], [.85, .57], [.97, .49], [1, .38], [.995, 'B']], cabin: [[.06, .68], [.24, .90], [.38, .99], [.52, 1], [.70, .66]], skins: [[[.06, .68], [.24, .90], [.30, .95], [.31, .69]], [[.475, .68], [.495, .68], [.495, 1], [.475, 1]]], roof: [1, 3] },
  sedan: { a_r: .215, a_f: .798, lower: [[0, 'B'], [.005, .42], [.02, .62], [.04, .68], [.17, .69], [.66, .68], [.70, .66], [.85, .58], [.97, .50], [1, .40], [.995, 'B']], cabin: [[.13, .68], [.27, .95], [.37, 1], [.55, 1], [.70, .66]], skins: [[[.13, .68], [.27, .95], [.31, .97], [.29, .69]], [[.47, .68], [.49, .68], [.49, 1], [.47, 1]]], roof: [1, 4] },
  hatch: { a_r: .17, a_f: .80, lower: [[0, 'B'], [.004, .42], [.01, .62], [.02, .66], [.66, .64], [.72, .60], [.86, .55], [.97, .48], [1, .38], [.995, 'B']], cabin: [[.015, .64], [.04, .93], [.12, .99], [.50, 1], [.72, .60]], skins: [[[.015, .64], [.04, .93], [.15, .975], [.17, .65]], [[.45, .64], [.47, .64], [.47, 1], [.45, 1]]], roof: [1, 3] },
  suv: { a_r: .20, a_f: .80, lower: [[0, 'B'], [.004, .40], [.012, .55], [.025, .60], [.70, .60], [.75, .58], [.88, .53], [.98, .47], [1, .36], [.995, 'B']], cabin: [[.02, .60], [.04, .94], [.10, .99], [.55, 1], [.74, .59]], skins: [[[.02, .60], [.04, .94], [.13, .975], [.14, .61]], [[.44, .60], [.46, .60], [.46, 1], [.44, 1]]], roof: [1, 3] },
  boxy: { a_r: .18, a_f: .815, lower: [[0, 'B'], [0, .55], [.68, .55], [.70, .56], [.97, .53], [1, .48], [1, 'B']], cabin: [[0, .55], [.005, .98], [.62, 1], [.69, .55]], skins: [[[0, .55], [.005, .98], [.07, .985], [.07, .56]], [[.39, .55], [.415, .55], [.415, .99], [.39, .99]]], roof: [1, 2], spare: true },
  pickup: { a_r: .235, a_f: .815, lower: [[0, 'B'], [.002, .48], [.004, .56], [.36, .56], [.37, .58], [.70, .57], [.74, .56], [.88, .54], [.98, .50], [1, .40], [.995, 'B']], cabin: [[.37, .56], [.38, .97], [.45, 1], [.62, 1], [.73, .56]], skins: [[[.37, .56], [.38, .97], [.42, .985], [.41, .57]], [[.53, .56], [.55, .56], [.55, 1], [.53, 1]]], roof: [1, 3], bed: [.012, .355] },
};
function tireRadius(spec, fallback) { const m = String(spec || '').match(/(\d{3})\s*\/\s*(\d{2})\s*Z?R?\s*(\d{2})/i); if (!m) return fallback; return (+m[3] * 25.4 + 2 * (+m[1]) * (+m[2]) / 100) / 2000; }
function tireWidth(spec, fallback) { const m = String(spec || '').match(/(\d{3})\s*\//); return m ? +m[1] / 1000 : fallback; }
function buildRealCar(p) { return p.body === 'traced' || !CAR_TPL[p.body] ? buildRealCarTraced(p) : buildCarLoft(p); }
function buildRealCarTraced(p) {
  const g = new THREE.Group(), rig = { wheels: [], steer: [] };
  let T = BODY_TPL[p.body] || BODY_TPL.sedan, traced = null;
  if (p.body === 'traced' && p.profile) { try { traced = JSON.parse(p.profile); T = traced; } catch (e) { T = BODY_TPL.sedan; } }
  const L = p.length, W = p.width, H = p.height, wb = Math.min(p.wheelbase, L * 0.9), fo = clamp(p.foverhang || (L - wb) * 0.45, 0.2, L - wb - 0.2);
  const zfa = L / 2 - fo, zra = zfa - wb, rf = tireRadius(p.tireF, 0.33), rr = tireRadius(p.tireR, rf), clr = Math.max(0.05, p.clearance);
  const uz = (u) => u <= T.a_r ? lerp(-L / 2, zra, u / T.a_r) : u <= T.a_f ? lerp(zra, zfa, (u - T.a_r) / (T.a_f - T.a_r)) : lerp(zfa, L / 2, (u - T.a_f) / (1 - T.a_f));
  const kz = (L - 0.1) / L, ky = (H - 0.05) / H;
  const yb = clr + 0.12, P = (pt) => [uz(pt[0]) * kz, pt[1] === 'B' ? yb : pt[1] * H * ky];
  const body = M(p.color), glass = M('#2b3540', { r: .1 }), dark = M('#1e1f22'), tire = M('#1c1c1c'), rim = M('#b9bdc4');
  const arch = (zc, r) => { const ra = r + 0.045, out = [], t0 = yb > r ? Math.asin(clamp((yb - r) / ra, 0, 1)) : 0; if (yb < r) out.push([zc + ra, yb]); for (let i = 0; i <= 14; i++) { const t = t0 + (Math.PI - 2 * t0) * i / 14; out.push([zc + ra * Math.cos(t), r + ra * Math.sin(t)]); } if (yb < r) out.push([zc - ra, yb]); return out; };
  const lowerPts = T.lower.map(P);
  profileMesh([...lowerPts, ...arch(zfa, rf), ...arch(zra, rr)], W, body, g, traced ? 0.09 : 0.05);
  if (T.cabin) {
    const cab = T.cabin.map(P); profileMesh(cab, W * 0.84, glass, g, 0.03);
    const [i0, i1] = T.roof || [1, cab.length - 2];
    const top = cab.slice(i0, i1 + 1); const band = [...top.map(([z, y]) => [z, y + 0.012]), ...top.slice().reverse().map(([z, y]) => [z, y - 0.045])];
    profileMesh(band, W * 0.82, body, g, 0.015);
    for (const s of (T.skins || [])) profileMesh(s.map(P), W * 0.845, body, g, 0.01);
    const ap = cab[cab.length - 1]; for (const sx of [-1, 1]) box(0.12, 0.1, 0.13, body, sx * (W / 2 + 0.03), ap[1] + 0.07, ap[0] - 0.12, g);
  }
  if (T.glass) profileMesh(T.glass.map(P), W * 1.004, glass, g, 0);
  if (T.bed) { const z0 = uz(T.bed[0]), z1 = uz(T.bed[1]); box(W * 0.86, 0.05, z1 - z0, dark, 0, T.lower[2][1] * H - 0.02, (z0 + z1) / 2, g); }
  if (T.spare) { const sp = cyl(rr, rr, 0.24, M('#26272b'), 0, H * 0.45, -L / 2 + 0.05, g, 24); sp.rotation.x = Math.PI / 2; sp.position.z = -L / 2 + 0.1; }
  // luzes: faróis na frente, lanternas atrás (alturas tiradas do perfil)
  const front = lowerPts.filter(([z]) => z > L / 2 - 0.25), back = lowerPts.filter(([z]) => z < -L / 2 + 0.25);
  const fy = Math.max(...front.map(p2 => p2[1])) - 0.06, by = Math.max(...back.map(p2 => p2[1])) - 0.08;
  for (const sx of [-1, 1]) { box(W * 0.2, 0.07, 0.05, M('#f4f1e6', { e: '#9a9580' }), sx * W * 0.33, fy, L / 2 - 0.06, g); box(W * 0.22, 0.06, 0.05, M('#9a1c1c', { e: '#4a0808' }), sx * W * 0.33, by, -L / 2 + 0.03, g); }
  // rodas com bitola e pneus da ficha
  rig.wb = wb; rig.r = (rf + rr) / 2;
  for (const [z, r, tw, track, front2] of [[zfa, rf, tireWidth(p.tireF, .225), p.trackF, true], [zra, rr, tireWidth(p.tireR, tireWidth(p.tireF, .225)), p.trackR, false]]) {
    const wgeo = new THREE.CylinderGeometry(r, r, tw, 30); wgeo.rotateZ(Math.PI / 2);
    const rgeo = new THREE.CylinderGeometry(r * 0.66, r * 0.66, tw + 0.008, 22); rgeo.rotateZ(Math.PI / 2);
    for (const sx of [-1, 1]) {
      const piv = grp(sx * Math.min(track, W - tw) / 2, r, z, g); const w = new THREE.Group(); piv.add(w);
      mesh(wgeo, tire, 0, 0, 0, w); mesh(rgeo, rim, 0, 0, 0, w); box(tw + 0.012, r * 0.16, r * 1.2, M('#7d828a'), 0, 0, 0, w); box(tw + 0.012, r * 1.2, r * 0.16, M('#7d828a'), 0, 0, 0, w);
      rig.wheels.push(w); if (front2) rig.steer.push(piv);
    }
  }
  g.userData.rig = rig; return g;
}
const CAR_OPTS = [...Object.entries(CAR_DB).map(([k, v]) => [k, v.name]), ['custom', 'Personalizado / outro modelo']];
function carDefaults(k) { const d = CAR_DB[k] || CAR_DB.p911; return { model: k, body: d.body, color: d.color, length: d.L, width: d.W, height: d.H, wheelbase: d.wb, foverhang: d.fo, trackF: d.tf, trackR: d.tr, clearance: d.clr, tireF: d.tireF, tireR: d.tireR }; }
def('realcar', {
  cat: 'Veículos', label: 'Carro de modelo real', icon: '🏁', pilot: 'car',
  params: (() => { const d = carDefaults('p911'); return [
    P('model', 'Modelo', 'select', 'p911', { opts: CAR_OPTS }), P('modelName', 'Nome do modelo', 'text', ''),
    P('body', 'Carroceria', 'select', d.body, { opts: [['coupe', 'Cupê (911)'], ['fastback', 'Fastback / sedã baixo'], ['sedan', 'Sedã 3 volumes'], ['hatch', 'Hatch'], ['suv', 'SUV / crossover'], ['boxy', 'Utilitário quadrado'], ['pickup', 'Picape'], ['traced', 'Traçado do model sheet']] }),
    P('color', 'Cor', 'color', d.color),
    P('length', 'Comprimento (m)', 'num', d.length, { min: 2.5, max: 7, step: .001 }), P('width', 'Largura s/ espelhos (m)', 'num', d.width, { min: 1.4, max: 2.6, step: .001 }), P('height', 'Altura (m)', 'num', d.height, { min: 1, max: 2.6, step: .001 }),
    P('wheelbase', 'Entre-eixos (m)', 'num', d.wheelbase, { min: 1.8, max: 4.5, step: .001 }), P('foverhang', 'Balanço dianteiro (m)', 'num', d.foverhang, { min: .3, max: 1.6, step: .001 }),
    P('trackF', 'Bitola dianteira (m)', 'num', d.trackF, { min: 1.2, max: 2.2, step: .001 }), P('trackR', 'Bitola traseira (m)', 'num', d.trackR, { min: 1.2, max: 2.2, step: .001 }),
    P('clearance', 'Vão livre (m)', 'num', d.clearance, { min: .05, max: .5, step: .001 }), P('tireF', 'Pneu dianteiro', 'text', d.tireF), P('tireR', 'Pneu traseiro', 'text', d.tireR),
    P('vmax', 'Vel. máx (km/h)', 'num', 250, { min: 20, max: 400, step: 5 }), P('profile', 'Perfil traçado', 'hidden', ''),
  ]; })(),
  build: buildRealCar, anim: animVehicle,
});
// ao trocar o modelo no inspetor, carrega as medidas da ficha
function applyCarModel(o, key) { if (!CAR_DB[key]) return; Object.assign(o.params, carDefaults(key)); o.params.modelName = CAR_DB[key].name; o.name = CAR_DB[key].name; }

/* ============================================================
   MODEL SHEET / IMAGENS DE REFERÊNCIA (qualquer objeto)
   o.refs = { side|front|back|top: {src, crop:[l,t,r,b], len, dx, dy, opacity, flip, rot} }
   ============================================================ */
const REF_VIEWS = { side: 'Lateral', front: 'Frente', back: 'Traseira', top: 'Topo' };
const _refTex = new Map(), _refImgSize = new Map();
function refTexture(src) { let t = _refTex.get(src); if (!t) { t = new THREE.TextureLoader().load(src, tx => { _refImgSize.set(src, [tx.image.width, tx.image.height]); bump(); }); t.colorSpace = THREE.SRGBColorSpace; _refTex.set(src, t); } return t; }
function objDims(o) { const p = o.params || {}; if (o.type === 'realcar') return { L: p.length, W: p.width, H: p.height }; const r = rt.get(o.id); const s = r && r.size; return s ? { L: s.z, W: s.x, H: s.y } : { L: 4.5, W: 1.9, H: 1.5 }; }
function buildRefs(o, g) {
  if (!o.refs) return;
  for (const view in o.refs) {
    const R = o.refs[view]; if (!R || !R.src) continue;
    const tex = refTexture(R.src).clone(); tex.needsUpdate = true;
    const [cl, ct, cr, cb] = R.crop || [0, 0, 1, 1], cw = Math.max(0.01, cr - cl), ch = Math.max(0.01, cb - ct);
    tex.repeat.set(cw * (R.flip ? -1 : 1), ch); tex.offset.set(R.flip ? cr : cl, 1 - cb);
    const isz = _refImgSize.get(R.src) || [R.w || 1600, R.h || 800];
    const len = R.len || 4.5, hgt = len * (ch * isz[1]) / (cw * isz[0]);
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: R.opacity ?? 0.55, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(len, hgt), m); pl.userData.helper = true; pl.renderOrder = -1;
    const d = objDims(o), dx = R.dx || 0, dy = R.dy || 0;
    if (view === 'side') { pl.rotation.y = -Math.PI / 2; pl.position.set(-(d.W / 2 + 0.05), hgt / 2 + dy, dx); }
    else if (view === 'front') { pl.position.set(dx, hgt / 2 + dy, -(d.L / 2 + 0.05)); }
    else if (view === 'back') { pl.rotation.y = Math.PI; pl.position.set(dx, hgt / 2 + dy, d.L / 2 + 0.05); }
    else { pl.rotation.x = -Math.PI / 2; pl.rotation.z = (R.rot || 0) * DEG; pl.position.set(dx, -0.004 + 0.002, dy); }
    g.add(pl);
  }
}
let refView = 'side';
function refsSection(o) {
  const R = (o.refs || {})[refView];
  const d = objDims(o);
  let h = `<div class="btnrow">${Object.entries(REF_VIEWS).map(([k, l]) => `<button data-rv="${k}" class="${k === refView ? 'on' : ''}">${l}${(o.refs || {})[k] ? ' •' : ''}</button>`).join('')}</div>`;
  h += `<div class="btnrow"><button data-ref="load">📄 Carregar imagem (${REF_VIEWS[refView]})</button>${R ? '<button data-ref="del">Remover</button>' : ''}</div>`;
  if (R) {
    const row = (k, lb, v, st, mn, mx) => `<div class="prow wide"><span class="lb">${lb}</span><input type="number" data-refp="${k}" value="${fmt(v, 3)}" step="${st}" min="${mn}" max="${mx}"></div>`;
    h += row('len', refView === 'side' || refView === 'top' ? 'Largura = compr. (m)' : 'Largura = larg. (m)', R.len, .001, .1, 30);
    h += row('dx', 'Deslocar horiz. (m)', R.dx || 0, .005, -20, 20) + row('dy', refView === 'top' ? 'Deslocar prof. (m)' : 'Deslocar vert. (m)', R.dy || 0, .005, -20, 20);
    h += row('opacity', 'Opacidade', R.opacity ?? .55, .05, 0, 1);
    h += `<div class="prow wide"><span class="lb">Recorte % (E,C,D,B)</span><span style="display:flex;gap:3px">${[0, 1, 2, 3].map(i => `<input type="number" data-refc="${i}" value="${Math.round((R.crop || [0, 0, 1, 1])[i] * 1000) / 10}" step="0.5" min="0" max="100" style="width:25%">`).join('')}</span></div>`;
    h += `<div class="btnrow"><button data-ref="flip" class="${R.flip ? 'on' : ''}">Espelhar</button>${refView === 'top' ? '<button data-ref="rot">Girar 90°</button>' : ''}<button data-ref="fit">Ajustar ao objeto (${refView === 'side' || refView === 'top' ? fmt(d.L, 3) : fmt(d.W, 3)} m)</button></div>`;
    if (refView === 'side' && o.type === 'realcar') h += `<div class="btnrow"><button class="pri" data-ref="trace" ${sampleNS ? '' : 'disabled'}>✨ Traçar silhueta com IA</button></div>`;
  }
  h += `<div class="hint">Recorte a vista certa do model sheet e use <b>Ajustar ao objeto</b>: a largura do recorte passa a valer o comprimento real do carro, então dá para conferir silhueta, rodas e balanços. As imagens aparecem só no viewport (não saem no render). Na lateral, a frente do carro fica à esquerda — use Espelhar se precisar.</div>`;
  return h;
}
function carSection(o) {
  const d = CAR_DB[o.params.model];
  return `<div class="hint" style="margin-top:0">${d ? `Medidas da ficha de <b>${esc(d.name)}</b>. Edite em Parâmetros se a versão for outra.` : 'Modelo personalizado: preencha a ficha em Parâmetros, peça para a IA preencher ou trace a silhueta a partir do model sheet.'}</div>
    <div class="prow wide"><span class="lb">Outro modelo</span><input type="text" id="rcAsk" placeholder="ex.: BMW M3 G80 2024" value="${esc(o.params.model === 'custom' ? o.params.modelName || '' : '')}"></div>
    <div class="btnrow"><button data-rc="ask" ${sampleNS ? '' : 'disabled'}>✨ Preencher ficha com IA</button></div>
    <div class="hint">A IA preenche pela base de conhecimento dela, sem acesso à web daqui — confira com a ficha oficial ou o model sheet. Fontes da biblioteca: ${CAR_SOURCES}</div>`;
}
// imagem → dataURL reduzida
function fileToDataURL(file, max = 1800) { return new Promise((res, rej) => { const img = new Image(); img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res({ src: c.toDataURL('image/jpeg', 0.88), w: c.width, h: c.height }); URL.revokeObjectURL(img.src); }; img.onerror = rej; img.src = URL.createObjectURL(file); }); }
function croppedBlob(R) { return new Promise((res) => { const img = new Image(); img.onload = () => { const [l, t, r, b] = R.crop || [0, 0, 1, 1]; const c = document.createElement('canvas'); c.width = Math.round(img.width * (r - l)); c.height = Math.round(img.height * (b - t)); const x = c.getContext('2d'); if (R.flip) { x.translate(c.width, 0); x.scale(-1, 1); } x.drawImage(img, img.width * l, img.height * t, c.width, c.height, 0, 0, c.width, c.height); c.toBlob(res, 'image/png'); }; img.src = R.src; }); }
const refFile = document.createElement('input'); refFile.type = 'file'; refFile.accept = 'image/*'; refFile.style.display = 'none'; document.body.appendChild(refFile);
refFile.onchange = async () => {
  const f = refFile.files[0]; refFile.value = ''; const o = sel && getObj(sel); if (!f || !o) return;
  try { const { src, w, h } = await fileToDataURL(f); const d = objDims(o); o.refs = o.refs || {}; o.refs[refView] = { src, w, h, crop: [0, 0, 1, 1], len: refView === 'side' || refView === 'top' ? d.L : d.W, dx: 0, dy: 0, opacity: 0.55, flip: false, rot: 0 }; _refImgSize.set(src, [w, h]); buildRuntime(o); attachGizmo(); commit(); renderInspector(); toast('Referência carregada — recorte a vista e ajuste'); } catch (e) { toast('Não consegui ler a imagem'); }
};
function initRealcarUI() {
insp.addEventListener('click', async e => {
  const o = sel && getObj(sel); if (!o) return; const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.rv) { refView = b.dataset.rv; renderInspector(); return; }
  const R = o.refs && o.refs[refView];
  if (b.dataset.ref === 'load') { refFile.click(); return; }
  if (b.dataset.ref === 'del') { delete o.refs[refView]; buildRuntime(o); attachGizmo(); commit(); renderInspector(); return; }
  if (b.dataset.ref === 'flip' && R) { R.flip = !R.flip; buildRuntime(o); attachGizmo(); commit(); renderInspector(); return; }
  if (b.dataset.ref === 'rot' && R) { R.rot = ((R.rot || 0) + 90) % 360; buildRuntime(o); attachGizmo(); commit(); return; }
  if (b.dataset.ref === 'fit' && R) { const d = objDims(o); R.len = refView === 'side' || refView === 'top' ? d.L : d.W; R.dx = 0; R.dy = 0; buildRuntime(o); attachGizmo(); commit(); renderInspector(); return; }
  if (b.dataset.ref === 'trace' && R) { traceSilhouette(o, R, b); return; }
  if (b.dataset.rc === 'ask') { askCarSpecs(o, b); return; }
});
insp.addEventListener('change', e => {
  const o = sel && getObj(sel); if (!o) return; const t = e.target; const R = o.refs && o.refs[refView];
  if (t.dataset.refp && R) { R[t.dataset.refp] = +t.value; buildRuntime(o); attachGizmo(); commit(); return; }
  if (t.dataset.refc && R) { const c = (R.crop || [0, 0, 1, 1]).slice(); c[+t.dataset.refc] = clamp(+t.value / 100, 0, 1); if (c[2] - c[0] > 0.01 && c[3] - c[1] > 0.01) { R.crop = c; buildRuntime(o); attachGizmo(); commit(); } return; }
  if (t.dataset.par === 'model' && o.type === 'realcar') { applyCarModel(o, t.value); buildRuntime(o); attachGizmo(); bump(); commit(); renderInspector(); renderOutliner(); e.stopImmediatePropagation(); return; }
}, true);
}

async function askCarSpecs(o, btn) {
  const name = ($('#rcAsk').value || '').trim(); if (!name) return toast('Escreva o nome do modelo');
  btn.disabled = true; btn.textContent = 'Consultando…';
  try {
    const d = await sampleNS.json(`Give the official exterior dimensions of this car: "${name}". Use the manufacturer spec sheet values you know (most common current version if the year is not given). Reply with ONLY JSON:
{"name":"full model name and generation","body":"coupe|fastback|sedan|hatch|suv|boxy|pickup","L":4.519,"W":1.852,"H":1.298,"wb":2.450,"fo":0.84,"tf":1.591,"tr":1.557,"clr":0.118,"tireF":"235/40R19","tireR":"295/35R20","confidence":"high|medium|low","note":"short note in Portuguese about version/assumptions"}
Units meters. W is width WITHOUT mirrors. fo = front overhang (front bumper to front axle). tf/tr = front/rear track. clr = ground clearance.`, { modelTier: 'default' });
    const num = (v, a, b2, dv) => { v = +v; return isFinite(v) && v >= a && v <= b2 ? v : dv; };
    const cur = o.params;
    Object.assign(o.params, { model: 'custom', modelName: String(d.name || name).slice(0, 60), body: BODY_TPL[d.body] ? d.body : cur.body, length: num(d.L, 2.5, 7, cur.length), width: num(d.W, 1.4, 2.6, cur.width), height: num(d.H, 1, 2.6, cur.height), wheelbase: num(d.wb, 1.8, 4.5, cur.wheelbase), foverhang: num(d.fo, .3, 1.6, cur.foverhang), trackF: num(d.tf, 1.2, 2.2, cur.trackF), trackR: num(d.tr, 1.2, 2.2, cur.trackR), clearance: num(d.clr, .05, .5, cur.clearance), tireF: /\d{3}\/\d{2}/.test(d.tireF) ? d.tireF : cur.tireF, tireR: /\d{3}\/\d{2}/.test(d.tireR) ? d.tireR : cur.tireR });
    o.name = o.params.modelName; buildRuntime(o); attachGizmo(); bump(); commit(); renderInspector(); renderOutliner();
    toast(`Ficha preenchida (${d.confidence || '?'}): ${d.note || ''}`, 6000);
  } catch (err) { toast(err && err.code === 'not_granted' ? 'Uso do Claude não autorizado' : 'Não consegui obter a ficha'); btn.disabled = false; btn.textContent = '✨ Preencher ficha com IA'; }
}
async function traceSilhouette(o, R, btn) {
  btn.disabled = true; btn.textContent = 'Traçando… (até ~1 min)';
  try {
    const blob = await croppedBlob(R);
    const d = await sampleNS.json(`The image is a SIDE-VIEW model sheet / blueprint (or side photo) of a car, already cropped to the side view. Trace it precisely. Coordinates are normalized to the image: x 0=left … 1=right, y 0=top … 1=bottom.
Reply with ONLY JSON:
{"front_side":"left|right",          // which side of the image the car's FRONT bumper is on
 "rear_bumper_x":0.02, "front_bumper_x":0.98, "ground_y":0.9, "roof_y":0.12,
 "rear_wheel":{"x":0.2,"y":0.78,"r":0.11}, "front_wheel":{"x":0.8,"y":0.78,"r":0.11},
 "silhouette":[[x,y],...],   // OUTER top/side outline of the body from the REAR bumper's lowest point, up over the trunk/roof/hood, to the FRONT bumper's lowest point. 30-45 points, follow every corner (spoiler, rear window, roof, windshield, hood, nose). Do not include the underbody or wheels.
 "windows":[[x,y],...]       // the side window glass area (DLO) as one closed polygon, 8-16 points
}`, { images: [blob], modelTier: 'default' });
    const flip = d.front_side === 'left';
    const X = (x) => flip ? 1 - x : x;
    let xr = X(+d.rear_bumper_x), xf = X(+d.front_bumper_x); if (xr > xf) [xr, xf] = [xf, xr];
    const gy = +d.ground_y, ty = +d.roof_y, U = x => clamp((X(x) - xr) / (xf - xr), 0, 1), Yf = y => clamp((gy - y) / (gy - ty), 0, 1.05);
    let sil = (d.silhouette || []).map(([x, y]) => [U(x), Yf(y)]); if (!sil.length) throw new Error('sem silhueta');
    if (sil[0][0] > sil[sil.length - 1][0]) sil.reverse();
    sil[0][1] = 'B'; sil[sil.length - 1][1] = 'B';
    const win = (d.windows || []).map(([x, y]) => [U(x), Yf(y)]);
    const ar = U(+d.rear_wheel.x), af = U(+d.front_wheel.x);
    const prof = { a_r: Math.min(ar, af), a_f: Math.max(ar, af), lower: sil, glass: win.length > 2 ? win : null };
    // medidas derivadas da imagem (usadas só se o modelo for personalizado)
    const Lpx = Math.abs(xf - xr), scale = o.params.length / Lpx;
    Object.assign(o.params, { body: 'traced', profile: JSON.stringify(prof) });
    if (o.params.model === 'custom') { o.params.wheelbase = +(Math.abs(X(d.front_wheel.x) - X(d.rear_wheel.x)) * scale).toFixed(3); o.params.foverhang = +((1 - prof.a_f) * o.params.length).toFixed(3); }
    buildRuntime(o); attachGizmo(); bump(); commit(); renderInspector();
    toast('Silhueta traçada a partir do model sheet — confira sobre a imagem de referência', 5000);
  } catch (err) { console.error(err); toast(err && err.code === 'not_granted' ? 'Uso do Claude não autorizado' : 'Não consegui traçar: ' + (err.message || err.code || 'erro')); btn.disabled = false; btn.textContent = '✨ Traçar silhueta com IA'; }
}

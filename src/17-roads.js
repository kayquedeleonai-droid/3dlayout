/* ============================================================
   ESTRADA COM CURVAS, SUBIDAS E DESCIDAS (spline editável)
   o.params.pts = [[x, y, z], ...] no espaço local da estrada (y = altura).
   Carros, pessoas e animais seguem a altura e a inclinação da pista.
   ============================================================ */
const ROAD_PRESETS = {
  straight: { lb: 'Reta', ic: '➖', pts: [[0, 0, -100], [0, 0, 100]] },
  curve: { lb: 'Curva 90°', ic: '↪️', pts: [[0, 0, -80], [0, 0, -10], [12, 0, 22], [45, 0, 35], [110, 0, 35]] },
  s: { lb: 'Curva em S', ic: '〰️', pts: [[0, 0, -110], [0, 0, -60], [22, 0, -20], [22, 0, 20], [0, 0, 60], [0, 0, 110]] },
  hill: { noBridge: true, lb: 'Subida e descida', ic: '⛰️', pts: [[0, 0, -120], [0, 0, -70], [0, 7, -25], [0, 9, 0], [0, 7, 25], [0, 0, 70], [0, 0, 120]] },
  climb: { noBridge: true, lb: 'Rampa de subida', ic: '📈', pts: [[0, 0, -100], [0, 0, -50], [0, 5, 0], [0, 13, 50], [0, 18, 100]] },
  serra: { noBridge: true, lb: 'Serra (zigue-zague)', ic: '🏔️', pts: [[0, 0, -70], [0, 2, -20], [6, 4, 10], [30, 7, 18], [55, 10, 8], [62, 12, -18], [50, 14, -40], [22, 16, -48], [0, 18, -46], [-15, 20, -30]] },
  overpass: { lb: 'Viaduto', ic: '🌉', pts: [[0, 0, -150], [0, 0, -90], [0, 4, -50], [0, 8, -15], [0, 8, 15], [0, 4, 50], [0, 0, 90], [0, 0, 150]] },
  loop: { lb: 'Circuito fechado', ic: '⭕', closed: true, pts: [[0, 0, -60], [45, 0, -45], [60, 0, 0], [45, 0, 45], [0, 0, 60], [-45, 0, 45], [-60, 0, 0], [-45, 0, -45]] },
};
def('roadpath', {
  cat: 'Cenário', label: 'Estrada com curvas', icon: '🛣️',
  params: [P('lanes', 'Faixas', 'int', 2, { min: 1, max: 8, step: 1 }), P('laneW', 'Largura da faixa (m)', 'num', 3.5, { min: 2.5, max: 4.5, step: .1 }), P('shoulder', 'Acostamento (m)', 'num', 2.5, { min: 0, max: 4, step: .1 }),
    P('sidewalk', 'Calçada', 'bool', false), P('guard', 'Guard-rail', 'bool', false), P('center', 'Linha central', 'select', 'double', { opts: [['double', 'Dupla amarela'], ['dash', 'Tracejada'], ['none', 'Nenhuma']] }),
    P('closed', 'Fechada (circuito)', 'bool', false), P('bridge', 'Pilares acima de 3 m', 'bool', true), P('asphalt', 'Asfalto', 'color', '#3a3c40')],
  build(p) { const g = new THREE.Group(); buildRoadPath(p, g); return g; },
});
function roadPts(p) { return Array.isArray(p.pts) && p.pts.length >= 2 ? p.pts : ROAD_PRESETS.s.pts; }
function roadCurve(p) { const c = new THREE.CatmullRomCurve3(roadPts(p).map(a => new THREE.Vector3(a[0], a[1], a[2])), !!p.closed, 'centripetal'); return c; }
function roadDims(p) { const hw = p.lanes * p.laneW / 2, E = hw + (+p.shoulder || 0) + (p.sidewalk ? 3 : 0); return { hw, E }; }
// amostra a spline a cada ~1 m: posição, direção, vetor lateral, distância acumulada
function sampleRoad(p) {
  const c = roadCurve(p), len = c.getLength(), n = clamp(Math.ceil(len / 1.0), 8, 3000), S = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, pt = c.getPointAt(u), t = c.getTangentAt(u), hl = Math.hypot(t.x, t.z) || 1;
    S.push({ x: pt.x, y: pt.y, z: pt.z, tx: t.x / hl, tz: t.z / hl, rx: -t.z / hl, rz: t.x / hl, s: u * len, grade: t.y / hl });
  }
  return { S, len };
}
const _roadMats = {};
function roadMat(c, opt) { const k = c + JSON.stringify(opt || {}); return _roadMats[k] || (_roadMats[k] = M(c, Object.assign({ r: .95 }, opt || {}))); }
function buildRoadPath(p, g) {
  const { S, len } = sampleRoad(p), { hw, E } = roadDims(p), sh = +p.shoulder || 0, lift = 0.03;
  // faixa genérica: offset(i) -> [lateral, dy]; liga amostras i0..i1
  const strip = (mat, A, B, from = 0, to = S.length - 1, poly = true) => {
    if (to - from < 1) return;
    const pos = [], idx = [];
    for (let i = from; i <= to; i++) { const s = S[i], [oa, ya] = A(s, i), [ob, yb] = B(s, i); pos.push(s.x + s.rx * oa, s.y + ya, s.z + s.rz * oa, s.x + s.rx * ob, s.y + yb, s.z + s.rz * ob); }
    for (let k = 0; k < to - from; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = mesh(geo, mat, 0, 0, 0, g); m.castShadow = false; m.receiveShadow = true; if (poly) { m.material.polygonOffset = true; } return m;
  };
  const both = (mat, a, b, y = lift, from, to) => { strip(mat, () => [a, y], () => [b, y], from, to); strip(mat, () => [-b, y], () => [-a, y], from, to); };
  const dashed = (mat, a, b, y, dash = 4, gap = 12) => { let i0 = null; for (let i = 0; i < S.length; i++) { const on = (S[i].s % (dash + gap)) < dash; if (on && i0 === null) i0 = i; if ((!on || i === S.length - 1) && i0 !== null) { strip(mat, () => [a, y], () => [b, y], i0, Math.max(i0 + 1, i)); i0 = null; } } };
  const asphalt = roadMat(p.asphalt || '#3a3c40'), white = roadMat('#e8e6e1', { r: .8 }), yel = roadMat('#e0b030', { r: .8 }), shoulderM = roadMat('#55575b'), dirt = roadMat('#7b7364'), conc = roadMat('#a7a49d', { r: .9 }), curb = roadMat('#c7c4bd', { r: .9 });
  strip(asphalt, () => [-hw, lift], () => [hw, lift]);
  if (sh > 0) both(shoulderM, hw, hw + sh, lift - 0.005);
  // pintura
  both(white, hw - 0.15, hw, lift + 0.006); // linha de bordo 0,15 m (CONTRAN, ≥80 km/h) no limite da faixa de rolamento
  for (let i = 1; i < p.lanes; i++) {
    const x = -hw + i * p.laneW, center = p.lanes % 2 === 0 && i === p.lanes / 2;
    if (center && p.center === 'double') { strip(yel, () => [x - 0.21, lift + 0.006], () => [x - 0.06, lift + 0.006]); strip(yel, () => [x + 0.06, lift + 0.006], () => [x + 0.21, lift + 0.006]); } // dupla: 0,15 m cada, 0,12 m entre elas
    else if (center && p.center === 'none') { }
    else dashed(center ? yel : white, x - 0.075, x + 0.075, lift + 0.006);
  }
  if (p.lanes === 1 && p.center !== 'none') dashed(yel, -0.06, 0.06, lift + 0.006);
  // calçada com meio-fio
  const E0 = hw + sh;
  if (p.sidewalk) { both(curb, E0, E0 + 0.2, lift + 0.15); both(conc, E0 + 0.2, E, lift + 0.15); strip(curb, () => [E0, lift], () => [E0, lift + 0.15]); strip(curb, () => [-E0, lift + 0.15], () => [-E0, lift]); }
  // talude / aterro até o chão (ou parede lateral do viaduto)
  const isBridge = (s) => p.bridge && s.y > 3;
  const skirtW = (s) => isBridge(s) ? 0 : Math.abs(s.y) * 1.6 + (Math.abs(s.y) > 0.05 ? 0.6 : 0);
  if (S.some(s => Math.abs(s.y) > 0.05)) {
    const yTop = p.sidewalk ? lift + 0.15 : lift;
    const k1 = strip(dirt, (s) => [E, yTop], (s) => [E + skirtW(s), isBridge(s) ? yTop - 0.9 : -s.y + 0.005]);
    const k2 = strip(dirt, (s) => [-E - skirtW(s), isBridge(s) ? yTop - 0.9 : -s.y + 0.005], (s) => [-E, yTop]); if (k1) k1.userData.skirt = true; if (k2) k2.userData.skirt = true;
    // laje do viaduto vista de baixo
    let i0 = null; for (let i = 0; i < S.length; i++) { const b = isBridge(S[i]); if (b && i0 === null) i0 = i; if ((!b || i === S.length - 1) && i0 !== null) { strip(conc, () => [E, -0.9], () => [-E, -0.9], i0, Math.max(i0 + 1, i)); i0 = null; } }
    // pilares
    const pm = roadMat('#9a978f', { r: .9 }); let next = 0;
    for (const s of S) if (isBridge(s) && s.s >= next) { next = s.s + 24; const ph = s.y - 0.9; for (const sx of p.lanes > 2 ? [-1, 1] : [0]) cyl(0.6, 0.6, ph, pm, s.x + s.rx * sx * hw * 0.5, ph / 2, s.z + s.rz * sx * hw * 0.5, g, 12); box(E * 2, 0.6, 1.4, pm, s.x, s.y - 1.2, s.z, g).rotation.y = Math.atan2(s.tx, s.tz); }
  }
  // guard-rail (automático nos viadutos)
  const guardAll = p.guard, yG = p.sidewalk ? lift + 0.15 : lift;
  if (guardAll || (p.bridge && S.some(isBridge))) {
    const gm = roadMat('#b9bcc0', { r: .4, m: .6 }), off = E - 0.25;
    const want = (s) => guardAll || isBridge(s);
    let i0 = null; for (let i = 0; i < S.length; i++) { const w = want(S[i]); if (w && i0 === null) i0 = i; if ((!w || i === S.length - 1) && i0 !== null) { const a = i0, b = Math.max(i0 + 1, i); strip(gm, () => [off, yG + 0.5], () => [off, yG + 0.8], a, b, false); strip(gm, () => [-off, yG + 0.8], () => [-off, yG + 0.5], a, b, false); strip(gm, () => [off, yG + 0.8], () => [off, yG + 0.5], a, b, false); strip(gm, () => [-off, yG + 0.5], () => [-off, yG + 0.8], a, b, false); i0 = null; } }
    let nx = 0; for (const s of S) if (want(s) && s.s >= nx) { nx = s.s + 4; for (const sx of [-1, 1]) box(0.1, 0.8, 0.1, gm, s.x + s.rx * sx * (off + 0.05), s.y + yG + 0.4, s.z + s.rz * sx * (off + 0.05), g); }
  }
  g.userData.road = { S, len, hw, E, bridgeH: p.bridge ? 3 : 1e9 };
  return g;
}
/* ---------- altura do terreno (estradas) ---------- */
let _groundTick = 0; const _roadWorld = new Map();
function roadsWorld() {
  const out = [];
  for (const o of project.objects) {
    if (o.type !== 'roadpath' || o.hidden) continue; const r = rt.get(o.id); if (!r || !r.g.userData.road) continue;
    let c = _roadWorld.get(o.id);
    r.g.updateMatrixWorld(true); const m = r.g.matrixWorld, R0 = r.g.userData.road, key = m.elements.join(',') + '|' + R0.len + '|' + R0.hw + '|' + R0.E + '|' + R0.S.length + '|' + R0.S[R0.S.length >> 1].y;
    if (!c || c.key !== key) {
      const R = r.g.userData.road, v = new THREE.Vector3(), d = new THREE.Vector3(), q = new THREE.Quaternion(); r.g.getWorldQuaternion(q); const sc = r.g.getWorldScale(new THREE.Vector3());
      const S = R.S.map(s => { v.set(s.x, s.y, s.z).applyMatrix4(m); d.set(s.rx, 0, s.rz).applyQuaternion(q); return { x: v.x, y: v.y, z: v.z, rx: d.x, rz: d.z }; });
      c = { key, S, hw: R.hw * sc.x, E: R.E * sc.x, bridgeH: R.bridgeH }; _roadWorld.set(o.id, c);
    }
    out.push(c);
  }
  return out;
}
let _roadsFrame = null;
function groundAt(x, z, prevH) {
  if (!_roadsFrame || _roadsFrame.t !== _groundTick) _roadsFrame = { t: _groundTick, list: roadsWorld() };
  let best = null, bestD = 1e9;
  for (const R of _roadsFrame.list) {
    const S = R.S; let bi = -1, bd = 1e18;
    for (let i = 0; i < S.length; i += 4) { const dx = x - S[i].x, dz = z - S[i].z, dd = dx * dx + dz * dz; if (dd < bd) { bd = dd; bi = i; } }
    for (let i = Math.max(0, bi - 4); i <= Math.min(S.length - 1, bi + 4); i++) { const dx = x - S[i].x, dz = z - S[i].z, dd = dx * dx + dz * dz; if (dd < bd) { bd = dd; bi = i; } }
    // interpola entre amostras vizinhas (altura contínua, sem degraus)
    const s0 = S[bi]; let s = s0;
    for (const j of [bi + 1, bi - 1]) { const n = S[j]; if (!n) continue; const ex = n.x - s0.x, ez = n.z - s0.z, L2 = ex * ex + ez * ez; if (L2 < 1e-9) continue; const u = ((x - s0.x) * ex + (z - s0.z) * ez) / L2; if (u >= 0 && u <= 1) { s = { x: s0.x + ex * u, z: s0.z + ez * u, y: s0.y + (n.y - s0.y) * u, rx: s0.rx, rz: s0.rz }; break; } }
    const lat = Math.abs((x - s.x) * s.rx + (z - s.z) * s.rz);
    const reach = R.E + Math.abs(s.y) * 1.6 + 0.6; if (lat > reach) continue;
    let h;
    if (lat <= R.E) h = s.y; else if (s.y > R.bridgeH || _hasTerrain) continue; else h = lerp(s.y, 0, (lat - R.E) / Math.max(0.01, reach - R.E));
    if (lat < bestD) { bestD = lat; best = h; }
  }
  if (best == null && _hasTerrain) return terrainAt(x, z);
  return best;
}
let _hasTerrain = false;
function hasRoadRelief() { _hasTerrain = project.objects.some(o => o.type === 'terrain' && !o.hidden); return _hasTerrain || project.objects.some(o => o.type === 'roadpath' && !o.hidden && roadPts(o.params).some(p => Math.abs(p[1]) > 0.01)); }
function followsGround(o) {
  if (o.cons && o.cons.ground === false) return false;
  const pl = ASSETS[o.type] && ASSETS[o.type].pilot; return pl === 'car' || pl === 'walker' || isQuadType(o.type);
}
/* ---------- edição: alças no viewport ---------- */
const roadHandles = new THREE.Group(); roadHandles.renderOrder = 10; scene.add(roadHandles); sceneHelpers.push(roadHandles);
const _hMat = new THREE.MeshBasicMaterial({ color: '#ffb02e', depthTest: false, transparent: true, opacity: .95 }), _hMatSel = new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false });
const _hGeo = new THREE.SphereGeometry(1, 16, 10);
let roadDrag = null, roadSelPt = -1;
function updateRoadHandles() {
  roadHandles.clear(); roadHandles.userData.road = null;
  const o = sel && getObj(sel); if (!o || o.type !== 'roadpath') return;
  const r = rt.get(o.id); if (!r) return; r.g.updateMatrixWorld(true);
  const pts = roadPts(o.params), v = new THREE.Vector3(), line = []; roadHandles.userData.road = o.id; syncRoadHandles();
  pts.forEach((p, i) => {
    v.set(p[0], p[1], p[2]);
    const h = new THREE.Mesh(_hGeo, i === roadSelPt ? _hMatSel : _hMat); h.position.copy(v); h.scale.setScalar(0.9); h.userData.roadPt = i; h.renderOrder = 11; roadHandles.add(h);
    if (Math.abs(p[1]) > 0.05) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, Math.abs(p[1]), 6), _hMat); st.position.set(v.x, v.y - p[1] / 2, v.z); roadHandles.add(st); }
    line.push(v.clone().setY(v.y + 0.3));
  });
  if (o.params.closed && line.length > 2) line.push(line[0]);
  const lg = new THREE.BufferGeometry().setFromPoints(line); const ln = new THREE.Line(lg, new THREE.LineDashedMaterial({ color: '#ffb02e', dashSize: 1.5, gapSize: 1, depthTest: false })); ln.computeLineDistances(); roadHandles.add(ln);
}
function syncRoadHandles() { const id = roadHandles.userData.road, r = id && rt.get(id); if (!r || !roadHandles.children.length && !roadHandles.userData.road) return; roadHandles.position.copy(r.g.position); roadHandles.quaternion.copy(r.g.quaternion); roadHandles.scale.copy(r.g.scale); roadHandles.updateMatrixWorld(true); }
function roadRayNDC(e) { const rect = renderer.domElement.getBoundingClientRect(), vr = viewRect(); return { x: ((e.clientX - rect.left - vr.x) / vr.w) * 2 - 1, y: -((e.clientY - rect.top - (rect.height - vr.y - vr.h)) / vr.h) * 2 + 1 }; }
const _rRay = new THREE.Raycaster(), _rPlane = new THREE.Plane(), _rHit = new THREE.Vector3();
renderer.domElement.addEventListener('pointerdown', e => {
  const o = sel && getObj(sel); if (!o || o.type !== 'roadpath' || e.button !== 0 || pilot.on) return;
  const cam = currentViewCam(); if (!cam) return; _rRay.setFromCamera(roadRayNDC(e), cam);
  const hit = _rRay.intersectObjects(roadHandles.children.filter(c => c.userData.roadPt != null), false)[0];
  if (e.altKey && !hit) { // Alt+clique: novo ponto no fim
    _rPlane.set(new THREE.Vector3(0, 1, 0), 0); if (!_rRay.ray.intersectPlane(_rPlane, _rHit)) return;
    const r = rt.get(o.id), loc = r.g.worldToLocal(_rHit.clone()); const pts = roadPts(o.params).map(a => a.slice()); const last = pts[pts.length - 1];
    pts.push([+loc.x.toFixed(2), last[1], +loc.z.toFixed(2)]); o.params.pts = pts; roadSelPt = pts.length - 1; rebuildRoad(o, true);
    e.stopImmediatePropagation(); e.preventDefault(); return;
  }
  if (!hit) return;
  e.stopImmediatePropagation(); e.preventDefault();
  roadSelPt = hit.object.userData.roadPt; o.params.pts = roadPts(o.params).map(a => a.slice());
  roadDrag = { o, i: roadSelPt, y0: e.clientY, vert: e.shiftKey, h0: o.params.pts[roadSelPt][1] };
  orbit.enabled = false; renderer.domElement.setPointerCapture(e.pointerId); updateRoadHandles(); renderInspector();
}, { capture: true });
renderer.domElement.addEventListener('pointermove', e => {
  if (!roadDrag) return; const { o, i } = roadDrag, r = rt.get(o.id), cam = currentViewCam(); if (!r || !cam) return;
  const pt = o.params.pts[i];
  if (roadDrag.vert) { pt[1] = +(roadDrag.h0 + (roadDrag.y0 - e.clientY) * 0.08).toFixed(2); }
  else {
    _rRay.setFromCamera(roadRayNDC(e), cam); const wp = new THREE.Vector3(pt[0], pt[1], pt[2]).applyMatrix4(r.g.matrixWorld);
    _rPlane.set(new THREE.Vector3(0, 1, 0), -wp.y); if (!_rRay.ray.intersectPlane(_rPlane, _rHit)) return;
    const loc = r.g.worldToLocal(_rHit.clone()); pt[0] = +loc.x.toFixed(2); pt[2] = +loc.z.toFixed(2);
  }
  rebuildRoad(o, false);
}, { capture: true });
renderer.domElement.addEventListener('pointerup', e => { if (!roadDrag) return; conformAllTerrain(); roadDrag = null; orbit.enabled = true; downPt = null; commit(); renderInspector(); }, { capture: true });
function rebuildRoad(o, doCommit) { _skipConform = !doCommit; buildRuntime(o); _skipConform = false; _roadWorld.delete(o.id); _groundTick++; updateRoadHandles(); bump(); if (doCommit) { commit(); renderInspector(); } }
/* ---------- inspector ---------- */
function roadSectionHTML(o) {
  const pts = roadPts(o.params), { S, len } = sampleRoad(o.params);
  let maxG = 0; for (const s of S) maxG = Math.max(maxG, Math.abs(s.grade));
  const ys = S.map(s => s.y);
  let h = `<div class="hint" style="margin-top:0">Comprimento <b>${len.toFixed(0)} m</b> · desnível <b>${(Math.max(...ys) - Math.min(...ys)).toFixed(1)} m</b> · rampa máx. <b>${(maxG * 100).toFixed(0)}%</b></div>`;
  h += `<div class="chips" style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0">${Object.entries(ROAD_PRESETS).map(([k, v]) => `<button class="chip" data-rpre="${k}">${v.ic} ${v.lb}</button>`).join('')}</div>`;
  h += `<div class="hint">Arraste as bolinhas laranja no viewport para fazer curvas. <b>Shift + arrastar</b> sobe/desce o ponto (rampa). <b>Alt + clique</b> no chão adiciona um ponto no fim.</div>`;
  h += `<table class="rpt" style="width:100%;border-collapse:collapse;font-size:11px;margin:4px 0"><tr style="color:var(--tx3)"><td>#</td><td>X</td><td>Z</td><td>Altura</td><td></td></tr>` +
    pts.map((p, i) => `<tr style="${i === roadSelPt ? 'background:rgba(255,176,46,.12)' : ''}"><td>${i + 1}</td>${[0, 2, 1].map(k => `<td><input type="number" step="${k === 1 ? 0.5 : 1}" data-rp="${i}:${k}" value="${p[k]}" style="width:100%"></td>`).join('')}<td><button class="ghost" data-rdel="${i}" title="Remover ponto" ${pts.length <= 2 ? 'disabled' : ''}>✕</button></td></tr>`).join('') + `</table>`;
  h += `<div class="btnrow"><button data-radd="1">＋ Ponto no fim</button><button data-radd="mid">＋ Ponto no meio</button><button data-rflat="1">Nivelar tudo</button></div>`;
  const vehs = project.objects.filter(x => followsGround(x));
  h += `<div class="ph" style="margin:10px 0 4px;padding:0">🚗 Animar ao longo da estrada</div>
    <div class="prow wide"><span class="lb">Objeto</span><select id="rfObj">${vehs.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('') || '<option value="">— adicione um carro/pessoa —</option>'}</select></div>
    <div class="prow wide"><span class="lb">Velocidade (km/h)</span><input type="number" id="rfSpd" value="60" step="5" min="1"></div>
    <div class="prow wide"><span class="lb">Faixa</span><select id="rfLane">${Array.from({ length: o.params.lanes }, (_, i) => `<option value="${i}" ${i === o.params.lanes - 1 ? 'selected' : ''}>${i + 1}ª ${i === o.params.lanes - 1 ? '(direita)' : i === 0 ? '(esquerda)' : ''}</option>`).join('')}<option value="c">Centro</option></select></div>
    <div class="prow wide"><span class="lb">Sentido</span><select id="rfDir"><option value="1">Do 1º ao último ponto</option><option value="-1">Contrário</option></select></div>
    <div class="prow wide"><span class="lb">Começar em (%)</span><input type="number" id="rfStart" value="0" min="0" max="100" step="5"></div>
    <div class="btnrow"><button class="pri" data-rfollow="1">▶ Gerar movimento a partir do frame atual</button></div>
    <div class="hint">Cria keyframes de posição e direção na velocidade escolhida; a altura e a inclinação vêm da estrada automaticamente.</div>`;
  return h;
}
function roadFollow(road, obj, kmh, lane, dir, startPct, fStart, silent) {
  const r = rt.get(road.id); if (!r || !obj) return; r.g.updateMatrixWorld(true);
  const { S, len } = sampleRoad(road.params), { hw } = roadDims(road.params), lw = road.params.laneW;
  const lat = lane === 'c' ? 0 : (-hw + lw * (+lane + 0.5)) * (dir > 0 ? 1 : -1);
  const v = kmh / 3.6, fps = project.fps, f0 = fStart ?? curFrame; let s = len * clamp(startPct / 100, 0, 1);
  const maxF = project.duration; const out = { px: [], pz: [], ry: [] }; const m = r.g.matrixWorld, q = r.g.getWorldQuaternion(new THREE.Quaternion());
  const at = (sv) => { const u = clamp(sv / len, 0, 1) * (S.length - 1), i = Math.min(S.length - 2, Math.floor(u)), t = u - i, a = S[i], b = S[i + 1]; return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t), tx: lerp(a.tx, b.tx, t), tz: lerp(a.tz, b.tz, t), rx: lerp(a.rx, b.rx, t), rz: lerp(a.rz, b.rz, t) }; };
  let prevYaw = null; const P2 = new THREE.Vector3(), D2 = new THREE.Vector3();
  for (let f = f0; f <= maxF; f++) {
    const c = at(s); P2.set(c.x + c.rx * lat, c.y, c.z + c.rz * lat).applyMatrix4(m); D2.set(c.tx * dir, 0, c.tz * dir).applyQuaternion(q);
    let yaw = Math.atan2(D2.x, D2.z) / DEG; if (prevYaw != null) { while (yaw - prevYaw > 180) yaw -= 360; while (yaw - prevYaw < -180) yaw += 360; } prevYaw = yaw;
    out.px.push({ f, v: P2.x }); out.pz.push({ f, v: P2.z }); out.ry.push({ f, v: yaw });
    s += dir * v / fps; if (!road.params.closed && (s < 0 || s > len)) break; if (road.params.closed) s = ((s % len) + len) % len;
  }
  if (out.px.length < 2) return silent ? null : toast('Sem espaço: mude o começo ou o sentido');
  writeSamples(obj, 'px', out.px, 'simplify', 0.01); writeSamples(obj, 'pz', out.pz, 'simplify', 0.01); writeSamples(obj, 'ry', out.ry, 'simplify', 0.08);
  if (obj.tracks.py && obj.tracks.py.length) { /* mantém */ } else obj.base.py = 0;
  if (silent) return; commit(); tlDirty = true; pathVer = -1; bump(); toast(`${obj.name} anda pela estrada: frames ${f0}–${out.px[out.px.length - 1].f}`);
}
function initRoadUI() {
  insp.addEventListener('change', e => { const o = sel && getObj(sel); if (o && e.target.id === 'consGround') { o.cons.ground = e.target.checked ? undefined : false; bump(); commit(); } if (o && e.target.id === 'camHid') { o.camHidden = e.target.checked || undefined; bump(); commit(); } if (o && e.target.id === 'frameSel') { const [x, y] = e.target.value.split(',').map(Number); o.cons.frameX = x; o.cons.frameY = y; if (!o.cons.aim) toast('O enquadramento nos terços funciona quando a câmera mira um objeto (Mirar em)'); bump(); commit(); } });
  insp.addEventListener('click', e => {
    const o = sel && getObj(sel), b = e.target.closest('button'); if (!o || !b || o.type !== 'roadpath') return;
    if (b.dataset.rpre) { const pr = ROAD_PRESETS[b.dataset.rpre]; o.params.pts = pr.pts.map(a => a.slice()); o.params.closed = !!pr.closed; o.params.bridge = !pr.noBridge; roadSelPt = -1; rebuildRoad(o, true); }
    if (b.dataset.rdel != null) { const pts = roadPts(o.params).map(a => a.slice()); pts.splice(+b.dataset.rdel, 1); o.params.pts = pts; roadSelPt = -1; rebuildRoad(o, true); }
    if (b.dataset.radd) {
      const pts = roadPts(o.params).map(a => a.slice());
      if (b.dataset.radd === 'mid') { const i = roadSelPt > 0 ? roadSelPt : Math.floor(pts.length / 2); const a = pts[i - 1], c = pts[i]; pts.splice(i, 0, [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2].map(v => +v.toFixed(2))); roadSelPt = i; }
      else { const a = pts[pts.length - 2], c = pts[pts.length - 1], dx = c[0] - a[0], dz = c[2] - a[2], l = Math.hypot(dx, dz) || 1; pts.push([+(c[0] + dx / l * 40).toFixed(2), c[1], +(c[2] + dz / l * 40).toFixed(2)]); roadSelPt = pts.length - 1; }
      o.params.pts = pts; rebuildRoad(o, true);
    }
    if (b.dataset.rflat) { o.params.pts = roadPts(o.params).map(a => [a[0], 0, a[2]]); rebuildRoad(o, true); }
    if (b.dataset.rfollow) roadFollow(o, getObj($('#rfObj').value), +$('#rfSpd').value || 60, $('#rfLane').value, +$('#rfDir').value, +$('#rfStart').value || 0);
  });
  insp.addEventListener('change', e => {
    const o = sel && getObj(sel), t = e.target; if (!o || o.type !== 'roadpath' || !t.dataset.rp) return;
    const [i, k] = t.dataset.rp.split(':').map(Number); o.params.pts = roadPts(o.params).map(a => a.slice()); o.params.pts[i][k] = +t.value || 0; roadSelPt = i; rebuildRoad(o, true);
  });
}

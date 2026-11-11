/* ============================================================
   CINEMATOGRAFIA: corpos de câmera (sensor real), kits de lentes, anamórfico,
   profundidade de campo, guias de composição, rigs (montagem em veículo)
   Sensores: fichas ARRI / Sony / DJI / locadoras (nov/2026). Focais: catálogos dos fabricantes.
   ============================================================ */
const CAMERA_BODIES = {
  ff: { lb: 'Full frame genérico', w: 36, h: 24, g: 'Genérico' },
  alexa35: { lb: 'ARRI ALEXA 35 · 4.6K Open Gate (S35)', w: 27.99, h: 19.22, g: 'ARRI' },
  minilf: { lb: 'ARRI ALEXA Mini LF · 4.5K Open Gate', w: 36.70, h: 25.54, g: 'ARRI' },
  alexa65: { lb: 'ARRI ALEXA 65 · 6.5K Open Gate', w: 54.12, h: 25.59, g: 'ARRI' },
  alexamini: { lb: 'ARRI ALEXA Mini · 3.4K Open Gate (S35)', w: 28.25, h: 18.17, g: 'ARRI' },
  venice2: { lb: 'Sony VENICE 2 · 8.6K 3:2 Full Frame', w: 35.9, h: 24.0, g: 'Sony' },
  venice2ana: { lb: 'Sony VENICE 2 · 5.8K 4:3 S35 (anamórfico)', w: 24.1, h: 17.8, g: 'Sony' },
  fx6: { lb: 'Sony FX6 · Full Frame 16:9', w: 35.7, h: 18.8, g: 'Sony' },
  fx3: { lb: 'Sony FX3 · Full Frame', w: 35.6, h: 23.8, g: 'Sony' },
  vraptor: { lb: 'RED V-RAPTOR 8K VV', w: 40.96, h: 21.60, g: 'RED' },
  komodo: { lb: 'RED KOMODO 6K S35', w: 27.03, h: 14.26, g: 'RED' },
  dxl2: { lb: 'Panavision DXL2 · 8K VV', w: 40.96, h: 21.60, g: 'Panavision' },
  c70: { lb: 'Canon EOS C70 / C300 III · S35', w: 26.2, h: 13.8, g: 'Canon' },
  bmpcc6k: { lb: 'Blackmagic Pocket 6K · S35', w: 23.10, h: 12.99, g: 'Blackmagic' },
  inspire3: { lb: 'DJI Inspire 3 · Zenmuse X9-8K Air (FF)', w: 35.9, h: 23.9, g: 'Drone' },
  m43: { lb: 'Micro 4/3 (Mavic 3, GH)', w: 17.3, h: 13.0, g: 'Drone' },
  s35: { lb: 'Super 35 genérico (4-perf)', w: 24.89, h: 18.66, g: 'Genérico' },
  phone: { lb: 'Smartphone (focais equivalentes FF)', w: 36, h: 24, g: 'Genérico' },
  custom: { lb: 'Personalizado', w: 36, h: 24, g: 'Genérico' },
};
// d: distorção (barril +), v: vinheta 0..1, ca: aberração cromática, ov: bokeh oval (anamórfico)
const LENS_SETS = {
  generic: { lb: 'Genérico', f: [14, 18, 24, 35, 50, 85, 135], t: 2.8, d: .05, v: .2, ca: .2, g: 'Esféricas' },
  signature: { lb: 'ARRI Signature Prime', f: [12, 15, 18, 21, 25, 29, 35, 40, 47, 58, 75, 95, 125, 150, 200, 280], t: 1.8, d: .02, v: .15, ca: .1, g: 'Esféricas' },
  cooke: { lb: 'Cooke S4/i', f: [12, 14, 16, 18, 21, 25, 27, 32, 35, 40, 50, 65, 75, 100, 135, 150, 180, 300], t: 2.0, d: .04, v: .3, ca: .2, g: 'Esféricas' },
  supreme: { lb: 'ZEISS Supreme Prime', f: [15, 18, 21, 25, 29, 35, 40, 50, 65, 85, 100, 135, 150, 200], t: 1.5, d: .02, v: .2, ca: .1, g: 'Esféricas' },
  summilux: { lb: 'Leitz Summilux-C', f: [16, 18, 21, 25, 29, 35, 40, 50, 65, 75, 100, 135], t: 1.4, d: .03, v: .2, ca: .1, g: 'Esféricas' },
  primo70: { lb: 'Panavision Primo 70', f: [24, 27, 35, 40, 50, 65, 80, 100, 125, 150, 200, 250], t: 2.0, d: .03, v: .25, ca: .15, g: 'Esféricas' },
  cne: { lb: 'Canon CN-E Prime', f: [14, 20, 24, 35, 50, 85, 135], t: 1.5, d: .05, v: .3, ca: .25, g: 'Esféricas' },
  sigma: { lb: 'Sigma Cine FF High Speed', f: [14, 20, 24, 28, 35, 40, 50, 85, 105, 135], t: 1.5, d: .04, v: .3, ca: .2, g: 'Esféricas' },
  masterana: { lb: 'ARRI Master Anamorphic 2x', f: [28, 32, 35, 40, 50, 60, 75, 100, 135, 180], t: 1.9, sq: 2, d: .06, v: .35, ca: .2, ov: 1, g: 'Anamórficas' },
  cookeana: { lb: 'Cooke Anamorphic/i FF 1.8x', f: [32, 40, 50, 75, 100, 135, 180], t: 2.3, sq: 1.8, d: .08, v: .45, ca: .3, ov: 1, g: 'Anamórficas' },
  orion: { lb: 'Atlas Orion Anamorphic 2x', f: [25, 32, 40, 50, 65, 80, 100], t: 2.0, sq: 2, d: .1, v: .5, ca: .4, ov: 1, g: 'Anamórficas' },
  sirui: { lb: 'Sirui Anamorphic 1.33x', f: [24, 35, 50, 75], t: 2.9, sq: 1.33, d: .08, v: .45, ca: .4, ov: 1, g: 'Anamórficas' },
  optimo: { lb: 'Angénieux Optimo 24-290 (zoom)', f: [24, 35, 50, 70, 100, 135, 200, 290], t: 2.8, zoom: [24, 290], d: .04, v: .25, ca: .2, g: 'Zooms' },
  premista: { lb: 'Fujinon Premista 28-100 (zoom)', f: [28, 35, 50, 70, 100], t: 2.9, zoom: [28, 100], d: .03, v: .2, ca: .15, g: 'Zooms' },
  cabrio: { lb: 'Fujinon Cabrio 19-90 (zoom)', f: [19, 24, 35, 50, 70, 90], t: 2.9, zoom: [19, 90], d: .05, v: .25, ca: .2, g: 'Zooms' },
  dl: { lb: 'DJI DL (Inspire 3)', f: [18, 24, 35, 50, 75], t: 2.8, d: .05, v: .25, ca: .2, g: 'Drone / mobile' },
  phone: { lb: 'Smartphone (equiv. FF)', f: [13, 24, 48, 77, 120], t: 8, d: .02, v: .1, ca: .1, g: 'Drone / mobile' },
};
ASSETS.camera.params = [
  P('body', 'Corpo / sensor', 'select', 'ff', { opts: Object.entries(CAMERA_BODIES).map(([k, v]) => [k, v.lb]), grp: k => CAMERA_BODIES[k].g }),
  P('sensorW', 'Sensor larg. (mm)', 'num', 36, { min: 4, max: 70, step: .01 }), P('sensorH', 'Sensor alt. (mm)', 'num', 24, { min: 3, max: 60, step: .01 }),
  P('lensSet', 'Kit de lentes', 'select', 'generic', { opts: Object.entries(LENS_SETS).map(([k, v]) => [k, v.lb]), grp: k => LENS_SETS[k].g }),
  P('squeeze', 'Squeeze anamórfico', 'select', '1', { opts: [['1', '1x (esférica)'], ['1.33', '1.33x'], ['1.5', '1.5x'], ['1.8', '1.8x'], ['2', '2x']] }),
  P('tstop', 'Abertura (T)', 'num', 2.8, { min: 0.7, max: 32, step: .1 }),
  P('focusAuto', 'Foco no alvo da mira', 'bool', true), P('focus', 'Distância de foco (m)', 'num', 5, { min: 0.2, max: 1000, step: .1 }),
  P('lensFX', 'Efeitos de lente (DOF, distorção, vinheta)', 'bool', true),
];
function camSensor(o) { const p = (o && o.params) || {}; return { w: +p.sensorW || 36, h: +p.sensorH || 24, sq: +p.squeeze || 1 }; }
function camFocus(o, f) {
  const p = o.params || {};
  if (p.focusAuto !== false && o.cons && o.cons.aim && getObj(o.cons.aim)) { const r = rt.get(o.id); const cp = r ? r.rig.cam.getWorldPosition(new THREE.Vector3()) : worldPos(o, f, new THREE.Vector3()); const tp = worldPos(getObj(o.cons.aim), f, new THREE.Vector3()); tp.y += o.cons.aimH ?? 1; return cp.distanceTo(tp); }
  return +p.focus || 5;
}
function dofInfo(o, f) {
  const S = camSensor(o), focal = getVal(o, 'focal', f), N = +(o.params || {}).tstop || 2.8, s = camFocus(o, f) * 1000;
  const coc = Math.hypot(S.w, S.h) / 1500, Hh = focal * focal / (N * coc) + focal;
  const near = s * (Hh - focal) / (Hh + s - 2 * focal), far = s < Hh ? s * (Hh - focal) / (Hh - s) : Infinity;
  return { focus: s / 1000, near: near / 1000, far: far / 1000, hyper: Hh / 1000, N, focal, S };
}
function camDescription(o, f) {
  const p = o.params || {}, b = CAMERA_BODIES[p.body] || CAMERA_BODIES.ff, L = LENS_SETS[p.lensSet] || LENS_SETS.generic, d = dofInfo(o, f);
  return { body: b.lb, lens: `${L.lb} ${fmt(d.focal, 0)}mm T${fmt(d.N, 1)}${d.S.sq > 1 ? ' · ' + d.S.sq + 'x anamórfica' : ''}`, dof: `foco ${fmt(d.focus, 2)} m · nítido ${fmt(d.near, 2)}–${isFinite(d.far) ? fmt(d.far, 2) + ' m' : '∞'}`, d };
}
// troca de corpo / kit atualiza sensor e squeeze
function applyCamParam(o, k, v) {
  const p = o.params;
  if (k === 'body') { p.body = v; if (CAMERA_BODIES[v] && v !== 'custom') { p.sensorW = CAMERA_BODIES[v].w; p.sensorH = CAMERA_BODIES[v].h; } if (v === 'phone') applyCamParam(o, 'lensSet', 'phone'); if (v === 'inspire3') applyCamParam(o, 'lensSet', 'dl'); }
  else if (k === 'lensSet') { const L = LENS_SETS[v]; if (!L) return; p.lensSet = v; p.squeeze = String(L.sq || 1); p.tstop = L.t; const cur = getVal(o, 'focal', curFrame), near = L.zoom ? clamp(cur, L.zoom[0], L.zoom[1]) : L.f.reduce((a, b) => Math.abs(b - cur) < Math.abs(a - cur) ? b : a, L.f[0]); setChannel(o, 'focal', curFrame, near); if (L.sq && project.aspect !== '2.39:1') toast('Lente anamórfica: considere a proporção 2.39:1 (topo da tela)'); }
  else if (k === 'focal') setChannel(o, 'focal', curFrame, clamp(+v, 4, 1200));
  else if (k === 'sensorW' || k === 'sensorH') { p[k] = +v; p.body = 'custom'; }
  else if (k === 'tstop' || k === 'focus') p[k] = Math.max(0.1, +v);
  else p[k] = v;
  bump(); commit(); tlDirty = true; lensBarKey = '';
}
function initCinemaUI() {
  insp.addEventListener('change', e => {
    const o = sel && getObj(sel), t = e.target; if (!o || o.type !== 'camera' || !t.dataset.par) return;
    e.stopImmediatePropagation();
    applyCamParam(o, t.dataset.par, t.type === 'checkbox' ? t.checked : t.value); renderInspector();
  }, true);
  initLensBar();
}
function groupedOpts(list, cur, grpFn) { let h = '', g = null; for (const [k, l] of list) { const gg = grpFn(k); if (gg !== g) { if (g !== null) h += '</optgroup>'; h += `<optgroup label="${gg}">`; g = gg; } h += `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(l)}</option>`; } return h + '</optgroup>'; }
function cameraSectionHTML(o) {
  const L = LENS_SETS[o.params.lensSet] || LENS_SETS.generic, cd = camDescription(o, curFrame), p = o.params;
  const act = project.activeCamera === o.id;
  const bodyP = ASSETS.camera.params.find(x => x.k === 'body'), lensP = ASSETS.camera.params.find(x => x.k === 'lensSet');
  return `<div class="prow wide"><span class="lb">Câmera</span><select data-par="body">${groupedOpts(bodyP.opts, p.body, bodyP.grp)}</select></div>
    <div class="prow wide"><span class="lb">Kit de lentes</span><select data-par="lensSet">${groupedOpts(lensP.opts, p.lensSet, lensP.grp)}</select></div>
    <div class="prow wide"><span class="lb">T-stop</span><input type="number" data-par="tstop" value="${p.tstop}" step="0.1" min="0.7" max="32"></div>
    <div class="prow wide"><span class="lb">Foco no alvo</span><input type="checkbox" data-par="focusAuto" ${p.focusAuto !== false ? 'checked' : ''}></div>
    ${p.focusAuto === false || !o.cons.aim ? `<div class="prow wide"><span class="lb">Foco (m)</span><input type="number" data-par="focus" value="${p.focus}" step="0.1" min="0.2"></div>` : ''}
    <div class="prow wide"><span class="lb">Efeitos de lente</span><input type="checkbox" data-par="lensFX" ${p.lensFX !== false ? 'checked' : ''}></div>
    ` + grpBlock(o, 'lens') + `<div class="hint" style="margin:6px 0 2px">${L.zoom ? 'Zoom ' + L.zoom[0] + '–' + L.zoom[1] + 'mm (digite qualquer focal no campo acima)' : 'Focais do kit ' + esc(L.lb)}:</div><div class="btnrow" style="margin-top:2px">${L.f.map(f => `<button class="chip ${Math.abs(getVal(o, 'focal', curFrame) - f) < 0.5 ? 'on' : ''}" data-focal="${f}">${f}</button>`).join('')}</div>
    <div class="libhint" style="margin:10px 0 4px;line-height:1.6"><b style="color:var(--tx2)">${esc(cd.body)}</b><br>${esc(cd.lens)}<br>Sensor ${fmt(cd.d.S.w, 2)}×${fmt(cd.d.S.h, 2)} mm · ${esc(cd.dof)}</div>
    <div class="btnrow"><button data-act="active" class="${act ? 'on' : ''}">${act ? '● Câmera ativa' : 'Tornar ativa'}</button><button data-act="lookthru">◉ Olhar por ela</button><button data-act="fromview" title="Copia a vista atual do editor para esta câmera">Alinhar à vista</button><button data-act="sbadd">🎬 Plano no storyboard</button></div>`;
}

/* ---------- rig: montar a câmera em um veículo (posição e giro relativos) ---------- */
function mountYaw(t, f) { return pilot.on && pilot.id === t.id ? pilot.s.ry : getVal(t, 'ry', f) * DEG; }
function convertMount(o, newId) {
  const t = newId && getObj(newId); if (!t) return;
  const f = curFrame, tp = worldPos(t, f, new THREE.Vector3()), yaw = mountYaw(t, f), p = new THREE.Vector3(getVal(o, 'px', f), getVal(o, 'py', f), getVal(o, 'pz', f));
  const off = p.sub(tp).applyAxisAngle(UP, -yaw);
  for (const ch of ['px', 'py', 'pz']) { delete o.tracks[ch]; } o.base.px = off.x; o.base.py = off.y; o.base.pz = off.z;
  if (!o.cons.aim) { const ry = getVal(o, 'ry', f) - yaw / DEG; delete o.tracks.ry; o.base.ry = ry; }
  o.cons.follow = null;
}

/* ---------- guias de composição ---------- */
let guideMode = 'thirds';
const GUIDES = [['thirds', 'Terços'], ['phi', 'Proporção áurea'], ['center', 'Centro / simetria'], ['diag', 'Diagonais'], ['safe', 'Áreas seguras'], ['frames', 'Frame lines (9:16 · 1:1 · 2.39)'], ['none', 'Sem guias']];
function drawGuides(ctx, r, y0) {
  if (!showGuides || guideMode === 'none') return;
  const X = (u) => r.x + r.w * u, Y = (v) => y0 + r.h * v;
  ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.beginPath();
  const vline = u => { ctx.moveTo(X(u), Y(0)); ctx.lineTo(X(u), Y(1)); }, hline = v => { ctx.moveTo(X(0), Y(v)); ctx.lineTo(X(1), Y(v)); };
  if (guideMode === 'thirds') { [1 / 3, 2 / 3].forEach(t => { vline(t); hline(t); }); }
  if (guideMode === 'phi') { const a = 0.382, b = 0.618; [a, b].forEach(t => { vline(t); hline(t); }); }
  if (guideMode === 'center') { vline(.5); hline(.5); ctx.stroke(); ctx.beginPath(); ctx.arc(X(.5), Y(.5), Math.min(r.w, r.h) * 0.04, 0, 7); }
  if (guideMode === 'diag') { ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(1)); ctx.moveTo(X(1), Y(0)); ctx.lineTo(X(0), Y(1)); const k = r.h / r.w; ctx.moveTo(X(0), Y(1)); ctx.lineTo(X(k * k / (1 + k * k)), Y(1 - 1 / (1 + k * k))); ctx.moveTo(X(1), Y(0)); ctx.lineTo(X(1 - k * k / (1 + k * k)), Y(1 / (1 + k * k))); }
  ctx.stroke();
  if (guideMode === 'safe') { ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(242,163,58,.55)'; ctx.strokeRect(X(.05), Y(.05), r.w * .9, r.h * .9); ctx.strokeStyle = 'rgba(122,167,255,.6)'; ctx.strokeRect(X(.1), Y(.1), r.w * .8, r.h * .8); ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '10px Inter'; ctx.fillText('action safe 90%', X(.05) + 4, Y(.05) + 12); ctx.fillText('title safe 80%', X(.1) + 4, Y(.1) + 12); }
  if (guideMode === 'frames') {
    const A = r.w / r.h; ctx.font = '10px Inter'; ctx.fillStyle = 'rgba(255,255,255,.6)';
    for (const [lab, a, col] of [['9:16', 9 / 16, 'rgba(122,167,255,.7)'], ['1:1', 1, 'rgba(108,200,106,.7)'], ['4:5', 0.8, 'rgba(175,123,232,.7)'], ['2.39:1', 2.39, 'rgba(242,163,58,.7)']]) {
      let w = r.w, h = r.h; if (a < A) w = r.h * a; else h = r.w / a; if (Math.abs(a - A) < 0.02) continue;
      ctx.strokeStyle = col; ctx.strokeRect(X(.5) - w / 2, Y(.5) - h / 2, w, h); ctx.fillStyle = col; ctx.fillText(lab, X(.5) - w / 2 + 4, Y(.5) - h / 2 + 12);
    }
  }
  ctx.restore();
}

/* ---------- presets extras de câmera: composição, movimentos e rigs ---------- */
Object.assign(CAM_PRESETS, {
  whip: { lb: 'Chicote (whip pan)', ic: '💨', size: 'MS', lens: 35, yaw: 20, custom: 'whip', dur: 3, grp: 'mov' },
  tiltup: { lb: 'Tilt revelação', ic: '⤴️', size: 'FS', lens: 24, yaw: 10, custom: 'tilt', dur: 4, grp: 'mov' },
  ped: { lb: 'Pedestal (sobe)', ic: '⬆️', size: 'MS', lens: 50, move: 'crane', dur: 4, grp: 'mov', rise: 1.4 },
  steady: { lb: 'Steadicam seguindo', ic: '🚶', size: 'MLS', lens: 32, yaw: 180, move: 'follow', shake: 0.3, dur: 5, grp: 'mov' },
  arc90: { lb: 'Arco 90°', ic: '◠', size: 'MS', lens: 50, yaw: -45, move: 'orbit', arc: 90, dur: 5, grp: 'mov' },
  lowtrack: { lb: 'Travelling rasteiro', ic: '🐍', size: 'FS', lens: 24, yaw: 70, move: 'track', height: 'lowtrack', dur: 5, grp: 'mov' },
  m_hood: { lb: 'Rig no capô (vê o motorista)', ic: '🚘', mount: [0, 'H+0.06', 'L*0.3'], aim: 0.85, lens: 18, grp: 'rig' },
  m_side: { lb: 'Rig na porta (olha p/ frente)', ic: '🚪', mount: ['W/2+0.32', 'H*0.55', '-L*0.08'], ry: 168, rx: -4, lens: 18, grp: 'rig' },
  m_front: { lb: 'Rig frontal (vê o carro)', ic: '🎯', mount: [0, 0.45, 'L/2+1.6'], aim: 0.55, lens: 24, grp: 'rig' },
  m_rear: { lb: 'Rig traseiro (vê a traseira)', ic: '🔙', mount: [0.3, 1.0, '-(L/2+1.8)'], aim: 0.7, lens: 24, grp: 'rig' },
  m_wheel: { lb: 'Rig na roda (detalhe)', ic: '⚙️', mount: ['W/2+0.55', 0.32, 'L*0.3'], aim: 0.33, lens: 24, grp: 'rig', aimOff: true },
});
for (const k of ['free', 'ws', 'fs', 'ms', 'cu', 'ecu', 'tq', 'side', 'low', 'high', 'top', 'ots', 'dutch', 'hand']) CAM_PRESETS[k].grp = 'comp';
for (const k of ['dollyin', 'dollyout', 'track', 'chase', 'lead', 'orbit', 'crane', 'drone', 'vertigo']) CAM_PRESETS[k].grp = 'mov';
CAM_PRESETS.orbit.arc = 180;
const CAM_GROUPS = [['comp', 'Composição · planos'], ['mov', 'Movimentos de câmera'], ['rig', 'Rigs em veículo (câmera presa ao carro)']];
function evalExpr(v, d) { if (typeof v === 'number') return v; return Function('L', 'W', 'H', 'return ' + v)(d.L, d.W, d.H); }
function createRigCamera(key, subj) {
  const P2 = CAM_PRESETS[key]; if (!subj || ASSETS[subj.type].pilot !== 'car') { toast('Selecione um veículo para montar o rig'); return null; }
  const r = rt.get(subj.id), d = { L: r.size.z, W: r.size.x, H: r.size.y };
  const [x, y, z] = P2.mount.map(v => evalExpr(v, d));
  const cam = addObject('camera', { silent: true, name: P2.lb.split(' (')[0] + ' ' + P2.lens + 'mm', base: { px: x, py: y, pz: z, rx: P2.rx || 0, ry: P2.ry || 0, rz: 0, focal: P2.lens }, cons: { mount: subj.id, aim: P2.aim != null ? subj.id : null, aimH: P2.aim || 1, shake: 0.08 } });
  buildRuntime(cam); bump(); project.activeCamera = cam.id; select(cam.id); commit(); renderOutliner();
  toast(`${P2.lb}: câmera presa a ${subj.name} — acompanha posição e giro do carro`);
  return cam;
}
function customMove(cam, P2, S, f0, f1) {
  const Sm = { rx: [], ry: [] }, ry0 = cam.base.ry, rx0 = cam.base.rx;
  if (P2.custom === 'whip') { cam.cons.aim = null; const yaw = Math.atan2(-(S.p.x - cam.base.px), -(S.p.z - cam.base.pz)) / DEG; const mid = Math.round((f0 + f1) / 2), wf = Math.round(project.fps * 0.35); setKey(cam, 'ry', f0, yaw); setKey(cam, 'ry', mid, yaw); setKey(cam, 'ry', Math.min(f1, mid + wf), yaw + 100); setKey(cam, 'ry', f1, yaw + 100); }
  if (P2.custom === 'tilt') { const tgt = S.p.clone(); tgt.y += S.H * 0.6; const D = tgt.sub(new THREE.Vector3(cam.base.px, cam.base.py, cam.base.pz)); cam.cons.aim = null; const yaw = Math.atan2(-D.x, -D.z) / DEG, pit = Math.asin(D.y / D.length()) / DEG; cam.base.ry = yaw; setKey(cam, 'rx', f0, pit - 45); setKey(cam, 'rx', f1, pit); for (const k of cam.tracks.rx) { k.h = 'free'; } applyEaseAll(cam.tracks.rx); }
}
function applyEaseAll(keys) { keys.forEach((k, i) => { const p = keys[i - 1], q = keys[i + 1]; k.ii = k.oi = 'bezier'; k.h = 'free'; k.li = { x: -(p ? (k.f - p.f) / 3 : 1), y: 0 }; k.ro = { x: q ? (q.f - k.f) / 3 : 1, y: 0 }; }); autoHandles(keys); bump(); }

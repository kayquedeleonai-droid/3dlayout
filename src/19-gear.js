/* ============================================================
   EQUIPAMENTO DE FILMAGEM REAL
   Cada câmera pode estar num suporte com medidas e limites de fichas técnicas
   (alcance, altura de lente, velocidade). O app desenha o equipamento em escala
   e confere a animação inteira contra os limites.
   o.gear = { type, base: {x, y, z, yaw}?, veh?: id }
   ============================================================ */
const GEAR = {
  none: { lb: 'Livre (sem equipamento)', ic: '🎥', grp: 'Livre' },
  tripod: { lb: 'Tripé + cabeça fluida', ic: '📷', grp: 'Fixo', hMin: 0.15, hMax: 2.0, still: true, src: 'Tripé padrão ~0,75–2,0 m de lente; baby legs/hi-hat até 0,15 m.' },
  slider: { lb: 'Slider 1,2 m', ic: '↔️', grp: 'Fixo', hMin: 0.15, hMax: 2.0, travel: 1.2, vMax: 1.0, src: 'Slider de 1,2 m sobre tripés; deslocamento só em linha reta (típico).' },
  dolly: { lb: 'Dolly Chapman Super PeeWee IV (trilho)', ic: '🛤️', grp: 'Chão', hMin: 0.48, hMax: 1.53, vMax: 3.0, gauge: 0.62, src: 'Super PeeWee IV: lente 0,48–1,53 m (modo baixo a extensor), braço 0,84 m, 0,51 × 1,07 m, bitola de trilho 24,5". Velocidade empurrada por maquinista ~3 m/s (típico).' },
  steadicam: { lb: 'Steadicam (operador)', ic: '🚶', grp: 'Chão', hMin: 0.4, hMax: 1.9, vMax: 4.5, op: true, shake: 0.25, src: 'Lente ~0,4 m (low mode) a 1,9 m. Operador andando/correndo: até ~4,5 m/s (típico); mais rápido, use veículo.' },
  gimbal: { lb: 'Gimbal de mão (Ronin 2 / MoVI)', ic: '🤲', grp: 'Chão', hMin: 0.2, hMax: 2.1, vMax: 6, op: true, shake: 0.15, src: 'Gimbal de 3 eixos na mão: ~0,2–2,1 m; corrida até ~6 m/s (típico).' },
  handheld: { lb: 'Câmera na mão / ombro', ic: '✋', grp: 'Chão', hMin: 0.3, hMax: 1.9, vMax: 5, op: true, shake: 0.7, src: 'Ombro ~1,5–1,7 m; baixo ~0,3 m. Tremor natural de operador.' },
  jib: { lb: 'Grua jib 4 m (base fixa)', ic: '🏗️', grp: 'Gruas', base: true, pivotH: 1.5, reach: [0.6, 4.0], hMin: 0, hMax: 5.5, vMax: 2.5, src: 'Jib manual de 4 m sobre tripé/pedestal, pivô ~1,5 m, lente até ~5,5 m (típico).' },
  techno: { lb: 'Technocrane SuperTechno 30', ic: '🏗️', grp: 'Gruas', base: true, pivotH: 2.36, reach: [2.65, 9.14], hMin: 0, hMax: 9.2, tele: 1.83, vMax: 4, rear: 2.4, baseW: 1.49, baseL: 1.65, src: 'SuperTechno 30: alcance do poste 2,65–9,14 m (telescópico 6,9 m), lente até 9,2 m, telescópio até 1,83 m/s, base 1,49 × 1,65 m, poste 2,15–2,56 m, traseira 2,4 m.' },
  russian: { lb: 'Russian Arm (U-Crane) em Mercedes', ic: '🚙', grp: 'Veículo', car: true, arm: 4.3, carVmax: 150, src: 'U-Crane / Russian Arm: braço padrão 4,3 m (opcional até 6,5 m), tilt ±45°, pan 360°; operação até 150 km/h. Carro: Mercedes GLE63s (4,94 × 2,01 × 1,78 m).' },
  carmount: { lb: 'Car mount (ventosa / hostess tray)', ic: '🧲', grp: 'Veículo', car: true, carVmax: 100, src: 'Rig preso à carroceria (ventosas, hostess tray, hood mount). Limite típico ~100 km/h — confirme com o rigger.' },
  drone: { lb: 'Drone DJI Inspire 3', ic: '🚁', grp: 'Aéreo', air: true, hMin: 0.5, hMax: 120, vMax: 26.1, vUp: 8, vDown: 8, src: 'Inspire 3: 94 km/h na horizontal, sobe/desce 8 m/s, 0,71 × 0,50 m. Altura limitada a 120 m (limite usual de regulamentação).' },
  fpv: { lb: 'Drone FPV de cinema', ic: '🛸', grp: 'Aéreo', air: true, hMin: 0.2, hMax: 120, vMax: 39, vUp: 15, vDown: 15, src: 'FPV de cinema com câmera cine leve (ex.: RED Komodo): até ~140 km/h em perseguição (típico). Cinewhoop: bem mais lento (~15 m/s).' },
  cable: { lb: 'Cable cam', ic: '🚡', grp: 'Aéreo', hMin: 2, hMax: 40, vMax: 10, line: true, src: 'Câmera em cabo entre duas torres: trajeto em linha reta, até ~10 m/s (típico).' },
};
const GEAR_GROUPS = ['Livre', 'Fixo', 'Chão', 'Gruas', 'Veículo', 'Aéreo'];
const gearViz = new THREE.Group(); scene.add(gearViz); sceneHelpers.push(gearViz);
const _gm = { metal: new THREE.MeshStandardMaterial({ color: '#8f949b', roughness: .45, metalness: .6 }), dark: new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: .7 }), yel: new THREE.MeshStandardMaterial({ color: '#d9a441', roughness: .6 }), bad: new THREE.MeshStandardMaterial({ color: '#e5484d', roughness: .6, emissive: '#5a0d10' }), wood: new THREE.MeshStandardMaterial({ color: '#7a5a3c', roughness: .9 }) };
const _gv = new THREE.Vector3(), _gv2 = new THREE.Vector3();
function camWorld(o, f, out = new THREE.Vector3()) { return worldPos(o, f, out); }
function gearPivot(o, f, out = new THREE.Vector3()) {
  const G = GEAR[o.gear && o.gear.type]; if (!G) return null;
  if (G.base && o.gear.base) return out.set(o.gear.base.x, (o.gear.base.y || 0) + G.pivotH, o.gear.base.z);
  if (o.gear.type === 'russian') { const v = getObj(o.gear.veh || o.cons.mount); if (!v) return null; const r = rt.get(v.id); worldPos(v, f, out); const h = r && r.size ? r.size.y : 1.78; out.y += h + 0.35; return out; }
  return null;
}
function groundBelow(p) { const g = typeof groundAt === 'function' && _roadRelief ? groundAt(p.x, p.z) : null; return g == null ? 0 : g; }
/* ---------- verificação dos limites ao longo da timeline ---------- */
function gearCheck(o, type) {
  const G = GEAR[type || (o.gear && o.gear.type)]; if (!G || !G.lb || type === 'none') return { ok: true, items: [], stats: {} };
  const fps = project.fps, N = project.duration, P = [], items = [];
  // com decupagem: só os trechos em que esta câmera está no ar (cada plano é um take)
  const onAir = (project.shots || []).filter(s => s.cam === o.id), air = (f) => !onAir.length || onAir.some(s => f >= s.start && f <= s.end);
  const saved = o.gear; if (type && (!o.gear || o.gear.type !== type)) o.gear = Object.assign({}, o.gear || {}, { type });
  for (let f = 0; f <= N; f++) P.push(camWorld(o, f, new THREE.Vector3()));
  let hMin = 1e9, hMax = -1e9, vMax = 0, vUpMax = 0, vDnMax = 0, rMin = 1e9, rMax = 0, teleMax = 0, carV = 0, prevR = null, moved = 0;
  const bad = (k, f) => { const it = items.find(i => i.k === k); if (it) { it.f1 = f; it.n++; } else items.push({ k, f0: f, f1: f, n: 1 }); };
  const veh = G.car ? getObj((o.gear && o.gear.veh) || o.cons.mount) : null;
  for (let f = 0; f <= N; f++) {
    if (!air(f)) { prevR = null; continue; }
    const p = P[f], h = p.y - groundBelow(p); hMin = Math.min(hMin, h); hMax = Math.max(hMax, h);
    if (f > 0 && air(f - 1)) { const d = p.distanceTo(P[f - 1]) * fps, vy = (p.y - P[f - 1].y) * fps; vMax = Math.max(vMax, d); vUpMax = Math.max(vUpMax, vy); vDnMax = Math.max(vDnMax, -vy); moved += p.distanceTo(P[f - 1]);
      if (G.vMax && d > G.vMax * 1.02) bad('v', f); if (G.vUp && vy > G.vUp * 1.02) bad('vup', f); if (G.vDown && -vy > G.vDown * 1.02) bad('vdn', f); }
    if (G.hMin != null && h < G.hMin - 0.01) bad('hmin', f); if (G.hMax != null && h > G.hMax + 0.01) bad('hmax', f);
    const pv = gearPivot(o, f, _gv);
    if (pv && (G.reach || G.arm)) { const r = p.distanceTo(pv); rMin = Math.min(rMin, r); rMax = Math.max(rMax, r); const [a, b] = G.reach || [0, G.arm]; if (r < a - 0.05) bad('rmin', f); if (r > b + 0.05) bad('rmax', f); if (G.tele && prevR != null) { const tv = Math.abs(r - prevR) * fps; teleMax = Math.max(teleMax, tv); if (tv > G.tele * 1.02) bad('tele', f); } prevR = r; }
    if (veh && f > 0 && air(f - 1)) { const a = worldPos(veh, f, _gv2).clone(), b = worldPos(veh, f - 1, new THREE.Vector3()); const kmh = a.distanceTo(b) * fps * 3.6; carV = Math.max(carV, kmh); if (kmh > G.carVmax * 1.02) bad('car', f); }
  }
  if (hMin > 1e8) { hMin = hMax = 0; }
  if (G.still && moved > 0.05) items.push({ k: 'still', f0: 0, f1: N, n: 1 });
  if (G.travel) { let span = 0; for (const p of P.filter((_, f) => air(f))) span = Math.max(span, p.distanceTo(P[0])); if (span > G.travel + 0.02) items.push({ k: 'travel', f0: 0, f1: N, n: 1, v: span }); }
  if (G.car && !veh) items.push({ k: 'nocar', f0: 0, f1: N, n: 1 });
  if (G.base && !(o.gear && o.gear.base)) items.push({ k: 'nobase', f0: 0, f1: N, n: 1 });
  o.gear = saved;
  return { ok: !items.length, items, stats: { hMin, hMax, vMax, vUpMax, vDnMax, rMin: rMin < 1e9 ? rMin : null, rMax: rMax || null, teleMax, carV, moved } };
}
const GEAR_MSG = {
  v: (G, s) => `velocidade da câmera chega a ${(s.vMax * 3.6).toFixed(0)} km/h (${s.vMax.toFixed(1)} m/s) — limite ${(G.vMax * 3.6).toFixed(0)} km/h`,
  vup: (G, s) => `sobe a ${s.vUpMax.toFixed(1)} m/s — limite ${G.vUp} m/s`, vdn: (G, s) => `desce a ${s.vDnMax.toFixed(1)} m/s — limite ${G.vDown} m/s`,
  hmin: (G, s) => `lente a ${s.hMin.toFixed(2)} m do chão — mínimo ${G.hMin} m`, hmax: (G, s) => `lente a ${s.hMax.toFixed(2)} m do chão — máximo ${G.hMax} m`,
  rmin: (G, s) => `câmera a ${s.rMin.toFixed(2)} m do pivô — alcance mínimo ${(G.reach || [0])[0]} m`, rmax: (G, s) => `câmera a ${s.rMax.toFixed(2)} m do pivô — alcance máximo ${(G.reach || [0, G.arm])[1]} m`,
  tele: (G, s) => `braço telescópico a ${s.teleMax.toFixed(2)} m/s — limite ${G.tele} m/s`, car: (G, s) => `veículo a ${s.carV.toFixed(0)} km/h — limite ${G.carVmax} km/h`,
  still: () => 'a câmera se desloca, mas o tripé é fixo (só pan/tilt/zoom)', travel: (G, s, it) => `deslocamento de ${it.v.toFixed(2)} m — o slider tem ${G.travel} m`,
  nocar: () => 'precisa estar montada em um veículo (Restrições → Montar)', nobase: () => 'base da grua não posicionada',
};
function gearCheckHTML(o) {
  const G = GEAR[o.gear && o.gear.type]; if (!G || o.gear.type === 'none') return '';
  const R = gearCheck(o), s = R.stats, fps = project.fps, t = f => (f / fps).toFixed(1) + 's';
  let h = `<div class="hint" style="margin:6px 0 2px">${(project.shots || []).some(s => s.cam === o.id) ? 'Nos planos em que está no ar' : 'Ao longo da cena'}: altura ${s.hMin.toFixed(2)}–${s.hMax.toFixed(2)} m · vel. máx. ${(s.vMax * 3.6).toFixed(1)} km/h${s.rMax ? ` · alcance ${s.rMin.toFixed(2)}–${s.rMax.toFixed(2)} m` : ''}${s.carV ? ` · carro até ${s.carV.toFixed(0)} km/h` : ''}</div>`;
  if (R.ok) h += `<div class="hint" style="color:#6cc86a;margin:4px 0">✓ Movimento possível com este equipamento.</div>`;
  else h += R.items.map(it => `<div class="hint" style="color:#ff8a80;margin:3px 0">⚠ ${GEAR_MSG[it.k](G, s, it)}${it.k !== 'still' && it.k !== 'nocar' && it.k !== 'nobase' && it.k !== 'travel' ? ` <span style="color:var(--tx3)">(${t(it.f0)}–${t(it.f1)})</span>` : ''}</div>`).join('');
  return h;
}
function gearSectionHTML(o) {
  const cur = (o.gear && o.gear.type) || 'none', G = GEAR[cur];
  let sel2 = '<select id="gearSel">'; for (const g of GEAR_GROUPS) { sel2 += `<optgroup label="${g}">` + Object.entries(GEAR).filter(([, v]) => v.grp === g).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${v.ic} ${v.lb}</option>`).join('') + '</optgroup>'; } sel2 += '</select>';
  let h = `<div class="prow wide"><span class="lb">Equipamento</span>${sel2}</div>`;
  if (G.src) h += `<div class="hint" style="margin-top:2px">📋 ${G.src}</div>`;
  if (G.base) h += `<div class="btnrow"><button data-gear-act="base">📍 Base atrás da câmera (frame atual)</button><button data-gear-act="opt">🎯 Otimizar posição da base</button></div>`;
  if (G.car) h += `<div class="btnrow"><button data-gear-act="car">${G.car && cur === 'russian' ? '🚙 Criar carro de câmera com Russian Arm' : '🔗 Montar no carro selecionado'}</button></div>`;
  h += gearCheckHTML(o);
  h += `<div class="btnrow"><button data-gear-act="suggest">✨ Sugerir equipamento para este movimento</button></div>`;
  return h;
}
function placeGearBase(o, f = curFrame) {
  const G = GEAR[o.gear.type], r = rt.get(o.id); if (!G || !G.base || !r) return;
  const p = camWorld(o, f, new THREE.Vector3()), fw = new THREE.Vector3(0, 0, -1).applyQuaternion(r.g.quaternion); fw.y = 0; if (fw.lengthSq() < 1e-6) fw.set(0, 0, -1); fw.normalize();
  const want = clamp((G.reach[0] + G.reach[1]) / 2, G.reach[0] + 0.3, G.reach[1] - 0.3), dy = p.y - G.pivotH, hd = Math.sqrt(Math.max(0.25, want * want - dy * dy));
  const b = p.clone().addScaledVector(fw, -hd); o.gear.base = { x: +b.x.toFixed(3), y: +groundBelow(b).toFixed(3), z: +b.z.toFixed(3), yaw: Math.atan2(fw.x, fw.z) };
}
function setGear(o, type) {
  const G = GEAR[type]; o.gear = Object.assign({}, o.gear || {}, { type });
  if (type === 'none') delete o.gear;
  if (G.base && !(o.gear.base)) placeGearBase(o);
  if (G.shake != null && !o.cons.shake) o.cons.shake = G.shake;
  if (G.car && !o.cons.mount) { const so = project.objects.find(x => x.id !== o.id && ASSETS[x.type].pilot === 'car'); if (type === 'carmount' && so) { convertMount(o, so.id); o.cons.mount = so.id; } }
  _gearTrackVer = -1; bump(); commit(); renderInspector();
}
function createCameraCar(o) {
  const subj = project.objects.find(x => x.id !== o.id && ASSETS[x.type].pilot === 'car' && x.id !== (o.gear && o.gear.veh));
  const p = camWorld(o, curFrame, new THREE.Vector3());
  const v = addObject('suv', { silent: true, name: 'Carro de câmera (Russian Arm)', params: Object.assign(defaultParams('suv'), { length: 4.94, width: 2.01, height: 1.78, color: '#1c1d20' }), base: { px: p.x + 2.5, py: 0, pz: p.z, ry: subj ? getVal(subj, 'ry', curFrame) : 0 } });
  // se houver um carro herói, o carro de câmera copia a trajetória dele, 4,5 m ao lado
  if (subj) { for (const ch of ['px', 'pz', 'ry']) { v.tracks[ch] = JSON.parse(JSON.stringify(subj.tracks[ch] || [])); v.base[ch] = subj.base[ch]; } v.cons.follow = null; const off = 4.5; const S = { px: [], pz: [] }; for (let f = 0; f <= project.duration; f++) { const yaw = getVal(subj, 'ry', f) * DEG; S.px.push({ f, v: getVal(subj, 'px', f) + Math.cos(yaw) * off }); S.pz.push({ f, v: getVal(subj, 'pz', f) - Math.sin(yaw) * off }); } writeSamples(v, 'px', S.px, 'simplify', 0.005); writeSamples(v, 'pz', S.pz, 'simplify', 0.005); }
  buildRuntime(v); o.gear = { type: 'russian', veh: v.id }; convertMount(o, v.id); o.cons.mount = v.id;
  // câmera no fim do braço: 3,5 m à frente-lado do pivô, altura de 1,2 m
  const r = rt.get(v.id); o.base.px = -1.2; o.base.py = (r && r.size ? r.size.y : 1.78) + 0.35 - 0.6; o.base.pz = 3.6; for (const ch of ['px', 'py', 'pz']) delete o.tracks[ch];
  if (subj && !o.cons.aim) { o.cons.aim = subj.id; o.cons.aimH = 0.6; }
  bump(); commit(); renderOutliner(); renderInspector(); toast('Carro de câmera criado: a câmera está no braço de 4,3 m e segue o carro herói ao lado');
}
function suggestGear(o) {
  const order = ['tripod', 'slider', 'dolly', 'steadicam', 'gimbal', 'jib', 'techno', 'russian', 'carmount', 'drone', 'fpv', 'cable'];
  const fits = [];
  for (const k of order) {
    const G = GEAR[k], tmp = Object.assign({}, o.gear || {}, { type: k });
    if (G.car && !(o.cons.mount && ASSETS[getObj(o.cons.mount)?.type]?.pilot === 'car')) continue;
    const saved = o.gear; o.gear = tmp; if (G.base) placeGearBase(o, Math.round(project.duration / 2)); const R = gearCheck(o, k); o.gear = saved;
    if (R.ok) fits.push([k, tmp]);
  }
  if (!fits.length) return toast('Nenhum equipamento real faz esse movimento inteiro — veja os avisos e ajuste a velocidade/altura', 6000);
  const [k, tmp] = fits[0]; o.gear = tmp; if (GEAR[k].shake != null && !o.cons.shake) o.cons.shake = GEAR[k].shake;
  _gearTrackVer = -1; bump(); commit(); renderInspector(); toast(`Sugestão: ${GEAR[k].lb}` + (fits.length > 1 ? ` (também serve: ${fits.slice(1, 4).map(x => GEAR[x[0]].lb.split(' (')[0]).join(', ')})` : ''), 6000);
}
/* ---------- desenho do equipamento em escala ---------- */
let _gearTrackVer = -1; const _gearStatic = new Map();
function cylBetween(a, b, r, mat, parent) { const d = _gv2.copy(b).sub(a), L = d.length(); if (L < 1e-4) return; const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 10), mat); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); parent.add(m); return m; }
let _opRigs = new Map();
function updateGearViz(f) {
  gearViz.clear();
  for (const o of project.objects) {
    if (o.type !== 'camera' || !o.gear || o.gear.type === 'none' || o.hidden) continue;
    const G = GEAR[o.gear.type]; if (!G) continue; const r = rt.get(o.id); if (!r) continue;
    const p = r.g.getWorldPosition(new THREE.Vector3()), gy = groundBelow(p), fw = new THREE.Vector3(0, 0, -1).applyQuaternion(r.g.quaternion); fw.y = 0; if (fw.lengthSq() < 1e-6) fw.set(0, 0, -1); fw.normalize();
    const yaw = Math.atan2(fw.x, fw.z), t = o.gear.type, grp = new THREE.Group(); gearViz.add(grp);
    if (t === 'tripod' || t === 'slider') {
      const head = p.clone(); head.y -= 0.16; const hh = Math.max(0.1, head.y - gy), sp = Math.min(0.55, 0.12 + hh * 0.33);
      const tripodAt = (c) => { for (let i = 0; i < 3; i++) { const a = yaw + i * Math.PI * 2 / 3 + Math.PI / 3; cylBetween(c, new THREE.Vector3(c.x + Math.sin(a) * sp, gy, c.z + Math.cos(a) * sp), 0.016, _gm.dark, grp); } };
      if (t === 'tripod') tripodAt(head); else { const dir = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); const a = head.clone().addScaledVector(dir, -0.6), b = head.clone().addScaledVector(dir, 0.6); cylBetween(a, b, 0.03, _gm.metal, grp); tripodAt(a); tripodAt(b); }
      cylBetween(head, p, 0.05, _gm.dark, grp);
    }
    if (t === 'dolly') {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.25, 1.07), _gm.yel); const back = new THREE.Vector3(p.x - fw.x * 0.35, gy + 0.2, p.z - fw.z * 0.35); ch.position.copy(back); ch.rotation.y = yaw; grp.add(ch);
      cylBetween(new THREE.Vector3(back.x, gy + 0.32, back.z), new THREE.Vector3(p.x, p.y - 0.12, p.z), 0.06, _gm.metal, grp);
      const st = _gearStatic.get(o.id); if (!st || st.ver !== animVer) { _gearStatic.set(o.id, { ver: animVer, g: buildTrack(o) }); }
      grp.add(_gearStatic.get(o.id).g.clone());
    }
    if (G.op) { // operador em escala real atrás da câmera
      let op = _opRigs.get(o.id); if (!op) { op = buildPerson(Object.assign(defaultParams('person'), { look: 'mannequin', height: 1.78 })); _opRigs.set(o.id, op); }
      const back = 0.42 + (t === 'steadicam' ? 0.25 : 0); op.position.set(p.x - fw.x * back, gy, p.z - fw.z * back); op.rotation.set(0, yaw, 0);
      const c = motion(o), i = clamp(Math.round(f), 0, c.N - 1); animPerson(op.userData.rig, { t: f / project.fps, dist: c.dist[i], speed: c.speed[i], yawRate: 0, vy: 0, y: 0 }, { pose: 'stand' });
      const R2 = op.userData.rig, low = (p.y - gy) < 0.9; if (low) { R2.hips.position.y = R2.hipY * 0.55; R2.legs.forEach(L => { L.h.rotation.x = -1.3; L.k.rotation.x = 1.9; }); }
      R2.arms.forEach(A => { A.s.rotation.set(-1.15, 0, A.side * -0.15); A.e.rotation.set(-0.35, 0, 0); });
      grp.add(op);
      if (t === 'steadicam') { const post = new THREE.Vector3(p.x - fw.x * 0.18, p.y - 0.15, p.z - fw.z * 0.18); cylBetween(post, new THREE.Vector3(post.x, post.y - 0.55, post.z), 0.02, _gm.metal, grp); cylBetween(new THREE.Vector3(post.x, post.y - 0.3, post.z), new THREE.Vector3(op.position.x, gy + 1.05, op.position.z), 0.025, _gm.dark, grp); }
    }
    if (G.base && o.gear.base) {
      const B = o.gear.base, base = new THREE.Vector3(B.x, B.y || 0, B.z), pv = gearPivot(o, f, new THREE.Vector3()), R = gearCheck._last && gearCheck._last.id === o.id ? null : null;
      const bx = new THREE.Mesh(new THREE.BoxGeometry(G.baseW || 0.7, 0.35, G.baseL || 0.7), _gm.dark); bx.position.set(base.x, base.y + 0.175, base.z); grp.add(bx);
      cylBetween(new THREE.Vector3(base.x, base.y + 0.3, base.z), pv, t === 'techno' ? 0.12 : 0.05, _gm.metal, grp);
      const dist = p.distanceTo(pv), [a, b] = G.reach, inR = dist >= a - 0.05 && dist <= b + 0.05, dir = p.clone().sub(pv).normalize();
      cylBetween(pv, p, t === 'techno' ? 0.11 : 0.05, inR ? _gm.yel : _gm.bad, grp);
      if (t === 'techno') cylBetween(pv, pv.clone().addScaledVector(dir, Math.min(dist, a)), 0.15, inR ? _gm.yel : _gm.bad, grp);
      const rearL = G.rear || 1.2, rear = pv.clone().addScaledVector(dir, -rearL); cylBetween(pv, rear, 0.08, _gm.metal, grp); const cw = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), _gm.dark); cw.position.copy(rear); grp.add(cw);
    }
    if (t === 'russian') {
      const pv = gearPivot(o, f, new THREE.Vector3()); if (pv) { const ok = p.distanceTo(pv) <= G.arm + 0.05; cylBetween(new THREE.Vector3(pv.x, pv.y - 0.35, pv.z), pv, 0.12, _gm.dark, grp); cylBetween(pv, p, 0.07, ok ? _gm.metal : _gm.bad, grp); const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), _gm.dark); head.position.copy(p); grp.add(head); }
    }
    if (t === 'carmount') { cylBetween(p, new THREE.Vector3(p.x, p.y - 0.25, p.z), 0.03, _gm.dark, grp); const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 14), _gm.dark); pl.position.set(p.x, p.y - 0.26, p.z); grp.add(pl); }
    if (t === 'drone' || t === 'fpv') {
      const d = new THREE.Group(); d.position.set(p.x, p.y + (t === 'drone' ? 0.3 : 0.08), p.z); d.rotation.y = yaw; grp.add(d);
      const L = t === 'drone' ? 0.71 : 0.3; const body = new THREE.Mesh(new THREE.BoxGeometry(L * 0.35, 0.1, L * 0.7), _gm.dark); d.add(body);
      for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const tip = new THREE.Vector3(sx * L * 0.5, t === 'drone' ? 0.12 : 0, sz * L * 0.35); cylBetween(new THREE.Vector3(0, 0, 0), tip, 0.015, _gm.dark, d); const pr = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.22, L * 0.22, 0.005, 20), new THREE.MeshBasicMaterial({ color: '#9aa0a6', transparent: true, opacity: .35 })); pr.position.copy(tip); pr.position.y += 0.03; d.add(pr); }
      if (t === 'drone') cylBetween(new THREE.Vector3(0, -0.05, 0), new THREE.Vector3(0, -0.22, 0), 0.02, _gm.dark, d);
    }
    if (t === 'cable') {
      const st = _gearStatic.get(o.id); if (!st || st.ver !== animVer) _gearStatic.set(o.id, { ver: animVer, g: buildCableTowers(o) }); grp.add(_gearStatic.get(o.id).g.clone());
      cylBetween(p, new THREE.Vector3(p.x, p.y + 0.5, p.z), 0.02, _gm.dark, grp);
    }
  }
}
function buildTrack(o) { // trilho de dolly sob todo o trajeto da câmera (bitola 0,62 m, dormentes a cada 0,6 m)
  const g = new THREE.Group(), pts = []; for (let f = 0; f <= project.duration; f += 1) { const p = camWorld(o, f, new THREE.Vector3()); if (!pts.length || p.distanceTo(pts[pts.length - 1]) > 0.05) pts.push(p); }
  if (pts.length < 2) { const p = pts[0] || new THREE.Vector3(); pts.length = 0; pts.push(p.clone().add(new THREE.Vector3(-1.2, 0, 0)), p.clone().add(new THREE.Vector3(1.2, 0, 0))); }
  const first = pts[0], last = pts[pts.length - 1], d0 = pts[1].clone().sub(first).setY(0).normalize(), d1 = last.clone().sub(pts[pts.length - 2]).setY(0).normalize();
  pts.unshift(first.clone().addScaledVector(d0, -1.2)); pts.push(last.clone().addScaledVector(d1, 1.2));
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = b.clone().sub(a).setY(0); const L = d.length(); if (L < 1e-4) continue; d.normalize(); const rgt = new THREE.Vector3(-d.z, 0, d.x);
    const ga = groundBelow(a), gb = groundBelow(b);
    for (const s of [-0.31, 0.31]) cylBetween(new THREE.Vector3(a.x + rgt.x * s, ga + 0.06, a.z + rgt.z * s), new THREE.Vector3(b.x + rgt.x * s, gb + 0.06, b.z + rgt.z * s), 0.02, _gm.metal, g);
    for (let u = (0.6 - acc % 0.6); u < L; u += 0.6) { const c = a.clone().addScaledVector(d, u); const sl = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, 0.1), _gm.wood); sl.position.set(c.x, groundBelow(c) + 0.02, c.z); sl.rotation.y = Math.atan2(d.x, d.z); g.add(sl); }
    acc += L;
  }
  return g;
}
function buildCableTowers(o) {
  const g = new THREE.Group(), a = camWorld(o, 0, new THREE.Vector3()), b = camWorld(o, project.duration, new THREE.Vector3()), d = b.clone().sub(a).setY(0); if (d.lengthSq() < 0.01) d.set(1, 0, 0); d.normalize();
  const A = a.clone().addScaledVector(d, -5), B = b.clone().addScaledVector(d, 5), top = Math.max(a.y, b.y) + 0.6;
  for (const T of [A, B]) { cylBetween(new THREE.Vector3(T.x, groundBelow(T), T.z), new THREE.Vector3(T.x, top, T.z), 0.12, _gm.metal, g); }
  cylBetween(new THREE.Vector3(A.x, top, A.z), new THREE.Vector3(B.x, top, B.z), 0.01, _gm.dark, g); return g;
}
/* ---------- biblioteca: câmeras já montadas em equipamento ---------- */
function gearLibraryHTML(card, m, subj, isCar) {
  return `<div class="acat">Equipamentos de filmagem (escala e limites reais)</div><div class="agrid">` + Object.entries(GEAR).filter(([k, v]) => k !== 'none' && m(v.lb)).map(([k, v]) => card(`data-gear="${k}"`, null, v.ic, v.lb, v.car ? 'preso a um carro' : v.hMax ? `lente ${v.hMin}–${v.hMax} m` : '', v.car && k === 'carmount' && !isCar)).join('') + '</div>';
}
function createGearCamera(k, subj) {
  const G = GEAR[k], t = subj ? worldPos(subj, curFrame, new THREE.Vector3()) : new THREE.Vector3(0, 0, 0), sy = subj ? getVal(subj, 'ry', curFrame) * DEG : 0;
  const pos = { tripod: [5, 1.5, 4], slider: [4, 1.3, 3], dolly: [6, 1.2, 0], steadicam: [0, 1.5, -4], gimbal: [0, 1.4, -3.5], handheld: [2.5, 1.6, -3], jib: [6, 3, 3], techno: [7, 4.5, 4], russian: [3, 1.2, 4], carmount: [0, 1.6, 2], drone: [25, 30, 25], fpv: [6, 3, -8], cable: [0, 10, 0] }[k] || [5, 1.5, 5];
  const off = new THREE.Vector3(pos[0], 0, pos[2]).applyAxisAngle(UP, sy);
  const cam = addObject('camera', { silent: true, name: G.lb.split(' (')[0], base: { px: t.x + off.x, py: pos[1] + (subj ? 0 : 0), pz: t.z + off.z, focal: k === 'drone' ? 24 : k === 'techno' ? 32 : 35 } });
  if (subj) { cam.cons.aim = subj.id; cam.cons.aimH = Math.min(1.2, (rt.get(subj.id)?.size?.y || 1.5) * 0.6); }
  buildRuntime(cam); project.activeCamera = cam.id;
  if (k === 'russian') { createCameraCar(cam); }
  else if (k === 'carmount') { if (subj && ASSETS[subj.type].pilot === 'car') { cam.gear = { type: k }; convertMount(cam, subj.id); cam.cons.mount = subj.id; cam.base.px = 0; cam.base.py = (rt.get(subj.id)?.size?.y || 1.4) + 0.12; cam.base.pz = (rt.get(subj.id)?.size?.z || 4.5) * 0.15; cam.cons.aim = null; cam.base.ry = 180; cam.base.rx = -6; } }
  else { cam.gear = { type: k }; if (G.base) placeGearBase(cam); if (G.shake != null) cam.cons.shake = G.shake; }
  bump(); select(cam.id); commit(); renderOutliner(); toast(`${G.lb}: câmera criada no equipamento — anime e confira os limites no inspetor`);
}
function initGearUI() {
  insp.addEventListener('change', e => { const o = sel && getObj(sel); if (o && e.target.id === 'gearSel') setGear(o, e.target.value); });
  insp.addEventListener('click', e => {
    const o = sel && getObj(sel), b = e.target.closest('[data-gear-act]'); if (!o || !b) return; const a = b.dataset.gearAct;
    if (a === 'base') { placeGearBase(o); bump(); commit(); renderInspector(); }
    if (a === 'car') { if (o.gear && o.gear.type === 'russian') createCameraCar(o); else { const so = project.objects.find(x => x.id !== o.id && ASSETS[x.type].pilot === 'car'); if (!so) return toast('Adicione um carro primeiro'); convertMount(o, so.id); o.cons.mount = so.id; bump(); commit(); renderInspector(); } }
    if (a === 'suggest') suggestGear(o);
    if (a === 'opt') { if (optimizeGearBase(o)) { bump(); commit(); renderInspector(); toast('Base posicionada: braço com o mínimo de telescópio, fora da pista'); } else toast('Nenhuma posição de base alcança o movimento inteiro — encurte o movimento'); }
  });
}
/* base da grua otimizada: braço o mais "fixo" possível (pouco telescópio), fora da pista e dentro do alcance */
function optimizeGearBase(o) {
  const G = GEAR[o.gear && o.gear.type]; if (!G || !G.base) return false;
  const onAir = (project.shots || []).filter(s => s.cam === o.id), fr = []; for (let f = 0; f <= project.duration; f += 2) if (!onAir.length || onAir.some(s => f >= s.start && f <= s.end)) fr.push(f);
  const P = fr.map(f => camWorld(o, f, new THREE.Vector3())); if (!P.length) return false;
  const c = P.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / P.length), roads = roadsWorld();
  const offRoad = (x, z) => !roads.some(R => R.S.some(s => (s.x - x) ** 2 + (s.z - z) ** 2 < (R.E + 1.5) ** 2));
  let best = null, R = G.reach[1];
  for (let dx = -R; dx <= R; dx += 0.5) for (let dz = -R; dz <= R; dz += 0.5) {
    const x = c.x + dx, z = c.z + dz; if (!offRoad(x, z)) continue; const gy = groundBelow(new THREE.Vector3(x, 0, z)), pv = new THREE.Vector3(x, gy + G.pivotH, z);
    let mn = 1e9, mx = 0, tele = 0, prev = null; for (let i = 0; i < P.length; i++) { const r = P[i].distanceTo(pv); mn = Math.min(mn, r); mx = Math.max(mx, r); if (prev != null && fr[i] - fr[i - 1] === 2) tele = Math.max(tele, Math.abs(r - prev) * project.fps / 2); prev = r; }
    if (mn < G.reach[0] + 0.1 || mx > G.reach[1] - 0.1) continue;
    const score = tele + (mx - mn) * 0.05; if (!best || score < best.score) best = { score, x, z, gy };
  }
  if (!best) return false;
  o.gear.base = { x: +best.x.toFixed(3), y: +best.gy.toFixed(3), z: +best.z.toFixed(3), yaw: 0 }; return true;
}

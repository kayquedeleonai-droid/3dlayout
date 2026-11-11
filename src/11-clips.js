/* ============================================================
   PRESETS DE ANIMAÇÃO (clipes na timeline) + PRESETS DE CÂMERA
   o.clips = [{id, kind, start, end}] em frames. Clipes de ação mexem o corpo
   procedimentalmente; presets de locomoção geram keyframes de trajetória.
   ============================================================ */
const PERSON_TYPES = ['person', 'woman', 'child', 'crowd'];
const isPersonType = t => PERSON_TYPES.includes(t);
const isQuadType = t => !!SPECIES[t] || t === 'dog';
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function br(j, x, y, z, w) { if (x != null) j.rotation.x = lerp(j.rotation.x, x, w); if (y != null) j.rotation.y = lerp(j.rotation.y, y, w); if (z != null) j.rotation.z = lerp(j.rotation.z, z, w); }
// a = {lt (s), u (0..1), w (peso entrada/saída)}
const PERSON_ACTIONS = {
  wave: { lb: 'Acenar', ic: '👋', dur: 3, pose(r, a) { const R = r.arms[1]; br(R.s, 0, 0, -2.6, a.w); br(R.e, 0, 0, -0.4 + Math.sin(a.lt * 9) * 0.45, a.w); br(r.head, null, -0.15, null, a.w); } },
  cheer: { lb: 'Comemorar', ic: '🙌', dur: 3, pose(r, a) { r.arms.forEach(A => { br(A.s, -0.2, 0, A.side * 2.75, a.w); br(A.e, 0, 0, A.side * 0.3, a.w); }); r.hips.position.y += Math.abs(Math.sin(a.lt * 6.5)) * 0.06 * r.H * a.w; br(r.head, -0.25, null, null, a.w); } },
  clap: { lb: 'Aplaudir', ic: '👏', dur: 3, pose(r, a) { const c = Math.abs(Math.sin(a.lt * 9)); r.arms.forEach(A => { br(A.s, -1.15, A.side * -0.55 * (0.6 + 0.4 * c), A.side * 0.15, a.w); br(A.e, -0.9, 0, 0, a.w); }); } },
  point: { lb: 'Apontar', ic: '👉', dur: 2.5, pose(r, a) { br(r.arms[1].s, -1.5, 0, -0.1, a.w); br(r.arms[1].e, -0.05, 0, 0, a.w); br(r.torso, null, -0.2, null, a.w); } },
  phone: { lb: 'Ao telefone', ic: '📱', dur: 4, pose(r, a) { br(r.arms[0].s, -0.5, 0, 0.35, a.w); br(r.arms[0].e, -2.4, 0, 0, a.w); br(r.head, 0.1, 0.1 * Math.sin(a.lt), 0.08, a.w); } },
  talk: { lb: 'Conversar', ic: '🗣️', dur: 4, pose(r, a) { r.arms.forEach((A, i) => { br(A.s, -0.45 + Math.sin(a.lt * 3 + i * 2) * 0.25, 0, A.side * 0.15, a.w); br(A.e, -1.2 + Math.sin(a.lt * 4 + i) * 0.4, 0, 0, a.w); }); br(r.head, Math.sin(a.lt * 5) * 0.06, Math.sin(a.lt * 1.3) * 0.25, null, a.w); } },
  look: { lb: 'Olhar em volta', ic: '👀', dur: 4, pose(r, a) { br(r.head, null, Math.sin(a.lt * 1.4) * 0.85, null, a.w); br(r.torso, null, Math.sin(a.lt * 1.4) * 0.22, null, a.w); } },
  jump: { lb: 'Pular', ic: '🦘', dur: 1.4, pose(r, a) { const u = a.u, air = u > 0.25 && u < 0.75 ? Math.sin(Math.PI * (u - 0.25) / 0.5) : 0, crouch = u < 0.25 ? sstep(0, 0.25, u) : u > 0.75 ? 1 - sstep(0.75, 1, u) : 0.2; r.hips.position.y += (air * 0.45 - crouch * 0.12) * r.H / 1.75 * a.w; r.legs.forEach(L => { br(L.h, -0.9 * crouch - 0.5 * air, null, null, a.w); br(L.k, 1.6 * crouch + 0.9 * air, null, null, a.w); }); r.arms.forEach(A => br(A.s, 0.6 * crouch - 2.4 * air, null, A.side * 0.3 * air, a.w)); br(r.torso, 0.4 * crouch, null, null, a.w); } },
  hit: { lb: 'Reação a impacto', ic: '💥', dur: 1.6, pose(r, a) { const k = Math.sin(Math.min(a.lt * 9, Math.PI)) * Math.exp(-a.lt * 1.8); br(r.torso, -0.6 * k, 0.35 * k, 0.2 * k, a.w); br(r.head, -0.5 * k, null, null, a.w); r.arms.forEach(A => br(A.s, 0.6 * k, null, A.side * 1.1 * k, a.w)); r.hips.position.y -= 0.03 * r.H * k * a.w; } },
  fall: { lb: 'Cair', ic: '🫠', dur: 2.5, out: false, pose(r, a) { const f = sstep(0, 0.9, a.lt); r.hips.rotation.x = lerp(r.hips.rotation.x, -1.45 * f, a.w); r.hips.position.y = lerp(r.hips.position.y, lerp(r.hipY, 0.11 * r.H, f), a.w); r.arms.forEach(A => br(A.s, -0.4, null, A.side * (0.3 + 1.0 * f), a.w)); r.legs.forEach((L, i) => br(L.h, -0.3 * f - i * 0.2 * f, null, null, a.w)); } },
  sit: { lb: 'Sentar', ic: '🪑', dur: 4, pose(r, a) { const f = sstep(0, 0.7, a.lt); r.hips.position.y = lerp(r.hips.position.y, lerp(r.hipY, r.hipY * 0.5 + 0.02 * r.H, f), a.w); r.legs.forEach(L => { br(L.h, -Math.PI / 2 * f, null, null, a.w); br(L.k, Math.PI / 2 * f, null, null, a.w); br(L.a, 0, null, null, a.w); }); r.arms.forEach(A => { br(A.s, -0.35 * f, null, null, a.w); br(A.e, -0.9 * f, null, null, a.w); }); } },
  crouch: { lb: 'Agachar', ic: '🧎', dur: 3, pose(r, a) { const f = sstep(0, 0.5, a.lt); r.hips.position.y = lerp(r.hips.position.y, r.hipY * (1 - 0.42 * f), a.w); r.legs.forEach(L => { br(L.h, -1.3 * f, null, null, a.w); br(L.k, 2.0 * f, null, null, a.w); br(L.a, -0.6 * f, null, null, a.w); }); br(r.torso, 0.45 * f, null, null, a.w); r.arms.forEach(A => br(A.s, -0.6 * f, null, null, a.w)); } },
  dance: { lb: 'Dançar', ic: '🕺', dur: 4, pose(r, a) { const t = a.lt * 6; r.hips.position.y += Math.abs(Math.sin(t)) * 0.04 * r.H * a.w; br(r.hips, null, Math.sin(t / 2) * 0.3, Math.sin(t) * 0.12, a.w); r.arms.forEach((A, i) => { br(A.s, -0.8 + Math.sin(t + i * Math.PI) * 0.8, 0, A.side * (1.2 + Math.sin(t / 2 + i) * 0.6), a.w); br(A.e, -1 + Math.sin(t * 1.3) * 0.5, 0, 0, a.w); }); r.legs.forEach((L, i) => br(L.k, 0.3 + Math.max(0, Math.sin(t + i * Math.PI)) * 0.5, null, null, a.w)); br(r.head, Math.sin(t) * 0.1, null, null, a.w); } },
  punch: { lb: 'Soco', ic: '🥊', dur: 2, pose(r, a) { const p = Math.max(0, Math.sin(a.lt * 7)), q = Math.max(0, -Math.sin(a.lt * 7)); br(r.arms[1].s, -1.5 * p - 0.6 * (1 - p), 0, 0, a.w); br(r.arms[1].e, -2.1 * (1 - p), 0, 0, a.w); br(r.arms[0].s, -1.5 * q - 0.6 * (1 - q), 0, 0, a.w); br(r.arms[0].e, -2.1 * (1 - q), 0, 0, a.w); br(r.torso, 0.15, (q - p) * 0.4, null, a.w); r.legs.forEach((L, i) => br(L.h, i ? 0.3 : -0.4, null, null, a.w)); } },
  kick: { lb: 'Chute', ic: '🦵', dur: 1.5, pose(r, a) { const p = Math.sin(Math.PI * clamp(a.u * 1.3 - 0.15, 0, 1)); br(r.legs[1].h, -1.5 * p, null, null, a.w); br(r.legs[1].k, 0.9 * (1 - p), null, null, a.w); br(r.legs[0].k, 0.25, null, null, a.w); br(r.torso, -0.25 * p, null, null, a.w); r.arms.forEach(A => br(A.s, -0.4, null, A.side * 0.6, a.w)); } },
};
const QUAD_ACTIONS = {
  qsit: { lb: 'Sentar', ic: '🐕', dur: 4, pose(r, a) { const f = sstep(0, 0.6, a.lt); br(r.body, -0.55 * f, null, null, a.w); r.body.position.y = lerp(r.body.position.y, r.by * (1 - 0.18 * f), a.w); r.legs.forEach(L => { if (!L.front) { br(L.up, -1.4 * f, null, null, a.w); br(L.lo, 2.2 * f, null, null, a.w); } else { br(L.up, 0.5 * f, null, null, a.w); br(L.lo, 0, null, null, a.w); } }); br(r.neck, r.neckA - 0.3 * f, null, null, a.w); } },
  graze: { lb: 'Cheirar / pastar', ic: '🌱', dur: 4, pose(r, a) { const f = sstep(0, 0.6, a.lt); br(r.neck, r.neckA + 1.5 * f, null, null, a.w); br(r.head, null, Math.sin(a.lt * 2) * 0.2 * f, null, a.w); } },
  qjump: { lb: 'Pular', ic: '⤴️', dur: 1.2, pose(r, a) { const air = Math.sin(Math.PI * a.u); r.body.position.y += air * 0.5 * r.S.Hw * r.k * a.w; br(r.body, -0.35 * Math.cos(Math.PI * a.u), null, null, a.w); r.legs.forEach(L => { br(L.up, L.front ? -0.9 * air : 0.9 * air, null, null, a.w); br(L.lo, (L.front ? 1.2 : -1.2) * air, null, null, a.w); }); } },
  rear: { lb: 'Empinar', ic: '🐴', dur: 2.5, pose(r, a) { const f = Math.sin(Math.PI * clamp(a.u, 0, 1)); br(r.body, -0.95 * f, null, null, a.w); r.body.position.y += 0.35 * r.S.Hw * r.k * f * a.w; r.legs.forEach(L => { if (L.front) { br(L.up, -1.1 * f + Math.sin(a.lt * 9) * 0.3 * f, null, null, a.w); br(L.lo, 1.6 * f, null, null, a.w); } }); br(r.neck, r.neckA - 0.6 * f, null, null, a.w); } },
  qlook: { lb: 'Olhar em volta', ic: '👀', dur: 4, pose(r, a) { br(r.head, null, Math.sin(a.lt * 1.5) * 0.9, null, a.w); br(r.neck, r.neckA - 0.2, null, null, a.w); } },
};
// presets de locomoção: geram keyframes (trajetória) a partir do frame atual
const MOVE_PRESETS = {
  walk: { lb: 'Andar para frente', ic: '🚶', for: 'walker', dur: 4, speed: o => +o.params.walk || 1.4 },
  run: { lb: 'Correr para frente', ic: '🏃', for: 'walker', dur: 3, speed: o => +o.params.run || 4 },
  turn: { lb: 'Virar 180°', ic: '↩️', for: 'any', dur: 1.5, turn: 180 },
  turnl: { lb: 'Virar à esquerda (curva)', ic: '↰', for: 'walker car', dur: 3, arc: 90 },
  turnr: { lb: 'Virar à direita (curva)', ic: '↱', for: 'walker car', dur: 3, arc: -90 },
  accel: { lb: 'Arrancar (0→100 km/h)', ic: '🚀', for: 'car', dur: 5, v0: 0, v1: 27.8 },
  cruise: { lb: 'Rodar a 80 km/h', ic: '🛣️', for: 'car', dur: 5, v0: 22.2, v1: 22.2 },
  brake: { lb: 'Frear até parar', ic: '🛑', for: 'car', dur: 3, v0: 22.2, v1: 0 },
  fly: { lb: 'Voar em frente', ic: '🕊️', for: 'bird', dur: 5, speed: o => +o.params.speed || 9 },
  takeoff: { lb: 'Decolar', ic: '🛫', for: 'bird', dur: 4, speed: o => +o.params.speed || 9, climb: 8 },
};
function actionsFor(o) { if (!o) return {}; if (isPersonType(o.type)) return PERSON_ACTIONS; if (ASSETS[o.type].params.some(p => p.k === 'species')) return QUAD_ACTIONS; return {}; }
function movesFor(o) { if (!o || o.type === 'camera') return {}; const k = ASSETS[o.type].pilot || 'prop'; const out = {}; for (const m in MOVE_PRESETS) { const f = MOVE_PRESETS[m].for; if (f === 'any' || f.split(' ').includes(k)) out[m] = MOVE_PRESETS[m]; } return out; }
function activeClip(o, f) { const cs = o.clips; if (!cs || !cs.length) return null; for (const c of cs) if (f >= c.start && f <= c.end) return c; return null; }
function applyClip(o, r, f) {
  const c = activeClip(o, f); if (!c) return;
  const A = PERSON_ACTIONS[c.kind] || QUAD_ACTIONS[c.kind]; if (!A) return;
  const fps = project.fps, lt = (f - c.start) / fps, len = Math.max(1, c.end - c.start) / fps;
  const w = Math.min(sstep(0, 0.25, lt), A.out === false ? 1 : sstep(0, 0.25, len - lt));
  const a = { lt, u: lt / len, w };
  if (PERSON_ACTIONS[c.kind]) { if (o.type === 'crowd') r.rig.members.forEach(m => A.pose(m.rig, { ...a, lt: lt + m.off * 0.1 })); else A.pose(r.rig, a); }
  else if (r.rig.legs) A.pose(r.rig, a);
}
function addClip(o, kind, f0) {
  const A = PERSON_ACTIONS[kind] || QUAD_ACTIONS[kind]; if (!A) return;
  o.clips = o.clips || [];
  const start = f0 ?? curFrame, end = Math.min(project.duration, start + Math.round(A.dur * project.fps));
  o.clips = o.clips.filter(c => c.end < start || c.start > end);
  o.clips.push({ id: uid('c'), kind, start, end }); o.clips.sort((a, b) => a.start - b.start);
  commit(); tlDirty = true; toast(`${A.lb}: frames ${start}–${end}`);
}
function applyMovePreset(o, key) {
  const M2 = MOVE_PRESETS[key]; if (!M2) return;
  const fps = project.fps, f0 = curFrame, f1 = Math.min(project.duration, f0 + Math.round(M2.dur * fps)); if (f1 <= f0) return toast('Sem espaço na timeline');
  const x0 = getVal(o, 'px', f0), y0 = getVal(o, 'py', f0), z0 = getVal(o, 'pz', f0), h0 = getVal(o, 'ry', f0);
  const S = { px: [], pz: [], ry: [], py: [] }; let x = x0, z = z0, y = y0, h = h0 * DEG;
  for (let f = f0; f <= f1; f++) {
    const u = (f - f0) / (f1 - f0), dt = f > f0 ? 1 / fps : 0;
    let v = 0;
    if (M2.speed) v = M2.speed(o) * (key === 'takeoff' ? sstep(0, 0.6, u) : Math.min(1, u * 4 + 0.15));
    if (M2.v0 != null) v = lerp(M2.v0, M2.v1, key === 'brake' ? 1 - Math.pow(1 - u, 2) : u);
    if (M2.arc) { const base = isPersonType(o.type) || isQuadType(o.type) ? (+o.params.walk || 1.4) : 13.9; v = base; h += (M2.arc * DEG) / (f1 - f0); }
    if (M2.turn) h = h0 * DEG + M2.turn * DEG * sstep(0, 1, u);
    x += Math.sin(h) * v * dt; z += Math.cos(h) * v * dt; if (M2.climb) y = y0 + M2.climb * sstep(0.2, 1, u);
    S.px.push({ f, v: x }); S.pz.push({ f, v: z }); S.ry.push({ f, v: h / DEG }); S.py.push({ f, v: y });
  }
  if (M2.turn) writeSamples(o, 'ry', S.ry, 'simplify', 0.05);
  else { writeSamples(o, 'px', S.px, 'simplify', 0.004); writeSamples(o, 'pz', S.pz, 'simplify', 0.004); if (M2.arc) writeSamples(o, 'ry', S.ry, 'simplify', 0.05); if (M2.climb) writeSamples(o, 'py', S.py, 'simplify', 0.004); }
  commit(); tlDirty = true; renderInspector(); renderOutliner(); toast(`${M2.lb}: frames ${f0}–${f1}`);
}

/* ---------- timeline: barras de clipe ---------- */
function drawClips(ctx, r, y, h) {
  for (const c of (r.o.clips || [])) {
    const A = PERSON_ACTIONS[c.kind] || QUAD_ACTIONS[c.kind]; const x0 = fx(c.start), x1 = fx(c.end);
    const s = selClip && selClip.c === c;
    ctx.fillStyle = s ? 'rgba(120,170,255,.35)' : 'rgba(255,255,255,.08)'; ctx.strokeStyle = s ? '#8bb6ff' : 'rgba(255,255,255,.28)'; ctx.lineWidth = 1;
    roundRect(ctx, x0, y + 3, Math.max(6, x1 - x0), h - 6, 5); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + 2, y, Math.max(2, x1 - x0 - 4), h); ctx.clip(); ctx.fillStyle = '#e8eaed'; ctx.font = '500 11px Inter, sans-serif'; ctx.textBaseline = 'middle'; ctx.fillText((A ? A.ic + ' ' + A.lb : c.kind), x0 + 8, y + h / 2); ctx.restore();
  }
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
let selClip = null;
function hitClip(row, x) { for (const c of (row.o.clips || [])) { const x0 = fx(c.start), x1 = fx(c.end); if (x >= x0 - 4 && x <= x1 + 4) return { o: row.o, c, edge: Math.abs(x - x0) < 6 ? 'l' : Math.abs(x - x1) < 6 ? 'r' : null }; } return null; }

/* ============================================================
   PRESETS DE CÂMERA (enquadramento calculado pelo tamanho real do assunto)
   ============================================================ */
const SHOT_SIZES = { ECU: [0.09, 0.93], CU: [0.21, 0.88], MCU: [0.34, 0.8], MS: [0.52, 0.71], MLS: [0.74, 0.6], FS: [1.18, 0.5], WS: [2.8, 0.45], EWS: [7, 0.4] };
const CAM_PRESETS = {
  free: { lb: 'Câmera livre (vista atual)', ic: '🎥', free: true },
  ws: { lb: 'Plano geral', ic: '🌄', size: 'WS', lens: 24 },
  fs: { lb: 'Plano inteiro', ic: '🧍', size: 'FS', lens: 35 },
  ms: { lb: 'Plano médio frontal', ic: '🙂', size: 'MS', lens: 50 },
  cu: { lb: 'Close-up', ic: '👤', size: 'CU', lens: 85 },
  ecu: { lb: 'Detalhe (ECU)', ic: '👁️', size: 'ECU', lens: 100 },
  tq: { lb: '3/4 frontal', ic: '📐', size: 'MLS', lens: 35, yaw: 35 },
  side: { lb: 'Perfil lateral', ic: '➡️', size: 'FS', lens: 50, yaw: 90 },
  low: { lb: 'Contra-plongée (herói)', ic: '⬆️', size: 'FS', lens: 24, height: 'low', yaw: 20 },
  high: { lb: 'Plongée', ic: '⬇️', size: 'FS', lens: 35, height: 'high', yaw: 15 },
  top: { lb: 'Zenital (top-down)', ic: '🔽', size: 'WS', lens: 24, height: 'top' },
  ots: { lb: 'Over-the-shoulder', ic: '🫂', ots: true, lens: 50 },
  dutch: { lb: 'Ângulo holandês', ic: '↗️', size: 'MS', lens: 35, yaw: 25, roll: 14 },
  dollyin: { lb: 'Dolly in (push-in)', ic: '⏩', size: 'MLS', lens: 50, move: 'dollyin', dur: 4 },
  dollyout: { lb: 'Dolly out (revelação)', ic: '⏪', size: 'MCU', lens: 35, move: 'dollyout', dur: 4 },
  track: { lb: 'Travelling lateral', ic: '↔️', size: 'FS', lens: 35, yaw: 90, move: 'track', dur: 5 },
  chase: { lb: 'Perseguição', ic: '🏎️', size: 'FS', lens: 24, yaw: 180, move: 'follow', dur: 5 },
  lead: { lb: 'Frontal recuando', ic: '🔙', size: 'MLS', lens: 35, move: 'follow', dur: 5 },
  orbit: { lb: 'Órbita 180°', ic: '🔄', size: 'FS', lens: 35, yaw: 0, move: 'orbit', dur: 6 },
  crane: { lb: 'Grua subindo', ic: '🏗️', size: 'FS', lens: 24, yaw: 20, move: 'crane', dur: 5 },
  drone: { lb: 'Drone revelação', ic: '🚁', size: 'WS', lens: 24, yaw: 180, move: 'drone', dur: 6 },
  hand: { lb: 'Câmera na mão', ic: '✋', size: 'MS', lens: 35, yaw: 15, shake: 0.9 },
  vertigo: { lb: 'Vertigo (dolly zoom)', ic: '🌀', size: 'MS', lens: 24, move: 'vertigo', dur: 4 },
};
function subjectInfo(o, f) {
  const r = rt.get(o.id); const s = r && r.size ? r.size.clone() : new THREE.Vector3(0.5, 1.7, 0.5); const sc = getVal(o, 'sy', f); s.multiplyScalar(sc);
  const p = worldPos(o, f, new THREE.Vector3()), yaw = getVal(o, 'ry', f) * DEG;
  const person = isPersonType(o.type) && o.type !== 'crowd';
  return { p, yaw, H: s.y, L: Math.max(s.x, s.z), person, fwd: new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), flyY: p.y };
}
function createPresetCamera(key, subjId) {
  const P2 = CAM_PRESETS[key]; if (!P2) return;
  if (P2.free) { const c = addObject('camera'); project.activeCamera = c.id; renderOutliner(); return c; }
  const subj = getObj(subjId) || (sel && getObj(sel) && getObj(sel).type !== 'camera' ? getObj(sel) : project.objects.find(o => ASSETS[o.type].pilot && o.type !== 'camera'));
  if (!subj) { toast('Adicione ou selecione um personagem/objeto para enquadrar'); return; }
  const f0 = curFrame, S = subjectInfo(subj, f0), aspect = aspectNum();
  const focal = P2.lens || 35, vfov = focalToVFov(focal, aspect) * DEG;
  const [frac, cy] = SHOT_SIZES[P2.size || 'MS'];
  let FH = S.person ? frac * S.H : Math.max(frac * S.H * 1.6, frac >= 1 ? S.L * 1.05 / Math.min(aspect, 1.8) : frac * S.L * 0.7);
  const aimH = S.person ? cy * S.H : Math.min(S.H * 0.55, Math.max(0.4, cy * S.H));
  let d = (FH / 2) / Math.tan(vfov / 2);
  const dir = S.fwd.clone().applyAxisAngle(UP, (P2.yaw || 0) * DEG);
  let pos = S.p.clone().addScaledVector(dir, d); pos.y = S.p.y + aimH;
  if (P2.height === 'low') pos.y = S.p.y + Math.max(0.25, S.H * 0.12);
  if (P2.height === 'lowtrack') pos.y = S.p.y + 0.35;
  if (P2.height === 'high') pos.y = S.p.y + aimH + d * 0.6;
  if (P2.height === 'top') { pos = S.p.clone(); pos.y += d + S.H; pos.addScaledVector(S.fwd, -0.01); }
  const cam = addObject('camera', { silent: true, name: P2.lb + ' ' + focal + 'mm', base: { focal }, cons: { aim: P2.ots ? null : subj.id, aimH: aimH, shake: P2.shake || 0 } });
  if (P2.ots) { const right = new THREE.Vector3(Math.cos(S.yaw), 0, -Math.sin(S.yaw)); pos = S.p.clone().addScaledVector(S.fwd, -0.75).addScaledVector(right, -0.32); pos.y = S.p.y + S.H * 0.93; const look = S.p.clone().addScaledVector(S.fwd, 4); look.y = S.p.y + S.H * 0.85; const D = look.sub(pos); cam.base.ry = Math.atan2(-D.x, -D.z) / DEG; cam.base.rx = Math.asin(D.y / D.length()) / DEG; }
  cam.base.rz = P2.roll || 0;
  if (P2.height === 'top') { cam.base.rx = -90; cam.base.ry = S.yaw / DEG + 180; cam.cons.aim = null; }
  const setPos = (v) => { cam.base.px = v.x; cam.base.py = v.y; cam.base.pz = v.z; };
  setPos(pos);
  const moving = ['px', 'pz', 'py'].some(c => hasAnim(subj, c));
  const f1 = Math.min(project.duration, f0 + Math.round((P2.dur || 4) * project.fps));
  const Sm = { px: [], py: [], pz: [], focal: [] }, push = (f, v) => { Sm.px.push({ f, v: v.x }); Sm.py.push({ f, v: v.y }); Sm.pz.push({ f, v: v.z }); };
  if (P2.move === 'follow' || P2.move === 'track' || P2.move === 'drone') { if (moving || P2.move !== 'track') { cam.cons.follow = subj.id; const off = pos.clone().sub(S.p); cam.base.px = off.x; cam.base.py = off.y; cam.base.pz = off.z; } }
  if (P2.move && f1 > f0) {
    for (let f = f0; f <= f1; f++) {
      const u = EASE.inout((f - f0) / (f1 - f0)); let v = pos.clone();
      if (P2.move === 'dollyin') v = S.p.clone().addScaledVector(dir, lerp(d, d * 0.42, u)).setY(pos.y);
      else if (P2.move === 'dollyout') v = S.p.clone().addScaledVector(dir, lerp(d, d * 2.6, u)).setY(lerp(pos.y, pos.y + 1.2, u));
      else if (P2.move === 'orbit') { v = pos.clone().sub(S.p).applyAxisAngle(UP, (P2.arc || 180) * DEG * u).add(S.p); if (cam.cons.follow) v.sub(S.p); }
      else if (P2.move === 'crane') { v = pos.clone().setY(lerp(pos.y, pos.y + (P2.rise || 6), u)); if (!P2.rise) v.addScaledVector(dir, d * 0.4 * u); if (cam.cons.follow) v.sub(S.p); }
      else if (P2.move === 'vertigo') { v = S.p.clone().addScaledVector(dir, lerp(d, d * 0.45, u)).setY(pos.y); Sm.focal.push({ f, v: focal * lerp(d, d * 0.45, u) / d }); }
      else if (P2.move === 'track') { if (cam.cons.follow) v = pos.clone().sub(S.p).add(new THREE.Vector3(0, 0, 0)).addScaledVector(S.fwd, lerp(0.6, -0.6, u)); else { const along = S.fwd.clone(); v = pos.clone().addScaledVector(along, lerp(-3, 3, u)); } }
      else if (P2.move === 'follow') { v = pos.clone().sub(S.p).multiplyScalar(lerp(1, 0.9, u)); }
      else if (P2.move === 'drone') { const off = pos.clone().sub(S.p); v = off.clone().multiplyScalar(lerp(0.5, 1.3, u)); v.y = lerp(1.5, 18, u); }
      push(f, v);
    }
    for (const ch of ['px', 'py', 'pz']) writeSamples(cam, ch, Sm[ch], 'simplify', 0.003);
    if (Sm.focal.length) writeSamples(cam, 'focal', Sm.focal, 'simplify', 0.05);
  }
  if (P2.custom && f1 > f0) customMove(cam, P2, S, f0, f1);
  buildRuntime(cam); bump();
  project.activeCamera = cam.id; select(cam.id); commit(); renderOutliner();
  toast(`${P2.lb} enquadrando ${subj.name} — distância ${fmt(d, 1)} m`);
  return cam;
}

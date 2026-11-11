/* ============================================================
   PILOTAR & GRAVAR MOVIMENTO
   ============================================================ */
const pilot = { on: false, id: null, kind: null, rec: false, s: {}, keys: new Set(), samples: null, f0: 0, tExtra: 0, acc: 0, view: 'chase', mode: 'simplify', look: { dx: 0, dy: 0, wheel: 0 } };
const K = (c) => pilot.keys.has(c) ? 1 : 0;
function pilotKindOf(o) { return o.type === 'camera' ? 'camera' : (ASSETS[o.type].pilot || 'prop'); }
function startPilot(id) {
  const o = getObj(id); if (!o) return;
  if (playing) togglePlay(false);
  pilot.on = true; pilot.id = id; pilot.kind = pilotKindOf(o); pilot.rec = false; pilot.tExtra = 0; pilot.keys.clear();
  resetPilotState();
  gizmo.detach();
  pilot.view = pilot.kind === 'camera' ? 'pilotcam' : 'chase';
  orbit.enabled = false;
  $('#pilotHud').classList.add('show');
  $('#hudKeys').innerHTML = `<b style="color:var(--tx)">${esc(o.name)}</b> — ${PILOT_INFO[pilot.kind].keys}<br><kbd>R</kbd> gravar/parar · <kbd>V</kbd> vista: <span id="hudView"></span> · gravação: <select id="hudMode" style="font-size:11px;padding:0 3px"><option value="simplify">keys otimizadas</option><option value="every">key a cada frame</option></select>`;
  $('#hudMode').value = pilot.mode; $('#hudMode').onchange = (e) => { pilot.mode = e.target.value; e.target.blur(); };
  updateHudView(); renderInspector(); renderOutliner();
  renderer.domElement.focus?.();
}
function resetPilotState() {
  const o = getObj(pilot.id), f = curFrame;
  const p = Object.assign(defaultParams(o.type), o.params);
  pilot.s = { pos: new THREE.Vector3(), rx: getVal(o, 'rx', f) * DEG, ry: getVal(o, 'ry', f) * DEG, rz: getVal(o, 'rz', f) * DEG, v: 0, steer: 0, dist: 0, yawRate: 0, vy: 0, focal: o.type === 'camera' ? getVal(o, 'focal', f) : 35, vel: new THREE.Vector3(), p };
  const wasOn = pilot.on; pilot.on = false; worldPos(o, f, pilot.s.pos); pilot.on = wasOn;
  pilot.s.tyaw = pilot.s.ry; pilot.s.tpitch = pilot.s.rx; pilot.s.tfocal = pilot.s.focal;
  if (pilot.kind === 'bird' && !ASSETS[o.type].hover) pilot.s.v = 0;
}
function exitPilot() {
  if (pilot.rec) stopRecording();
  pilot.on = false; pilot.keys.clear(); orbit.enabled = true;
  $('#pilotHud').classList.remove('show');
  attachGizmo(); renderInspector(); renderOutliner();
}
function updateHudView() { const el = $('#hudView'); if (el) el.textContent = { chase: 'perseguição', free: 'livre', cam: 'câmera ativa', pilotcam: 'pela câmera' }[pilot.view]; }
function cyclePilotView() {
  const order = pilot.kind === 'camera' ? ['pilotcam', 'free'] : ['chase', 'free', 'cam'];
  pilot.view = order[(order.indexOf(pilot.view) + 1) % order.length];
  orbit.enabled = pilot.view === 'free';
  if (pilot.view === 'free') { orbit.target.copy(pilot.s.pos); }
  updateHudView();
}
function stepPilot(dt) {
  const s = pilot.s, p = s.p, o = getObj(pilot.id); if (!o) return;
  const W = K('KeyW') || K('ArrowUp'), S = K('KeyS') || K('ArrowDown'), A = K('KeyA') || K('ArrowLeft'), D = K('KeyD') || K('ArrowRight'), sh = K('ShiftLeft') || K('ShiftRight');
  const prevY = s.pos.y;
  if (pilot.kind === 'car') {
    const vmax = (p.vmax || 180) / 3.6, wb = rt.get(o.id)?.rig?.wb || 2.7;
    let acc = 0;
    if (W) acc = s.v < -0.2 ? 14 : 7 * (1 - clamp(s.v / vmax, 0, 1)) + 0.5;
    if (S) acc = s.v > 0.3 ? -12 : -5;
    s.v += acc * dt;
    if (!W && !S) { const dec = (0.4 + Math.abs(s.v) * 0.04) * dt; s.v = Math.abs(s.v) <= dec ? 0 : s.v - Math.sign(s.v) * dec; }
    if (K('Space')) s.v *= Math.max(0, 1 - 3 * dt);
    s.v = clamp(s.v, -12, vmax);
    const target = (A - D) * 0.62 / (1 + Math.abs(s.v) / 16);
    s.steer += (target - s.steer) * Math.min(1, 7 * dt);
    s.yawRate = s.v / wb * Math.tan(s.steer);
    s.ry += s.yawRate * dt;
    s.pos.x += Math.sin(s.ry) * s.v * dt; s.pos.z += Math.cos(s.ry) * s.v * dt;
    s.dist += s.v * dt;
  } else if (pilot.kind === 'walker' || pilot.kind === 'prop') {
    const walk = p.walk || 1.4, run = p.run || 4.5;
    const fast = pilot.kind === 'prop' ? (sh ? 8 : 2.5) : (sh ? run : walk);
    const target = W ? fast : S ? -walk * 0.6 : 0;
    s.v += (target - s.v) * Math.min(1, (pilot.kind === 'prop' ? 5 : 2.6) * dt);
    if (Math.abs(s.v) < 0.01 && !W && !S) s.v = 0;
    s.yawRate = (A - D) * (pilot.kind === 'prop' ? 1.6 : 2.4 / (1 + Math.abs(s.v) * 0.12));
    s.ry += s.yawRate * dt;
    s.pos.x += Math.sin(s.ry) * s.v * dt; s.pos.z += Math.cos(s.ry) * s.v * dt;
    if (pilot.kind === 'prop') s.pos.y = Math.max(-50, s.pos.y + (K('KeyE') - K('KeyQ')) * (sh ? 5 : 2) * dt);
    s.dist += s.v * dt / Math.max(0.01, getVal(o, 'sy', curFrame));
  } else if (pilot.kind === 'bird') {
    const sp = p.speed || 9, hover = ASSETS[o.type].hover;
    const target = hover ? (W ? sp : S ? -sp * 0.4 : 0) : (W ? sp * 1.6 : S ? sp * 0.45 : sp);
    s.v += (target - s.v) * Math.min(1, 1.5 * dt);
    const turn = A - D;
    s.yawRate = turn * (hover ? 1.4 : 1.15);
    s.ry += s.yawRate * dt;
    const tvy = (K('Space') - K('KeyC')) * (hover ? 5 : 4) + (K('KeyE') - K('KeyQ')) * 4;
    s.vy += (tvy - s.vy) * Math.min(1, 2.5 * dt);
    s.pos.x += Math.sin(s.ry) * s.v * dt; s.pos.z += Math.cos(s.ry) * s.v * dt; s.pos.y = Math.max(0, s.pos.y + s.vy * dt);
    const bank = hover ? -turn * 0.12 - 0 : -turn * 0.55, pitch = hover ? s.v / Math.max(sp, 1) * 0.25 : -Math.atan2(s.vy, Math.max(2, Math.abs(s.v)));
    s.rz += (bank - s.rz) * Math.min(1, 3 * dt); s.rx += (pitch - s.rx) * Math.min(1, 3 * dt);
    s.dist += Math.abs(s.v) * dt;
  } else if (pilot.kind === 'camera') {
    const lk = pilot.look, zoomK = 35 / s.focal;
    s.tyaw -= lk.dx * 0.0028 * zoomK; s.tpitch = clamp(s.tpitch - lk.dy * 0.0028 * zoomK, -1.5, 1.5);
    s.tfocal = clamp(s.tfocal * Math.exp(lk.wheel * 0.0012), 8, 400);
    lk.dx = lk.dy = lk.wheel = 0;
    s.ry += (s.tyaw - s.ry) * Math.min(1, 9 * dt); s.rx += (s.tpitch - s.rx) * Math.min(1, 9 * dt); s.focal += (s.tfocal - s.focal) * Math.min(1, 6 * dt);
    s.rz += (K('KeyZ') - K('KeyX')) * 0.6 * dt;
    const cp = Math.cos(s.rx), fwd = new THREE.Vector3(-Math.sin(s.ry) * cp, Math.sin(s.rx), -Math.cos(s.ry) * cp), right = new THREE.Vector3(Math.cos(s.ry), 0, -Math.sin(s.ry));
    const dir = new THREE.Vector3().addScaledVector(fwd, W - S).addScaledVector(right, D - A).addScaledVector(UP, K('KeyE') - K('KeyQ'));
    const speed = 5 * (sh ? 4 : 1) * (K('AltLeft') || K('AltRight') ? 0.2 : 1);
    if (dir.lengthSq() > 0) dir.normalize().multiplyScalar(speed);
    s.vel.lerp(dir, Math.min(1, 3.5 * dt));
    s.pos.addScaledVector(s.vel, dt); s.v = s.vel.length();
  }
  s.vy = pilot.kind === 'bird' ? s.vy : (s.pos.y - prevY) / dt;
}
function startRecording() {
  if (!pilot.on || pilot.rec) return;
  pilot.rec = true; pilot.f0 = curFrame; pilot.acc = 0; pilot.samples = {};
  for (const ch of PILOT_INFO[pilot.kind].ch) pilot.samples[ch] = [];
  recordSample();
  $('#hudRec').innerHTML = '<span id="recDot"></span> Parar (R)';
}
function recordSample() {
  const o = getObj(pilot.id), s = pilot.s, f = curFrame;
  const pos = s.pos.clone();
  const fl = o.cons && o.cons.follow && getObj(o.cons.follow);
  if (fl) { pilot.on = false; pos.sub(worldPos(fl, f, new THREE.Vector3())); pilot.on = true; }
  const vals = { px: pos.x, py: pos.y, pz: pos.z, rx: s.rx / DEG, ry: s.ry / DEG, rz: s.rz / DEG, focal: s.focal };
  for (const ch in pilot.samples) pilot.samples[ch].push({ f, v: vals[ch] });
}
function stopRecording() {
  if (!pilot.rec) return;
  pilot.rec = false; $('#hudRec').innerHTML = '● Gravar (R)';
  const o = getObj(pilot.id); let n = 0;
  const eps = { px: 0.015, py: 0.015, pz: 0.015, rx: 0.35, ry: 0.35, rz: 0.35, focal: 0.25 };
  for (const ch in pilot.samples) { const sm = pilot.samples[ch]; if (sm.length < 2) continue; writeSamples(o, ch, sm, pilot.mode, eps[ch]); n += o.tracks[ch].length; }
  const frames = (pilot.samples.px || []).length;
  pilot.samples = null;
  if (frames > 1) { commit(); toast(`Gravado: ${frames} frames → ${n} keyframes`); } else toast('Gravação muito curta');
  renderInspector(); renderOutliner(); tlDirty = true;
}
/* olhar com o mouse quando pilotando câmera */
let lookDrag = null;
renderer.domElement.addEventListener('pointerdown', e => { if (pilot.on && pilot.kind === 'camera' && pilot.view === 'pilotcam') { lookDrag = { x: e.clientX, y: e.clientY }; renderer.domElement.setPointerCapture(e.pointerId); e.preventDefault(); } });
renderer.domElement.addEventListener('pointermove', e => { if (lookDrag) { pilot.look.dx += e.clientX - lookDrag.x; pilot.look.dy += e.clientY - lookDrag.y; lookDrag = { x: e.clientX, y: e.clientY }; } });
renderer.domElement.addEventListener('pointerup', () => { lookDrag = null; });
renderer.domElement.addEventListener('wheel', e => { if (pilot.on && pilot.kind === 'camera' && pilot.view === 'pilotcam') { pilot.look.wheel += e.deltaY; e.preventDefault(); } }, { passive: false });

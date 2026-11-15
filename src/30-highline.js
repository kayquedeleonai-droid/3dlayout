/* ============================================================
   HIGHLINE (fita de corda bamba) — objeto dinâmico que cede sob o peso
   Carga pontual numa fita tensionada: flecha δ = W·s·(L−s) / (T·L)
   (W = peso, s = posição, L = vão, T = tensão). A fita segue o pé de quem anda nela.
   ============================================================ */
def('highline', {
  cat: 'Cenário', label: 'Highline (fita)', icon: '〰️',
  params: [P('span', 'Vão', 'num', 20, { min: 2, max: 200, step: .5 }), P('tension', 'Tensão (kN)', 'num', 6, { min: 1, max: 20, step: .5 }), P('weight', 'Peso de quem anda (kg)', 'num', 75, { min: 20, max: 150, step: 1 }), P('color', 'Cor da fita', 'color', '#e8c13a'), P('walker', 'Quem anda (id)', 'text', '')],
  build(p) {
    const g = new THREE.Group(), m = M(p.color, { r: .6 }), dark = M('#2b2c30', { r: .5 }), steel = M('#9aa0a6', { r: .35, m: .6 });
    const seg = () => { const s = box(0.025, 0.006, 1, m, 0, 0, 0, g); s.geometry.translate(0, 0, 0.5); return s; };
    const a = seg(), b = seg();
    // ancoragens: placa + olhal + fita de backup
    for (const z of [0, p.span]) { box(0.3, 0.06, 0.3, dark, 0, -0.03, z + (z ? 0.25 : -0.25), g); cyl(0.04, 0.04, 0.12, steel, 0, 0.0, z, g); }
    g.userData.rig = { g, a, b, span: p.span };
    return g;
  },
  anim(rig, c, p) {
    const L = rig.span, f = c.t * project.fps, A = new THREE.Vector3(0, 0, 0), B = new THREE.Vector3(0, 0, L);
    let P2 = null; const w = p.walker && getObj(p.walker);
    if (w) { rig.g.updateMatrixWorld(true); const wp = worldPos(w, f, new THREE.Vector3()); const lp = rig.g.worldToLocal(wp); if (lp.z > 0.05 && lp.z < L - 0.05 && Math.abs(lp.x) < 1.2 && lp.y > -3 && lp.y < 0.15) P2 = lp.setY(lp.y - 0.003); }
    if (!P2) { const s = L / 2, d = (9.81 * 3) * s * (L - s) / (p.tension * 1000 * L); P2 = new THREE.Vector3(0, -d, s); } // só o peso da fita
    const put = (m, p0, p1) => { m.position.copy(p0); m.scale.set(1, 1, p0.distanceTo(p1)); m.lookAt(rig.g.localToWorld(p1.clone())); };
    rig.g.updateMatrixWorld(true); put(rig.a, A, P2); put(rig.b, P2, B);
  }
});
function highlineSag(span, s, tensionKN, kg) { return kg * 9.81 * s * (span - s) / (tensionKN * 1000 * span); }

/* ============================================================
   EXEMPLO · Corda bamba (highline) entre dois prédios — 20 s
   Equilíbrio simulado: pêndulo invertido (pivô no pé) + controle humano com
   atraso de reação (~120 ms), ruído de passada e um desequilíbrio forte no meio.
   ============================================================ */
function buildTightrope() {
  const fps = 24, DUR = 479, N = DUR + 1;
  const P0 = newProject(); P0.name = 'Corda bamba — highline entre prédios'; P0.fps = fps; P0.duration = DUR; P0.aspect = '2.39:1';
  Object.assign(P0.settings, { sky: '#9cbad8', bg2: '#e9e4da', ground: '#8f8b84', grid: false, groundShow: true, groundOpacity: 1, fog: 0.0019, sunAz: 235, sunEl: 32, sunInt: 2.1, groundSize: 3000, exposure: 1.05 });
  loadProjectData(P0);
  const add = (type, opts) => addObject(type, Object.assign({ silent: true }, opts));
  const rnd = mulberry(4417), pick = (a) => a[Math.floor(rnd() * a.length)];
  // ---------- rua 45 m abaixo e os dois prédios ----------
  const road = add('roadpath', { name: 'Rua', params: Object.assign(defaultParams('roadpath'), { lanes: 4, laneW: 3.2, shoulder: 0, sidewalk: true, guard: false, center: 'double', bridge: false, delin: false }) });
  road.params.pts = [[-400, 0, 9.2], [400, 0, 9.2]]; buildRuntime(road);
  const { E } = roadDims(road.params), zA = 9.2 - E, zB = 9.2 + E;              // fachadas encostadas nas calçadas
  const FL = 3.4, FLOORS = 13, ROOF = FL * FLOORS;                               // 44,2 m
  const bA = add('building', { name: 'Prédio A (saída)', params: Object.assign(defaultParams('building'), { width: 34, depth: 26, floors: FLOORS, floorH: FL, color: '#c3bdb1', glass: '#2f4252', style: 'grade' }), base: { px: 0, py: 0, pz: zA - 13 } });
  const bB = add('building', { name: 'Prédio B (chegada)', params: Object.assign(defaultParams('building'), { width: 30, depth: 24, floors: FLOORS + 1, floorH: FL - 0.25, color: '#9aa2aa', glass: '#22313f', style: 'faixas' }), base: { px: 1.5, py: 0, pz: zB + 12 } });
  const roofB = (FLOORS + 1) * (FL - 0.25);
  // vizinhança: prédios dos dois lados da rua, de 6 a 22 andares
  const fac = [['#b9b4aa', '#2b3a4a'], ['#8f979f', '#22313f'], ['#d6d1c7', '#34495c'], ['#6f7377', '#1d2833'], ['#c9bfae', '#3a4652'], ['#a7b4bf', '#1f3a55']];
  for (const sz of [-1, 1]) for (const dir of [-1, 1]) { let x = dir > 0 ? 19 : -19; for (let i = 0; i < 9; i++) { const w = 14 + rnd() * 20, [c, gl] = pick(fac), d = 18 + rnd() * 14, cx = x + dir * w / 2; if (sz < 0 && dir > 0 && cx + w / 2 > 47 && cx - w / 2 < 75) { x += dir * (w + 3); continue; } add('building', { name: 'Prédio', params: Object.assign(defaultParams('building'), { width: w, depth: d, floors: Math.round(6 + rnd() * 16), floorH: 3.3, color: c, glass: gl, style: rnd() < .5 ? 'grade' : 'faixas' }), base: { px: x + dir * w / 2, py: 0, pz: sz < 0 ? zA - d / 2 - rnd() * 3 : zB + d / 2 + rnd() * 3 } }); x += dir * (w + 3 + rnd() * 6); } }
  // prédio de onde a tele filma (tripé no telhado, 15 andares)
  const camRoof = 15 * 3.4; add('building', { name: 'Prédio vizinho (câmera tele)', params: Object.assign(defaultParams('building'), { width: 18, depth: 18, floors: 15, floorH: 3.4, color: '#a9a39a', glass: '#2a3a48', style: 'grade' }), base: { px: 61, py: 0, pz: zA - 9 } });
  // carros lá embaixo (dão escala e vertigem)
  const civil = ['corolla', 'polo', 'compass', 'model3', 'dolphin', 'strada'], cols = ['#e9e9e6', '#c4c7cb', '#2b2d31', '#7d1f22', '#284a73', '#9a9ea3'];
  for (let i = 0; i < 14; i++) { const k = pick(civil), lane = i % 4, dir = lane < 2 ? -1 : 1, x0 = -260 + rnd() * 520, v = (25 + rnd() * 20) / 3.6;
    const o = add('realcar', { name: 'Carro', params: Object.assign(carDefaults(k), { modelName: CAR_DB[k].name, color: pick(cols) }) });
    o.base.pz = 9.2 + (lane - 1.5) * 3.2; o.base.px = x0; o.base.ry = dir > 0 ? 90 : -90; setKey(o, 'px', 0, x0, 'linear'); setKey(o, 'px', DUR, x0 + dir * v * N / fps, 'linear'); buildRuntime(o); }
  // ---------- a fita ----------
  const AY = ROOF + 1.0, A = new THREE.Vector3(0, AY, zA - 0.8), BZ = zB + 0.8, SPAN = BZ - A.z, TENS = 6, KG = 72;
  const line = add('highline', { name: 'Highline (fita 25 mm)', params: Object.assign(defaultParams('highline'), { span: SPAN, tension: TENS, weight: KG }), base: { px: 0, py: AY, pz: A.z } });
  // ---------- simulação de equilíbrio ----------
  const T = (f) => f / fps;
  const phaseAt = (t) => t < 1.2 ? 'idle' : t < 7.6 ? 'walk' : t < 8.9 ? 'wob' : t < 11.6 ? 'crouch' : t < 13.4 ? 'idle' : 'walk';
  const GAIN = { idle: [15, 4.2, 12, 2.0], walk: [15, 4.0, 12, 2.3], wob: [16, 3.0, 13, 1.2], crouch: [21, 6.5, 15, 1.0] };
  const r2 = mulberry(77), gauss = () => { let u = 0, v = 0; while (u === 0) u = r2(); v = r2(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const SUB = 12, dt = 1 / (fps * SUB), DLY = Math.round(0.12 / dt); let th = 0, om = 0, nz = 0; const hist = Array(DLY + 1).fill([0, 0]);
  const lean = [], uu = [];
  for (let i = 0; i < N * SUB; i++) {
    const t = i * dt, ph = phaseAt(t), Lc = ph === 'crouch' ? 0.72 : 1.0, [Kp, Kd, Um, sig] = GAIN[ph];
    nz += -nz / 0.5 * dt + sig * Math.sqrt(dt) * gauss() * 0.28;
    const imp = t >= 7.55 && t < 7.85 ? 2.0 : 0, [td, od] = hist.shift();
    const u = clamp(Kp * td + Kd * od, -Um, Um);
    om += (9.81 / Lc * Math.sin(th) - u + nz + imp) * dt; th += om * dt; hist.push([th, om]);
    if (i % SUB === 0) { lean.push(th); uu.push(u / 4); }
  }
  const n1 = []; { let a = 0; for (let f = 0; f < N + 120; f++) { a += -a * 0.12 + (r2() - 0.5) * 0.5; n1.push(clamp(a, -1, 1)); } }
  // ---------- caminhada na fita: posição s(t) ----------
  const vAt = (t) => { const ramp = (x, a, b) => clamp((x - a) / (b - a), 0, 1); const w1 = ramp(t, 1.0, 1.6) * (1 - ramp(t, 7.3, 7.7)), w2 = ramp(t, 13.2, 13.9); return 0.42 * w1 + 0.46 * w2; };
  const S = [6.0]; for (let f = 1; f < N; f++) S.push(S[f - 1] + vAt(T(f)) / fps);
  // agachar faz a fita "quicar" (oscilação vertical amortecida ~1,3 Hz)
  const bounce = (t) => { const t0 = 8.95; if (t < t0) return 0; const x = t - t0; return 0.07 * Math.exp(-x * 1.4) * Math.sin(2 * Math.PI * 1.3 * x); };
  const walker = add('person', { name: 'Equilibrista', params: Object.assign(defaultParams('person'), { look: 'real', height: 1.76, pose: 'stand' }) });
  const wx = [], wy = [], wz = [], wr = [];
  for (let f = 0; f < N; f++) { const s = S[f], t = T(f); wz.push(A.z + s); wy.push(AY - highlineSag(SPAN, s, TENS, KG) - bounce(t) + 0.003); wx.push(-0.42 * Math.sin(lean[f]) + 0.03 * Math.sin(t * 2.1)); wr.push(lean[f] / DEG); }
  writeSamples(walker, 'px', wx.map((v, f) => ({ f, v })), 'every'); writeSamples(walker, 'py', wy.map((v, f) => ({ f, v })), 'every'); writeSamples(walker, 'pz', wz.map((v, f) => ({ f, v })), 'every'); writeSamples(walker, 'rz', wr.map((v, f) => ({ f, v })), 'every');
  walker.cons.ground = false; Object.assign(walker.base, { px: wx[0], py: wy[0], pz: wz[0] });
  const sec = (t) => Math.round(t * fps);
  walker.acts = [{ c: 'Idle_Loop', f0: 0, f1: sec(1.25), bl: 10 }, { c: 'Walk_Loop', f0: sec(1.25), f1: sec(7.55), rate: 'auto', bl: 10 }, { c: 'Idle_Loop', f0: sec(7.55), f1: sec(8.85), bl: 8, off: 0.6 },
    { c: 'Crouch_Idle_Loop', f0: sec(8.85), f1: sec(11.6), bl: 12 }, { c: 'Idle_Loop', f0: sec(11.6), f1: sec(13.45), bl: 14, off: 1.1 }, { c: 'Walk_Loop', f0: sec(13.45), f1: DUR, rate: 'auto', bl: 10 }];
  const crouchW = Array.from({ length: N }, (_, f) => { const t = T(f), r = (x, a, b) => clamp((x - a) / (b - a), 0, 1); const s = r(t, 8.6, 9.1) * (1 - r(t, 11.4, 11.9)); return s * s * (3 - 2 * s); });
  walker.overlay = { kind: 'tightrope', lean: lean.map(v => +v.toFixed(4)), u: uu.map(v => +v.toFixed(3)), crouch: crouchW.map(v => +v.toFixed(3)), n1: n1.map(v => +v.toFixed(3)) };
  buildRuntime(walker);
  line.params.walker = walker.id; buildRuntime(line);
  // ---------- câmeras ----------
  const body = (o, b, ls) => { const B = CAMERA_BODIES[b], Ls = LENS_SETS[ls]; Object.assign(o.params, { body: b, sensorW: B.w, sensorH: B.h, lensSet: ls, squeeze: String(Ls.sq || 1), tstop: Ls.t, focusAuto: true }); };
  const tgt = add('null', { name: 'Alvo: tronco do equilibrista' }); tgt.camHidden = true; tgt.cons.ground = false; tgt.cons.mount = walker.id; Object.assign(tgt.base, { px: 0, py: 1.15, pz: 0 }); buildRuntime(tgt);
  const feetT = add('null', { name: 'Alvo: pés' }); feetT.camHidden = true; feetT.cons.ground = false; feetT.cons.mount = walker.id; Object.assign(feetT.base, { px: 0, py: 0.12, pz: 0.05 }); buildRuntime(feetT);
  const W = (f) => new THREE.Vector3(wx[clamp(f, 0, DUR)], wy[clamp(f, 0, DUR)], wz[clamp(f, 0, DUR)]);
  const cams = [];
  const mkCam = (name, focal, opts) => { const c = addObject('camera', { silent: true, name, base: { px: 0, py: 1, pz: 0, focal } }); body(c, opts.body || 'alexa35', opts.lens || 'signature'); c.cons.shake = opts.shake ?? 0.15; c.cons.shakeFreq = opts.freq ?? 1.2; c.cons.aim = (opts.aim || tgt).id; c.cons.aimH = 0; if (opts.gear) c.gear = { type: opts.gear }; if (opts.surf != null) c.gear.surfaceY = opts.surf; if (opts.tstop) c.params.tstop = opts.tstop; cams.push(c); return c; };
  const bake = (c, f0, f1, fn) => { const K = { px: [], py: [], pz: [] }; for (let f = Math.max(0, f0 - 6); f <= Math.min(DUR, f1 + 6); f++) { const u = clamp((f - f0) / Math.max(1, f1 - f0), 0, 1), p = fn(f, u * u * (3 - 2 * u), u); K.px.push({ f, v: p.x }); K.py.push({ f, v: p.y }); K.pz.push({ f, v: p.z }); } for (const ch in K) writeSamples(c, ch, K[ch], 'every'); Object.assign(c.base, { px: K.px[0].v, py: K.py[0].v, pz: K.pz[0].v }); };
  // 1 · abertura: drone de lado, bem aberto, subindo devagar (mostra o vão e a rua lá embaixo)
  const c1 = mkCam('01 Drone · abertura', 24, { gear: 'drone', body: 'inspire3', lens: 'generic', shake: 0.12 });
  bake(c1, 0, sec(4.2), (f, s) => new THREE.Vector3(-62 + 16 * s, AY - 16 + 12 * s, 9.2 - 2.5 + 3 * s));  // no cânion da rua: a fita cruza por cima
  // 2 · pés na fita (cable cam paralelo à fita, 1 m abaixo, 50 mm)
  const c2 = mkCam('02 Pés na fita · cable', 50, { gear: 'cable', aim: feetT, tstop: 2.0, shake: 0.08, surf: AY - 6 });
  bake(c2, sec(4.2), sec(7.2), (f) => { const p = W(f); return new THREE.Vector3(1.6, p.y - 0.55, p.z - 2.4 + (f - sec(4.2)) * 0.002); });
  // 3 · tele no tronco/rosto durante o desequilíbrio (do prédio vizinho, 200 mm, tripé)
  const c3 = mkCam('03 Tele · desequilíbrio', 200, { gear: 'tripod', lens: 'optimo', shake: 0.05, tstop: 2.8, surf: 15 * 3.4 });
  bake(c3, sec(7.2), sec(10.6), () => new THREE.Vector3(53.2, camRoof + 1.6, zA - 1.2));
  // 4 · vertigem: drone acima, olhando para baixo (agachado; a rua 45 m abaixo)
  const c4 = mkCam('04 Vertigem · de cima', 18, { gear: 'drone', body: 'inspire3', lens: 'generic', shake: 0.08 });
  bake(c4, sec(10.6), sec(13.6), (f, s) => { const p = W(f); const a = 0.4 + s * 0.55; return new THREE.Vector3(p.x + Math.sin(a) * 2.2, p.y + 7.5 + 2.5 * s, p.z + Math.cos(a) * 2.2 - 1.5); });
  // 5 · contra-plongée da ancoragem de chegada: a fita converge para a lente
  const c5 = mkCam('05 Linha · da ancoragem', 32, { gear: 'tripod', shake: 0.04, surf: roofB });
  bake(c5, sec(13.6), sec(17), () => new THREE.Vector3(0.35, AY + 0.25, BZ + 1.1));
  // 6 · final: drone orbitando meia volta, abrindo
  const c6 = mkCam('06 Drone · órbita final', 35, { gear: 'drone', body: 'inspire3', lens: 'generic', shake: 0.1 });
  bake(c6, sec(17), DUR, (f, s) => { const p = W(f), a = -0.9 + 1.5 * s, r = 9 + 7 * s; return new THREE.Vector3(p.x + Math.sin(a) * r, p.y + 1.5 + 3 * s, p.z + Math.cos(a) * r); });
  project.shots = [[c1, 0, sec(4.2), 'Abertura · o vão', 'Drone voando pelo cânion da rua e subindo: a fita cruza entre os dois prédios, equilibrista pequeno no quadro, a rua 45 m abaixo.'], [c2, sec(4.2), sec(7.2), 'Pés na fita', 'Cable cam paralelo à fita, 50 mm: passos lentos, pés virados para fora, a fita balança.'], [c3, sec(7.2), sec(10.6), 'Desequilíbrio · tele', '200 mm do prédio vizinho: perde o equilíbrio, braços giram, agacha para recuperar.'], [c4, sec(10.6), sec(13.6), 'Vertigem', 'Drone acima olhando para baixo: agachado na fita, a rua lá embaixo.'], [c5, sec(13.6), sec(17), 'Da ancoragem', 'Câmera na ancoragem de chegada, a fita converge para a lente; ele volta a andar.'], [c6, sec(17), DUR, 'Órbita final', 'Drone faz meia volta abrindo o quadro.']]
    .map(([c, start, end, name, notes]) => ({ cam: c.id, start, end, name, notes }));
  normalizeShots(); project.activeCamera = c1.id;
  rebuildAll(); applyFrame(0); commit(); renderOutliner(); renderInspector(); tlDirty = true; renderViewSel(); setView('cam');
  return { walker, line, cams, maxLean: Math.max(...lean.map(Math.abs)) / DEG, sEnd: S[N - 1] };
}

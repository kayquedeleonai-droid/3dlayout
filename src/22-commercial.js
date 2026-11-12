/* ============================================================
   EXEMPLO: COMERCIAL ESPORTIVO 30 s (24 fps, multicâmera)
   Estrada de serra com subidas, grampo e descida; 911 com pilotagem realista
   (freia nas curvas, limite de aderência); 12 planos com equipamento real,
   composição nos terços e leve câmera na mão.
   ============================================================ */
const COMM_ROAD = [[0, 0, -230], [0, 0, -60], [25, 2, 40], [90, 6, 110], [170, 12, 140], [240, 18, 120], [275, 20, 70], [260, 20, 20], [215, 17, 10], [160, 12, -20], [130, 8, -80], [150, 5, -140], [120, 3, -200], [60, 1, -250], [-30, 0, -262], [-260, 0, -262]];
function commScene() {
  const P = newProject(); P.name = 'Comercial esportivo — 911 na serra'; P.fps = 24; P.duration = 719; P.aspect = '2.39:1';
  Object.assign(P.settings, { sky: '#7fa6cf', bg2: '#f0d6b0', ground: '#6b7356', grid: false, groundShow: true, groundOpacity: 1, fog: 0.0022, sunAz: 250, sunEl: 20, sunInt: 2.1, groundSize: 3000, exposure: 1.05 });
  loadProjectData(P);
  const add = (type, opts) => { const o = addObject(type, Object.assign({ silent: true }, opts)); return o; };
  // cenário
  const road = add('roadpath', { name: 'Estrada da serra', params: Object.assign(defaultParams('roadpath'), { lanes: 2, laneW: 3.5, shoulder: 1.2, guard: true, center: 'double', bridge: false, asphalt: '#34363a' }) });
  road.params.pts = COMM_ROAD.map(a => a.slice()); buildRuntime(road);
  add('terrain', { name: 'Montanhas', params: Object.assign(defaultParams('terrain'), { size: 2000, height: 120, feature: 260, flat: 360, color: '#66704f', seed: 4 }), base: { px: 30, py: -0.06, pz: -60 } });
  applyFrame(0);
  const nearRoad = (x, z, m) => { const L = roadsWorld(); for (const R of L) for (const s of R.S) if ((s.x - x) ** 2 + (s.z - z) ** 2 < m * m) return true; return false; };
  const rnd = mulberry(77);
  for (let i = 0; i < 60; i++) { const x = -260 + rnd() * 560, z = -330 + rnd() * 520; if (nearRoad(x, z, 26)) continue; add(rnd() < 0.55 ? 'pine' : 'tree', { name: 'Árvore', params: Object.assign(defaultParams(rnd() < 0.55 ? 'pine' : 'tree'), { height: 8 + rnd() * 9, seed: (rnd() * 999) | 0 }), base: { px: x, pz: z, ry: rnd() * 360 } }); }
  for (let i = 0; i < 16; i++) { const x = 150 + rnd() * 160, z = -40 + rnd() * 200; if (nearRoad(x, z, 18)) continue; add('rock', { name: 'Rocha', params: Object.assign(defaultParams('rock'), { size: 2 + rnd() * 5, seed: (rnd() * 999) | 0 }), base: { px: x, pz: z } }); }
  // carro herói: Porsche 911, faixa da direita, pilotagem realista até 150 km/h
  const car = add('realcar', { name: 'Porsche 911 (herói)', params: Object.assign(carDefaults('p911'), { modelName: CAR_DB.p911.name, color: '#c8102e' }) });
  buildRuntime(car); roadFollow(road, car, 220, 1, 1, 0, 0, true); // traçado completo da estrada; o tempo vem do perfil abaixo
  const drv = add('person', { name: 'Piloto', params: Object.assign(defaultParams('person'), { look: 'clothes', height: 1.72, shirt: '#1d1e22', pants: '#1d1e22', pose: 'sit' }) });
  drv.cons.mount = car.id; drv.cons.ground = false; Object.assign(drv.base, { px: 0.36, py: -0.17, pz: -0.1 }); buildRuntime(drv);
  car.speedProf = realisticProfile(car, { vMax: 150, v0: 112, aLat: 0.95 }); applySpeedProfile(car);
  return { road, car };
}
function carState(car, f) {
  const p = worldPos(car, f, new THREE.Vector3()), y = getVal(car, 'ry', f) * DEG;
  return { p, fw: new THREE.Vector3(Math.sin(y), 0, Math.cos(y)), rt: new THREE.Vector3(-Math.cos(y), 0, Math.sin(y)), yaw: y };
}
function buildSportsCommercial() {
  const { road, car } = commScene(), fps = 24, F = (s) => Math.round(s * fps);
  const H = car.params.height, L = car.params.length;
  const S = (f) => carState(car, clamp(f, 0, project.duration));
  const smooth = (a, b, x) => { const t = clamp((x - a) / Math.max(1e-6, b - a), 0, 1); return t * t * (3 - 2 * t); };
  // lado da tela para onde o carro aponta → deixa "ar" na frente (regra dos terços)
  const lead = (C, f, yThird = 0) => { const st = S(f), v = st.p.clone().setY(st.p.y + 0.55).sub(C).normalize(), r = new THREE.Vector3().crossVectors(v, UP).normalize(), s = st.fw.dot(r); return { x: s > 0.25 ? -1 / 3 : s < -0.25 ? 1 / 3 : 0, y: yThird }; };
  const body = (o, b, ls) => { const B = CAMERA_BODIES[b], Ls = LENS_SETS[ls]; o.params.body = b; o.params.sensorW = B.w; o.params.sensorH = B.h; o.params.lensSet = ls; o.params.squeeze = String(Ls.sq || 1); o.params.tstop = Ls.t; o.params.focusAuto = true; };
  const mkCam = (name, focal, opts = {}) => { const c = addObject('camera', { silent: true, name, base: { px: 0, py: 1.5, pz: 0, rx: 0, ry: 0, rz: 0, focal } }); body(c, opts.body || 'alexa35', opts.lens || 'signature'); c.cons.shake = opts.shake ?? 0.25; c.cons.shakeFreq = opts.freq ?? 1.8; if (opts.aim !== false) { c.cons.aim = car.id; c.cons.aimH = 0.55; } return c; };
  const bake = (c, f0, f1, fn) => { const T = { px: [], py: [], pz: [] }; for (let f = Math.max(0, f0 - 6); f <= Math.min(project.duration, f1 + 6); f++) { const u = clamp((f - f0) / Math.max(1, f1 - f0), 0, 1), p = fn(f, u); T.px.push({ f, v: p.x }); T.py.push({ f, v: p.y }); T.pz.push({ f, v: p.z }); } for (const ch in T) writeSamples(c, ch, T[ch], 'simplify', 0.003); c.base.px = T.px[0].v; c.base.py = T.py[0].v; c.base.pz = T.pz[0].v; };
  const frameAt = (c, f, y = 0) => { const p = new THREE.Vector3(getVal(c, 'px', f), getVal(c, 'py', f), getVal(c, 'pz', f)); const l = lead(p, f, y); c.cons.frameX = l.x; c.cons.frameY = l.y; };
  const shots = [];
  const shot = (c, a, b, name, notes) => { shots.push({ cam: c.id, start: F(a), end: F(b) - 1, name, notes }); };
  // ---- carro de câmera (Mercedes GLE63s + Russian Arm) com posições relativas ao herói por plano ----
  const camcar = addObject('suv', { silent: true, name: 'Carro de câmera (Russian Arm)', params: Object.assign(defaultParams('suv'), { length: 4.94, width: 2.01, height: 1.78, color: '#17181b' }) });
  camcar.camHidden = true;
  const OFF = [[F(0), 0, 9.6], [F(5.5), 0, 9.6], [F(8), -3.5, 0.2], [F(12), -3.5, 0.2], [F(25), 0, -11.0], [F(30), 0, -11.0]]; // [frame, lateral (+ = direita do herói), à frente]
  const offAt = (f) => { for (let i = 0; i < OFF.length - 1; i++) { const a = OFF[i], b = OFF[i + 1]; if (f <= b[0]) { const u = smooth(a[0], b[0], f); return [lerp(a[1], b[1], u), lerp(a[2], b[2], u)]; } } return OFF[OFF.length - 1].slice(1); };
  { const T = { px: [], pz: [], ry: [] }; let prev = null; for (let f = 0; f <= project.duration; f++) { const st = S(f), [a, b] = offAt(f), p = st.p.clone().addScaledVector(st.rt, a).addScaledVector(st.fw, b); let y = st.yaw / DEG; if (prev != null) { while (y - prev > 180) y -= 360; while (y - prev < -180) y += 360; } prev = y; T.px.push({ f, v: p.x }); T.pz.push({ f, v: p.z }); T.ry.push({ f, v: y }); } for (const ch in T) writeSamples(camcar, ch, T[ch], 'simplify', ch === 'ry' ? 0.05 : 0.004); camcar.base.px = T.px[0].v; camcar.base.pz = T.pz[0].v; buildRuntime(camcar); }
  const onArm = (c, x, y, z) => { c.cons.mount = camcar.id; c.gear = { type: 'russian', veh: camcar.id }; for (const ch of ['px', 'py', 'pz']) delete c.tracks[ch]; Object.assign(c.base, { px: x, py: y, pz: z }); };
  // 1 · abertura aérea
  { const A = S(F(2.4)), c = mkCam('01 Abertura · drone', 24, { body: 'inspire3', lens: 'dl', shake: 0.12 }); c.gear = { type: 'drone' };
    bake(c, F(0), F(3), (f, u) => A.p.clone().addScaledVector(A.fw, lerp(30, 24, u)).addScaledVector(A.rt, lerp(17, 14, u)).setY(A.p.y + lerp(15, 10, u)));
    frameAt(c, F(1.5), -1 / 3); shot(c, 0, 3, 'Abertura aérea', 'Drone desce devagar enquanto o 911 entra no quadro pela reta; carro no terço inferior.'); }
  // 2 · frontal rasteiro no braço
  { const c = mkCam('02 Frontal rasteiro · Russian Arm', 24, { shake: 0.3 }); onArm(c, -0.8, 0.45, -2.8); c.cons.frameX = 1 / 3; c.cons.frameY = 0;
    shot(c, 3, 5.5, 'Frontal rasteiro', 'Câmera a 45 cm do asfalto, 7 m à frente; o carro avança no terço direito a 150 km/h.'); }
  // 3 · roda (car mount no herói)
  { const c = mkCam('03 Detalhe roda · car mount', 18, { aim: false, shake: 0.35, freq: 3 }); c.cons.mount = car.id; c.gear = { type: 'carmount' }; Object.assign(c.base, { px: car.params.width / 2 + 0.5, py: 0.34, pz: L * 0.3, ry: 10, rx: -4 });
    shot(c, 18.25, 19.5, 'Detalhe da roda', 'Ventosa na lateral dianteira olhando para trás: roda girando, asfalto borrado.'); }
  // 4 · tele lateral, tripé
  { const A = S(F(6.8)), c = mkCam('04 Tele frontal · tripé 135 mm', 135, { shake: 0.06 }); c.gear = { type: 'tripod' }; const B = S(F(8.7)), p = B.p.clone().addScaledVector(B.rt, 2.5); p.y = B.p.y + 1.55; Object.assign(c.base, { px: p.x, py: p.y, pz: p.z });
    frameAt(c, F(6.8), 0); shot(c, 5.5, 8, 'Tele na subida', 'Tripé no acostamento 60 m à frente: a 135 mm o carro vem crescendo na subida, compressão de tele.'); }
  // 5 · capô olhando o piloto
  { const c = mkCam('05 Capô · piloto', 18, { aim: false, shake: 0.2, freq: 2.6 }); c.cons.mount = car.id; c.gear = { type: 'carmount' }; Object.assign(c.base, { px: 0.15, py: H * 0.62 + 0.3, pz: L * 0.3, ry: 4, rx: -2 });
    shot(c, 16.5, 18.25, 'Capô · piloto', 'Hood mount olhando o para-brisa; o céu e a serra passam no reflexo.'); }
  // 6 · technocrane no grampo
  { const A = S(F(15.4)), c = mkCam('06 Grampo · Technocrane', 40, { shake: 0.05 });
    bake(c, F(12), F(16.5), (f, u) => A.p.clone().addScaledVector(A.rt, lerp(-9, -8.5, u)).addScaledVector(A.fw, lerp(-6, 0, smooth(0, 1, u))).setY(A.p.y + lerp(6, 1.6, smooth(0, 1, u))));
    c.gear = { type: 'techno' }; buildRuntime(c); applyFrame(F(14)); frameAt(c, F(14.5), -1 / 3); shot(c, 12, 16.5, 'Grampo · grua', 'Technocrane no lado de dentro do grampo: desce de 6 m até 1,6 m enquanto o carro freia e contorna.'); }
  // 7 · lado a lado
  { const c = mkCam('07 Lado a lado · Russian Arm', 21, { shake: 0.25 }); onArm(c, 0.6, 1.0, 0.3); applyFrame(F(9.5)); c.cons.frameX = 0; c.cons.frameY = 0;
    const st = S(F(9.5)), cp = rt.get(c.id) ? worldPos(c, F(9.5), new THREE.Vector3()) : st.p; const l = lead(cp, F(9.5)); c.cons.frameX = l.x;
    shot(c, 8, 12, 'Lado a lado', 'Carro de câmera na outra faixa, braço a 1 m de altura, 150 km/h na subida em curva.'); }
  // 8 · FPV na descida
  { const c = mkCam('08 Descida · FPV', 20, { body: 'komodo', lens: 'generic', shake: 0.4, freq: 2.2 }); c.gear = { type: 'fpv' };
    bake(c, F(19.5), F(22.5), (f, u) => { const st = S(f); return st.p.clone().addScaledVector(st.fw, lerp(-8, -3.8, u)).addScaledVector(st.rt, lerp(1.8, -0.6, u)).setY(st.p.y + lerp(3.2, 0.9, smooth(0, 1, u))); });
    c.cons.frameX = 0; c.cons.frameY = -1 / 3; shot(c, 19.5, 22.5, 'Descida · FPV', 'FPV mergulha atrás do carro na descida, passando de 3 m para 0,9 m.'); }
  // 9 · câmera na mão no S
  { const A = S(F(24.1)), c = mkCam('09 Ápice · câmera na mão', 18, { shake: 0.9, freq: 1.6 }); c.gear = { type: 'handheld' }; const p = A.p.clone().addScaledVector(A.rt, 2.6).addScaledVector(A.fw, 9); p.y = A.p.y + 0.7; Object.assign(c.base, { px: p.x, py: p.y, pz: p.z });
    frameAt(c, F(23.6), 0); shot(c, 22.5, 25, 'Ápice na mão', 'Operador agachado no acostamento, no ápice do S; o carro passa a 2,5 m da lente.'); }
  // 10 · traseira no braço
  { const c = mkCam('10 Traseira · Russian Arm', 28, { shake: 0.3 }); onArm(c, -0.4, 0.75, 3.7); c.cons.frameX = 0; c.cons.frameY = -1 / 3;
    shot(c, 25, 27.5, 'Traseira', 'Braço baixo atrás do carro, lanternas no terço inferior saindo do S.'); }
  // 11 · final aéreo
  { const A = S(F(28.4)), c = mkCam('11 Final · drone sobe', 28, { body: 'inspire3', lens: 'dl', shake: 0.1 }); c.gear = { type: 'drone' };
    bake(c, F(27.5), F(30), (f, u) => A.p.clone().addScaledVector(A.fw, lerp(10, 6, u)).addScaledVector(A.rt, lerp(12, 14, u))
      .setY(A.p.y + lerp(3, 20, u)));
    frameAt(c, F(29), -1 / 3); shot(c, 27.5, 30, 'Final aéreo', 'Drone sobe e revela a serra enquanto o 911 some na próxima reta.'); }
  project.shots = shots; normalizeShots(); project.activeCamera = project.shots[0].cam;
  for (const s of project.shots) { const o = getObj(s.cam); if (o.gear && GEAR[o.gear.type] && GEAR[o.gear.type].base) optimizeGearBase(o); }
  project.shots.forEach((s, i) => { const o = getObj(s.cam); o.name = String(i + 1).padStart(2, '0') + o.name.slice(2); });
  rebuildAll(); applyFrame(0); commit(); renderOutliner(); renderInspector(); tlDirty = true; renderViewSel(); setView('cam');
  return { car, camcar };
}

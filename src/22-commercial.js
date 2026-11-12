/* ============================================================
   EXEMPLO: COMERCIAL ESPORTIVO 30 s (24 fps, multicâmera, ritmo rápido)
   Rodovia com curvas abertas, leve subida e ponte sobre um rio (montanhas só no fundo);
   911 até 215 km/h com pilotagem realista; 18 planos curtos com equipamento real
   (hard mounts, tele, FPV, drone, Technocrane, cable cam, câmera na mão).
   ============================================================ */
// rodovia: retas longas, curvas abertas, leve subida, ponte sobre um rio e descida suave — sempre no asfalto
const COMM_ROAD = [[0, 0, -420], [0, 0, -180], [30, 0, -20], [130, 1, 110], [280, 1.5, 175], [430, 2.5, 190], [540, 6.5, 170], [640, 7, 130], [740, 6.5, 80], [840, 2.5, 20], [930, 1, -70], [990, 0.5, -190], [1010, 0, -330], [1010, 0, -620]];
function commScene() {
  const P = newProject(); P.name = 'Comercial esportivo — 911 na rodovia'; P.fps = 24; P.duration = 719; P.aspect = '2.39:1';
  Object.assign(P.settings, { sky: '#6f9cc9', bg2: '#e9d5b5', ground: '#6d7752', grid: false, groundShow: true, groundOpacity: 1, fog: 0.0016, sunAz: 245, sunEl: 16, sunInt: 2.2, groundSize: 6000, exposure: 1.05 });
  loadProjectData(P);
  const add = (type, opts) => addObject(type, Object.assign({ silent: true }, opts));
  const road = add('roadpath', { name: 'Rodovia', params: Object.assign(defaultParams('roadpath'), { lanes: 2, laneW: 3.6, shoulder: 2.5, guard: true, center: 'double', bridge: true, delin: true, asphalt: '#323438' }) });
  road.params.pts = COMM_ROAD.map(a => a.slice()); buildRuntime(road);
  // montanhas só no horizonte: área plana grande em volta da estrada
  add('terrain', { name: 'Montanhas ao fundo', params: Object.assign(defaultParams('terrain'), { size: 4200, height: 210, feature: 420, flat: 1500, color: '#6a7450', seed: 11 }), base: { px: 505, py: -0.06, pz: -120 } });
  // rio sob a ponte
  add('plane', { name: 'Rio', params: Object.assign(defaultParams('plane'), { width: 26, depth: 900, color: '#3e6f8c' }), base: { px: 640, py: 0.04, pz: 130, ry: -62 } });
  applyFrame(0); conformAllTerrain(); applyFrame(0);
  const gnd = (x, z) => terrainAt(x, z) ?? 0, L = roadsWorld();
  const distRoad = (x, z) => { let m = 1e9; for (const R of L) for (let i = 0; i < R.S.length; i += 2) { const s = R.S[i], d = (s.x - x) ** 2 + (s.z - z) ** 2; if (d < m) m = d; } return Math.sqrt(m); };
  const rnd = mulberry(77);
  // árvores em faixas a 18–90 m da pista (parallax de velocidade), fora do rio
  for (let i = 0, n = 0; i < 900 && n < 140; i++) { const x = -120 + rnd() * 1250, z = -700 + rnd() * 980, d = distRoad(x, z); if (d < 18 || d > 95) continue; const rx = x - 640, rz = z - 130, along = rx * Math.sin(-62 * DEG) + rz * Math.cos(-62 * DEG), across = rx * Math.cos(-62 * DEG) - rz * Math.sin(-62 * DEG); if (Math.abs(across) < 20 && Math.abs(along) < 450) continue; const t = rnd() < 0.6 ? 'pine' : 'tree'; add(t, { name: 'Árvore', params: Object.assign(defaultParams(t), { height: 9 + rnd() * 10, seed: (rnd() * 999) | 0 }), base: { px: x, py: gnd(x, z) - 0.1, pz: z, ry: rnd() * 360 } }); n++; }
  const car = add('realcar', { name: 'Porsche 911 (herói)', params: Object.assign(carDefaults('p911'), { modelName: CAR_DB.p911.name, color: '#c8102e' }) });
  buildRuntime(car); roadFollow(road, car, 260, 1, 1, 0, 0, true);
  const drv = add('person', { name: 'Piloto', params: Object.assign(defaultParams('person'), { look: 'clothes', height: 1.72, shirt: '#1d1e22', pants: '#1d1e22', pose: 'sit' }) });
  drv.cons.mount = car.id; drv.cons.ground = false; Object.assign(drv.base, { px: 0.36, py: -0.17, pz: -0.1 }); buildRuntime(drv);
  car.speedProf = realisticProfile(car, { vMax: 215, v0: 170, aLat: 1.05, aAcc: 0.55, aBrk: 1.0 }); applySpeedProfile(car);
  return { road, car };
}
function carState(car, f) {
  const p = worldPos(car, f, new THREE.Vector3()), y = getVal(car, 'ry', f) * DEG;
  return { p, fw: new THREE.Vector3(Math.sin(y), 0, Math.cos(y)), rt: new THREE.Vector3(-Math.cos(y), 0, Math.sin(y)), yaw: y };
}
function buildSportsCommercial() {
  const { road, car } = commScene(), fps = 24, F = (s) => Math.round(s * fps);
  const H = car.params.height, L = car.params.length, W = car.params.width;
  const S = (f) => carState(car, clamp(f, 0, project.duration));
  const smooth = (a, b, x) => { const t = clamp((x - a) / Math.max(1e-6, b - a), 0, 1); return t * t * (3 - 2 * t); };
  const od = odometer(car);
  const posAtDist = (d) => { let f = 0; while (f < project.duration && od.dist[f + 1] < d) f++; const a = od.dist[f], b = od.dist[Math.min(project.duration, f + 1)], u = b > a ? clamp((d - a) / (b - a), 0, 1) : 0; const p = worldPos(car, f, new THREE.Vector3()), q = worldPos(car, Math.min(project.duration, f + 1), new THREE.Vector3()); return p.lerp(q, u); };
  const lead = (C, f, yThird = 0) => { const st = S(f), v = st.p.clone().setY(st.p.y + 0.55).sub(C).normalize(), r = new THREE.Vector3().crossVectors(v, UP).normalize(), s2 = st.fw.dot(r); return { x: s2 > 0.25 ? -1 / 3 : s2 < -0.25 ? 1 / 3 : 0, y: yThird }; };
  const body = (o, b, ls) => { const B = CAMERA_BODIES[b], Ls = LENS_SETS[ls]; o.params.body = b; o.params.sensorW = B.w; o.params.sensorH = B.h; o.params.lensSet = ls; o.params.squeeze = String(Ls.sq || 1); o.params.tstop = Ls.t; o.params.focusAuto = true; };
  const mkCam = (name, focal, opts = {}) => { const c = addObject('camera', { silent: true, name, base: { px: 0, py: 1.5, pz: 0, rx: 0, ry: 0, rz: opts.dutch || 0, focal } }); body(c, opts.body || 'alexa35', opts.lens || 'signature'); c.cons.shake = opts.shake ?? 0.5; c.cons.shakeFreq = opts.freq ?? 2.4; if (opts.aim !== false) { c.cons.aim = car.id; c.cons.aimH = 0.55; } if (opts.gear) c.gear = { type: opts.gear }; return c; };
  const bake = (c, f0, f1, fn) => { const T = { px: [], py: [], pz: [] }; for (let f = Math.max(0, f0 - 4); f <= Math.min(project.duration, f1 + 4); f++) { const u = clamp((f - f0) / Math.max(1, f1 - f0), 0, 1), p = fn(f, u); T.px.push({ f, v: p.x }); T.py.push({ f, v: p.y }); T.pz.push({ f, v: p.z }); } for (const ch in T) writeSamples(c, ch, T[ch], 'simplify', 0.003); c.base.px = T.px[0].v; c.base.py = T.py[0].v; c.base.pz = T.pz[0].v; };
  const place = (c, p) => Object.assign(c.base, { px: p.x, py: p.y, pz: p.z });
  const frameAt = (c, f, y = 0) => { const p = worldPos(c, f, new THREE.Vector3()); const l = lead(p, f, y); c.cons.frameX = l.x; c.cons.frameY = l.y; };
  const onCar = (c, x, y, z, ry = 0, rx = 0) => { c.cons.mount = car.id; c.gear = { type: 'hardmount' }; c.cons.aim = null; Object.assign(c.base, { px: x, py: y, pz: z, ry, rx }); };
  const roadside = (st, lat, fwd, h) => { const p = st.p.clone().addScaledVector(st.rt, lat).addScaledVector(st.fw, fwd); p.y = (groundAt(p.x, p.z) ?? st.p.y) + h; return p; };
  const shots = []; const shot = (c, a, b, name, notes) => shots.push({ cam: c.id, start: F(a), end: F(b) - 1, name, notes });
  // 1 · drone pairando baixo sobre a pista: o carro passa por baixo
  { const A = S(F(1.3)), c = mkCam('Drone baixo', 18, { body: 'inspire3', lens: 'dl', shake: 0.25, gear: 'drone' }); bake(c, 0, F(1.75), (f, u) => A.p.clone().addScaledVector(A.fw, lerp(4, 0, u)).addScaledVector(A.rt, 2).setY(A.p.y + lerp(5, 4, u))); c.cons.frameY = -1 / 3; shot(c, 0, 1.75, 'Abertura · drone baixo', 'Drone a 5 m sobre o asfalto; o 911 passa por baixo a 170 km/h.'); }
  // 2 · roda dianteira (hard mount)
  { const c = mkCam('Roda dianteira', 14, { aim: false, shake: 0.55, freq: 5 }); onCar(c, W / 2 + 0.45, 0.3, L * 0.32, 12, -3); shot(c, 1.75, 3, 'Roda dianteira', 'Rig rígido na lateral: roda a 190 km/h, asfalto e balizadores passando borrados.'); }
  // 3 · tele frontal 200 mm com crash zoom
  { const B = S(F(4.9)), c = mkCam('Tele frontal 200 mm', 200, { shake: 0.12, gear: 'tripod' }); place(c, roadside(B, 4.9, 0, 1.5)); setKey(c, 'focal', F(3), 200); setKey(c, 'focal', F(4.1), 200); setKey(c, 'focal', F(4.5), 300); frameAt(c, F(3.8)); shot(c, 3, 4.5, 'Tele frontal + crash zoom', 'Tripé no acostamento: o carro cresce comprimido pela tele e a lente "puxa" de 200 para 300 mm.'); }
  // 4 · para-choque rasteiro olhando o carro
  { const c = mkCam('Para-choque rasteiro', 18, { aim: false, shake: 0.5, freq: 4.5, dutch: 4 }); onCar(c, 0, 0.42, L / 2 + 1.5, 0, 3); shot(c, 4.5, 5.75, 'Para-choque rasteiro', 'Rig 1,5 m à frente do para-choque, a 42 cm do chão, olhando a frente do carro; a pista corre por baixo.'); }
  // 5 · câmera na mão na curva
  { const A = S(F(6.9)), c = mkCam('Na mão · curva', 16, { shake: 1.2, freq: 2.6, dutch: -7, gear: 'handheld' }); place(c, roadside(A, 3.4, 7, 0.9)); frameAt(c, F(6.4)); shot(c, 5.75, 7.25, 'Na mão · curva', 'Operador no acostamento externo, câmera baixa e inclinada; o carro passa a 3 m em 165 km/h.'); }
  // 6 · interior: piloto
  { const c = mkCam('Interior · piloto', 14, { aim: false, shake: 0.45, freq: 4 }); onCar(c, -0.42, 0.98, 0.05, -78, -4); shot(c, 7.25, 8.5, 'Interior · piloto', 'Câmera no banco do passageiro, grande-angular no piloto e na estrada pelo para-brisa.'); }
  // 7 · lateral baixa
  { const c = mkCam('Lateral baixa', 16, { aim: false, shake: 0.5, freq: 4.2 }); onCar(c, W / 2 + 2.6, 0.6, 0.1, 96, -2); shot(c, 8.5, 10.25, 'Lateral baixa', 'Rig na soleira com braço de 2,6 m: o perfil inteiro do 911 com o fundo correndo atrás.'); }
  // 8 · FPV mergulhando sobre o carro
  { const A = S(F(11)), c = mkCam('FPV mergulho', 20, { body: 'komodo', lens: 'generic', shake: 0.5, freq: 2.4, gear: 'fpv' }); bake(c, F(10.25), F(11.75), (f, u) => A.p.clone().addScaledVector(A.fw, lerp(12, -4, u)).addScaledVector(A.rt, lerp(6, 2, u)).setY(A.p.y + lerp(11, 1.6, smooth(0, 1, u)))); c.cons.frameY = -1 / 3; shot(c, 10.25, 11.75, 'FPV mergulho', 'FPV desce de 11 m até 1,6 m bem quando o carro passa.'); }
  // 9 · traseira (hard mount)
  { const c = mkCam('Traseira baixa', 18, { aim: false, shake: 0.5, freq: 4.5, dutch: -3 }); onCar(c, 0.15, 0.7, -L / 2 - 2.1, 180, 2); shot(c, 11.75, 13.25, 'Traseira baixa', 'Rig atrás do para-choque olhando para a frente: lanternas, escape e a estrada fugindo.'); }
  // 10 · Technocrane na curva
  { const A = S(F(14.2)), c = mkCam('Technocrane · curva', 28, { shake: 0.15, gear: 'techno' }); bake(c, F(13.25), F(15), (f, u) => roadside(A, -7.5, lerp(-2.5, 1.5, u), lerp(3.6, 1.4, u))); buildRuntime(c); frameAt(c, F(14.1), -1 / 3); shot(c, 13.25, 15, 'Curva · Technocrane', 'Grua no lado de dentro da curva desce de 3,6 m a 1,4 m enquanto o carro passa a 210 km/h.'); }
  // 11 · detalhe lanterna/lateral traseira
  { const c = mkCam('Detalhe traseiro', 20, { aim: false, shake: 0.5, freq: 4 }); onCar(c, W / 2 + 0.7, 1.05, -L / 2 - 0.4, 162, -8); shot(c, 15, 16.5, 'Detalhe traseiro', 'Rig no ombro traseiro: para-lama largo e lanterna, céu refletindo.'); }
  // 12 · ponte: tele lateral da margem do rio
  { const A = S(F(18.6)), c = mkCam('Ponte · tele lateral', 85, { shake: 0.1, gear: 'tripod' }); const p = A.p.clone().addScaledVector(A.rt, -70); p.y = 1.6; place(c, p); frameAt(c, F(17.5)); shot(c, 16.5, 18.5, 'Ponte · tele lateral', 'Tripé na margem do rio, 70 m da ponte: panorâmica rápida com o carro cruzando a 210 km/h.'); }
  // 13 · ponte: cable cam sobre a pista
  { const A = S(F(19.4)), c = mkCam('Ponte · cable cam', 20, { shake: 0.18, gear: 'cable' }); bake(c, F(18.5), F(20), (f, u) => A.p.clone().addScaledVector(A.fw, lerp(-2, 10, u)).addScaledVector(A.rt, -1.8).setY(A.p.y + 6.5)); c.cons.frameY = -1 / 3; shot(c, 18.5, 20, 'Ponte · cable cam', 'Cable cam 6,5 m acima do tabuleiro; o carro passa por baixo no sentido contrário do cabo.'); }
  // 14 · drone lateral sobre o rio
  { const A = S(F(21.3)), c = mkCam('Drone · rio', 50, { body: 'inspire3', lens: 'dl', shake: 0.15, gear: 'drone' }); bake(c, F(20), F(22), (f, u) => A.p.clone().addScaledVector(A.rt, -42).addScaledVector(A.fw, lerp(-12, 4, u)).setY(A.p.y + lerp(1, 6, u))); frameAt(c, F(21), -1 / 3); shot(c, 20, 22, 'Drone · rio', 'Drone ao lado da ponte subindo devagar; o carro atravessa o quadro.'); }
  // 15 · capô · piloto
  { const c = mkCam('Capô · piloto', 16, { aim: false, shake: 0.45, freq: 4.2 }); onCar(c, 0.12, H * 0.62 + 0.3, L * 0.3, 4, -2); shot(c, 22, 23.75, 'Capô · piloto', 'Hood mount olhando o para-brisa: piloto e a pista descendo da ponte.'); }
  // 16 · câmera no chão (hi-hat) no acostamento
  { const A = S(F(25.0)), c = mkCam('Hi-hat no chão', 16, { shake: 0.2, gear: 'tripod' }); place(c, roadside(A, 3.4, 0, 0.18)); frameAt(c, F(24.6)); shot(c, 23.75, 25.5, 'Rasteiro no acostamento', 'Câmera a 18 cm do chão na borda da pista: o carro passa a 2 m — puro deslocamento de ar.'); }
  // 17 · FPV perseguindo (o carro foge)
  { const c = mkCam('FPV perseguição', 18, { body: 'komodo', lens: 'generic', shake: 0.55, freq: 2.6, gear: 'fpv' }); const d0 = od.dist[F(25.5)] - 7; bake(c, F(25.5), F(27.75), (f, u) => { const t = (f - F(25.5)) / fps, d = d0 + 33 * t + 0.75 * t * t; const p = posAtDist(d); return p.setY(p.y + lerp(1.4, 2.4, u)); }); c.cons.frameY = -1 / 3; shot(c, 25.5, 27.75, 'FPV perseguição', 'FPV a ~130 km/h atrás do carro, que abre distância a 200 km/h.'); }
  // 18 · final: drone sobe no fim da reta
  { const A = S(F(29.3)), c = mkCam('Final · drone sobe', 24, { body: 'inspire3', lens: 'dl', shake: 0.12, gear: 'drone' }); bake(c, F(27.75), F(30), (f, u) => roadside(A, 6, -30, lerp(2, 18, u))); frameAt(c, F(29), -1 / 3); shot(c, 27.75, 30, 'Final · drone sobe', 'Drone sobe e o 911 some na reta rumo às montanhas.'); }
  project.shots = shots; normalizeShots(); project.activeCamera = project.shots[0].cam;
  for (const s2 of project.shots) { const o = getObj(s2.cam); if (o.gear && GEAR[o.gear.type] && GEAR[o.gear.type].base) optimizeGearBase(o); }
  project.shots.forEach((s2, i) => { const o = getObj(s2.cam); o.name = String(i + 1).padStart(2, '0') + ' ' + o.name; });
  rebuildAll(); applyFrame(0); commit(); renderOutliner(); renderInspector(); tlDirty = true; renderViewSel(); setView('cam');
  return { car };
}

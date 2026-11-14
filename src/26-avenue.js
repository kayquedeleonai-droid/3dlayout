/* ============================================================
   EXEMPLO · Avenida (estilo Paulista) — loop 360° em volta do carro
   30 s a 24 fps · carro herói a ~115 km/h costurando o trânsito
   Câmera FPV dá 4 voltas completas (7,5 s cada): o primeiro e o
   último quadro têm o mesmo ângulo → loop perfeito para trocar o carro na IA.
   ============================================================ */
function buildAvenueLoop() {
  const fps = 24, DUR = 719, T = (DUR + 1) / fps;
  const P = newProject(); P.name = 'Avenida — loop 360° (estilo Paulista)'; P.fps = fps; P.duration = DUR; P.aspect = '2.39:1';
  Object.assign(P.settings, { sky: '#8fb2d4', bg2: '#e4e0d8', ground: '#8e8b85', grid: false, groundShow: true, groundOpacity: 1, fog: 0.0026, sunAz: 300, sunEl: 34, sunInt: 2.0, groundSize: 5000, exposure: 1.05 });
  loadProjectData(P);
  const add = (type, opts) => addObject(type, Object.assign({ silent: true }, opts));
  const rnd = mulberry(2026);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  // ---------- avenida: 4 faixas por sentido (3,3 m), calçadas, prédios recuados ----------
  const LW = 3.3, Z0 = -260, Z1 = 1560;
  const road = add('roadpath', { name: 'Avenida (4+4 faixas)', params: Object.assign(defaultParams('roadpath'), { lanes: 8, laneW: LW, shoulder: 0, sidewalk: true, guard: false, center: 'double', bridge: false, delin: false, asphalt: '#2e3033' }) });
  road.params.pts = [[0, 0, Z0], [0, 0, Z1]]; buildRuntime(road);
  const { hw, E } = roadDims(road.params);
  // sentido +z anda pela direita (x negativo); faixa 0 = junto ao canteiro, 3 = junto à calçada
  const laneX = (k) => -LW * (k + 0.5), laneXo = (k) => LW * (k + 0.5);
  // prédios dos dois lados (torres de 6 a 34 andares, fachadas variadas)
  const facades = [['#b9b4aa', '#2b3a4a'], ['#8f979f', '#22313f'], ['#d6d1c7', '#34495c'], ['#6f7377', '#1d2833'], ['#c9bfae', '#3a4652'], ['#a7b4bf', '#1f3a55'], ['#e1ddd5', '#2a4256']];
  for (const sx of [-1, 1]) {
    let z = Z0;
    while (z < Z1) {
      const w = 16 + rnd() * 26, d = 18 + rnd() * 16, gap = 3 + rnd() * 9, [c, gl] = pick(facades);
      const floors = Math.round(rnd() < 0.25 ? 22 + rnd() * 14 : 7 + rnd() * 16);
      const setback = 5 + rnd() * 6;
      add('building', { name: 'Prédio', params: Object.assign(defaultParams('building'), { width: d, depth: w, floors, floorH: 3.3, color: c, glass: gl, style: rnd() < 0.5 ? 'grade' : 'faixas' }), base: { px: sx * (E + setback + d / 2), py: 0, pz: z + w / 2 } });
      z += w + gap;
    }
  }
  // árvores e postes na calçada
  for (const sx of [-1, 1]) {
    for (let z = Z0 + 10; z < Z1; z += 28) add('tree', { name: 'Árvore', params: Object.assign(defaultParams('tree'), { height: 6 + rnd() * 3 }), base: { px: sx * (hw + 1.9), py: 0, pz: z + rnd() * 6 } });
    for (let z = Z0 + 24; z < Z1; z += 42) add('lamp', { name: 'Poste', params: { height: 9 }, base: { px: sx * (hw + 0.6), py: 0, pz: z, ry: sx > 0 ? -90 : 90 } });
  }
  // ---------- trânsito ----------
  const VH = 112 / 3.6;                                   // velocidade de cruzeiro do herói
  const traffic = [];
  const civil = ['corolla', 'polo', 'compass', 'model3', 'dolphin', 'hilux', 'strada', 'modely'];
  const colors = ['#e9e9e6', '#e9e9e6', '#c4c7cb', '#9a9ea3', '#2b2d31', '#1a1b1e', '#5b6470', '#7d1f22', '#284a73'];
  // costura do herói: troca de faixa (0–2) a cada ~2,3 s; o trânsito é posto na faixa de onde ele acabou de desviar
  const LH = 4.96, N = DUR + 1, CHD = 0.9, zH = (f) => VH * f / fps, sched = []; { let ln = 1, t = 1.3; while (t < T - 1.2) { const to = ln === 1 ? (rnd() < 0.5 ? 0 : 2) : 1; sched.push({ t, from: ln, to }); ln = to; t += 2.1 + rnd() * 0.6; } }
  const heroLat = (t) => { let lat = laneX(1); for (const c of sched) { if (t < c.t) break; const u = clamp((t - c.t) / CHD, 0, 1); lat = lerp(laneX(c.from), laneX(c.to), u * u * (3 - 2 * u)); } return lat; };
  const heroLanes = (t) => { const L = new Set(); for (const dt of [-0.9, -0.45, 0, 0.45, 0.9]) { const x = heroLat(t + dt); for (let k = 0; k < 3; k++) if (Math.abs(x - laneX(k)) < 2.6) L.add(k); } return L; };
  for (const c of sched) { // o carro de quem ele desviou: passa por ele ~0,5 s depois de completar a troca
    const v = (44 + rnd() * 18) / 3.6, tm = c.t + CHD + 0.45 + rnd() * 0.3;
    traffic.push({ bus: false, v, lane: c.from, z0: tm * (VH - v) - 0, L: 4.6, tm });
    if (rnd() < 0.55) { const other = [0, 1, 2].find(k => k !== c.from && k !== c.to); if (other != null) { const v2 = (44 + rnd() * 18) / 3.6, t2 = tm + (rnd() - 0.5) * 1.2; traffic.push({ bus: false, v: v2, lane: other, z0: t2 * (VH - v2), L: 4.6, tm: t2 }); } }
  }
  for (let i = 0; i < 9; i++) { const bus = i % 2 === 0, v = (bus ? 36 + rnd() * 8 : 40 + rnd() * 10) / 3.6; traffic.push({ bus, v, lane: 3, z0: 20 + i * 95 + rnd() * 30, L: bus ? 12 : 4.6 }); }
  for (let i = 0; i < 5; i++) traffic.push({ bus: false, v: (45 + rnd() * 15) / 3.6, lane: i % 4, z0: -12 - i * 14, L: 4.6 }); // ficam para trás
  const zOf = (c, t) => c.z0 + c.v * t;
  // tira do trânsito qualquer carro que o herói chegaria a tocar (folga de 3 m)
  for (let i = traffic.length - 1; i >= 0; i--) { const c = traffic[i], Lc = c.bus ? 12 : 5.4; for (let f = 0; f <= DUR; f += 2) { const t = f / fps; if (Math.abs(heroLat(t) - laneX(c.lane)) < 2.45 && Math.abs(zH(f) - zOf(c, t)) < (LH + Lc) / 2 + 3) { traffic.splice(i, 1); break; } } }
  // objetos do trânsito
  traffic.forEach((c, i) => {
    let o;
    if (c.bus) o = add('bus', { name: 'Ônibus ' + (i + 1), params: Object.assign(defaultParams('bus'), { color: pick(['#c8102e', '#1f5fa8', '#e2e2dc', '#2c8a4b']), length: 12 }) });
    else { const k = pick(civil); o = add('realcar', { name: CAR_DB[k].name.split(' (')[0], params: Object.assign(carDefaults(k), { modelName: CAR_DB[k].name, color: pick(colors) }) }); c.L = o.params.length; }
    o.base.px = laneX(c.lane); o.base.pz = c.z0; o.base.ry = 0;
    setKey(o, 'pz', 0, c.z0, 'linear'); setKey(o, 'pz', DUR, zOf(c, DUR / fps), 'linear'); buildRuntime(o);
  });
  const hero = []; for (let f = 0; f < N; f++) hero.push({ f, x: heroLat(f / fps), z: zH(f), v: VH });
  // checagem de colisão (caixas com 0,5 m de folga)
  let hits = 0; const hitL = []; for (const h of hero) for (const c of traffic) { const t = h.f / fps; if (Math.abs(h.x - laneX(c.lane)) < 1.95 + 0.5 && Math.abs(h.z - zOf(c, t)) < (LH + c.L) / 2 + 0.5) { hits++; if (hitL.length < 12) hitL.push([h.f, c.lane, +(zOf(c, t) - h.z).toFixed(1), +h.x.toFixed(1)]); } }
  for (let i = 0; i < 26; i++) { // sentido contrário
    const k = pick(civil), o = add('realcar', { name: 'Contramão · ' + CAR_DB[k].name.split(' (')[0], params: Object.assign(carDefaults(k), { modelName: CAR_DB[k].name, color: pick(colors) }) });
    const vv = (45 + rnd() * 20) / 3.6, z0 = -150 + rnd() * 1650 + 400 * rnd(), ln = Math.floor(rnd() * 4);
    o.base.px = laneXo(ln); o.base.pz = z0; o.base.ry = 180; setKey(o, 'pz', 0, z0, 'linear'); setKey(o, 'pz', DUR, z0 - vv * T, 'linear'); buildRuntime(o);
  }
  // carro herói + piloto
  const car = add('realcar', { name: 'Carro herói (trocar na IA)', params: Object.assign(carDefaults('taycan'), { modelName: CAR_DB.taycan.name, color: '#c8102e' }) });
  const S = (a, ch) => hero.map(h => ({ f: h.f, v: a(h) }));
  writeSamples(car, 'px', S(h => h.x), 'simplify', 0.002); writeSamples(car, 'pz', S(h => h.z), 'simplify', 0.002);
  const yaw = hero.map((h, i) => { const a = hero[Math.max(0, i - 1)], b = hero[Math.min(N - 1, i + 1)]; return Math.atan2(b.x - a.x, b.z - a.z) / DEG; });
  writeSamples(car, 'ry', hero.map((h, i) => ({ f: h.f, v: yaw[i] })), 'simplify', 0.05);
  car.base.px = hero[0].x; car.base.pz = 0; buildRuntime(car);
  const drv = add('person', { name: 'Piloto', params: Object.assign(defaultParams('person'), { look: 'real', height: 1.78 }) });
  seatInCar(drv, car); buildRuntime(drv);
  // ---------- câmera: FPV orbitando 360° — 3 voltas de 10 s, com rampas ----------
  // movimento de câmera de verdade: o centro da órbita segue o carro suavizado (troca de faixa vira deriva no quadro,
  // não tranco); a velocidade angular tem rampa (demora nos 3/4 de frente e de trás, acelera nas laterais);
  // raio e altura respiram junto; mira com leve antecipação; tudo amostrado quadro a quadro, sem simplificar.
  const gauss = (arr, sig) => { const r = Math.ceil(sig * 3), w = []; for (let j = -r; j <= r; j++) w.push(Math.exp(-(j * j) / (2 * sig * sig))); return arr.map((_, i) => { let a2 = 0, ws = 0; for (let j = -r; j <= r; j++) { const q = arr[clamp(i + j, 0, arr.length - 1)]; a2 += q * w[j + r]; ws += w[j + r]; } return a2 / ws; }); };
  const cxS = gauss(hero.map(h => h.x), 16), yawS = gauss(yaw, 18);   // centro da órbita: carro suavizado (~0,7 s)
  const cam = addObject('camera', { silent: true, name: 'Loop 360° · FPV', base: { px: 0, py: 1.2, pz: 0, focal: 20 } });
  const B = CAMERA_BODIES.komodo, Ls = LENS_SETS.generic; Object.assign(cam.params, { body: 'komodo', sensorW: B.w, sensorH: B.h, lensSet: 'generic', squeeze: '1', tstop: Ls.t, focusAuto: true });
  cam.cons.shake = 0.12; cam.cons.shakeFreq = 1.4; cam.gear = { type: 'fpv' };
  const LOOPS = 3, TH0 = Math.PI * 0.8, A = 0.21, ring = [];
  for (let f = 0; f < N; f++) {
    const phi = 2 * Math.PI * LOOPS * f / N;                 // fase uniforme (3 voltas exatas → loop perfeito)
    const th = TH0 + phi - A * Math.sin(2 * phi);            // rampa: velocidade 0,58× nos 3/4, 1,42× nas laterais
    const k = Math.sin(th - TH0) ** 2;                        // 0 nos ângulos-herói, 1 nas laterais
    const R = 7.4 - 1.3 * k, ht = 0.95 + 1.65 * (k * k * (3 - 2 * k));
    const y = yawS[f] * DEG, lx = R * Math.sin(th), lz = R * Math.cos(th), cx = cxS[f], cz = hero[f].z;
    ring.push({ f, th, R, cx, cz, yw: y, x: cx + lx * Math.cos(y) + lz * Math.sin(y), y: ht, z: cz - lx * Math.sin(y) + lz * Math.cos(y), spd: 1 - 2 * A * Math.cos(2 * phi) });
  }
  // se a órbita passaria perto de outro veículo, sobe por cima dele — com rampa longa (≈1 s), nunca de repente
  const need = ring.map(r => { let m = 0; const t = r.f / fps; for (const c of traffic) if (Math.abs(r.x - laneX(c.lane)) < 2.4 && Math.abs(r.z - zOf(c, t)) < c.L / 2 + 2) m = Math.max(m, (c.bus ? 3.2 : 1.8) + 1.0); return m; });
  const lift = need.map((_, i) => { let m = 0; for (let j = Math.max(0, i - 30); j <= Math.min(N - 1, i + 30); j++) m = Math.max(m, need[j]); return m; });
  const liftS = gauss(lift, 10);
  // quando sobe por cima de alguém, também se afasta (mantém o ângulo de olhar e o carro inteiro no quadro)
  const extra = ring.map((r, i) => Math.max(0, liftS[i] - r.y)), exS = gauss(extra, 6);
  ring.forEach((r, i) => { const e = exS[i], R2 = r.R + e * 1.1, lx = R2 * Math.sin(r.th), lz = R2 * Math.cos(r.th); r.x = r.cx + lx * Math.cos(r.yw) + lz * Math.sin(r.yw); r.z = r.cz - lx * Math.sin(r.yw) + lz * Math.cos(r.yw); r.y = r.y + e; });
  // reconfere: depois de se afastar, pode ter encostado em outro → sobe o necessário (suave)
  const need2 = ring.map(r => { let m = 0; const t = r.f / fps; for (const c of traffic) if (Math.abs(r.x - laneX(c.lane)) < 2.4 && Math.abs(r.z - zOf(c, t)) < c.L / 2 + 2) m = Math.max(m, (c.bus ? 3.2 : 1.8) + 1.0); return m; });
  const l2 = gauss(need2.map((_, i) => { let m = 0; for (let j = Math.max(0, i - 30); j <= Math.min(N - 1, i + 30); j++) m = Math.max(m, need2[j]); return m; }), 10);
  ring.forEach((r, i) => { r.y = Math.max(r.y, l2[i]); });
  const ys = gauss(ring.map(r => r.y), 4); ring.forEach((r, i) => { r.y = ys[i]; });
  for (const ch of ['x', 'y', 'z']) writeSamples(cam, 'p' + ch, ring.map(r => ({ f: r.f, v: r[ch] })), 'every');
  // inclinação de FPV: banca para dentro da curva, mais forte quando acelera nas laterais
  writeSamples(cam, 'rz', ring.map(r => ({ f: r.f, v: -(3 + 5 * (r.spd - 0.58) / 0.84) })), 'every');
  cam.base.px = ring[0].x; cam.base.py = ring[0].y; cam.base.pz = ring[0].z; buildRuntime(cam);
  // alvo da mira: carro suavizado + 2 m à frente (o carro "puxa" o quadro, com folga para respirar)
  const tgt = add('null', { name: 'Alvo da câmera (loop)' }); tgt.camHidden = true;
  const ax = gauss(hero.map(h => h.x), 9);
  writeSamples(tgt, 'px', hero.map((h, i) => ({ f: h.f, v: ax[i] + Math.sin(yawS[i] * DEG) * 0.8 })), 'every');
  writeSamples(tgt, 'pz', hero.map((h, i) => ({ f: h.f, v: h.z + 0.8 })), 'every');
  tgt.base.py = 0.62; buildRuntime(tgt);
  cam.cons.aim = tgt.id; cam.cons.aimH = 0;
  // câmera nunca atravessa um carro
  let camHits = 0; for (const r of ring) { const t = r.f / fps; for (const c of traffic) if (Math.abs(r.x - laneX(c.lane)) < 1.4 && Math.abs(r.z - zOf(c, t)) < c.L / 2 + 0.4 && r.y < (c.bus ? 3.4 : 1.9)) camHits++; }
  project.shots = [{ cam: cam.id, start: 0, end: DUR, name: 'Loop 360° · carro herói', notes: 'FPV orbitando o carro: 3 voltas de 10 s com rampa — demora nos 3/4 de frente e de trás (baixo, 1 m, 7,4 m de distância) e acelera nas laterais subindo a ~3,5 m por cima do trânsito, bancando para dentro. Centro da órbita suavizado: o carro desliza no quadro nas trocas de faixa. Primeiro e último quadro iguais — loop perfeito para trocar o carro na IA.' }];
  normalizeShots(); project.activeCamera = cam.id;
  rebuildAll(); applyFrame(0); commit(); renderOutliner(); renderInspector(); tlDirty = true; renderViewSel(); setView('cam');
  return { car, hits, hitL, camHits, km: (hero[N - 1].z / 1000).toFixed(2), vmin: Math.min(...hero.map(h => h.v)) * 3.6 };
}

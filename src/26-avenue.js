/* ============================================================
   EXEMPLO · Avenida (estilo Paulista) — loop 360° INVISÍVEL
   30 s a 24 fps. Tudo é periódico com o período do filme:
   · o carro anda D = 928 m em 30 s (58 ciclos de tracejado de 16 m)
   · a cidade (prédios, árvores, postes) se repete exatamente a cada D
   · cada carro do trânsito tem uma cópia um período antes/depois
   · a costura do herói começa e termina na mesma faixa
   · a câmera dá 3 voltas exatas, com suavizações "circulares"
   → o quadro 720 é idêntico ao quadro 0: o corte do loop não aparece.
   ============================================================ */
function buildAvenueLoop() {
  const fps = 24, DUR = 719, N = DUR + 1, T = N / fps;
  const DASH = 16, D = 58 * DASH, VH = D / T;                 // 928 m em 30 s = 111,4 km/h
  const P = newProject(); P.name = 'Avenida — loop 360° (estilo Paulista)'; P.fps = fps; P.duration = DUR; P.aspect = '2.39:1';
  Object.assign(P.settings, { sky: '#8fb2d4', bg2: '#e4e0d8', ground: '#8e8b85', grid: false, groundShow: true, groundOpacity: 1, fog: 0.0026, sunAz: 300, sunEl: 34, sunInt: 2.0, groundSize: 5000, exposure: 1.05 });
  loadProjectData(P);
  const add = (type, opts) => addObject(type, Object.assign({ silent: true }, opts));
  const rnd = mulberry(2026);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const wrapT = (t) => ((t % T) + T) % T;
  // ---------- avenida ----------
  const LW = 3.3, Z0 = -40 * DASH, Z1 = D + 45 * DASH;          // começa num múltiplo do tracejado → tracejado periódico
  const road = add('roadpath', { name: 'Avenida (4+4 faixas)', params: Object.assign(defaultParams('roadpath'), { lanes: 8, laneW: LW, shoulder: 0, sidewalk: true, guard: false, center: 'double', bridge: false, delin: false, asphalt: '#2e3033' }) });
  road.params.pts = [[0, 0, Z0], [0, 0, Z1]]; buildRuntime(road);
  const { hw, E } = roadDims(road.params);
  const laneX = (k) => -LW * (k + 0.5), laneXo = (k) => LW * (k + 0.5);
  const inWorld = (z, m = 0) => z > Z0 + m && z < Z1 - m;
  // ---------- cidade: um "quarteirão" de D metros, repetido ----------
  const facades = [['#b9b4aa', '#2b3a4a'], ['#8f979f', '#22313f'], ['#d6d1c7', '#34495c'], ['#6f7377', '#1d2833'], ['#c9bfae', '#3a4652'], ['#a7b4bf', '#1f3a55'], ['#e1ddd5', '#2a4256']];
  const blocks = [];
  for (const sx of [-1, 1]) {
    let z = 0;
    while (true) {
      const w = 16 + rnd() * 26, gap = 3 + rnd() * 9; if (z + w > D - 3) break;
      const [c, gl] = pick(facades);
      blocks.push({ sx, z: z + w / 2, w, d: 18 + rnd() * 16, floors: Math.round(rnd() < 0.25 ? 22 + rnd() * 14 : 7 + rnd() * 16), setback: 5 + rnd() * 6, c, gl, style: rnd() < 0.5 ? 'grade' : 'faixas' });
      z += w + gap;
    }
  }
  for (let k = -1; k <= 2; k++) for (const b of blocks) { const z = b.z + k * D; if (!inWorld(z, 20)) continue;
    add('building', { name: 'Prédio', params: Object.assign(defaultParams('building'), { width: b.d, depth: b.w, floors: b.floors, floorH: 3.3, color: b.c, glass: b.gl, style: b.style }), base: { px: b.sx * (E + b.setback + b.d / 2), py: 0, pz: z } }); }
  const TREE = D / 29, LAMP = D / 20, treeH = Array.from({ length: 58 }, () => 6 + rnd() * 3);
  for (const sx of [-1, 1]) {
    for (let z = Z0 + 10, i = 0; z < Z1; z += TREE, i++) { const ii = ((Math.round((z - Z0 - 10) / TREE) % 29) + 29) % 29 + (sx > 0 ? 29 : 0); add('tree', { name: 'Árvore', params: Object.assign(defaultParams('tree'), { height: treeH[ii] }), base: { px: sx * (hw + 1.9), py: 0, pz: z } }); }
    for (let z = Z0 + 24; z < Z1; z += LAMP) add('lamp', { name: 'Poste', params: { height: 9 }, base: { px: sx * (hw + 0.6), py: 0, pz: z, ry: sx > 0 ? -90 : 90 } });
  }
  // ---------- costura do herói (periódica): 10 trocas, começa e termina na faixa 1 ----------
  const LH = 4.96, CHD = 1.7;                                   // troca de faixa em 1,7 s ≈ 0,6 g de pico (esportivo, realista)
  const sched = []; { let ln = 1; const n = 10; for (let i = 0; i < n; i++) { const t = 0.9 + i * (T - 0.9 - CHD - 0.7) / (n - 1) + (rnd() - 0.5) * 0.3; const to = ln === 1 ? (i % 4 === 0 ? 0 : 2) : 1; sched.push({ t, from: ln, to }); ln = to; } }
  const heroLat0 = (t) => { let lat = laneX(1); for (const c of sched) { if (t < c.t) break; const u = clamp((t - c.t) / CHD, 0, 1); lat = lerp(laneX(c.from), laneX(c.to), u * u * u * (u * (u * 6 - 15) + 10)); } return lat; };
  const heroLat = (t) => heroLat0(wrapT(t));                    // smootherstep: aceleração lateral sem degrau
  const zH = (t) => VH * t;
  // ---------- trânsito (periódico) ----------
  const civil = ['corolla', 'polo', 'compass', 'model3', 'dolphin', 'hilux', 'strada', 'modely'];
  const colors = ['#e9e9e6', '#e9e9e6', '#c4c7cb', '#9a9ea3', '#2b2d31', '#1a1b1e', '#5b6470', '#7d1f22', '#284a73'];
  const base = [];                                              // mesmo sentido: definido pelo instante em que o herói o alcança
  for (const c of sched) {
    const v = (44 + rnd() * 18) / 3.6; base.push({ lane: c.from, v, tm: c.t + 1.85 + rnd() * 0.35 }); // o carro de quem ele desviou
    if (rnd() < 0.6) { const other = [0, 1, 2].find(k => k !== c.from && k !== c.to); if (other != null) base.push({ lane: other, v: (44 + rnd() * 18) / 3.6, tm: c.t + 0.5 + rnd() * 2.2 }); }
  }
  for (let i = 0; i < 6; i++) { const bus = i % 2 === 0; base.push({ lane: 3, bus, v: (bus ? 36 + rnd() * 8 : 40 + rnd() * 10) / 3.6, tm: i * T / 6 + rnd() * 2 }); }
  // posição relativa ao herói: zr(t) = (tm − t)(VH − v). Cópias tm ± T garantem a periodicidade.
  const zr = (c, t) => (c.tm - t) * (VH - c.v);
  let traffic = [];
  for (const c of base) for (let k = -2; k <= 2; k++) { const cc = Object.assign({}, c, { tm: c.tm + k * T, L: c.bus ? 12 : 5.4 }); let vis = false; for (let t = 0; t <= T; t += 0.5) { const r = zr(cc, t); if (r > -260 && r < 520) { vis = true; break; } } if (vis) traffic.push(cc); }
  // remove qualquer carro (e as cópias dele) que o herói tocaria
  const touches = (c) => { for (let f = 0; f < N; f += 1) { const t = f / fps; if (Math.abs(heroLat(t) - laneX(c.lane)) < 2.45 && Math.abs(zr(c, t)) < (LH + c.L) / 2 + 3) return true; } return false; };
  const badBase = new Set(); traffic.forEach(c => { if (touches(c)) badBase.add(base.find(b => b.lane === c.lane && Math.abs(wrapT(b.tm) - wrapT(c.tm)) < 1e-6 && b.v === c.v)); });
  traffic = traffic.filter(c => !badBase.has(base.find(b => b.lane === c.lane && Math.abs(wrapT(b.tm) - wrapT(c.tm)) < 1e-6 && b.v === c.v)));
  const zOf = (c, t) => zH(t) + zr(c, t);
  traffic.forEach(c => { c.look = base.indexOf(base.find(b => b.lane === c.lane && Math.abs(wrapT(b.tm) - wrapT(c.tm)) < 1e-6 && b.v === c.v)); });
  const looks = base.map(b => b.bus ? { bus: true, color: pick(['#c8102e', '#1f5fa8', '#e2e2dc', '#2c8a4b']) } : { model: pick(civil), color: pick(colors) });
  for (const c of traffic) {
    const lk = looks[c.look]; let o;
    if (lk.bus) o = add('bus', { name: 'Ônibus', params: Object.assign(defaultParams('bus'), { color: lk.color, length: 12 }) });
    else o = add('realcar', { name: CAR_DB[lk.model].name.split(' (')[0], params: Object.assign(carDefaults(lk.model), { modelName: CAR_DB[lk.model].name, color: lk.color }) });
    o.base.px = laneX(c.lane); o.base.pz = zOf(c, 0); o.base.ry = 0;
    setKey(o, 'pz', 0, zOf(c, 0), 'linear'); setKey(o, 'pz', DUR, zOf(c, DUR / fps), 'linear'); buildRuntime(o);
  }
  // contramão: posição relativa zr(t) = z0 − (VH + w)t, cópias a cada (VH + w)·T
  for (let i = 0; i < 16; i++) {
    const w = (45 + rnd() * 20) / 3.6, Pw = (VH + w) * T, z0 = rnd() * Pw, ln = Math.floor(rnd() * 4), model = pick(civil), color = pick(colors);
    for (let k = -1; k <= 2; k++) {
      const zz = z0 + k * Pw - 200; let vis = false; for (let t = 0; t <= T; t += 0.5) { const r = zz - (VH + w) * t; if (r > -300 && r < 600) { vis = true; break; } } if (!vis) continue;
      const o = add('realcar', { name: 'Contramão · ' + CAR_DB[model].name.split(' (')[0], params: Object.assign(carDefaults(model), { modelName: CAR_DB[model].name, color }) });
      o.base.px = laneXo(ln); o.base.pz = zz; o.base.ry = 180; setKey(o, 'pz', 0, zz, 'linear'); setKey(o, 'pz', DUR, zz - w * DUR / fps, 'linear'); buildRuntime(o);
    }
  }
  // ---------- herói ----------
  const hero = []; for (let f = 0; f < N; f++) hero.push({ f, x: heroLat(f / fps), z: zH(f / fps) });
  let hits = 0; for (const h of hero) for (const c of traffic) { const t = h.f / fps; if (Math.abs(h.x - laneX(c.lane)) < 2.45 && Math.abs(zr(c, t)) < (LH + c.L) / 2 + 0.5) hits++; }
  const car = add('realcar', { name: 'Carro herói (trocar na IA)', params: Object.assign(carDefaults('taycan'), { modelName: CAR_DB.taycan.name, color: '#c8102e' }) }); car.clayHero = true;
  writeSamples(car, 'px', hero.map(h => ({ f: h.f, v: h.x })), 'every'); writeSamples(car, 'pz', hero.map(h => ({ f: h.f, v: h.z })), 'every');
  const yaw = hero.map(h => { const t = h.f / fps, e = 0.5 / fps; return Math.atan2(heroLat(t + e) - heroLat(t - e), 2 * e * VH) / DEG; });
  writeSamples(car, 'ry', hero.map((h, i) => ({ f: h.f, v: yaw[i] })), 'every');
  car.base.px = hero[0].x; car.base.pz = 0; buildRuntime(car);
  const drv = add('person', { name: 'Piloto', params: Object.assign(defaultParams('person'), { look: 'real', height: 1.78 }) });
  seatInCar(drv, car); buildRuntime(drv);
  // ---------- câmera: FPV 360° — 3 voltas de 10 s, com rampas ----------
  // suavização circular (o fim emenda no começo)
  const gauss = (arr, sig) => { const n = arr.length, r = Math.ceil(sig * 3), w = []; for (let j = -r; j <= r; j++) w.push(Math.exp(-(j * j) / (2 * sig * sig))); return arr.map((_, i) => { let a2 = 0, ws = 0; for (let j = -r; j <= r; j++) { a2 += arr[((i + j) % n + n) % n] * w[j + r]; ws += w[j + r]; } return a2 / ws; }); };
  const maxF = (arr, r) => arr.map((_, i) => { let m = 0; for (let j = -r; j <= r; j++) m = Math.max(m, arr[((i + j) % N + N) % N]); return m; });
  const cxS = gauss(hero.map(h => h.x), 16), yawS = gauss(yaw, 18);
  const cam = addObject('camera', { silent: true, name: 'Loop 360° · FPV', base: { px: 0, py: 1.2, pz: 0, focal: 20 } });
  const B = CAMERA_BODIES.komodo, Ls = LENS_SETS.generic; Object.assign(cam.params, { body: 'komodo', sensorW: B.w, sensorH: B.h, lensSet: 'generic', squeeze: '1', tstop: Ls.t, focusAuto: true });
  cam.cons.shake = 0; cam.gear = { type: 'fpv' };                // sem tremor aleatório: ele não se repetiria no loop
  const LOOPS = 3, TH0 = Math.PI * 0.8, A = 0.21, ring = [];
  for (let f = 0; f < N; f++) {
    const phi = 2 * Math.PI * LOOPS * f / N, th = TH0 + phi - A * Math.sin(2 * phi), k = Math.sin(th - TH0) ** 2;
    const R = 7.4 - 1.3 * k, ht = 0.95 + 1.65 * (k * k * (3 - 2 * k));
    ring.push({ f, th, R, cx: cxS[f], cz: hero[f].z, yw: yawS[f] * DEG, y: ht, spd: 1 - 2 * A * Math.cos(2 * phi) });
  }
  const place = (r, R2) => { const lx = R2 * Math.sin(r.th), lz = R2 * Math.cos(r.th); r.x = r.cx + lx * Math.cos(r.yw) + lz * Math.sin(r.yw); r.z = r.cz - lx * Math.sin(r.yw) + lz * Math.cos(r.yw); };
  ring.forEach(r => place(r, r.R));
  const needAt = (r) => { let m = 0; const t = r.f / fps; for (const c of traffic) if (Math.abs(r.x - laneX(c.lane)) < 2.4 && Math.abs(r.z - zOf(c, t)) < c.L / 2 + 2) m = Math.max(m, (c.bus ? 3.2 : 1.8) + 1.0); return m; };
  const liftS = gauss(maxF(ring.map(needAt), 30), 10);
  const exS = gauss(ring.map((r, i) => Math.max(0, liftS[i] - r.y)), 6);
  ring.forEach((r, i) => { place(r, r.R + exS[i] * 1.1); r.y += exS[i]; });
  const l2 = gauss(maxF(ring.map(needAt), 30), 10); ring.forEach((r, i) => { r.y = Math.max(r.y, l2[i]); });
  const ys = gauss(ring.map(r => r.y), 4); ring.forEach((r, i) => { r.y = ys[i]; });
  for (const ch of ['x', 'y', 'z']) writeSamples(cam, 'p' + ch, ring.map(r => ({ f: r.f, v: r[ch] })), 'every');
  writeSamples(cam, 'rz', ring.map(r => ({ f: r.f, v: -(3 + 5 * (r.spd - 0.58) / 0.84) })), 'every');
  cam.base.px = ring[0].x; cam.base.py = ring[0].y; cam.base.pz = ring[0].z; buildRuntime(cam);
  const tgt = add('null', { name: 'Alvo da câmera (loop)' }); tgt.camHidden = true;
  const ax = gauss(hero.map(h => h.x), 9);
  writeSamples(tgt, 'px', hero.map((h, i) => ({ f: h.f, v: ax[i] + Math.sin(yawS[i] * DEG) * 0.8 })), 'every');
  writeSamples(tgt, 'pz', hero.map(h => ({ f: h.f, v: h.z + 0.8 })), 'every');
  tgt.base.py = 0.62; buildRuntime(tgt);
  cam.cons.aim = tgt.id; cam.cons.aimH = 0;
  let camHits = 0; for (const r of ring) { const t = r.f / fps; for (const c of traffic) if (Math.abs(r.x - laneX(c.lane)) < 1.4 && Math.abs(r.z - zOf(c, t)) < c.L / 2 + 0.4 && r.y < (c.bus ? 3.4 : 1.9)) camHits++; }
  project.shots = [{ cam: cam.id, start: 0, end: DUR, name: 'Loop 360° · carro herói', notes: 'Loop invisível: cidade, trânsito, carro e câmera são periódicos — o quadro seguinte ao último é idêntico ao primeiro. FPV dá 3 voltas de 10 s com rampa (demora nos 3/4, acelera nas laterais e sobe por cima do trânsito). O herói troca de faixa em 1,7 s (≈0,6 g), com a carroceria inclinando nas curvas.' }];
  normalizeShots(); project.activeCamera = cam.id;
  rebuildAll(); applyFrame(0); commit(); renderOutliner(); renderInspector(); tlDirty = true; renderViewSel(); setView('cam');
  return { car, hits, camHits, km: (D / 1000).toFixed(2), vmin: VH * 3.6, nTraffic: traffic.length };
}

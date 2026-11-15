/* ============================================================
   EXEMPLO · Perseguição (ação) — 16,5 s
   Sprint → olha para trás → pula o capô de um carro → rolamento →
   virada brusca para um beco → freia, olha em volta, se esconde atrás da caçamba.
   O perseguidor passa pela boca do beco sem vê-lo.
   Física: voo balístico (g = 9,81), inclinação na curva = atan(v·ω/g), frenagem ~7 m/s².
   ============================================================ */
function buildChase() {
  const fps = 24, g = 9.81;
  const P0 = newProject(); P0.name = 'Perseguição — beco (ação)'; P0.fps = fps; P0.aspect = '2.39:1';
  Object.assign(P0.settings, { sky: '#b9c6d3', bg2: '#efe2cf', ground: '#7d7a75', grid: false, groundShow: true, groundOpacity: 1, fog: 0.004, sunAz: 250, sunEl: 21, sunInt: 2.2, groundSize: 2000, exposure: 1.05 });
  loadProjectData(P0);
  const add = (type, opts) => addObject(type, Object.assign({ silent: true }, opts));
  const rnd = mulberry(909), pick = (a) => a[Math.floor(rnd() * a.length)];
  // ---------- rua, prédios e o beco ----------
  const road = add('roadpath', { name: 'Rua', params: Object.assign(defaultParams('roadpath'), { lanes: 2, laneW: 3.5, shoulder: 0, sidewalk: true, guard: false, center: 'double', bridge: false, delin: false }) });
  road.params.pts = [[0, 0, -90], [0, 0, 140]]; buildRuntime(road);
  const { E } = roadDims(road.params), AZ0 = 42.2, AZ1 = 46.6, AZ = (AZ0 + AZ1) / 2, AX1 = -31;   // beco: z 42,2–46,6, de x = −E até a parede
  const fac = [['#a59a8b', '#2b3440'], ['#8c8f92', '#1d2630'], ['#b7a68f', '#33404c'], ['#6e6a66', '#1e2228'], ['#c2b6a4', '#2f3b46'], ['#7f8a90', '#1f2c38']];
  const bld = (x0, x1, z0, z1, floors, name) => { const [c, gl] = pick(fac); add('building', { name: name || 'Prédio', params: Object.assign(defaultParams('building'), { width: Math.abs(x1 - x0), depth: Math.abs(z1 - z0), floors, floorH: 3.3, color: c, glass: gl, style: rnd() < .5 ? 'grade' : 'faixas' }), base: { px: (x0 + x1) / 2, py: 0, pz: (z0 + z1) / 2 } }); };
  for (const sx of [-1, 1]) { let z = -90; while (z < 140) { const w = 12 + rnd() * 16; let z1 = z + w; if (sx < 0 && z < AZ1 && z1 > AZ0) { if (z < AZ0 - 4) bld(-E - 0.4, -E - 40, z, AZ0, Math.round(5 + rnd() * 6), 'Prédio (beco)'); z = AZ1; continue; } bld(sx * (E + 0.4), sx * (E + 0.4 + 18 + rnd() * 10), z, Math.min(z1, 140), Math.round(4 + rnd() * 8)); z = z1 + 0.6; } }
  bld(-E - 0.4, -E - 40, AZ1, AZ1 + 18, 7, 'Prédio (beco)');
  add('wall', { name: 'Muro do fim do beco', params: Object.assign(defaultParams('wall'), { length: AZ1 - AZ0 + 0.4, height: 3.2, thick: 0.3, color: '#8a8178' }), base: { px: AX1, py: 0, pz: AZ, ry: 90 } });
  const dump = add('box', { name: 'Caçamba de lixo', params: Object.assign(defaultParams('box'), { w: 1.1, h: 1.25, d: 1.9, color: '#2f5d3a' }), base: { px: -22.4, py: 0, pz: AZ + 1.0 } });
  for (const [x, z, w, h, d, c] of [[-12, AZ0 + 0.4, 0.6, 0.5, 0.6, '#8b6b45'], [-12.6, AZ0 + 0.45, 0.5, 0.4, 0.5, '#7a5d3b'], [-17, AZ1 - 0.4, 0.8, 1.0, 0.6, '#5a5f66'], [-27.5, AZ0 + 0.5, 0.7, 0.9, 0.7, '#3d4248'], [-8.5, AZ1 - 0.35, 0.45, 0.9, 0.45, '#3a6b8f']])
    add('box', { name: 'Entulho', params: Object.assign(defaultParams('box'), { w, h, d, color: c }), base: { px: x, py: 0, pz: z } });
  for (const sx of [-1, 1]) for (let z = -80; z < 140; z += 26) if (!(sx < 0 && z > AZ0 - 3 && z < AZ1 + 3)) add('lamp', { name: 'Poste', params: { height: 7 }, base: { px: sx * (E - 0.4), py: 0, pz: z, ry: sx > 0 ? -90 : 90 } });
  // carros estacionados junto ao meio-fio + o carro parado atravessado (o que ele pula)
  const civil = ['corolla', 'polo', 'compass', 'model3', 'strada'], cols = ['#e9e9e6', '#c4c7cb', '#2b2d31', '#7d1f22', '#284a73', '#9a9ea3'];
  for (const sx of [-1, 1]) for (let z = -70; z < 130; z += 7 + rnd() * 9) { if (Math.abs(z - 24) < 9 || (sx < 0 && z > AZ0 - 7 && z < AZ1 + 3)) continue; const k = pick(civil); add('realcar', { name: 'Estacionado', params: Object.assign(carDefaults(k), { modelName: CAR_DB[k].name, color: pick(cols) }), base: { px: sx * 2.6, py: 0, pz: z, ry: sx > 0 ? 180 : 0 } }); }
  const jc = add('realcar', { name: 'Carro parado (ele pula o capô)', params: Object.assign(carDefaults('corolla'), { modelName: CAR_DB.corolla.name, color: '#b8bcc2' }) });
  const JCZ = 24; Object.assign(jc.base, { px: -0.55 + jc.params.length / 2, py: 0, pz: JCZ, ry: -90 }); buildRuntime(jc);
  // ---------- trajeto do fugitivo ----------
  const curve = new THREE.CatmullRomCurve3([[0, 0, -12], [0, 0, 10], [0, 0, 30], [0.1, 0, 36.5], [-1.2, 0, 41.4], [-5.2, 0, AZ - 0.2], [-10, 0, AZ], [-26, 0, AZ]].map(a => new THREE.Vector3(...a)), false, 'centripetal');
  const LEN = curve.getLength(), at = (s) => curve.getPointAt(clamp(s / LEN, 0, 1)), tan = (s) => curve.getTangentAt(clamp(s / LEN, 0, 1));
  const sOfZ = (z) => { let lo = 0, hi = LEN; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (at(m).z < z) lo = m; else hi = m; } return lo; };
  const JH = 1.05, S_TO = sOfZ(20.9), S_LAND = sOfZ(26.9), FLIGHT = Math.sqrt(8 * JH / g);      // voo balístico para subir 1,05 m: 0,93 s
  const ROLL_T = [0, 0.365, 0.73, 1.095, 1.46], ROLL_Z = [0, 2.03, 4.25, 4.94, 5.02], ROFF = 0.3;  // curva de deslocamento do Roll_RM
  const rollZ = (t) => { let i = 0; while (i < 3 && t > ROLL_T[i + 1]) i++; const u = clamp((t - ROLL_T[i]) / (ROLL_T[i + 1] - ROLL_T[i]), 0, 1); return lerp(ROLL_Z[i], ROLL_Z[i + 1], u * u * (3 - 2 * u) * 0.35 + u * 0.65); };
  const V = 6.4, VTURN = 4.9;
  // integra o tempo
  const H = []; let s = 0, t = 0, v = V, phase = 'run1', tTO = 0, tLand = 0, tRollEnd = 0, tStop = 0;
  const sTurn0 = sOfZ(33.5), sTurn1 = sOfZ(AZ) + 4, sStop = LEN - 1.5;
  while (true) {
    const f = H.length; t = f / fps;
    if (phase === 'run1') { if (s >= S_TO) { phase = 'air'; tTO = t; } }
    if (phase === 'air') { const u = (t - tTO) / FLIGHT; if (u >= 1) { phase = 'roll'; tLand = t; s = S_LAND; } }
    if (phase === 'roll') { const tr = t - tLand + ROFF; if (tr >= 1.46) { phase = 'run2'; tRollEnd = t; v = 2.6; } }
    let y = 0;
    if (phase === 'air') { const u = (t - tTO) / FLIGHT; s = lerp(S_TO, S_LAND, u); y = 4 * JH * u * (1 - u); }
    else if (phase === 'roll') { s = S_LAND + rollZ(t - tLand + ROFF) - rollZ(ROFF); }
    else if (phase === 'run2') { const vt = s > sTurn0 - 3 && s < sTurn1 ? VTURN : V; const brake = Math.sqrt(Math.max(0, 2 * 7 * (sStop - s))); v = Math.min(v + 3.2 / fps, vt, brake); if (v > vt) v = Math.max(vt, v - 6 / fps); if (s >= sStop - 0.02 || v < 0.05) { phase = 'stop'; tStop = t; v = 0; } }
    const p = at(s); H.push({ f, t, s, x: p.x, y, z: p.z, ph: phase });
    if (phase === 'run1' || phase === 'run2') s += v / fps;
    if (phase === 'stop' && t - tStop > 4.2) break;
    if (H.length > 900) break;
  }
  const DUR = H.length - 1, N = H.length; project.duration = DUR;
  // direção (ry), giro final e inclinação na curva
  const hd = H.map(h => { const d = tan(h.s); return Math.atan2(d.x, d.z); });
  for (let i = 1; i < N; i++) { while (hd[i] - hd[i - 1] > Math.PI) hd[i] -= 2 * Math.PI; while (hd[i] - hd[i - 1] < -Math.PI) hd[i] += 2 * Math.PI; }
  const fStop = Math.round(tStop * fps), TURN0 = fStop + 6, TURN1 = TURN0 + 17;
  const ry = hd.map((a, i) => { const u = clamp((i - TURN0) / (TURN1 - TURN0), 0, 1); return a + Math.PI * u * u * (3 - 2 * u); });   // vira para trás depois de parar
  const spd = H.map((h, i) => i ? Math.hypot(h.x - H[i - 1].x, h.z - H[i - 1].z) * fps : V);
  const lean = ry.map((a, i) => { if (i === 0 || i >= TURN0) return 0; const w = (a - ry[i - 1]) * fps; return -Math.atan(spd[i] * w / g); });
  const leanS = lean.map((_, i) => { let a = 0, n = 0; for (let j = -3; j <= 3; j++) { const k = clamp(i + j, 0, N - 1); a += lean[k]; n++; } return a / n; });
  const runner = add('person', { name: 'Fugitivo', params: Object.assign(defaultParams('person'), { look: 'real', height: 1.78, skinMat: 'blocks' }) });
  writeSamples(runner, 'px', H.map(h => ({ f: h.f, v: h.x })), 'every'); writeSamples(runner, 'pz', H.map(h => ({ f: h.f, v: h.z })), 'every'); writeSamples(runner, 'py', H.map(h => ({ f: h.f, v: h.y })), 'every');
  writeSamples(runner, 'ry', ry.map((v2, f) => ({ f, v: v2 / DEG })), 'every'); writeSamples(runner, 'rz', leanS.map((v2, f) => ({ f, v: v2 / DEG })), 'every');
  runner.cons.ground = false; Object.assign(runner.base, { px: H[0].x, py: 0, pz: H[0].z, ry: ry[0] / DEG });
  const F = (sec) => Math.round(sec * fps), fTO = F(tTO), fLand = F(tLand), fRE = F(tRollEnd);
  runner.acts = [
    { c: 'Sprint_Loop', f0: 0, f1: fTO - 1, rate: 'auto', bl: 4 },
    { c: 'Sprint_Loop', f0: fTO - 1, f1: fLand - 1, rate: 0.26, off: 0.14, bl: 4 },   // salto em corrida: passada "congelada" (barreira)
    { c: 'Roll', f0: fLand, f1: fRE, off: ROFF, bl: 4 },
    { c: 'Sprint_Loop', f0: fRE, f1: fStop - 3, rate: 'auto', bl: 7 },
    { c: 'Idle_Loop', f0: fStop - 3, f1: TURN1 + 18, bl: 8, off: 0.4 },
    { c: 'Crouch_Idle_Loop', f0: TURN1 + 18, f1: DUR, bl: 12 }];
  // olhares: para trás por cima do ombro, espiada no beco, procura em volta, espia por cima da caçamba
  runner.overlay = { kind: 'look', keys: [[0, 0, 0], [F(1.5), 0, 0], [F(1.85), -72, 6], [F(2.35), -72, 6], [F(2.7), 0, 0], [fRE + 30, 0, 0], [fRE + 36, 70, 5], [fRE + 46, 70, 5], [fRE + 52, 0, 0], [fStop, 0, 0], [fStop + 4, -60, -5], [fStop + 10, -60, -5], [fStop + 15, 55, -5], [fStop + 22, 55, -5], [TURN1, 0, 0], [TURN1 + 30, 0, 10], [TURN1 + 44, -18, 2], [DUR, -12, 0]] };
  buildRuntime(runner);
  // ---------- perseguidor: dá a volta no carro, passa pela boca do beco e para procurando ----------
  const pc = new THREE.CatmullRomCurve3([[1.9, 0, -42], [1.9, 0, 17], [-1.6, 0, 21.5], [-1.6, 0, 26.5], [1.2, 0, 31], [1.4, 0, 52], [1.6, 0, 70]].map(a => new THREE.Vector3(...a)), false, 'centripetal');
  const PL = pc.getLength(), sOfZp = (z) => { let lo = 0, hi = PL; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (pc.getPointAt(m / PL).z < z) lo = m; else hi = m; } return lo; };
  const sPStop = sOfZp(AZ + 0.3), PV = 6.1, PH = []; { let sp = 0, vp = PV, stopT = -1;
    for (let f = 0; f < N; f++) { const tt = f / fps; if (stopT < 0) { const br = Math.sqrt(Math.max(0, 2 * 6.5 * (sPStop - sp))); vp = Math.min(PV, br); if (vp < 0.05) stopT = tt; } else if (tt - stopT > 1.7) vp = Math.min(3.2, vp + 2 / fps); else vp = 0;
      const p = pc.getPointAt(clamp(sp / PL, 0, 1)), d = pc.getTangentAt(clamp(sp / PL, 0, 1)); PH.push({ f, x: p.x, z: p.z, ry: Math.atan2(d.x, d.z), v: vp, stopT }); sp += vp / fps; } }
  const pursuer = add('person', { name: 'Perseguidor', params: Object.assign(defaultParams('person'), { look: 'real', height: 1.83, skinMat: 'blocks' }) });
  writeSamples(pursuer, 'px', PH.map(h => ({ f: h.f, v: h.x })), 'every'); writeSamples(pursuer, 'pz', PH.map(h => ({ f: h.f, v: h.z })), 'every'); writeSamples(pursuer, 'ry', PH.map(h => ({ f: h.f, v: h.ry / DEG })), 'every');
  Object.assign(pursuer.base, { px: PH[0].x, pz: PH[0].z, ry: PH[0].ry / DEG });
  const pStopF = PH.findIndex(h => h.v < 0.05 && h.f > 10), pGoF = pStopF > 0 ? pStopF + Math.round(1.7 * fps) : DUR;
  pursuer.acts = pStopF > 0 ? [{ c: 'Sprint_Loop', f0: 0, f1: pStopF - 2, rate: 'auto', bl: 6 }, { c: 'Idle_Loop', f0: pStopF - 2, f1: pGoF, bl: 8 }, { c: 'Jog_Fwd_Loop', f0: pGoF, f1: DUR, rate: 'auto', bl: 8 }] : [{ c: 'Sprint_Loop', f0: 0, f1: DUR, rate: 'auto' }];
  if (pStopF > 0) pursuer.overlay = { kind: 'look', keys: [[0, 0, 0], [pStopF, 0, 0], [pStopF + 5, -85, 4], [pStopF + 20, -85, 4], [pStopF + 27, 55, 0], [pStopF + 36, 55, 0], [pGoF, 0, 0]] };
  buildRuntime(pursuer);
  // ---------- câmeras ----------
  const body = (o, b, ls) => { const B = CAMERA_BODIES[b], Ls = LENS_SETS[ls]; Object.assign(o.params, { body: b, sensorW: B.w, sensorH: B.h, lensSet: ls, squeeze: String(Ls.sq || 1), tstop: Ls.t, focusAuto: true }); };
  const mkCam = (name, focal, o) => { const c = addObject('camera', { silent: true, name, base: { px: 0, py: 1.4, pz: 0, focal } }); body(c, o.body || 'alexamini', o.lens || 'signature'); c.cons.shake = o.shake ?? 0.3; c.cons.shakeFreq = o.freq ?? 2; if (o.gear) c.gear = { type: o.gear }; if (o.tstop) c.params.tstop = o.tstop; return c; };
  const writeP = (c, P2) => { for (const ch of ['x', 'y', 'z']) writeSamples(c, 'p' + ch, P2.map((p, f) => ({ f, v: p[ch] })), 'every'); Object.assign(c.base, { px: P2[0].x, py: P2[0].y, pz: P2[0].z }); };
  const nrand = mulberry(31), ou = (n, tau, amp) => { const out = []; let a = 0; for (let i = 0; i < n; i++) { a += -a / tau + (nrand() - 0.5) * amp; out.push(a); } return out; };
  // suavização gaussiana (sem sobressinal), usada em todos os caminhos de câmera
  const gsm = (arr, sig) => { const R = Math.ceil(sig * 3), w = []; for (let j = -R; j <= R; j++) w.push(Math.exp(-j * j / (2 * sig * sig))); return arr.map((_, i) => { const o = new THREE.Vector3(); let n = 0; for (let j = -R; j <= R; j++) { const k = clamp(i + j, 0, arr.length - 1); o.addScaledVector(arr[k], w[j + R]); n += w[j + R]; } return o.multiplyScalar(1 / n); }); };
  // balanço de mão: soma de senos lentos com fase aleatória (respiração + passada do operador), sem ruído de alta frequência
  const sway = (seed, comps) => { const r = mulberry(seed), ph = comps.map(() => r() * 6.283); return (tt) => comps.reduce((a, [hz, amp], k) => a + amp * Math.sin(tt * 6.283 * hz + ph[k]), 0); };
  // alvo da mira: peito do fugitivo, com leve atraso e suavizado (o operador acompanha, não "caça" o quadro)
  const aimN = add('null', { name: 'Alvo: fugitivo (suave)' }); aimN.camHidden = true; aimN.cons.ground = false;
  const lagA = 3;
  const AIM0 = H.map((h, i) => { const k = Math.max(0, i - lagA), i0 = Math.floor(k), u = k - i0, a = H[i0], b = H[Math.min(N - 1, i0 + 1)]; const fw = new THREE.Vector3(Math.sin(ry[i]), 0, Math.cos(ry[i])); const crouch = i > TURN1 + 12 ? clamp((i - TURN1 - 12) / 16, 0, 1) : 0; return new THREE.Vector3(lerp(a.x, b.x, u) + fw.x * 0.4, lerp(a.y, b.y, u) * 0.6 + 1.2 - 0.45 * crouch, lerp(a.z, b.z, u) + fw.z * 0.4); });
  const AIM = gsm(AIM0, 4);
  writeP(aimN, AIM); buildRuntime(aimN);
  // 1 · travelling na mão: operador com a câmera na mão num quadriciclo; segue colado, curvas suaves, balanço de mão leve
  const fpv = mkCam('01 Travelling na mão · colado', 24, { gear: 'tracking', body: 'komodo', lens: 'generic', shake: 0.1, freq: 0.9 });
  fpv.cons.aim = aimN.id; fpv.cons.aimH = 0;
  const OFF = [[0, 4.2, 1.4, 1.5], [1.5, 3.2, 1.0, 1.35], [2.6, 2.7, -0.6, 1.25], [tTO - 0.2, 3.4, -1.3, 1.0], [tRollEnd, 3.4, 0.8, 1.5], [tRollEnd + 1.1, 2.9, 1.5, 1.45], [tRollEnd + 2.3, 2.5, 0.35, 1.3], [tStop - 0.6, 2.4, -0.2, 1.35], [tStop + 1.5, 2.9, 0.1, 1.45], [DUR / fps, 3.0, 0.2, 1.5]];
  const offAt = (tt) => { let i = 0; while (i < OFF.length - 2 && tt > OFF[i + 1][0]) i++; const a = OFF[i], b = OFF[i + 1], u = clamp((tt - a[0]) / Math.max(1e-3, b[0] - a[0]), 0, 1), sm = u * u * (3 - 2 * u); return [lerp(a[1], b[1], sm), lerp(a[2], b[2], sm), lerp(a[3], b[3], sm)]; };
  const hdS = hd.map((_, i) => { let a = 0, n = 0; for (let j = -10; j <= 10; j++) { a += hd[clamp(i + j, 0, N - 1)]; n++; } return a / n; });
  const tgtP = H.map((h, i) => { const [bk, sd, up] = offAt(h.t), a = hdS[Math.min(i, fStop)]; const fw = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), lf = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)); return new THREE.Vector3(h.x, 0, h.z).addScaledVector(fw, -bk).addScaledVector(lf, sd).setY(up + h.y * 0.25); });
  // caminho suave (σ ≈ 0,3 s) + balanço de mão: 2–3 cm, 0,4–1,3 Hz
  const sx1 = sway(11, [[0.45, 0.018], [1.1, 0.008]]), sy1 = sway(12, [[0.6, 0.016], [1.3, 0.007]]), sz1 = sway(13, [[0.35, 0.015]]);
  const P1 = gsm(tgtP, 7).map((p, i) => { const tt = i / fps; return p.add(new THREE.Vector3(sx1(tt), sy1(tt), sz1(tt))); });
  // nunca abaixo de 0,55 m, nem dentro das paredes do beco
  P1.forEach(p => { p.y = Math.max(0.55, p.y); if (p.x < -E - 0.2) p.z = clamp(p.z, AZ0 + 0.45, AZ1 - 0.45); });
  writeP(fpv, P1);
  // inclinação lateral pequena nas curvas (±2,5°) + leve deriva de mão (±0,6°)
  const rz1 = sway(14, [[0.3, 0.6], [0.8, 0.25]]);
  const latA0 = P1.map((p, i) => { if (i < 2 || i > N - 3) return 0; const a1 = P1[i + 1].clone().sub(p), a0 = p.clone().sub(P1[i - 1]); const ac = a1.sub(a0).multiplyScalar(fps * fps); const fw = P1[i + 1].clone().sub(P1[i - 1]).setY(0).normalize(); const rt = new THREE.Vector3(-fw.z, 0, fw.x); return clamp(ac.dot(rt) * 0.3, -2.5, 2.5); });
  const latA = latA0.map((_, i) => { let a = 0, n = 0; for (let j = -8; j <= 8; j++) { a += latA0[clamp(i + j, 0, N - 1)]; n++; } return a / n + rz1(i / fps); });
  writeSamples(fpv, 'rz', latA.map((v2, f) => ({ f, v: v2 })), 'every'); buildRuntime(fpv);
  // 2 · câmera rente ao chão do outro lado do carro: ele voa por cima da lente (14 mm, hi-hat)
  const low = mkCam('02 Rente ao chão · pulo', 14, { gear: 'tripod', body: 'alexamini', lens: 'signature', shake: 0.12, freq: 1.4 });
  low.cons.aim = aimN.id; low.cons.aimH = 0; Object.assign(low.base, { px: -2.6, py: 0.32, pz: JCZ + 3.2 }); buildRuntime(low);
  // 3 · na mão, no beco: operador ofegante, reenquadra atrasado
  const hh = mkCam('03 Na mão · beco', 28, { gear: 'handheld', body: 'alexamini', lens: 'signature', shake: 0.22, freq: 1.1 });
  hh.cons.aim = aimN.id; hh.cons.aimH = 0;
  const sx3 = sway(21, [[0.4, 0.02], [0.9, 0.008]]), sy3 = sway(22, [[0.55, 0.018], [1.2, 0.006]]), sz3 = sway(23, [[0.3, 0.015]]);
  const HH0 = H.map((h, i) => { const u = clamp((i - (fStop - 30)) / 60, 0, 1), sm = u * u * (3 - 2 * u); return new THREE.Vector3(-14.5 - 3.2 * sm, 1.58, AZ - 0.7); });
  writeP(hh, gsm(HH0, 5).map((p, i) => { const tt = i / fps; return p.add(new THREE.Vector3(sx3(tt), sy3(tt), sz3(tt))); }));
  const rz3 = sway(24, [[0.25, 0.8], [0.7, 0.3]]); writeSamples(hh, 'rz', H.map((_, f) => ({ f, v: rz3(f / fps) })), 'every'); buildRuntime(hh);
  // 4 · por cima do ombro, escondido atrás da caçamba: cabeça dele na borda do quadro, a boca do beco ao fundo (perseguidor)
  const cl = mkCam('04 Por cima do ombro · caçamba', 40, { gear: 'handheld', body: 'alexamini', lens: 'signature', shake: 0.14, freq: 0.9, tstop: 2.0 });
  const mouthT = add('null', { name: 'Alvo: boca do beco' }); mouthT.camHidden = true; mouthT.cons.ground = false; Object.assign(mouthT.base, { px: -4, py: 1.05, pz: AZ + 0.15 }); buildRuntime(mouthT);
  cl.cons.aim = mouthT.id; cl.cons.aimH = 0; Object.assign(cl.base, { px: H[N - 1].x - 1.05, py: 1.0, pz: AZ - 0.42 }); buildRuntime(cl);
  // ---------- montagem ----------
  const cut1 = fTO - F(0.35), cut2 = fRE - F(0.2), cut3 = fStop - F(0.9), cut4 = TURN1 + 14;
  project.shots = [[fpv, 0, cut1, 'Travelling na mão · sprint', 'Operador com a câmera na mão num quadriciclo, 2,5–4 m atrás: acompanha suave, balanço leve de mão; ele olha para trás por cima do ombro.'], [low, cut1, cut2, 'Pulo · rente ao chão', '14 mm no asfalto do outro lado do carro: ele voa por cima do capô e cai rolando.'], [fpv, cut2, cut3, 'Travelling · virada no beco', 'Volta no travelling: retoma a corrida, a câmera abre na curva e entra colada no beco.'], [hh, cut3, cut4, 'Na mão · freada', 'Operador ofegante no beco: ele freia, procura em volta, vira.'], [cl, cut4, DUR, 'Escondido · por cima do ombro', '40 mm por cima do ombro, agachado atrás da caçamba: o perseguidor para na boca do beco, olha para dentro e não o vê.']]
    .map(([c, start, end, name, notes]) => ({ cam: c.id, start, end, name, notes }));
  normalizeShots(); project.activeCamera = fpv.id;
  rebuildAll(); applyFrame(0); commit(); renderOutliner(); renderInspector(); tlDirty = true; renderViewSel(); setView('cam');
  return { runner, pursuer, dur: (DUR + 1) / fps, tTO, tLand, tRollEnd, tStop, maxLean: Math.max(...leanS.map(Math.abs)) / DEG, pStop: pStopF / fps };
}

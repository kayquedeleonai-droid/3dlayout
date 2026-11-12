/* ============================================================
   VELOCIDADE PRECISA (km/h) + QUILOMETRAGEM
   - Mede velocidade e distância em 3D (inclui subidas/descidas da estrada), com sub-amostragem.
   - Perfil de velocidade: pontos [tempo (s), km/h] interpolados linearmente; a distância é a
     integral exata do perfil e o objeto é reposicionado ao longo da MESMA trajetória
     (comprimento de arco), então a forma do caminho não muda — só o tempo.
   o.speedProf = [{ t, v }]  (s, km/h)
   ============================================================ */
const SUB = 4; // sub-amostras por frame nas medições
function roadSig() { let s = ''; for (const o of project.objects) if (o.type === 'roadpath') s += o.id + (o.hidden ? 'h' : '') + JSON.stringify(roadPts(o.params)) + o.base.px + ',' + o.base.pz + ',' + o.base.py + ',' + o.base.ry + ';'; return s; }
const _odo = new Map();
function odometer(o) {
  const key = animVer + '|' + project.duration + '|' + project.fps + '|' + roadSig();
  let c = _odo.get(o.id); if (c && c.key === key) return c;
  const N = project.duration, fps = project.fps, dist = new Float64Array(N + 1), speed = new Float64Array(N + 1);
  const P = new THREE.Vector3(), Q = new THREE.Vector3();
  worldPos(o, 0, P); let maxV = 0, maxA = 0;
  for (let f = 1; f <= N; f++) { let d = 0; for (let k = 1; k <= SUB; k++) { worldPos(o, f - 1 + k / SUB, Q); d += Q.distanceTo(P); P.copy(Q); } dist[f] = dist[f - 1] + d; }
  for (let f = 0; f <= N; f++) { const a = Math.max(0, f - 0.5), b = Math.min(N, f + 0.5); worldPos(o, a, P); worldPos(o, b, Q); speed[f] = b > a ? Q.distanceTo(P) / ((b - a) / fps) : 0; maxV = Math.max(maxV, speed[f]); }
  for (let f = 1; f <= N; f++) maxA = Math.max(maxA, Math.abs(speed[f] - speed[f - 1]) * fps);
  c = { key, dist, speed, maxV, maxA }; _odo.set(o.id, c); return c;
}
const fmtKm = (m) => m >= 1000 ? (m / 1000).toFixed(3).replace('.', ',') + ' km' : m.toFixed(2).replace('.', ',') + ' m';
const fmtV = (ms) => (ms * 3.6).toFixed(1).replace('.', ',') + ' km/h';
/* ---------- trajetória (forma) independente do tempo ---------- */
function pathPolyline(o) {
  const N = project.duration, pts = [], v = new THREE.Vector3();
  const hasY = !!(o.tracks.py && o.tracks.py.length > 1) && ASSETS[o.type].pilot === 'bird';
  for (let f = 0; f <= N; f += 1 / SUB) { rawPos(o, f, v); const q = v.clone(); if (!pts.length || q.distanceTo(pts[pts.length - 1]) > 0.002) pts.push(q); }
  let len = 0; for (let i = 1; i < pts.length; i++) len += hDist(pts[i - 1], pts[i], hasY);
  return { pts, hasY, len };
}
function hDist(a, b, hasY) { // distância real: horizontal + desnível do terreno (ou altura de voo)
  const dx = b.x - a.x, dz = b.z - a.z; let dy = hasY ? b.y - a.y : 0;
  if (!hasY && _roadRelief) { const ga = groundAt(a.x, a.z) || 0, gb = groundAt(b.x, b.z) || 0; dy = gb - ga; }
  return Math.sqrt(dx * dx + dz * dz + dy * dy);
}
function profileDistance(prof, t) { // ∫ v dt de prof[0].t até t (m), v em km/h linear por partes
  let s = 0; const P = prof;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[i + 1], ta = a.t, tb = b ? b.t : Infinity; if (t <= ta) break;
    const te = Math.min(t, tb), va = a.v / 3.6, vb = b ? b.v / 3.6 : va, ve = b ? va + (vb - va) * (te - ta) / (tb - ta) : va;
    s += (va + ve) / 2 * (te - ta);
  }
  return s;
}
function applySpeedProfile(o) {
  const prof = (o.speedProf || []).slice().sort((a, b) => a.t - b.t); if (!prof.length) return toast('Defina pelo menos um ponto de velocidade');
  const fps = project.fps, N = project.duration, t0 = prof[0].t;
  let { pts, hasY } = pathPolyline(o);
  const need = profileDistance(prof, N / fps) + 1;
  // caminho parado ou curto demais: segue reto na direção do objeto
  if (pts.length < 2) { const h = getVal(o, 'ry', curFrame) * DEG, p0 = pts[0] || rawPos(o, 0, new THREE.Vector3()); pts = [p0.clone(), p0.clone().add(new THREE.Vector3(Math.sin(h), 0, Math.cos(h)).multiplyScalar(need))]; }
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + hDist(pts[i - 1], pts[i], hasY));
  let total = cum[cum.length - 1];
  if (total < need) { const a = pts[pts.length - 2], b = pts[pts.length - 1], d = b.clone().sub(a); if (!hasY) d.y = 0; d.normalize(); const ext = b.clone().addScaledVector(d, need - total + 1); pts.push(ext); cum.push(total + hDist(b, ext, hasY)); total = cum[cum.length - 1]; }
  let seg = 0;
  const at = (s) => { s = clamp(s, 0, total); while (seg > 0 && cum[seg] > s) seg--; while (seg < cum.length - 2 && cum[seg + 1] < s) seg++; const a = pts[seg], b = pts[seg + 1], u = (s - cum[seg]) / Math.max(1e-9, cum[seg + 1] - cum[seg]); return a.clone().lerp(b, u); };
  const S = { px: [], py: [], pz: [], ry: [] }; let prevYaw = getVal(o, 'ry', 0);
  for (let f = 0; f <= N; f++) {
    const s = profileDistance(prof, f / fps), p = at(s);
    const ahead = at(s + 0.6), behind = at(Math.max(0, s - 0.6)), dx = ahead.x - behind.x, dz = ahead.z - behind.z;
    let yaw = prevYaw; if (Math.hypot(dx, dz) > 0.05) { yaw = Math.atan2(dx, dz) / DEG; while (yaw - prevYaw > 180) yaw -= 360; while (yaw - prevYaw < -180) yaw += 360; } prevYaw = yaw;
    S.px.push({ f, v: p.x }); S.pz.push({ f, v: p.z }); S.ry.push({ f, v: yaw }); if (hasY) S.py.push({ f, v: p.y });
  }
  // primeiros frames antes do início do perfil: parado na largada com a mesma direção
  for (const ch of ['px', 'pz', 'ry']) writeSamples(o, ch, S[ch], 'simplify', ch === 'ry' ? 0.02 : 0.0015);
  if (hasY) writeSamples(o, 'py', S.py, 'simplify', 0.0015);
  commit(); tlDirty = true; pathVer = -1; bump();
  // conferência: velocidade medida x pedida
  const od = odometer(o); let err = 0; for (let f = 1; f < N; f++) { const want = (() => { const t = f / fps; let v = prof[0].v; for (let i = 0; i < prof.length; i++) { const a = prof[i], b = prof[i + 1]; if (t >= a.t && (!b || t <= b.t)) { v = b ? a.v + (b.v - a.v) * (t - a.t) / (b.t - a.t) : a.v; break; } if (t < a.t) { v = 0; break; } } return v; })(); err = Math.max(err, Math.abs(od.speed[f] * 3.6 - want)); }
  renderInspector(); toast(`Velocidade aplicada · percorre ${fmtKm(od.dist[N])} · erro máx. ${err.toFixed(2).replace('.', ',')} km/h`, 5000);
}
function readProfile(o) { const od = odometer(o), fps = project.fps, N = project.duration, step = Math.max(1, Math.round(fps)); const P = []; for (let f = 0; f <= N; f += step) P.push({ t: +(f / fps).toFixed(2), v: +(od.speed[f] * 3.6).toFixed(1) }); if (P[P.length - 1].t < N / fps) P.push({ t: +(N / fps).toFixed(2), v: +(od.speed[N] * 3.6).toFixed(1) }); o.speedProf = P; }
const SPEED_PRESETS = {
  const: { lb: 'Constante', f: (v, T) => [{ t: 0, v }] },
  launch: { lb: 'Arrancar 0 → X em T s', f: (v, T) => [{ t: 0, v: 0 }, { t: T, v }] },
  brake: { lb: 'Frear X → 0 em T s', f: (v, T, D) => [{ t: 0, v }, { t: Math.max(0, D - T), v }, { t: D, v: 0 }] },
  pass: { lb: 'Passa acelerando (X → X+40%)', f: (v, T, D) => [{ t: 0, v }, { t: D, v: v * 1.4 }] },
  real: { lb: 'Pilotagem realista (freia nas curvas, X = vel. máx.)', f: null },
  stopgo: { lb: 'Chega, para 1 s e sai', f: (v, T, D) => [{ t: 0, v }, { t: D * 0.35, v: 0 }, { t: D * 0.35 + 1, v: 0 }, { t: D, v }] },
};
function speedSectionHTML(o) {
  const od = odometer(o), f = clamp(Math.round(curFrame), 0, project.duration), N = project.duration, fps = project.fps;
  const avg = od.dist[N] / Math.max(1e-6, N / fps), g = od.maxA / 9.81;
  let h = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:2px 0 6px">
    <div class="hint" style="margin:0"><span style="color:var(--tx3)">Agora (frame ${f})</span><br><b style="font-size:15px;color:var(--tx)">${fmtV(od.speed[f])}</b></div>
    <div class="hint" style="margin:0"><span style="color:var(--tx3)">Odômetro</span><br><b style="font-size:15px;color:var(--tx)">${fmtKm(od.dist[f])}</b></div></div>
    <div class="hint" style="margin:0 0 4px">Cena inteira: ${fmtKm(od.dist[N])} em ${(N / fps).toFixed(2).replace('.', ',')} s · média ${fmtV(avg)} · máx. ${fmtV(od.maxV)} · aceleração máx. ${g.toFixed(2).replace('.', ',')} g${g > 1.1 ? ' <span style="color:#ff8a80">⚠ acima do que um carro de rua faz (~1 g)</span>' : ''}</div>
    <canvas id="spdGraph" width="560" height="150" style="width:100%;height:110px;background:var(--bg2,#17181b);border-radius:6px;margin:4px 0"></canvas>`;
  const P = o.speedProf || [];
  h += `<div class="ph" style="margin:8px 0 4px;padding:0">Perfil de velocidade</div>`;
  h += `<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="color:var(--tx3)"><td>Tempo (s)</td><td>km/h</td><td></td></tr>` + P.map((p, i) => `<tr><td><input type="number" step="0.1" min="0" data-sp="${i}:t" value="${p.t}" style="width:100%"></td><td><input type="number" step="1" min="0" data-sp="${i}:v" value="${p.v}" style="width:100%"></td><td><button class="ghost" data-spdel="${i}">✕</button></td></tr>`).join('') + `</table>`;
  h += `<div class="btnrow"><button data-spadd="1">＋ Ponto no frame atual</button><button data-spread="1">Ler da animação</button></div>`;
  h += `<div class="prow wide"><span class="lb">Modelo</span><select id="spPre">${Object.entries(SPEED_PRESETS).map(([k, v]) => `<option value="${k}">${v.lb}</option>`).join('')}</select></div>
    <div class="prow wide"><span class="lb">X (km/h)</span><input type="number" id="spX" value="${Math.round(od.maxV * 3.6) || 60}" step="5" min="1"></div>
    <div class="prow wide"><span class="lb">T (s)</span><input type="number" id="spT" value="3" step="0.5" min="0.1"></div>
    <div class="btnrow"><button data-spfill="1">Preencher perfil</button><button class="pri" data-spapply="1">▶ Aplicar velocidade</button></div>
    <div class="hint">A forma do trajeto continua igual — só o tempo muda. A distância é a integral exata do perfil (km/h × tempo), medida em 3D, incluindo subidas e descidas da estrada. Sem trajeto, o objeto anda reto para a frente.</div>`;
  return h;
}
function drawSpeedGraph(o) {
  const cv = document.getElementById('spdGraph'); if (!cv) return; const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, od = odometer(o), N = project.duration, fps = project.fps;
  const P = o.speedProf || []; let vmax = Math.max(10, od.maxV * 3.6, ...P.map(p => p.v)); vmax = Math.ceil(vmax / 20) * 20;
  ctx.clearRect(0, 0, W, H); ctx.font = '18px Inter, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
  const X = f => 44 + (W - 54) * f / N, Y = v => H - 22 - (H - 34) * v / vmax;
  for (let v = 0; v <= vmax; v += vmax / 4) { ctx.beginPath(); ctx.moveTo(44, Y(v)); ctx.lineTo(W - 10, Y(v)); ctx.stroke(); ctx.fillText(String(Math.round(v)), 4, Y(v) + 6); }
  ctx.fillText('km/h', 4, 16); ctx.fillText((N / fps).toFixed(1) + ' s', W - 64, H - 2);
  ctx.strokeStyle = '#7aa7ff'; ctx.lineWidth = 3; ctx.beginPath(); for (let f = 0; f <= N; f++) { const x = X(f), y = Y(od.speed[f] * 3.6); f ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  ctx.fillStyle = '#ffb02e'; for (const p of P) { ctx.beginPath(); ctx.arc(X(p.t * fps), Y(p.v), 6, 0, 7); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(curFrame), 8); ctx.lineTo(X(curFrame), H - 22); ctx.stroke();
}
function initSpeedUI() {
  insp.addEventListener('click', e => {
    const o = sel && getObj(sel), b = e.target.closest('button'); if (!o || !b) return;
    if (b.dataset.spdel != null) { o.speedProf.splice(+b.dataset.spdel, 1); commit(); renderInspector(); }
    if (b.dataset.spadd) { const od = odometer(o), f = clamp(Math.round(curFrame), 0, project.duration); (o.speedProf = o.speedProf || []).push({ t: +(f / project.fps).toFixed(2), v: +(od.speed[f] * 3.6).toFixed(1) }); o.speedProf.sort((a, c) => a.t - c.t); commit(); renderInspector(); }
    if (b.dataset.spread) { readProfile(o); commit(); renderInspector(); }
    if (b.dataset.spfill && $('#spPre').value === 'real') { const P2 = realisticProfile(o, { vMax: +$('#spX').value || 160, v0: odometer(o).speed[0] * 3.6 || 100 }); if (!P2) return toast('Precisa de uma trajetória (ex.: Animar ao longo da estrada)'); o.speedProf = P2; commit(); renderInspector(); return; }
    if (b.dataset.spfill) { const pr = SPEED_PRESETS[$('#spPre').value]; o.speedProf = pr.f(+$('#spX').value || 60, +$('#spT').value || 3, project.duration / project.fps).map(p => ({ t: +p.t.toFixed(2), v: +p.v.toFixed(1) })); commit(); renderInspector(); }
    if (b.dataset.spapply) applySpeedProfile(o);
  });
  insp.addEventListener('change', e => { const o = sel && getObj(sel), t = e.target; if (!o || !t.dataset.sp) return; const [i, k] = t.dataset.sp.split(':'); o.speedProf[+i][k] = Math.max(0, +t.value || 0); o.speedProf.sort((a, c) => a.t - c.t); commit(); renderInspector(); });
}
/* ---------- HUD no viewport ---------- */
const speedHud = document.createElement('div'); speedHud.style.cssText = 'position:absolute;left:64px;top:12px;z-index:5;pointer-events:none;font:600 12px Inter,sans-serif;color:#e8eaed;background:rgba(20,21,24,.78);border:1px solid rgba(255,255,255,.08);padding:6px 10px;border-radius:8px;display:none;white-space:nowrap';
renderer.domElement.parentElement.appendChild(speedHud);
function updateSpeedHud(f) {
  const o = sel && getObj(sel);
  if (cinema || !o || !ASSETS[o.type].pilot || o.type === 'camera' && !(o.gear && o.gear.type !== 'none')) { speedHud.style.display = 'none'; return; }
  if (pilot.on && pilot.id === o.id) { speedHud.style.display = 'block'; speedHud.textContent = `🎮 ${fmtV(Math.abs(pilot.s.v))} · ${fmtKm(pilot.s.dist || 0)}`; return; }
  const od = odometer(o), i = clamp(Math.round(f), 0, project.duration); if (od.maxV < 0.01) { speedHud.style.display = 'none'; return; }
  speedHud.style.display = 'block'; speedHud.innerHTML = `${ASSETS[o.type].icon} <span style="font-size:15px">${fmtV(od.speed[i])}</span> <span style="color:#9aa0a6;font-weight:500">· ${fmtKm(od.dist[i])} percorridos</span>`;
}
/* ---------- pilotagem realista: velocidade limitada pela curva (aderência) e por aceleração/frenagem ---------- */
function realisticProfile(o, opt = {}) {
  const vMax = (opt.vMax ?? 160) / 3.6, aLat = (opt.aLat ?? 0.9) * 9.81, aAcc = (opt.aAcc ?? 0.45) * 9.81, aBrk = (opt.aBrk ?? 0.95) * 9.81, v0 = (opt.v0 ?? 100) / 3.6;
  const { pts, hasY } = pathPolyline(o); if (pts.length < 3) return null;
  // reamostra a cada 1 m
  const R = [pts[0]], D = [0]; let acc = 0, tot = 0; for (let i = 1; i < pts.length; i++) { const d = hDist(pts[i - 1], pts[i], hasY); acc += d; tot += d; if (acc >= 1) { R.push(pts[i]); D.push(tot); acc = 0; } }
  const n = R.length, vc = new Float64Array(n).fill(vMax);
  for (let i = 3; i < n - 3; i++) { // raio pela variação de direção em ±3 m
    const a = R[i - 3], b = R[i], c = R[i + 3], h1 = Math.atan2(b.x - a.x, b.z - a.z), h2 = Math.atan2(c.x - b.x, c.z - b.z); let dh = h2 - h1; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
    const k = Math.abs(dh) / Math.max(0.5, Math.hypot(c.x - a.x, c.z - a.z) / 2); vc[i] = Math.min(vMax, k > 1e-5 ? Math.sqrt(aLat / k) : vMax); // k = Δrumo entre as cordas ÷ distância entre seus centros
  }
  const v = new Float64Array(n); v[0] = Math.min(v0, vc[0]);
  for (let i = 1; i < n; i++) v[i] = Math.min(vc[i], Math.sqrt(v[i - 1] * v[i - 1] + 2 * aAcc * (D[i] - D[i - 1])));
  for (let i = n - 2; i >= 0; i--) v[i] = Math.min(v[i], Math.sqrt(v[i + 1] * v[i + 1] + 2 * aBrk * (D[i + 1] - D[i])));
  // perfil no tempo (pontos a cada 0,25 s)
  const prof = []; let t = 0, nextT = 0;
  for (let i = 0; i < n - 1; i++) { if (t >= nextT) { prof.push({ t: +t.toFixed(3), v: +(v[i] * 3.6).toFixed(2) }); nextT += 0.25; } t += (D[i + 1] - D[i]) / Math.max(0.5, (v[i] + v[i + 1]) / 2); if (t > project.duration / project.fps + 0.5) break; }
  return prof;
}

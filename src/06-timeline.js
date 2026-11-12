/* ============================================================
   TIMELINE: DOPE SHEET + GRAPH EDITOR + VELOCIDADE
   ============================================================ */
const tlc = $('#tlcanvas'), tctx = tlc.getContext('2d'), chanList = $('#chanList');
const RULER = 26, SB = 62; let rowsH = 0;
const TOP = () => RULER + (tl.mode === 'dope' ? SB : 0); // trilha de MONTAGEM fica logo abaixo da régua
const tl = { mode: 'dope', v0: -2, v1: 242, gy0: -10, gy1: 10, norm: false, W: 0, H: 0, drag: null, box: null, hoverKey: null };
const graphVis = new Set(); let graphVisFor = null;
let rows = [];
function resizeTL() { const r = tlc.parentElement.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2); tl.W = r.width; tl.H = r.height; tlc.width = r.width * d; tlc.height = r.height * d; tctx.setTransform(d, 0, 0, d, 0, 0); tlDirty = true; }
new ResizeObserver(resizeTL).observe(tlc.parentElement);
const fx = f => (f - tl.v0) / (tl.v1 - tl.v0) * tl.W;
const xf = x => tl.v0 + x / tl.W * (tl.v1 - tl.v0);
function fitTime() { tl.v0 = -Math.max(2, project.duration * 0.01); tl.v1 = project.duration + Math.max(2, project.duration * 0.02); tlDirty = true; }

/* ---------- normalização por canal (graph) ---------- */
const normInfo = {};
function chScale(o, ch) { if (!tl.norm) return { mid: 0, half: 1 }; const k = o.tracks[ch]; if (!k || !k.length) return { mid: 0, half: 1 }; let mn = Infinity, mx = -Infinity; for (let f = 0; f <= project.duration; f += Math.max(1, project.duration / 200)) { const v = evalKeys(k, f); mn = Math.min(mn, v); mx = Math.max(mx, v); } return { mid: (mn + mx) / 2, half: Math.max((mx - mn) / 2, 1e-4) }; }
const gy = (v, s) => tl.H - ((((v - s.mid) / s.half) - tl.gy0) / (tl.gy1 - tl.gy0)) * (tl.H - RULER - 8) - 4;
const yg = (y, s) => (tl.gy0 + (tl.H - 4 - y) / (tl.H - RULER - 8) * (tl.gy1 - tl.gy0)) * s.half + s.mid;

/* ---------- linhas da dope sheet ---------- */
let tlOnlyAnim = true;
function buildRows() {
  rows = [];
  for (const o of project.objects) {
    const anim = Object.keys(o.tracks).filter(c => o.tracks[c].length);
    if (tlOnlyAnim && !anim.length && !(o.clips && o.clips.length) && o.id !== sel && o.type !== 'camera') continue; // cenário estático não polui a timeline
    rows.push({ t: 'obj', o, chs: anim, h: 32 });
    if (o.id === sel) for (const gk in GROUPS) { const chs = GROUPS[gk].ch.filter(c => hasAnim(o, c)); if (!chs.length) continue; rows.push({ t: 'grp', o, chs, gk, h: 20 }); for (const c of chs) rows.push({ t: 'ch', o, chs: [c], h: 18 }); }
  }
  let y = 0; for (const r of rows) { r.y0 = y; y += r.h; } rowsH = y;
}
function renderChanList() {
  const o = sel && getObj(sel);
  if (tl.mode === 'dope') {
    buildRows();
    chanList.innerHTML = `<div style="min-height:100%;display:flex;flex-direction:column"><div style="height:${RULER}px;flex:none;border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 10px;color:var(--tx3);font-size:11px;position:sticky;top:0;background:var(--bg1);z-index:3"><label style="display:flex;gap:6px;align-items:center;cursor:pointer" title="Esconde da timeline o cenário sem animação"><input type="checkbox" id="tlOnlyAnim" ${tlOnlyAnim ? 'checked' : ''}> Só objetos animados</label></div><div id="sbHead" style="top:${RULER}px;height:${SB}px"><div style="display:flex;flex-direction:column;gap:2px"><span>${ic('film', 13)} Montagem</span><span class="sub" style="font-weight:400;color:var(--tx3);font-size:10.5px">${(project.shots || []).length ? project.shots.length + ' planos · arraste câmeras aqui' : 'arraste câmeras para cá'}</span></div><button data-sbadd="1" title="Adicionar plano: câmera selecionada a partir do frame atual">＋</button></div>` + rows.map(r => {
      if (r.t === 'obj') { const ty = r.o.type === 'camera' ? 'câmera' : Object.keys(actionsFor(r.o)).length ? 'animação' : 'keyframe'; return `<div class="crow" data-id="${r.o.id}" style="height:${r.h}px;flex:none;${r.o.id === sel ? 'background:var(--selbg)' : ''}"><span style="width:16px;text-align:center">${ASSETS[r.o.type].icon}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500">${esc(r.o.name)}</span><button class="add" data-add="${r.o.id}" title="Adicionar ${ty}">＋</button></div>`; }
      if (r.t === 'grp') return `<div class="crow" style="height:${r.h}px;flex:none;padding-left:30px;color:var(--tx2);font-size:11px">${GROUPS[r.gk].lb}</div>`;
      const c = r.chs[0]; return `<div class="crow" style="height:${r.h}px;flex:none;padding-left:42px;color:var(--tx3);font-size:11px"><span class="cdot" style="background:${CH[c].col}"></span>${CH[c].lb}${GROUPS[CH[c].g].unit ? ' ' + GROUPS[CH[c].g].unit : ''}</div>`;
    }).join('') + `<div style="flex:1;min-height:20px"></div></div>`;
  } else if (tl.mode === 'graph') {
    if (!o) { chanList.innerHTML = '<div class="hint" style="padding:10px">Selecione um objeto para editar curvas.</div>'; return; }
    const anim = channelsOf(o).filter(c => hasAnim(o, c));
    const gsig = o.id + anim.join(); if (graphVisFor !== gsig) { if (!graphVisFor || !graphVisFor.startsWith(o.id)) graphVis.clear(); anim.forEach(c => graphVis.add(c)); graphVisFor = gsig; }
    let h = `<div class="crow grp">${esc(o.name)}</div>`;
    if (!anim.length) h += '<div class="hint" style="padding:6px 10px">Sem canais animados. Ligue o cronômetro ⏱ no inspetor, use <kbd>K</kbd> ou grave com Pilotar.</div>';
    for (const gk in GROUPS) { const chs = GROUPS[gk].ch.filter(c => anim.includes(c)); if (!chs.length) continue; h += `<div class="crow grp">${GROUPS[gk].lb}</div>` + chs.map(c => `<div class="crow ${graphVis.has(c) ? '' : 'off'}" data-ch="${c}" title="Clique: mostrar/ocultar · Alt+clique: solo"><span class="cdot" style="background:${CH[c].col}"></span>${chLabel(c)}</div>`).join(''); }
    h += `<div style="padding:8px"><label style="display:flex;gap:6px;align-items:center;color:var(--tx2)"><input type="checkbox" id="normChk" ${tl.norm ? 'checked' : ''}> Normalizar curvas</label></div>`;
    chanList.innerHTML = h;
  } else {
    chanList.innerHTML = o ? `<div class="crow grp">${esc(o.name)}</div><div class="hint" style="padding:4px 10px">Velocidade escalar da posição (km/h e m/s), calculada das curvas. Somente leitura — ajuste a velocidade no Graph Editor mudando o espaçamento/curvas das keys de posição.</div>` : '<div class="hint" style="padding:10px">Selecione um objeto.</div>';
  }
}
chanList.addEventListener('click', e => {
  const ab = e.target.closest('[data-add]'); if (ab) { e.stopPropagation(); openAddPopup(getObj(ab.dataset.add), ab); return; }
  if (e.target.closest('[data-sbadd]')) { addStoryboardShot(); return; }
  const r = e.target.closest('.crow'); if (!r) return;
  if (r.dataset.id) { select(r.dataset.id); return; }
  if (r.dataset.ch) { const c = r.dataset.ch; if (e.altKey) { graphVis.clear(); graphVis.add(c); } else graphVis.has(c) ? graphVis.delete(c) : graphVis.add(c); renderChanList(); fitGraph(); }
});
chanList.addEventListener('change', e => { if (e.target.id === 'normChk') { tl.norm = e.target.checked; fitGraph(); } });
chanList.addEventListener('scroll', () => { tlDirty = true; });

/* ---------- desenho ---------- */
function niceStep(range, px, minPx) { const raw = range / (px / minPx); const p = Math.pow(10, Math.floor(Math.log10(raw))); for (const m of [1, 2, 5, 10]) if (p * m >= raw) return p * m; return p * 10; }
function drawRuler(ctx) {
  ctx.fillStyle = '#18191d'; ctx.fillRect(0, 0, tl.W, RULER);
  // work area
  ctx.fillStyle = 'rgba(255,255,255,.022)'; ctx.fillRect(fx(0), 0, fx(project.duration) - fx(0), tl.H);
  const fps = project.fps, secSteps = [1, 2, 3, 6, 12, 24].map(k => fps / 24 * k).concat([fps, fps * 2, fps * 5, fps * 10, fps * 30, fps * 60]);
  const raw = (tl.v1 - tl.v0) / (tl.W / 70); const step = secSteps.find(s => s >= raw) || fps * 120;
  ctx.font = '10px JetBrains Mono, monospace'; ctx.textBaseline = 'middle';
  for (let f = Math.ceil(tl.v0 / step) * step; f <= tl.v1; f += step) { const x = fx(f); ctx.fillStyle = '#222225'; ctx.fillRect(x, RULER, 1, tl.H); ctx.fillStyle = '#5c5c63'; ctx.fillRect(x, RULER - 7, 1, 7); ctx.fillStyle = '#8a8a92'; ctx.fillText(fmtSec(f), x + 4, 10); }
  const sub = step / 5; if (fx(sub) - fx(0) > 6) { ctx.fillStyle = '#3a3e46'; for (let f = Math.ceil(tl.v0 / sub) * sub; f <= tl.v1; f += sub) ctx.fillRect(fx(f), RULER - 3, 1, 3); }
  ctx.fillStyle = '#2c2f35'; ctx.fillRect(0, RULER - 1, tl.W, 1);
  if (tl.mode !== 'dope') drawShotsBand(ctx);
}
function fmtSec(f) { const s = f / project.fps; return (Math.abs(s - Math.round(s)) < 1e-6 ? Math.round(s) : s.toFixed(Math.abs(s * 10 - Math.round(s * 10)) < 1e-6 ? 1 : 2)) + 's'; }
function drawPlayhead(ctx) {
  const x = Math.round(fx(curFrame)) + 0.5; ctx.strokeStyle = '#f2a33a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, tl.H); ctx.stroke();
  ctx.fillStyle = '#f2a33a'; ctx.beginPath(); ctx.moveTo(x - 6, 0); ctx.lineTo(x + 6, 0); ctx.lineTo(x + 6, 12); ctx.lineTo(x, 18); ctx.lineTo(x - 6, 12); ctx.fill();
  ctx.fillStyle = '#1b1206'; ctx.font = '600 9px JetBrains Mono, monospace'; ctx.textAlign = 'center'; ctx.fillText(curFrame, x, 7); ctx.textAlign = 'left';
  if (pilot.rec) { ctx.fillStyle = 'rgba(232,88,79,.15)'; ctx.fillRect(fx(pilot.f0), RULER, fx(curFrame) - fx(pilot.f0), tl.H); }
}
function diamond(ctx, x, y, r, fill, stroke) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); } }
function keysOfRow(r) { const m = new Map(); for (const ch of r.chs) for (const k of r.o.tracks[ch] || []) { const f = Math.round(k.f * 1000) / 1000; if (!m.has(f)) m.set(f, []); m.get(f).push({ o: r.o, ch, k }); } return m; }
function isSel(k) { for (const s of selKeys) if (s.k === k) return true; return false; }
function drawDope(ctx) {
  const sy = chanList.scrollTop, bottom = tl.H, T0 = TOP();
  ctx.save(); ctx.beginPath(); ctx.rect(0, T0, tl.W, bottom - T0); ctx.clip();
  rows.forEach((r, i) => {
    const ROWH = r.h, y = T0 + r.y0 - sy; if (y + ROWH < T0 || y > bottom) return;
    if (r.o.id === sel && r.t === 'obj') { ctx.fillStyle = 'rgba(122,167,255,.06)'; ctx.fillRect(0, y, tl.W, ROWH); }
    ctx.fillStyle = '#1d1d20'; ctx.fillRect(0, y + ROWH - 1, tl.W, 1);
    if (r.t === 'obj') drawClips(ctx, r, y, ROWH);
    const km = keysOfRow(r), cy = y + ROWH / 2;
    // barras entre keys
    const fs = [...km.keys()].sort((a, b) => a - b);
    if (fs.length > 1) { ctx.fillStyle = r.t === 'obj' ? 'rgba(242,193,78,.12)' : 'rgba(242,193,78,.07)'; ctx.fillRect(fx(fs[0]), cy - 3, fx(fs[fs.length - 1]) - fx(fs[0]), 6); }
    for (const [f, ks] of km) {
      const s = ks.some(x => isSel(x.k)), hold = ks.every(x => x.k.oi === 'hold'), lin = ks.every(x => x.k.oi === 'linear');
      const x = fx(f), rr = r.t === 'ch' ? 4.5 : 5.5;
      if (hold) { ctx.fillStyle = s ? '#4f9cf0' : '#c79a3a'; ctx.fillRect(x - rr * 0.8, cy - rr * 0.8, rr * 1.6, rr * 1.6); }
      else if (lin) diamond(ctx, x, cy, rr, s ? '#4f9cf0' : '#c79a3a', s ? '#cfe3ff' : null);
      else { diamond(ctx, x, cy, rr, s ? '#4f9cf0' : '#f2c14e', s ? '#cfe3ff' : '#0006'); }
    }
  });
  ctx.restore();
  if (!rows.length) { ctx.fillStyle = '#6b717c'; ctx.font = '12px Inter'; ctx.fillText('Sem objetos. Adicione personagens, objetos ou câmeras pela biblioteca.', 20, T0 + 30); }
  drawStoryboard(ctx);
}
const _bandImg = new Map(); let _bandQ = [];
function bandThumb(sh) { // miniatura do plano (gerada aos poucos, fora do play)
  const key = sh.cam + ':' + Math.round((sh.start + sh.end) / 2) + ':' + project.aspect; const im = _bandImg.get(key);
  if (im) return im.complete ? im : null; if (!_bandQ.includes(key)) _bandQ.push(key); return null;
}
function pumpBandThumbs() {
  if (playing || !_bandQ.length || typeof shotThumb !== 'function') return; const key = _bandQ.shift(), [cam, mid] = key.split(':');
  const sh = (project.shots || []).find(s => s.cam === cam && Math.round((s.start + s.end) / 2) === +mid); if (!sh) return;
  const url = shotThumb(sh); applyFrame(curFrame); if (!url) return; const im = new Image(); im.onload = () => { tlDirty = true; }; im.src = url; _bandImg.set(key, im);
}
function drawStoryboard(ctx) {
  const y0 = RULER; ctx.fillStyle = '#121214'; ctx.fillRect(0, y0, tl.W, SB); ctx.fillStyle = '#303034'; ctx.fillRect(0, y0 + SB - 1, tl.W, 1);
  const s = project.shots || [];
  if (!s.length) { ctx.fillStyle = '#7d8088'; ctx.font = '12px Inter'; ctx.textBaseline = 'middle'; ctx.fillText('Montagem vazia — arraste câmeras do painel Objetos para esta faixa (ou ＋). Cada bloco é um plano; o play segue a montagem.', 12, y0 + SB / 2); return; }
  const d = tl.drag && tl.drag.t === 'shot' ? tl.drag : null;
  s.forEach((sh, i) => {
    const x0 = fx(sh.start) + 1, x1 = fx(sh.end + 1) - 1, o = getObj(sh.cam); if (!o) return; const col = camColor(sh.cam), on = selShot === sh, live = curFrame >= sh.start && curFrame <= sh.end, w = Math.max(4, x1 - x0), H = SB - 10;
    ctx.save(); roundRect(ctx, x0, y0 + 5, w, H, 6); ctx.clip();
    ctx.fillStyle = '#1f2024'; ctx.fillRect(x0, y0 + 5, w, H);
    const im = bandThumb(sh); if (im) { const th = H, tw = Math.min(w, th * aspectNum()); ctx.globalAlpha = 0.9; ctx.drawImage(im, x0, y0 + 5, tw, th); ctx.globalAlpha = 1; const gr = ctx.createLinearGradient(x0, 0, x0 + tw, 0); gr.addColorStop(0, 'rgba(31,32,36,0)'); gr.addColorStop(1, 'rgba(31,32,36,1)'); ctx.fillStyle = gr; ctx.fillRect(x0 + tw * 0.45, y0 + 5, tw * 0.55 + 1, H); }
    ctx.fillStyle = col; ctx.fillRect(x0, y0 + 5, 3, H);
    ctx.fillStyle = col; roundRect(ctx, x0 + 7, y0 + 10, 20, 17, 4); ctx.fill(); ctx.fillStyle = '#111'; ctx.font = '700 11px Inter'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x0 + 17, y0 + 19); ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 4; ctx.fillStyle = '#f1f2f4'; ctx.font = '600 11.5px Inter'; ctx.fillText(sh.name || o.name, x0 + 32, y0 + 19);
    ctx.fillStyle = '#9a9ea6'; ctx.font = '10.5px Inter'; ctx.fillText(((sh.end - sh.start + 1) / project.fps).toFixed(1) + ' s · ' + fmt(getVal(o, 'focal', Math.round((sh.start + sh.end) / 2)), 0) + ' mm', x0 + 9, y0 + 40); ctx.shadowBlur = 0;
    ctx.restore();
    ctx.strokeStyle = d && d.drop === sh ? '#ffb02e' : on ? '#8bb6ff' : live ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.12)'; ctx.lineWidth = d && d.drop === sh ? 2 : 1; roundRect(ctx, x0, y0 + 5, w, H, 6); ctx.stroke(); ctx.lineWidth = 1;
  });
}
let selShot = null;
function graphCurves() { const o = sel && getObj(sel); if (!o || tl.mode !== 'graph') return []; return channelsOf(o).filter(c => hasAnim(o, c) && graphVis.has(c)).map(c => ({ o, ch: c, keys: o.tracks[c], s: chScale(o, c) })); }
function drawGraph(ctx) {
  const cs = graphCurves();
  ctx.save(); ctx.beginPath(); ctx.rect(0, RULER, tl.W, tl.H - RULER); ctx.clip();
  // grade de valores
  const s0 = { mid: 0, half: 1 }, vstep = niceStep(tl.gy1 - tl.gy0, tl.H - RULER, 28);
  ctx.font = '10px JetBrains Mono, monospace'; ctx.fillStyle = '#5c626c';
  for (let v = Math.ceil(tl.gy0 / vstep) * vstep; v <= tl.gy1; v += vstep) { const y = gy(v, s0); ctx.fillStyle = Math.abs(v) < 1e-9 ? '#3d4149' : '#24262b'; ctx.fillRect(0, Math.round(y), tl.W, 1); ctx.fillStyle = '#5c626c'; ctx.fillText(tl.norm ? fmt(v, 2) : fmt(v, 2), 4, y - 6); }
  for (const c of cs) {
    ctx.strokeStyle = CH[c.ch].col; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let x = 0; x <= tl.W; x += 2) { const f = xf(x), y = gy(evalKeys(c.keys, f), c.s); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  for (const c of cs) for (const k of c.keys) {
    const x = fx(k.f), y = gy(k.v, c.s), s = isSel(k);
    if (s) {
      ctx.strokeStyle = '#cfd3da'; ctx.lineWidth = 1; ctx.fillStyle = '#cfd3da';
      const i = c.keys.indexOf(k);
      if (i > 0 && c.keys[i - 1].oi !== 'hold') { const hx = fx(k.f + k.li.x), hy = gy(k.v + k.li.y, c.s); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(hx, hy); ctx.stroke(); ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, 7); ctx.fill(); }
      if (i < c.keys.length - 1 && k.oi !== 'hold') { const hx = fx(k.f + k.ro.x), hy = gy(k.v + k.ro.y, c.s); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(hx, hy); ctx.stroke(); ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, 7); ctx.fill(); }
    }
    ctx.fillStyle = s ? '#4f9cf0' : '#e9ebee'; ctx.strokeStyle = '#000a'; ctx.lineWidth = 1;
    if (k.oi === 'linear' && k.ii === 'linear') diamond(ctx, x, y, 4.5, ctx.fillStyle, '#000a'); else { ctx.fillRect(x - 3.5, y - 3.5, 7, 7); ctx.strokeRect(x - 3.5, y - 3.5, 7, 7); }
  }
  ctx.restore();
  if (!cs.length) { ctx.fillStyle = '#6b717c'; ctx.font = '12px Inter'; ctx.fillText(sel ? 'Nenhuma curva visível — ative canais à esquerda.' : 'Selecione um objeto animado.', 20, RULER + 30); }
  else { ctx.fillStyle = '#6b717c'; ctx.font = '10.5px Inter'; ctx.fillText('Arraste keys/alças · Alt+arrastar alça quebra tangente · duplo clique na curva adiciona key · roda: zoom (Ctrl: só tempo, Shift: só valor) · botão do meio/direito: pan · F: enquadrar', 10, tl.H - 8); }
}
function speedSeries(o) {
  const N = project.duration + 1, arr = new Float32Array(N); let prev = worldPos(o, 0, new THREE.Vector3());
  for (let f = 1; f < N; f++) { const p = worldPos(o, f, new THREE.Vector3()); arr[f] = p.distanceTo(prev) * project.fps; prev = p; } arr[0] = arr[1] || 0; return arr;
}
let speedCache = { ver: -1, id: null, arr: null };
function drawSpeed(ctx) {
  const o = sel && getObj(sel); if (!o) return;
  if (speedCache.ver !== animVer || speedCache.id !== o.id) speedCache = { ver: animVer, id: o.id, arr: speedSeries(o) };
  const a = speedCache.arr; let mx = 0; for (const v of a) mx = Math.max(mx, v); mx = Math.max(mx * 1.15, 1);
  const Y = v => tl.H - 6 - v / mx * (tl.H - RULER - 14);
  ctx.font = '10px JetBrains Mono, monospace';
  const st = niceStep(mx * 3.6, tl.H - RULER, 26);
  for (let k = 0; k <= mx * 3.6; k += st) { const y = Y(k / 3.6); ctx.fillStyle = '#24262b'; ctx.fillRect(0, y, tl.W, 1); ctx.fillStyle = '#5c626c'; ctx.fillText(fmt(k, 1) + ' km/h', 4, y - 5); }
  ctx.strokeStyle = '#f2a33a'; ctx.lineWidth = 1.8; ctx.beginPath();
  for (let f = 0; f < a.length; f++) { const x = fx(f), y = Y(a[f]); f ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  const v = a[clamp(curFrame, 0, a.length - 1)]; ctx.fillStyle = '#ffbf5e'; ctx.font = '600 12px JetBrains Mono'; ctx.fillText(`${fmt(v * 3.6, 1)} km/h · ${fmt(v, 2)} m/s`, fx(curFrame) + 8, Y(v) - 8);
  for (const ch of ['px', 'py', 'pz']) for (const k of o.tracks[ch] || []) { ctx.fillStyle = '#f2c14e'; ctx.fillRect(fx(k.f) - 1, tl.H - 10, 2, 6); }
}
let rowSig = '';
function tlSignature() { return tl.mode + '|' + sel + '|' + (project.shots || []).length + '|' + project.objects.map(o => o.id + ':' + o.name + ':' + Object.keys(o.tracks).filter(c => o.tracks[c].length).join(',')).join(';'); }
function drawTL() {
  tlDirty = false; const ctx = tctx;
  const sig = tlSignature(); if (sig !== rowSig) { rowSig = sig; renderChanList(); }
  ctx.fillStyle = '#141519'; ctx.fillRect(0, 0, tl.W, tl.H);
  drawRuler(ctx);
  if (tl.mode === 'dope') drawDope(ctx); else if (tl.mode === 'graph') drawGraph(ctx); else drawSpeed(ctx);
  if (tl.box) { ctx.strokeStyle = '#4f9cf0'; ctx.fillStyle = 'rgba(79,156,240,.12)'; const b = tl.box; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
  drawPlayhead(ctx);
}

/* ---------- enquadrar gráfico ---------- */
function fitGraph() {
  const cs = graphCurves(); let mn = Infinity, mx = -Infinity;
  for (const c of cs) { for (let f = 0; f <= project.duration; f += Math.max(1, project.duration / 300)) { const v = (evalKeys(c.keys, f) - c.s.mid) / c.s.half; mn = Math.min(mn, v); mx = Math.max(mx, v); } for (const k of c.keys) { const v = (k.v - c.s.mid) / c.s.half; mn = Math.min(mn, v); mx = Math.max(mx, v); } }
  if (!isFinite(mn)) { mn = -1; mx = 1; } if (mx - mn < 1e-3) { mn -= 1; mx += 1; }
  const pad = (mx - mn) * 0.12; tl.gy0 = mn - pad; tl.gy1 = mx + pad; tlDirty = true;
}

/* ---------- interação ---------- */
function mpos(e) { const r = tlc.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function hitDope(x, y) {
  const sy = chanList.scrollTop, yy = y - TOP() + sy; const r = rows.find(r2 => yy >= r2.y0 && yy < r2.y0 + r2.h); if (!r) return null;
  const km = keysOfRow(r); let best = null, bd = 7;
  for (const [f, ks] of km) { const d = Math.abs(fx(f) - x); if (d < bd) { bd = d; best = ks; } }
  return best ? { row: r, ks: best } : { row: r, ks: null };
}
function hitGraph(x, y) {
  const cs = graphCurves();
  for (const c of cs) for (let i = 0; i < c.keys.length; i++) {
    const k = c.keys[i]; if (!isSel(k)) continue;
    if (i > 0) { const hx = fx(k.f + k.li.x), hy = gy(k.v + k.li.y, c.s); if (Math.hypot(hx - x, hy - y) < 6) return { handle: 'li', c, k }; }
    if (i < c.keys.length - 1) { const hx = fx(k.f + k.ro.x), hy = gy(k.v + k.ro.y, c.s); if (Math.hypot(hx - x, hy - y) < 6) return { handle: 'ro', c, k }; }
  }
  for (const c of cs) for (const k of c.keys) if (Math.abs(fx(k.f) - x) < 6 && Math.abs(gy(k.v, c.s) - y) < 6) return { key: k, c };
  return null;
}
function snapshotSel() { return [...selKeys].map(s => ({ s, f: s.k.f, v: s.k.v })); }
tlc.addEventListener('contextmenu', e => e.preventDefault());
tlc.addEventListener('pointerdown', e => {
  const p = mpos(e); tlc.setPointerCapture(e.pointerId);
  if (e.button === 1 || e.button === 2 || (e.altKey && e.button === 0 && tl.mode === 'graph' && !hitGraph(p.x, p.y))) { tl.drag = { t: 'pan', x: p.x, y: p.y, v0: tl.v0, v1: tl.v1, g0: tl.gy0, g1: tl.gy1 }; return; }
  if (p.y < RULER) { tl.drag = { t: 'scrub' }; setFrame(xf(p.x)); return; }
  if (tl.mode === 'dope' && p.y >= RULER && p.y < RULER + SB) {
    const f = xf(p.x), sh = (project.shots || []).find(s => f >= s.start && f <= s.end + 1);
    selShot = sh || null; selClip = null;
    if (sh) { const edge = Math.abs(p.x - fx(sh.start)) < 6 ? 'l' : Math.abs(p.x - fx(sh.end + 1)) < 6 ? 'r' : null; tl.drag = { t: 'shot', sh, edge, x: p.x, s0: sh.start, e0: sh.end }; if (!edge) setFrame(Math.max(sh.start, Math.min(sh.end, xf(p.x)))); }
    tlDirty = true; return;
  }
  if (tl.mode === 'dope') {
    const h = hitDope(p.x, p.y);
    const hc = h && h.row && h.row.t === 'obj' && !h.ks ? hitClip(h.row, p.x) : null;
    if (hc) { selClip = hc; selShot = null; selKeys.clear(); if (h.row.o.id !== sel) select(h.row.o.id); tl.drag = { t: 'clip', hc, x: p.x, s0: hc.c.start, e0: hc.c.end }; tlDirty = true; return; }
    selClip = null; selShot = null;
    if (h && h.ks) {
      const already = h.ks.every(x => isSel(x.k));
      if (!e.shiftKey && !already) selKeys.clear();
      if (e.shiftKey && already) h.ks.forEach(x => { for (const s of selKeys) if (s.k === x.k) selKeys.delete(s); });
      else h.ks.forEach(x => { if (!isSel(x.k)) selKeys.add(x); });
      if (h.row.o.id !== sel) { const keep = new Set(selKeys); select(h.row.o.id); keep.forEach(k => selKeys.add(k)); }
      tl.drag = { t: 'dkeys', x: p.x, orig: snapshotSel(), moved: false };
    } else { if (!e.shiftKey) selKeys.clear(); tl.box = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; tl.drag = { t: 'box' }; if (h && h.row && h.row.o.id !== sel && !e.shiftKey) { /* manter seleção de objeto */ } }
  } else if (tl.mode === 'graph') {
    const h = hitGraph(p.x, p.y);
    if (h && h.handle) { tl.drag = { t: 'handle', h, alt: e.altKey }; }
    else if (h && h.key) {
      const already = isSel(h.key);
      if (!e.shiftKey && !already) selKeys.clear();
      if (!already) selKeys.add({ o: h.c.o, ch: h.c.ch, k: h.key }); else if (e.shiftKey) { for (const s of selKeys) if (s.k === h.key) selKeys.delete(s); }
      tl.drag = { t: 'gkeys', x: p.x, y: p.y, orig: snapshotSel(), moved: false };
    } else { if (!e.shiftKey) selKeys.clear(); tl.box = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; tl.drag = { t: 'box' }; }
  } else { tl.drag = { t: 'scrub' }; setFrame(xf(p.x)); }
  tlDirty = true;
});
tlc.addEventListener('pointermove', e => {
  const p = mpos(e), d = tl.drag; if (!d) return;
  if (d.t === 'scrub') { setFrame(xf(p.x)); }
  else if (d.t === 'pan') { const df = (p.x - d.x) / tl.W * (d.v1 - d.v0); tl.v0 = d.v0 - df; tl.v1 = d.v1 - df; const dv = (p.y - d.y) / (tl.H - RULER - 8) * (d.g1 - d.g0); tl.gy0 = d.g0 + dv; tl.gy1 = d.g1 + dv; }
  else if (d.t === 'box') { tl.box.x1 = p.x; tl.box.y1 = p.y; }
  else if (d.t === 'clip') { const df = Math.round(xf(p.x) - xf(d.x)), c = d.hc.c; if (d.hc.edge === 'l') c.start = Math.min(d.s0 + df, c.end - 2); else if (d.hc.edge === 'r') c.end = Math.max(d.e0 + df, c.start + 2); else { c.start = clamp(d.s0 + df, 0, project.duration - (d.e0 - d.s0)); c.end = c.start + (d.e0 - d.s0); } d.moved = true; }
  else if (d.t === 'shot') { const df = Math.round(xf(p.x) - xf(d.x)), s = d.sh, S = project.shots, i = S.indexOf(s);
    if (d.edge === 'l') { s.start = clamp(d.s0 + df, S[i - 1] ? S[i - 1].start + 1 : 0, s.end - 1); if (S[i - 1]) S[i - 1].end = s.start - 1; else s.start = 0; }
    else if (d.edge === 'r') { s.end = clamp(d.e0 + df, s.start + 1, S[i + 1] ? S[i + 1].end - 1 : project.duration); if (S[i + 1]) S[i + 1].start = s.end + 1; else s.end = project.duration; }
    else { d.drop = Math.abs(p.x - d.x) > 8 ? S.find(x => xf(p.x) >= x.start && xf(p.x) <= x.end && x !== s) : null; }
    d.moved = true; tlDirty = true; }
  else if (d.t === 'dkeys') {
    const df = Math.round(xf(p.x) - xf(d.x)); if (df !== 0) d.moved = true;
    for (const r of d.orig) r.s.k.f = r.f + df; bump();
  } else if (d.t === 'gkeys') {
    let dxp = p.x - d.x, dyp = p.y - d.y; if (e.shiftKey) { if (Math.abs(dxp) > Math.abs(dyp)) dyp = 0; else dxp = 0; }
    const df = Math.round(xf(d.x + dxp) - xf(d.x)); if (Math.abs(dxp) + Math.abs(dyp) > 2) d.moved = true;
    for (const r of d.orig) { const s = chScale(r.s.o, r.s.ch); r.s.k.f = r.f + df; r.s.k.v = r.v + (yg(d.y + dyp, s) - yg(d.y, s)); }
    for (const r of d.orig) autoHandles(r.s.o.tracks[r.s.ch]);
    bump();
  } else if (d.t === 'handle') {
    const { k, c } = d.h, f = xf(p.x), v = yg(p.y, c.s), side = d.h.handle;
    k.h = 'free';
    const keys = c.keys, i = keys.indexOf(k);
    if (side === 'li') { k.ii = 'bezier'; const lim = i > 0 ? k.f - keys[i - 1].f : 1; const hx = clamp(f - k.f, -lim, -0.01); k.li = { x: hx, y: v - k.v }; if (!(e.altKey || d.alt)) { const sl = k.li.y / k.li.x; k.ro = { x: k.ro.x, y: sl * k.ro.x }; } }
    else { k.oi = k.oi === 'hold' ? 'hold' : 'bezier'; const lim = i < keys.length - 1 ? keys[i + 1].f - k.f : 1; const hx = clamp(f - k.f, 0.01, lim); k.ro = { x: hx, y: v - k.v }; if (!(e.altKey || d.alt)) { const sl = k.ro.y / k.ro.x; k.li = { x: k.li.x, y: sl * k.li.x }; } }
    bump();
  }
  tlDirty = true;
});
tlc.addEventListener('pointerup', e => {
  const d = tl.drag; tl.drag = null;
  if (!d) return;
  if (d.t === 'box') {
    const b = tl.box; tl.box = null; const x0 = Math.min(b.x0, b.x1), x1 = Math.max(b.x0, b.x1), y0 = Math.min(b.y0, b.y1), y1 = Math.max(b.y0, b.y1);
    if (x1 - x0 < 3 && y1 - y0 < 3) { if (tl.mode === 'dope') { setFrame(xf(b.x0)); const h = hitDope(b.x0, b.y0); if (h && h.row && h.row.o.id !== sel) select(h.row.o.id); } }
    else if (tl.mode === 'dope') { const sy = chanList.scrollTop; rows.forEach((r, i) => { const cy = TOP() + r.y0 - sy + r.h / 2; if (cy < y0 || cy > y1) return; for (const [f, ks] of keysOfRow(r)) { const x = fx(f); if (x >= x0 && x <= x1) ks.forEach(k => { if (!isSel(k.k)) selKeys.add(k); }); } }); }
    else if (tl.mode === 'graph') { for (const c of graphCurves()) for (const k of c.keys) { const x = fx(k.f), y = gy(k.v, c.s); if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && !isSel(k)) selKeys.add({ o: c.o, ch: c.ch, k }); } }
  }
  if ((d.t === 'dkeys' || d.t === 'gkeys') && d.moved) { const tracks = new Set(); for (const r of d.orig) tracks.add(r.s.o.tracks[r.s.ch]); for (const t of tracks) { sortKeys(t); autoHandles(t); } cleanSelKeys(); bump(); commit(); }
  if (d.t === 'handle') commit();
  if (d.t === 'shot' && d.drop) { const a = d.sh, b = d.drop; for (const k of ['cam', 'name', 'notes']) { const t = a[k]; a[k] = b[k]; b[k] = t; } toast('Planos trocados de lugar'); }
  if ((d.t === 'clip' || d.t === 'shot') && d.moved) { if (d.t === 'shot') normalizeShots(); commit(); renderViewSel(); }
  tlDirty = true;
});
tlc.addEventListener('dblclick', e => {
  if (tl.mode !== 'graph') return; const p = mpos(e); const f = Math.round(xf(p.x));
  for (const c of graphCurves()) { const v = evalKeys(c.keys, f); if (Math.abs(gy(v, c.s) - p.y) < 8) { setKey(c.o, c.ch, f, v); commit(); tlDirty = true; renderInspector(); return; } }
});
tlc.addEventListener('wheel', e => {
  e.preventDefault(); const p = mpos(e);
  if (tl.mode === 'dope' && e.shiftKey) { chanList.scrollTop += e.deltaY; tlDirty = true; return; }
  const z = Math.exp(e.deltaY * 0.0015);
  if (!(tl.mode === 'graph' && e.shiftKey)) { const f = xf(p.x); tl.v0 = f - (f - tl.v0) * z; tl.v1 = f + (tl.v1 - f) * z; }
  if (tl.mode === 'graph' && !e.ctrlKey && !e.metaKey) { const s0 = { mid: 0, half: 1 }, v = yg(p.y, s0); tl.gy0 = v - (v - tl.gy0) * z; tl.gy1 = v + (tl.gy1 - v) * z; }
  tlDirty = true;
}, { passive: false });
function cleanSelKeys() { for (const s of [...selKeys]) { if (!(s.o.tracks[s.ch] || []).includes(s.k)) selKeys.delete(s); } }

/* ---------- operações em keys ---------- */
function targetKeys() {
  if (selKeys.size) return [...selKeys];
  const o = sel && getObj(sel); if (!o) return [];
  const out = []; for (const ch in o.tracks) for (const k of o.tracks[ch]) out.push({ o, ch, k });
  if (out.length) toast('Nenhuma key selecionada — aplicado a todas as keys do objeto');
  return out;
}
function applyInterp(kind) {
  const ks = targetKeys(); if (!ks.length) return toast('Selecione keys');
  for (const { o, ch, k } of ks) {
    const t = o.tracks[ch], i = t.indexOf(k), p = t[i - 1], q = t[i + 1];
    const dl = p ? (k.f - p.f) / 3 : 1, dr = q ? (q.f - k.f) / 3 : 1;
    if (kind === 'linear') { k.ii = k.oi = 'linear'; k.h = 'auto'; }
    else if (kind === 'auto') { k.ii = k.oi = 'bezier'; k.h = 'auto'; }
    else if (kind === 'hold') { k.oi = 'hold'; }
    else if (kind === 'ease') { k.ii = k.oi = 'bezier'; k.h = 'free'; k.li = { x: -dl, y: 0 }; k.ro = { x: dr, y: 0 }; }
    else if (kind === 'easein') { if (k.h === 'auto') { k.h = 'free'; } k.ii = 'bezier'; k.li = { x: -dl, y: 0 }; }
    else if (kind === 'easeout') { if (k.h === 'auto') { k.h = 'free'; } k.oi = 'bezier'; k.ro = { x: dr, y: 0 }; }
  }
  const tracks = new Set(ks.map(x => x.o.tracks[x.ch])); for (const t of tracks) autoHandles(t);
  bump(); commit(); tlDirty = true;
}
function deleteSelKeys() {
  if (!selKeys.size) return false;
  const byTrack = new Map(); for (const s of selKeys) { const key = s.o.id + s.ch; if (!byTrack.has(key)) byTrack.set(key, { o: s.o, ch: s.ch, ks: new Set() }); byTrack.get(key).ks.add(s.k); }
  for (const { o, ch, ks } of byTrack.values()) { const v = getVal(o, ch, curFrame); o.tracks[ch] = o.tracks[ch].filter(k => !ks.has(k)); if (!o.tracks[ch].length) { delete o.tracks[ch]; o.base[ch] = v; } else autoHandles(o.tracks[ch]); }
  selKeys.clear(); bump(); commit(); tlDirty = true; renderInspector(); renderChanList(); renderOutliner(); return true;
}
function setTLMode(m) { tl.mode = m; $('#tlMode').value = m; renderChanList(); if (m === 'graph') fitGraph(); tlDirty = true; }
$('#tlMode').onchange = e => { setTLMode(e.target.value); e.target.blur(); };
$('#tlZoom').oninput = e => { const z = +e.target.value / 100, full = project.duration * 1.04 + 4, span = Math.max(12, full * Math.pow(1 - z, 2.2)); const c = curFrame; tl.v0 = clamp(c - span / 2, -full * 0.02, Math.max(-2, project.duration + 2 - span)); tl.v1 = tl.v0 + span; tlDirty = true; };
$('#iLinear').onclick = () => applyInterp('linear'); $('#iBezier').onclick = () => applyInterp('auto'); $('#iEase').onclick = () => applyInterp('ease'); $('#iEaseIn').onclick = () => applyInterp('easein'); $('#iEaseOut').onclick = () => applyInterp('easeout'); $('#iHold').onclick = () => applyInterp('hold');
$('#iFit').onclick = () => { if (tl.mode === 'graph') fitGraph(); fitTime(); };
$('#iDel').onclick = () => deleteSelKeys();

chanList.addEventListener('change', e => { if (e.target.id === 'tlOnlyAnim') { tlOnlyAnim = e.target.checked; renderChanList(); tlDirty = true; } });

/* ============================================================
   DECUPAGEM / MULTISHOT — controle dos planos da edição
   Cada plano = { cam, start, end, name, notes } em frames da cena (ação contínua,
   como várias câmeras filmando o mesmo take). Cartões com miniatura, lente,
   equipamento, enquadramento, duração; tocar/loopar um plano; dividir; exportar.
   ============================================================ */
let thumbRend = null; const shotThumbs = new Map();
function shotThumb(sh) {
  const o = getObj(sh.cam), r = o && rt.get(o.id); if (!r) return '';
  const mid = Math.round((sh.start + sh.end) / 2), key = sh.cam + ':' + mid + ':' + animVer + ':' + project.aspect;
  if (shotThumbs.has(key)) return shotThumbs.get(key);
  try {
    const a = aspectNum(), W = 224, H = Math.round(W / a);
    if (!thumbRend) { thumbRend = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); thumbRend.outputColorSpace = renderer.outputColorSpace; thumbRend.toneMapping = renderer.toneMapping; thumbRend.shadowMap.enabled = renderer.shadowMap.enabled; }
    thumbRend.setSize(W, H, false);
    applyFrame(mid); setHelpersVisible(false);
    const restore = camHide(); renderScene(thumbRend, r.rig.cam, renderMode === 'shaded' ? 'shaded' : renderMode, W, H); restore();
    const url = thumbRend.domElement.toDataURL('image/jpeg', 0.8); shotThumbs.set(key, url); return url;
  } catch (e) { console.warn(e); return ''; }
}
function frameLabel(c) { const x = +(c.frameX || 0), y = +(c.frameY || 0); if (!x && !y) return 'centro'; return 'terço' + (y < 0 ? ' inferior' : y > 0 ? ' superior' : '') + (x < 0 ? ' esquerdo' : x > 0 ? ' direito' : ''); }
function shotInfo(sh, i) {
  const o = getObj(sh.cam), fps = project.fps, mid = Math.round((sh.start + sh.end) / 2), dur = (sh.end - sh.start + 1) / fps;
  const focal = getVal(o, 'focal', mid), G = o.gear && GEAR[o.gear.type];
  return { o, dur, focal, gear: G && o.gear.type !== 'none' ? G.lb : 'livre', frame: frameLabel(o.cons), name: sh.name || o.name, i };
}
function seqHTML() {
  normalizeShots(); const S = project.shots, fps = project.fps, cams = project.objects.filter(o => o.type === 'camera');
  const total = (project.duration + 1) / fps, avg = S.length ? S.reduce((a, s) => a + (s.end - s.start + 1), 0) / S.length / fps : 0;
  const opt = (cur) => cams.map(c => `<option value="${c.id}" ${c.id === cur ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  let h = `<div class="hint" style="margin-top:0">${S.length ? `<b>${S.length} planos</b> · duração média ${avg.toFixed(2).replace('.', ',')} s · filme de ${total.toFixed(1).replace('.', ',')} s a ${fps} fps.` : 'Sem planos: a edição usa só a câmera ativa.'} Todas as câmeras filmam a mesma ação (multicâmera): cada plano escolhe qual está no ar e em que trecho.</div>
  <div class="btnrow" style="margin:8px 0 12px"><button class="pri" data-sq="play">▶ Assistir filme (tela cheia)</button><button data-sq="split" ${cams.length ? '' : 'disabled'}>✂ Cortar no frame ${curFrame}</button><button data-sq="even" ${cams.length > 1 ? '' : 'disabled'}>Um plano por câmera</button><button data-sq="txt" ${S.length ? '' : 'disabled'}>⬇ Decupagem (.txt)</button><button data-sq="csv" ${S.length ? '' : 'disabled'}>⬇ Planilha (.csv)</button><button data-sq="clear" ${S.length ? '' : 'disabled'}>Limpar</button></div>`;
  h += `<div style="display:flex;flex-direction:column;gap:8px">` + S.map((sh, i) => {
    const I = shotInfo(sh, i), col = camColor(sh.cam), cur = curFrame >= sh.start && curFrame <= sh.end;
    return `<div data-shot="${i}" style="display:grid;grid-template-columns:150px 1fr;gap:10px;padding:8px;border-radius:10px;border:1px solid ${cur ? '#8bb6ff' : 'var(--line)'};background:${cur ? 'rgba(122,167,255,.08)' : 'var(--bg2,#17181b)'}">
      <div style="position:relative;cursor:pointer" data-sqgo="${i}" title="Ir para o plano"><img src="${shotThumb(sh)}" style="width:150px;border-radius:6px;display:block;background:#000;aspect-ratio:${aspectNum()}"><span style="position:absolute;left:6px;top:6px;background:${col};color:#111;font:700 11px Inter;padding:1px 6px;border-radius:4px">${i + 1}</span><span style="position:absolute;right:6px;bottom:6px;background:rgba(0,0,0,.65);color:#fff;font:600 10.5px Inter;padding:1px 5px;border-radius:4px">${I.dur.toFixed(2).replace('.', ',')} s</span></div>
      <div style="min-width:0">
        <div style="display:flex;gap:6px;align-items:center"><input type="text" data-sqk="name" data-i="${i}" value="${esc(sh.name || I.o.name)}" style="flex:1;font-weight:600"><button class="ghost" data-sqloop="${i}" title="Tocar este plano em loop">⟲</button><button class="ghost" data-sqdup="${i}" title="Dividir ao meio">⧉</button><button class="ghost" data-sqdel="${i}" title="Remover plano">✕</button></div>
        <div style="display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:6px;margin-top:6px;font-size:11px"><label style="color:var(--tx3)">Câmera<select data-sqk="cam" data-i="${i}" style="width:100%">${opt(sh.cam)}</select></label><label style="color:var(--tx3)">Entra (s)<input type="number" step="${(1 / fps).toFixed(4)}" data-sqk="start" data-i="${i}" value="${(sh.start / fps).toFixed(2)}" style="width:100%"></label><label style="color:var(--tx3)">Sai (s)<input type="number" step="${(1 / fps).toFixed(4)}" data-sqk="end" data-i="${i}" value="${((sh.end + 1) / fps).toFixed(2)}" style="width:100%"></label></div>
        <div class="hint" style="margin:6px 0 4px">🎞 ${I.focal.toFixed(0)} mm · ${esc(I.gear)} · alvo no ${I.frame}${I.o.cons.shake ? ` · tremor ${I.o.cons.shake}°` : ''} · frames ${sh.start}–${sh.end}</div>
        <input type="text" data-sqk="notes" data-i="${i}" value="${esc(sh.notes || '')}" placeholder="Notas do plano (ação, intenção, prompt para a IA…)" style="width:100%;font-size:11px">
      </div></div>`;
  }).join('') + `</div>`;
  return h;
}
let seqLoop = null;
function seqText(csv) {
  const fps = project.fps, rows = project.shots.map((sh, i) => { const I = shotInfo(sh, i); return [i + 1, I.name, (sh.start / fps).toFixed(2), ((sh.end + 1) / fps).toFixed(2), I.dur.toFixed(2), I.o.name, I.focal.toFixed(0) + 'mm', I.gear, I.frame, sh.notes || '']; });
  if (csv) return ['Plano;Nome;Entra (s);Sai (s);Duração (s);Câmera;Lente;Equipamento;Enquadramento;Notas', ...rows.map(r => r.map(x => String(x).replace(/;/g, ',')).join(';'))].join('\n');
  return `DECUPAGEM — ${project.name}\n${project.shots.length} planos · ${((project.duration + 1) / fps).toFixed(1)} s @ ${fps} fps · ${project.aspect}\n\n` + rows.map(r => `${String(r[0]).padStart(2, '0')}. ${r[1]}  [${r[2]}–${r[3]} s · ${r[4]} s]\n    ${r[5]} · ${r[6]} · ${r[7]} · alvo no ${r[8]}${r[9] ? '\n    ' + r[9] : ''}`).join('\n\n');
}
function openSequencer() {
  openModal('🎬 Decupagem · multishot', seqHTML(), m => {
    $('#modalBox').style.width = 'min(860px,96vw)'; closeModal.onClose = () => { $('#modalBox').style.width = ''; applyFrame(curFrame); bump(); };
    const rerender = () => { m.querySelector('.mb').innerHTML = seqHTML(); tlDirty = true; renderViewSel(); applyFrame(curFrame); bump(); };
    m.addEventListener('change', e => {
      const t = e.target, k = t.dataset.sqk; if (!k) return; const sh = project.shots[+t.dataset.i]; if (!sh) return;
      if (k === 'cam') sh.cam = t.value; else if (k === 'start') sh.start = Math.round(+t.value * project.fps); else if (k === 'end') sh.end = Math.round(+t.value * project.fps) - 1; else sh[k] = t.value;
      if (k === 'start' || k === 'end') { const i = +t.dataset.i, S = project.shots; if (k === 'start' && S[i - 1]) S[i - 1].end = Math.max(S[i - 1].start, sh.start - 1); if (k === 'end' && S[i + 1]) S[i + 1].start = Math.min(S[i + 1].end, sh.end + 1); }
      normalizeShots(); commit(); if (k !== 'name' && k !== 'notes') rerender(); else tlDirty = true;
    });
    m.addEventListener('click', e => {
      const b = e.target.closest('[data-sq],[data-sqgo],[data-sqloop],[data-sqdup],[data-sqdel]'); if (!b) return; const S = project.shots, cams = project.objects.filter(o => o.type === 'camera');
      if (b.dataset.sqgo != null) { const sh = S[+b.dataset.sqgo]; setFrame(sh.start); setView('cut'); rerender(); return; }
      if (b.dataset.sqloop != null) { const sh = S[+b.dataset.sqloop]; seqLoop = { a: sh.start, b: sh.end }; setFrame(sh.start); setView('cam'); closeModal(); if (!playing) togglePlay(); toast(`Plano ${+b.dataset.sqloop + 1} em loop — Esc ou clique na timeline para sair`); return; }
      if (b.dataset.sqdup != null) { const i = +b.dataset.sqdup, sh = S[i], mid = Math.round((sh.start + sh.end) / 2); if (sh.end - sh.start < 2) return; S.splice(i + 1, 0, { cam: sh.cam, start: mid + 1, end: sh.end, name: (sh.name || '') + ' (b)', notes: sh.notes }); sh.end = mid; commit(); rerender(); return; }
      if (b.dataset.sqdel != null) { const i = +b.dataset.sqdel; const [x] = S.splice(i, 1); if (S[i - 1]) S[i - 1].end = x.end; else if (S[i]) S[i].start = x.start; commit(); rerender(); return; }
      const a = b.dataset.sq;
      if (a === 'play') { closeModal(); openCinema(); }
      if (a === 'split') { const f = curFrame; normalizeShots(); if (!S.length) { const c0 = project.activeCamera || cams[0].id, c1 = (cams.find(c => c.id !== c0) || cams[0]).id; project.shots = f > 0 ? [{ cam: c0, start: 0, end: f - 1 }, { cam: c1, start: f, end: project.duration }] : [{ cam: c0, start: 0, end: project.duration }]; } else { const i = S.findIndex(x => f > x.start && f <= x.end); if (i >= 0) { const cur = S[i], idx = cams.findIndex(c => c.id === cur.cam), nx = cams[(idx + 1) % cams.length].id; S.splice(i + 1, 0, { cam: nx, start: f, end: cur.end }); cur.end = f - 1; } } commit(); rerender(); }
      if (a === 'even') { const n = cams.length, D = project.duration + 1; project.shots = cams.map((c, i) => ({ cam: c.id, start: Math.round(i * D / n), end: Math.round((i + 1) * D / n) - 1, name: c.name })); commit(); rerender(); }
      if (a === 'clear') { project.shots = []; commit(); rerender(); }
      if (a === 'txt') saveFile((project.name || 'decupagem') + ' - decupagem.txt', seqText(false), seqText(false));
      if (a === 'csv') saveFile((project.name || 'decupagem') + ' - planos.csv', '﻿' + seqText(true), seqText(true));
    });
  });
}
$('#bShots').onclick = openSequencer; $('#bShots').innerHTML = '🎬 Decupagem'; $('#bShots').title = 'Decupagem / multishot: planos, câmeras, cortes';
/* HUD do plano no ar + navegação [ ] entre planos */
const shotHud = document.createElement('div'); shotHud.style.cssText = 'position:absolute;right:12px;top:12px;z-index:5;pointer-events:none;font:600 11.5px Inter,sans-serif;color:#e8eaed;background:rgba(20,21,24,.78);border:1px solid rgba(255,255,255,.08);padding:5px 9px;border-radius:8px;display:none;white-space:nowrap';
renderer.domElement.parentElement.appendChild(shotHud);
function updateShotHud(f) {
  const S = project.shots; if (!S || !S.length || !viewIsCam() || pilot.on) { shotHud.style.display = 'none'; return; }
  const i = S.findIndex(s => f >= s.start && f <= s.end); if (i < 0) { shotHud.style.display = 'none'; return; }
  const I = shotInfo(S[i], i), left = (S[i].end - f) / project.fps;
  shotHud.style.display = 'block'; shotHud.innerHTML = `<span style="color:${camColor(S[i].cam)}">■</span> PLANO ${i + 1}/${S.length} · ${esc(I.name)} · ${I.focal.toFixed(0)} mm <span style="color:#9aa0a6;font-weight:500">· ${left.toFixed(1)} s</span>`;
  if (pipRect) shotHud.style.right = '330px'; else shotHud.style.right = '12px';
}
function seqTick(f) { cineTick(f); if (seqLoop && playing && (f > seqLoop.b || f < seqLoop.a)) setFrame(seqLoop.a); updateShotHud(f); }
addEventListener('keydown', e => {
  if (e.target.matches && e.target.matches('input,textarea,select')) return; const S = project.shots;
  if (e.key === 'Escape') seqLoop = null;
  if ((e.key === ']' || e.key === '[') && S && S.length) { const i = S.findIndex(s => curFrame >= s.start && curFrame <= s.end), j = clamp(i + (e.key === ']' ? 1 : -1), 0, S.length - 1); setFrame(S[j].start); e.preventDefault(); }
});

tlc.addEventListener('pointerdown', () => { seqLoop = null; }, true);
/* ---------- ASSISTIR FILME: tela cheia, todos os planos em sequência ---------- */
let cinema = false, _cinePrev = null;
const cineBar = document.createElement('div'); cineBar.id = 'cineBar';
cineBar.innerHTML = `<div class="row" style="margin-bottom:10px"><button id="cinePlay">❚❚</button><span id="cineTime" style="font-variant-numeric:tabular-nums;min-width:120px">00:00 / 00:00</span><span id="cineShot" style="flex:1;color:#cfd3d8"></span><label style="display:flex;gap:6px;align-items:center;color:#cfd3d8"><input type="checkbox" id="cineLoop" checked> repetir</label><button id="cineExit">✕ Sair (Esc)</button></div><div id="cineSegs"></div>`;
$('#vpwrap').appendChild(cineBar);
function cineSegs() {
  const S = project.shots && project.shots.length ? project.shots : [{ cam: project.activeCamera, start: 0, end: project.duration, name: (getObj(project.activeCamera) || {}).name || 'Câmera' }], D = project.duration + 1;
  $('#cineSegs').innerHTML = S.map((s, i) => `<div class="sg" data-f="${s.start}" style="flex:${s.end - s.start + 1}" title="${esc(s.name || '')}"><i style="background:${camColor(s.cam)}"></i>&nbsp;${i + 1} · ${esc(s.name || (getObj(s.cam) || {}).name || '')}</div>`).join('') + `<div id="cineHead"></div>`;
}
const mmss = (f) => { const s = f / project.fps; return String(Math.floor(s / 60)).padStart(2, '0') + ':' + (s % 60).toFixed(1).padStart(4, '0'); };
function cineTick(f) {
  if (!cinema) return; const D = project.duration + 1, segs = $('#cineSegs');
  $('#cineHead').style.left = (f / D * segs.clientWidth) + 'px'; $('#cineTime').textContent = `${mmss(f)} / ${mmss(D)}`; $('#cinePlay').textContent = playing ? '❚❚' : '▶';
  const S = project.shots || [], i = S.findIndex(s => f >= s.start && f <= s.end); $('#cineShot').textContent = i >= 0 ? `Plano ${i + 1}/${S.length} · ${S[i].name || getObj(S[i].cam).name}` : '';
  if (!playing && f >= project.duration && $('#cineLoop').checked) { setFrame(0); togglePlay(true); }
}
function openCinema() {
  const cams = project.objects.filter(o => o.type === 'camera'); if (!cams.length) return toast('Adicione uma câmera primeiro');
  _cinePrev = { view: viewPick, loop, sel, frame: curFrame }; select(null); seqLoop = null;
  cinema = true; document.body.classList.add('cinema'); setView('cam'); cineSegs(); loop = $('#cineLoop').checked;
  setFrame(0); togglePlay(true);
  try { if (document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { }); } catch (e) { }
}
function closeCinema() {
  if (!cinema) return; cinema = false; document.body.classList.remove('cinema'); togglePlay(false);
  if (_cinePrev) { loop = _cinePrev.loop; setView(_cinePrev.view === 'free' ? 'free' : _cinePrev.view); }
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { }
}
$('#bWatch').onclick = openCinema;
$('#cineExit').onclick = closeCinema; $('#cinePlay').onclick = () => togglePlay();
$('#cineLoop').onchange = e => { loop = e.target.checked; };
$('#cineSegs').addEventListener('pointerdown', e => { const r = $('#cineSegs').getBoundingClientRect(); setFrame(clamp(Math.round((e.clientX - r.left) / r.width * (project.duration + 1)), 0, project.duration)); });
addEventListener('keydown', e => { if (!cinema) return; if (e.key === 'Escape') { closeCinema(); e.preventDefault(); } if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const S = project.shots || []; if (!S.length) return; const i = S.findIndex(s => curFrame >= s.start && curFrame <= s.end), j = clamp(i + (e.key === 'ArrowRight' ? 1 : -1), 0, S.length - 1); setFrame(S[j].start); e.preventDefault(); e.stopPropagation(); } }, true);
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && cinema) { /* continua em modo cinema dentro da janela */ } });

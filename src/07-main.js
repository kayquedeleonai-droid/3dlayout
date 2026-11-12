/* ============================================================
   VIEWPORT
   ============================================================ */
const ov = $('#overlay2d'), octx = ov.getContext('2d');
function viewIsCam() { return (pilot.on && (pilot.view === 'pilotcam' || pilot.view === 'cam')) || (!pilot.on && viewMode === 'cam'); }
function viewCamId() { if (pilot.on && pilot.view === 'pilotcam') return pilot.id; if (!viewIsCam()) return null; if (pilot.on) return shotCamAt(curFrame); return viewPick === 'cut' || viewPick === 'free' ? shotCamAt(curFrame) : viewPick; }
function currentViewCam() {
  const cid = viewCamId(); if (!cid) return editorCam;
  const r = rt.get(cid); return r ? r.rig.cam : editorCam;
}
function viewRect() {
  const w = vpEl.clientWidth, h = vpEl.clientHeight;
  if (!viewIsCam() || currentViewCam() === editorCam) return { x: 0, y: 0, w, h };
  const a = aspectNum(); let rw = w, rh = w / a; if (rh > h) { rh = h; rw = h * a; }
  return { x: (w - rw) / 2, y: (h - rh) / 2, w: rw, h: rh };
}
let pathVer = -1;
function updatePath() {
  const o = sel && getObj(sel);
  pathVer = animVer;
  const has = o && !(pilot.on && pilot.id === o.id) && (['px', 'py', 'pz'].some(c => hasAnim(o, c)) || (o.cons.follow && getObj(o.cons.follow)));
  if (!has) { pathLine.userData.has = false; updatePathVisibility(); return; }
  const pts = [], kp = [], kf = new Set(); for (const c of ['px', 'py', 'pz']) (o.tracks[c] || []).forEach(k => kf.add(Math.round(k.f)));
  for (let f = 0; f <= project.duration; f++) { const p = worldPos(o, f, new THREE.Vector3()); p.y += 0.05; pts.push(p); if (kf.has(f)) kp.push(p); }
  pathLine.geometry.dispose(); pathLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
  pathDots.geometry.dispose(); pathDots.geometry = new THREE.BufferGeometry().setFromPoints(pts.filter((_, i) => i % Math.max(1, Math.round(project.fps / 6)) === 0));
  pathKeys.geometry.dispose(); pathKeys.geometry = new THREE.BufferGeometry().setFromPoints(kp);
  pathLine.userData.has = true; updatePathVisibility();
}
function updatePathVisibility() { const v = showPath && !!pathLine.userData.has && !viewIsCam(); pathLine.visible = pathDots.visible = pathKeys.visible = v; }
function renderViewport(dt) {
  const w = vpEl.clientWidth, h = vpEl.clientHeight;
  const sz = renderer.getSize(new THREE.Vector2()); if (sz.x !== w || sz.y !== h) renderer.setSize(w, h);
  const d = Math.min(devicePixelRatio, 2); if (ov.width !== Math.round(w * d) || ov.height !== Math.round(h * d)) { ov.width = Math.round(w * d); ov.height = Math.round(h * d); ov.style.width = w + 'px'; ov.style.height = h + 'px'; }
  const cam = currentViewCam(), camView = cam !== editorCam;
  if (pathVer !== animVer) updatePath();
  if (!camView) {
    editorCam.aspect = w / h; editorCam.updateProjectionMatrix();
    setHelpersVisible(true);
    if (sel && rt.get(sel)) { selBox.setFromObject(rt.get(sel).g); selBox.visible = !pilot.on || pilot.view === 'free'; }
    gizmo.visible = !!gizmo.object;
    renderScene(renderer, editorCam, renderMode, w, h);
    renderPip(w, h);
  } else {
    pipRect = null;
    setHelpersVisible(false);
    renderer.setClearColor(0x000000, 1); renderer.setScissorTest(false); renderer.clear();
    const r = viewRect();
    renderCamera(renderer, getObj(viewCamId()), cam, renderMode, r.w, r.h, r.x, r.y);
  }
  // overlay
  octx.setTransform(d, 0, 0, d, 0, 0); octx.clearRect(0, 0, w, h);
  if (camView) {
    const r = viewRect(), y0 = h - r.y - r.h;
    drawGuides(octx, r, y0);
    const co = getObj(viewCamId());
    if (co) { const focal = pilot.on && pilot.id === co.id ? pilot.s.focal : getVal(co, 'focal', curFrame); octx.font = '11px JetBrains Mono, monospace'; octx.fillStyle = 'rgba(255,255,255,.85)'; const cdx = camDescription(co, curFrame), tx = Math.max(r.x + 10, 64); octx.fillText(`${co.name} · ${cdx.lens} · ${project.aspect}`, tx, y0 + 18); octx.fillStyle = 'rgba(255,255,255,.6)'; octx.fillText(`${cdx.body} · ${cdx.dof}`, tx, y0 + 32); octx.fillStyle = 'rgba(255,255,255,.85)'; octx.textAlign = 'right'; octx.fillText(timecode(curFrame) + `  f${curFrame}`, r.x + r.w - 10, y0 + 18); octx.textAlign = 'left'; }
  }
  if (pilot.rec) { octx.fillStyle = '#e8584f'; octx.beginPath(); octx.arc(w - 22, h - 22, 7, 0, 7); octx.fill(); octx.font = '600 12px Inter'; octx.textAlign = 'right'; octx.fillText('REC', w - 34, h - 18); octx.textAlign = 'left'; }
  const info = [];
  info.push(`<b>${viewIsCam() ? 'CÂMERA' : 'LIVRE'}</b> · ${renderMode === 'shaded' ? 'playblast' : renderMode}`);
  if (sel && getObj(sel)) info.push(esc(getObj(sel).name));
  updateLabels(camView, w, h); drawAxes(); updateLensBar(camView);
  const pipEl = $('#pip'), wantPip = !camView && project.objects.some(o => o.type === 'camera'); if ((pipEl.style.display !== 'none') !== wantPip) pipEl.style.display = wantPip ? '' : 'none';
}
function updateChase(dt) {
  if (!pilot.on || pilot.view !== 'chase') return;
  const r = rt.get(pilot.id); if (!r) return;
  const s = pilot.s, rad = Math.min(r.radius, 40), dist = rad * 2.6 + 3, hgt = rad * 0.9 + 1.2;
  const fwd = new THREE.Vector3(Math.sin(s.ry), 0, Math.cos(s.ry));
  const want = s.pos.clone().addScaledVector(fwd, -dist); want.y = s.pos.y + hgt;
  editorCam.position.lerp(want, 1 - Math.exp(-4 * dt));
  const look = s.pos.clone(); look.y += rad * 0.35; editorCam.lookAt(look); orbit.target.copy(look);
}

/* ============================================================
   LOOP PRINCIPAL
   ============================================================ */
let last = performance.now(), exporting = false;
function loopFn(now) {
  requestAnimationFrame(loopFn);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (exporting) return;
  if (pilot.on) {
    if (pilot.rec) { const step = 1 / project.fps; pilot.acc += dt; let n = 0; while (pilot.acc >= step && n < 6) { pilot.acc -= step; stepPilot(step); setFrame(curFrame + 1); recordSample(); n++; if (curFrame >= project.duration) { stopRecording(); break; } } }
    else { stepPilot(dt); pilot.tExtra += dt; }
    const s = pilot.s; $('#hudSpeed').textContent = pilot.kind === 'camera' ? fmt(s.v, 1) : Math.round(Math.abs(s.v) * 3.6); $('#hudUnit').textContent = pilot.kind === 'camera' ? 'm/s' : 'km/h';
  } else if (playing) {
    playAcc += dt * project.fps; const n = Math.floor(playAcc);
    if (n > 0) { playAcc -= n; let f = curFrame + n; if (f > project.duration) { if (loop) f = f % (project.duration + 1); else { f = project.duration; togglePlay(false); } } setFrame(f); }
  }
  applyFrame(curFrame);
  updateChase(dt);
  if (orbit.enabled) orbit.update();
  renderViewport(dt);
  refreshInspectorValues();
  if (tlDirty || playing || pilot.on) drawTL();
  pumpThumbs();
}

/* ============================================================
   TECLADO
   ============================================================ */
let overTL = false; $('#tl').addEventListener('mouseenter', () => overTL = true); $('#tl').addEventListener('mouseleave', () => overTL = false);
function isTyping() { const a = document.activeElement; return a && ((a.tagName === 'INPUT' && !['checkbox', 'color', 'range', 'file'].includes(a.type)) || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT'); }
window.addEventListener('keydown', e => {
  if ($('#modal').classList.contains('show')) { if (e.key === 'Escape') closeModal(); return; }
  if (isTyping()) { if (e.key === 'Enter' || e.key === 'Escape') document.activeElement.blur(); return; }
  if (pilot.on) {
    if (e.code === 'KeyR') { if (!e.repeat) pilot.rec ? stopRecording() : startRecording(); }
    else if (e.code === 'KeyT') resetPilotState();
    else if (e.code === 'Escape') exitPilot();
    else if (e.code === 'KeyV') cyclePilotView();
    else pilot.keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'AltLeft', 'AltRight', 'Tab'].includes(e.code)) e.preventDefault();
    return;
  }
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && e.code === 'KeyY') { e.preventDefault(); redo(); return; }
  if (mod && e.code === 'KeyD') { e.preventDefault(); if (sel) duplicateObject(sel); return; }
  if (mod && e.code === 'KeyS') { e.preventDefault(); saveProject(); return; }
  if (mod) return;
  switch (e.code) {
    case 'Space': e.preventDefault(); togglePlay(); break;
    case 'KeyW': setGizmoMode('translate'); break;
    case 'KeyE': setGizmoMode('rotate'); break;
    case 'KeyR': setGizmoMode('scale'); break;
    case 'KeyK': keyAllSelected(); break;
    case 'KeyP': if (sel) startPilot(sel); break;
    case 'KeyC': setView(viewMode === 'cam' ? 'free' : 'cam'); break;
    case 'KeyA': if (sel) openAddPopup(getObj(sel)); break;
    case 'KeyF': if (overTL && tl.mode === 'graph') fitGraph(); else if (overTL) fitTime(); else frameSelected(); break;
    case 'Delete': case 'Backspace': if (deleteSelection()) break; if (!deleteSelKeys() && sel) deleteObject(sel); break;
    case 'ArrowLeft': e.preventDefault(); setFrame(curFrame - (e.shiftKey ? 10 : 1)); break;
    case 'ArrowRight': e.preventDefault(); setFrame(curFrame + (e.shiftKey ? 10 : 1)); break;
    case 'Home': setFrame(0); break;
    case 'End': setFrame(project.duration); break;
    case 'KeyJ': jumpKey(-1); break;
    case 'KeyL': jumpKey(1); break;
    case 'F9': e.preventDefault(); applyInterp(e.shiftKey && (e.ctrlKey || e.metaKey) ? 'easeout' : e.shiftKey ? 'easein' : 'ease'); break;
    case 'Escape': if (selKeys.size) { selKeys.clear(); tlDirty = true; } else select(null); break;
    case 'Digit1': setTLMode('dope'); break; case 'Digit2': setTLMode('graph'); break; case 'Digit3': setTLMode('speed'); break;
  }
});
window.addEventListener('keyup', e => pilot.keys.delete(e.code));
window.addEventListener('blur', () => pilot.keys.clear());

/* ---------- transporte ---------- */
$('#pPlay').onclick = () => togglePlay(); $('#pStart').onclick = () => setFrame(0); $('#pEnd').onclick = () => setFrame(project.duration);
$('#pPrev').onclick = () => setFrame(curFrame - 1); $('#pNext').onclick = () => setFrame(curFrame + 1);
$('#pPrevK').onclick = () => jumpKey(-1); $('#pNextK').onclick = () => jumpKey(1);
$('#fCur').onchange = e => setFrame(+e.target.value);
$('#fpsSel').onchange = e => { project.fps = +e.target.value; bump(); commit(); setFrame(curFrame); syncDurUI(); e.target.blur(); };
$('#durIn').onchange = e => { project.duration = clamp(Math.round(+e.target.value * project.fps), 12, 100000); bump(); normalizeShots(); commit(); fitTime(); setFrame(curFrame); syncDurUI(); };
$('#bLoop').onclick = () => { loop = !loop; $('#bLoop').classList.toggle('on', loop); };
$('#bUndo').onclick = undo; $('#bRedo').onclick = redo;
$('#hudRec').onclick = () => pilot.rec ? stopRecording() : startRecording();
$('#hudReset').onclick = () => resetPilotState(); $('#hudExit').onclick = () => exitPilot();
// redimensionar timeline
{ let st = null; $('#resizer').addEventListener('pointerdown', e => { st = { y: e.clientY, h: $('#tl').getBoundingClientRect().height }; e.target.setPointerCapture(e.pointerId); }); $('#resizer').addEventListener('pointermove', e => { if (!st) return; const h = clamp(st.h - (e.clientY - st.y), 120, innerHeight - 200); document.documentElement.style.setProperty('--tl-h', h + 'px'); }); $('#resizer').addEventListener('pointerup', () => st = null); }

/* ============================================================
   MODAIS
   ============================================================ */
function openModal(title, body, mount) { $('#modalBox').innerHTML = `<h3>${title}<span class="grow"></span><button class="ghost" id="mClose">✕</button></h3><div class="mb">${body}</div>`; $('#modal').classList.add('show'); $('#mClose').onclick = closeModal; if (mount) mount($('#modalBox')); }
function closeModal() { $('#modal').classList.remove('show'); if (closeModal.onClose) { closeModal.onClose(); closeModal.onClose = null; } }
$('#modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal') closeModal(); });
async function copyText(t) { try { await navigator.clipboard.writeText(t); toast('Copiado para a área de transferência'); } catch (e) { toast('Não foi possível copiar — selecione o texto e use Ctrl+C'); } }
let downloadsNS = null;
(async () => { try { if (window.claude && window.claude.use) downloadsNS = await window.claude.use('downloads'); } catch (e) { } })();
async function saveFile(filename, data, fallbackText) {
  if (downloadsNS) {
    try { await downloadsNS.save({ filename, data }); toast('Arquivo salvo: ' + filename); return true; }
    catch (err) { if (err && err.code === 'declined') { toast('Download cancelado'); return false; } }
  }
  // fallback: link direto (fora do sandbox) ou texto copiável
  try { const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data])); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); } catch (e) { }
  if (typeof fallbackText === 'string') openModal('Salvar ' + esc(filename), `<div class="hint">Se o download não começou, copie o conteúdo abaixo e salve como <b>${esc(filename)}</b>.</div><textarea readonly id="fbText"></textarea><div class="btnrow"><button class="pri" id="fbCopy">Copiar</button></div>`, m => { m.querySelector('#fbText').value = fallbackText; m.querySelector('#fbCopy').onclick = () => copyText(fallbackText); });
  return false;
}

/* ---------- arquivo ---------- */
function sanitizeProject(d) {
  const p = Object.assign(newProject(), d); p.settings = Object.assign(newProject().settings, (d.version || 1) >= 2 ? (d.settings || {}) : {}); p.version = 2;
  p.objects = (d.objects || []).filter(o => ASSETS[o.type]).map(o => {
    const base = Object.assign({ px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 }, o.base || {}); if (o.type === 'camera' && base.focal == null) base.focal = 35;
    const tracks = {}; for (const ch in (o.tracks || {})) { const ks = (o.tracks[ch] || []).map(k => Object.assign(mkKey(k.f, k.v), k)); if (ks.length) { sortKeys(ks); autoHandles(ks); tracks[ch] = ks; } }
    return { id: o.id || uid(), type: o.type, name: o.name || ASSETS[o.type].label, params: Object.assign(defaultParams(o.type), o.params || {}), base, tracks, cons: Object.assign({ aim: null, aimH: 1, follow: null, mount: null, shake: 0, shakeFreq: 1.5 }, o.cons || {}), hidden: !!o.hidden, refs: o.refs || undefined, custom: o.custom || undefined, gear: o.gear || undefined, camHidden: o.camHidden || undefined, speedProf: Array.isArray(o.speedProf) ? o.speedProf.filter(p => isFinite(p.t) && isFinite(p.v)) : undefined, clips: (o.clips || []).filter(c => PERSON_ACTIONS[c.kind] || QUAD_ACTIONS[c.kind]).map(c => ({ id: c.id || uid('c'), kind: c.kind, start: +c.start, end: +c.end })) };
  });
  if (p.activeCamera && !p.objects.find(o => o.id === p.activeCamera)) p.activeCamera = null;
  p.shots = (d.shots || []).filter(s => p.objects.find(o => o.id === s.cam)).map(s => ({ cam: s.cam, start: Math.round(+s.start || 0), end: Math.round(+s.end || 0), name: String(s.name || '').slice(0, 60), notes: String(s.notes || '').slice(0, 400) }));
  return p;
}
function loadProjectData(d, fromHistory) {
  if (pilot.on) { pilot.rec = false; exitPilot(); }
  project = sanitizeProject(d); bump(); mcache.clear();
  const keepSel = sel && getObj(sel) ? sel : null;
  selKeys.clear(); rebuildAll(); sel = keepSel;
  $('#fpsSel').value = project.fps; syncDurUI(); $('#selAspect').value = project.aspect; viewPick = 'free'; viewMode = 'free';
  setFrame(Math.min(curFrame, project.duration));
  attachGizmo(); renderOutliner(); renderInspector(); renderChanList(); pathVer = -1; tlDirty = true;
  if (!fromHistory) { undoStack.length = 0; redoStack.length = 0; lastSnap = snapshot(); autosave(); fitTime(); }
}
function saveProject() { const json = JSON.stringify(project, null, 1); saveFile((project.name || 'layout') .replace(/[^\w\-]+/g, '_') + '.layout3d.json', json, json); }
$('#bSave').onclick = saveProject;
$('#bOpen').onclick = () => $('#fileIn').click();
$('#fileIn').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const d = JSON.parse(await f.text()); loadProjectData(d); toast('Projeto carregado'); } catch (err) { toast('Arquivo inválido'); } e.target.value = ''; };
$('#bNew').onclick = () => openModal('Nova cena', `<p>Começar uma cena vazia? Alterações não salvas serão perdidas (o histórico de desfazer é limpo).</p><div class="btnrow"><button class="pri" id="mNewOk">Nova cena</button><button id="mNewCam">Nova cena com câmera</button></div>`, m => {
  m.querySelector('#mNewOk').onclick = () => { closeModal(); loadProjectData(newProject()); select(null); };
  m.querySelector('#mNewCam').onclick = () => { closeModal(); loadProjectData(newProject()); addObject('camera', { base: { px: 0, py: 1.6, pz: 10, rx: -4, ry: 0 } }); };
});
$('#bDemo').onclick = () => openModal('Exemplos', `<div class="btnrow" style="flex-direction:column;align-items:stretch;gap:8px"><button class="pri" id="exComm" style="padding:12px;text-align:left">🏁 <b>Comercial esportivo · 30 s</b><br><span style="font-weight:400;font-size:11.5px">911 na serra (subida, grampo, descida), pilotagem realista, 11 planos com Technocrane, Russian Arm, drone, FPV, car mounts e câmera na mão.</span></button><button id="exBasic" style="padding:12px;text-align:left">🚗 <b>Cena simples · 10 s</b><br><span style="font-weight:400;font-size:11.5px">Carro, pedestre e 3 câmeras.</span></button></div>`, m => {
  m.querySelector('#exBasic').onclick = () => { closeModal(); loadProjectData(demoProject()); setView('free'); toast('Cena de exemplo carregada — aperte Espaço para tocar'); };
  m.querySelector('#exComm').onclick = () => { closeModal(); toast('Montando o comercial…'); setTimeout(() => { buildSportsCommercial(); toast('Comercial de 30 s pronto — Espaço para tocar a edição · 🎬 Decupagem para ver os planos', 6000); }, 30); };
});

/* ---------- ambiente ---------- */
function openEnvModal() {
  const s = project.settings;
  openModal('Ambiente', `<div class="mgrid">
    <label>Fundo — topo</label><input type="color" data-env="sky" value="${s.sky}">
    <label>Fundo — base</label><input type="color" data-env="bg2" value="${s.bg2 || s.sky}">
    <label>Chão</label><input type="color" data-env="ground" value="${s.ground}">
    <label>Névoa</label><input type="range" min="0" max="0.05" step="0.001" data-env="fog" value="${s.fog}">
    <label>Sol — azimute</label><input type="range" min="0" max="360" step="1" data-env="sunAz" value="${s.sunAz}">
    <label>Sol — elevação</label><input type="range" min="2" max="90" step="1" data-env="sunEl" value="${s.sunEl}">
    <label>Sol — intensidade</label><input type="range" min="0" max="6" step="0.1" data-env="sunInt" value="${s.sunInt}">
    <label>Tamanho do chão</label><input type="number" min="10" max="20000" step="10" data-env="groundSize" value="${s.groundSize}">
    <label>Grade</label><input type="checkbox" data-env="grid" ${s.grid ? 'checked' : ''}>
    <label>Depth: distância máx (m)</label><input type="number" min="1" max="5000" step="1" data-env="depthFar" value="${s.depthFar || 80}">
    </div><div class="btnrow" style="margin-top:12px">${[['Playblast cinza', '#4f565f', '#a7abb1', '#8d9094'], ['Playblast claro', '#9aa0a8', '#d9dbde', '#a9acb0'], ['Fundo escuro', '#1d1f23', '#3a3d43', '#5d6066']].map(p => `<button data-preset='${JSON.stringify(p)}'>${p[0]}</button>`).join('')}</div>`, m => {
    m.addEventListener('input', e => { const k = e.target.dataset.env; if (!k) return; s[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'color' ? e.target.value : +e.target.value; applyEnv(); });
    m.addEventListener('click', e => { const b = e.target.closest('[data-preset]'); if (!b) return; const [, sky, bg2, ground] = JSON.parse(b.dataset.preset); Object.assign(s, { sky, bg2, ground, fog: 0 }); applyEnv(); closeModal(); $('#bScene').click(); });
  });
  closeModal.onClose = () => commit();
}

/* ---------- ajuda ---------- */
$('#bHelp').onclick = () => openModal('Atalhos e fluxo', `<div class="helpgrid">
  <kbd>Espaço</kbd><span>Play / pause</span><kbd>← →</kbd><span>Frame anterior/próximo (Shift: 10)</span><kbd>J / L</kbd><span>Keyframe anterior / próximo</span>
  <kbd>W E R</kbd><span>Mover / girar / escala</span><kbd>K</kbd><span>Keyframe em todos os canais do objeto</span><kbd>P</kbd><span>Pilotar objeto selecionado</span>
  <kbd>C</kbd><span>Alternar vista livre / câmera ativa</span><kbd>F</kbd><span>Enquadrar seleção (no Graph: enquadrar curvas)</span>
  <kbd>F9</kbd><span>Easy Ease · Shift+F9 Ease In · Ctrl+Shift+F9 Ease Out</span><kbd>Delete</kbd><span>Apagar keys selecionadas ou o objeto</span>
  <kbd>1 2 3</kbd><span>Dope Sheet / Graph Editor / Velocidade</span><kbd>Ctrl+Z / Ctrl+Shift+Z</kbd><span>Desfazer / refazer</span><kbd>Ctrl+D</kbd><span>Duplicar</span><kbd>Ctrl+S</kbd><span>Salvar projeto</span>
  </div><p class="hint" style="margin-top:14px"><b>Pilotar:</b> selecione um carro, pessoa, animal, pássaro ou câmera e aperte <kbd>P</kbd>. Treine à vontade (o tempo fica parado), aperte <kbd>R</kbd> para gravar: a timeline anda em tempo real e o movimento vira keyframes a partir do frame atual. <kbd>R</kbd> de novo para parar. <kbd>T</kbd> volta para o estado do frame atual. <kbd>V</kbd> troca a vista.</p>
  <p class="hint"><b>Graph Editor:</b> arraste keys e alças; Alt+arrastar quebra a tangente; duplo clique na curva cria key; Shift trava o eixo; roda = zoom; botão do meio/direito = pan.</p>
  <p class="hint"><b>Para IA:</b> exporte o vídeo da câmera em Shaded/Clay como referência de movimento, em Depth para ControlNet/depth-to-video, Segmentação para máscaras, e use <b>✦ Prompt IA</b> para descrever o movimento de câmera em texto.</p>`);

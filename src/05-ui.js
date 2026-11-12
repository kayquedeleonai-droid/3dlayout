/* ============================================================
   ESTADO DE UI
   ============================================================ */
let curFrame = 0, playing = false, loop = true, sel = null, viewMode = 'free', renderMode = 'read';
let gizmoDragging = false, tlDirty = true, inspDirty = true, showPath = true, showGuides = true;
const selKeys = new Set(); // objetos key selecionados {o, ch, k}

function setFrame(f, fromPlay) {
  curFrame = clamp(Math.round(f), 0, project.duration);
  $('#fCur').value = curFrame;
  $('#tcode').textContent = timecode(curFrame);
  tlDirty = true;
}
function timecode(f) { const fps = project.fps, s = Math.floor(f / fps), fr = f % fps; return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(fr).padStart(2, '0')}`; }
function togglePlay(v) { playing = v ?? !playing; $('#pPlay').textContent = playing ? '❚❚' : '▶'; playAcc = 0; }
let playAcc = 0;

/* ---------- seleção ---------- */
function select(id) {
  if (pilot.on && id !== pilot.id) exitPilot();
  sel = id; selKeys.clear();
  attachGizmo(); renderOutliner(); renderInspector(); renderChanList(); tlDirty = true; pathVer = -1; selClip = null; libOnSelect();
}
function attachGizmo() {
  const o = sel && getObj(sel);
  if (o && !o.hidden && !pilot.on && rt.get(sel)) gizmo.attach(rt.get(sel).g); else gizmo.detach();
}

/* ---------- criar / remover objetos ---------- */
function addObject(type, opts = {}) {
  const d = ASSETS[type], n = project.objects.filter(o => o.type === type).length + 1;
  const o = { id: uid(), type, name: d.label + (n > 1 ? ' ' + n : ''), params: defaultParams(type), base: { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 }, tracks: {}, cons: { aim: null, aimH: 1, follow: null, shake: 0, shakeFreq: 1.5 }, hidden: false };
  if (type === 'camera') {
    o.base.focal = 35;
    const p = editorCam.position, e = new THREE.Euler().setFromQuaternion(editorCam.quaternion, 'YXZ');
    Object.assign(o.base, { px: p.x, py: p.y, pz: p.z, rx: e.x / DEG, ry: e.y / DEG, rz: 0 });
    if (!project.activeCamera) project.activeCamera = o.id;
  } else {
    const t = orbit.target; o.base.px = Math.round(t.x * 2) / 2; o.base.pz = Math.round(t.z * 2) / 2;
    if (d.pilot === 'bird' && !d.hover) o.base.py = 6;
    if (type === 'flock') o.base.py = 10;
  }
  if (type === 'null') o.base.py = 1;
  if (opts.id && !getObj(opts.id)) o.id = String(opts.id);
  if (opts.refs) o.refs = opts.refs;
  Object.assign(o.base, opts.base || {}); if (opts.params) Object.assign(o.params, opts.params); if (opts.name) o.name = opts.name; if (opts.cons) Object.assign(o.cons, opts.cons);
  project.objects.push(o); buildRuntime(o);
  if (!opts.silent) { select(o.id); commit(); }
  return o;
}
function deleteObject(id) {
  const i = project.objects.findIndex(o => o.id === id); if (i < 0) return;
  const r = rt.get(id); if (r) { world.remove(r.g); disposeGroup(r.g); rt.delete(id); }
  project.objects.splice(i, 1);
  project.shots = (project.shots || []).filter(s => s.cam !== id);
  for (const o of project.objects) { if (o.cons.aim === id) o.cons.aim = null; if (o.cons.follow === id) o.cons.follow = null; if (o.cons.mount === id) o.cons.mount = null; }
  if (project.activeCamera === id) project.activeCamera = (project.objects.find(o => o.type === 'camera') || {}).id || null;
  if (pilot.on && pilot.id === id) exitPilot();
  sel = null; select(null); bump(); commit();
}
function duplicateObject(id) {
  const o = getObj(id); if (!o) return;
  const c = JSON.parse(JSON.stringify(o)); c.id = uid(); c.name = o.name + ' cópia';
  for (const ch in c.tracks) if (ch === 'px' || ch === 'pz') c.tracks[ch].forEach(k => k.v += 2);
  if (!c.tracks.px?.length) c.base.px += 2; if (!c.tracks.pz?.length) c.base.pz += 2;
  project.objects.push(c); buildRuntime(c); select(c.id); bump(); commit();
}

/* ============================================================
   INSPETOR
   ============================================================ */
const secState = { xf: true, cam: true, cons: false, par: true, gen: false, car: true, ref: false, sens: false, model: true, road: true, gear: true, speed: true };
function sec(id, title, body, extra = '') { return `<div class="sec ${secState[id] ? '' : 'closed'}" data-sec="${id}"><div class="sech"><span class="car">${secState[id] ? '▼' : '▶'}</span>${title}<span class="grow"></span>${extra}</div><div class="secb">${body}</div></div>`; }
function chRow(o, ch) {
  const d = CH[ch], g = GROUPS[d.g];
  return `<div class="prow"><button class="kbtn" data-key="${ch}" title="Adicionar/remover keyframe">◇</button><span class="lb" data-scrub="${ch}" title="Arraste para ajustar">${d.lb}${g.unit ? ' <span style="color:var(--tx3)">' + g.unit + '</span>' : ''}</span><input type="number" step="${ch[0] === 'r' ? 1 : ch === 'focal' ? 1 : 0.1}" data-ch="${ch}"><span></span></div>`;
}
function grpBlock(o, gk) {
  const g = GROUPS[gk], on = g.ch.some(c => hasAnim(o, c));
  return `<div class="grpl"><button class="sw ${on ? 'on' : ''}" data-sw="${gk}" title="Cronômetro: ${on ? 'desativar animação (apaga keys)' : 'ativar animação'}">⏱</button>${g.lb}<span class="grow"></span><button class="kbtn" data-nav="${gk}:-1" title="Key anterior">◀</button><button class="kbtn" data-gkey="${gk}" title="Key em todos os eixos">◆</button><button class="kbtn" data-nav="${gk}:1" title="Próxima key">▶</button></div>` + g.ch.map(c => chRow(o, c)).join('');
}
function paramField(p, v) {
  let inp;
  if (p.t === 'color') inp = `<input type="color" data-par="${p.k}" value="${v}">`;
  else if (p.t === 'select') inp = `<select data-par="${p.k}">${p.opts.map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  else if (p.t === 'hidden') return '';
  else if (p.t === 'text') inp = `<input type="text" data-par="${p.k}" value="${esc(v ?? '')}">`;
  else if (p.t === 'bool') inp = `<input type="checkbox" data-par="${p.k}" ${v ? 'checked' : ''}>`;
  else inp = `<input type="number" data-par="${p.k}" value="${v}" min="${p.min}" max="${p.max}" step="${p.step}">`;
  return `<div class="prow wide"><span class="lb">${p.lb}</span>${inp}</div>`;
}
const GEN = {
  camera: [['dolly', 'Dolly in / out', [['dist', 'Distância (m, + entra)', 3]]], ['truck', 'Truck lateral', [['dist', 'Distância (m, + direita)', 3]]], ['pedestal', 'Pedestal (sobe/desce)', [['dist', 'Altura (m)', 2]]], ['orbit', 'Órbita em volta do alvo', [['angle', 'Ângulo (°)', 90]]], ['pan', 'Pan', [['angle', 'Ângulo (°, + esquerda)', 30]]], ['tilt', 'Tilt', [['angle', 'Ângulo (°, + cima)', 15]]], ['zoom', 'Zoom', [['focal', 'Focal final (mm)', 85]]], ['dollyzoom', 'Dolly zoom (vertigo)', [['dist', 'Distância (m, + entra)', 3], ['subj', 'Dist. do assunto (m)', 8]]], ['crane', 'Grua (sobe + tilt)', [['dist', 'Altura (m)', 4], ['angle', 'Tilt (°, − baixo)', -20]]]],
  obj: [['forward', 'Avançar em linha reta', [['dist', 'Distância (m)', 20]]], ['circle', 'Andar em círculo', [['radius', 'Raio (m)', 8], ['turns', 'Voltas', 1]]], ['spin', 'Girar no lugar', [['angle', 'Ângulo (°)', 360]]], ['rise', 'Subir / descer', [['dist', 'Altura (m)', 3]]], ['bounce', 'Quicar', [['dist', 'Altura (m)', 1], ['count', 'Quiques', 4]]]],
};
let genState = { preset: null, vals: {}, ease: 'inout', len: 5 };
const fk = (v) => Math.abs(+v || 0) < 1e-3 ? '0' : (+v).toFixed(3);
function renderInspector() {
  inspDirty = false;
  const o = sel && getObj(sel);
  if (!o) {
    $('#insp').innerHTML = envPanelHTML();
    return;
  }
  const d = ASSETS[o.type], isCam = o.type === 'camera';
  const others = project.objects.filter(x => x.id !== o.id);
  const optsObj = (cur) => `<option value="">— nenhum —</option>` + others.map(x => `<option value="${x.id}" ${x.id === cur ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  let h = `<div class="ph" style="padding-top:2px">${d.icon} ${esc(d.label)}<span class="grow"></span><button class="ghost" data-act="dup" title="Duplicar (Ctrl+D)">⧉</button><button class="ghost" data-act="del" title="Apagar (Delete)">🗑</button></div>`;
  h += `<div style="padding:10px 10px 4px"><input type="text" id="objName" value="${esc(o.name)}" style="width:100%;font-weight:600"></div>`;
  h += `<div class="hint" id="dimLine" style="padding:0 10px;margin:2px 0 4px"></div>`;
  h += `<div style="padding:4px 10px 10px"><button class="${pilot.on && pilot.id === o.id ? 'rec' : 'pri'}" data-act="pilot" style="width:100%;padding:7px">${pilot.on && pilot.id === o.id ? '■ Parar de pilotar (Esc)' : ic('gamepad', 15) + '<span>Pilotar e gravar movimento (P)</span>'}</button></div>`;
  // transformação
  if (isCam) {
    const act = project.activeCamera === o.id;
    h += sec('cam', 'Câmera & lente', cameraSectionHTML(o));
  }
  if (!isCam && (swapOptions(o) || o.custom)) h += sec('model', 'Modelo' + (o.custom ? ' <span style="color:var(--acc)">•</span>' : ''), modelSectionHTML(o));
  h += sec('xf', 'Transformação', grpBlock(o, 'pos') + grpBlock(o, 'rot') + grpBlock(o, 'scl') + `<div class="hint">Cronômetro ⏱ liga a animação: depois disso, qualquer mudança cria keyframe no frame atual (como no After Effects).</div>`);
  const c = o.cons;
  h += sec('cons', 'Restrições' + (c.aim || c.follow || c.shake ? ' <span style="color:var(--acc)">•</span>' : ''), `
    <div class="prow wide"><span class="lb">Mirar em</span><select data-cons="aim">${optsObj(c.aim)}</select></div>
    <div class="prow wide"><span class="lb">Altura da mira</span><input type="number" step="0.1" data-cons="aimH" value="${c.aimH}"></div>
    ${o.type === 'camera' ? `<div class="prow wide"><span class="lb">Alvo na tela</span><select id="frameSel">${[['0,0', 'Centro'], ['-0.333,0', 'Terço esquerdo'], ['0.333,0', 'Terço direito'], ['0,-0.333', 'Terço inferior'], ['0,0.333', 'Terço superior'], ['-0.333,-0.333', 'Ponto ↙ (esq. inferior)'], ['0.333,-0.333', 'Ponto ↘ (dir. inferior)'], ['-0.333,0.333', 'Ponto ↖ (esq. superior)'], ['0.333,0.333', 'Ponto ↗ (dir. superior)']].map(([v, l]) => `<option value="${v}" ${v === fk(c.frameX) + ',' + fk(c.frameY) ? 'selected' : ''}>${l}</option>`).join('')}</select></div>` : ''}
    <div class="prow wide"><span class="lb">Seguir</span><select data-cons="follow">${optsObj(c.follow)}</select></div>
    <div class="prow wide"><span class="lb">Montar (rig)</span><select data-cons="mount">${optsObj(c.mount)}</select></div>
    ${o.type !== 'camera' ? `<div class="prow wide"><span class="lb">Esconder nas câmeras</span><input type="checkbox" id="camHid" ${o.camHidden ? 'checked' : ''} title="Aparece no editor, mas não nas câmeras nem no vídeo (carro de câmera, equipe, marcações)"></div>` : ''}
    ${followsGround(o) ? `<div class="prow wide"><span class="lb">Seguir estrada/terreno</span><input type="checkbox" id="consGround" ${c.ground === false ? '' : 'checked'}></div>` : ''}
    <div class="prow wide"><span class="lb">Tremor (°)</span><input type="number" step="0.1" min="0" data-cons="shake" value="${c.shake}"></div>
    <div class="prow wide"><span class="lb">Freq. tremor</span><input type="number" step="0.1" min="0" data-cons="shakeFreq" value="${c.shakeFreq}"></div>
    <div class="hint"><b>Mirar</b>: aponta sempre para o objeto. <b>Seguir</b>: posição relativa ao alvo, sem girar junto (travelling/perseguição). <b>Montar</b>: rig preso ao veículo — acompanha posição e giro (capô, porta, para-choque). <b>Tremor</b>: câmera na mão.</div>`);
  if (o.type === 'realcar') h += sec('car', 'Ficha técnica do carro', carSection(o));
  if (o.type === 'roadpath') h += sec('road', 'Traçado da estrada', roadSectionHTML(o));
  if (isCam) h += sec('gear', 'Equipamento de filmagem' + (o.gear && o.gear.type !== 'none' ? ' <span style="color:var(--acc)">•</span>' : ''), gearSectionHTML(o));
  if (!isCam && ASSETS[o.type].pilot) h += sec('speed', 'Velocidade e quilometragem', speedSectionHTML(o));
  if (o.type !== 'camera') h += sec('ref', 'Model sheet / referência' + (o.refs && Object.keys(o.refs).length ? ' <span style="color:var(--acc)">•</span>' : ''), refsSection(o));
  if (d.params.length) h += sec(isCam ? 'sens' : 'par', isCam ? 'Sensor e óptica (avançado)' : 'Parâmetros procedurais', d.params.map(p => paramField(p, o.params[p.k] ?? p.def)).join(''));
  // gerador
  const list = isCam ? GEN.camera : GEN.obj;
  if (!genState.preset || !list.find(x => x[0] === genState.preset)) { genState.preset = list[0][0]; genState.vals = {}; }
  const gp = list.find(x => x[0] === genState.preset);
  h += sec('gen', 'Gerador de movimento', `
    <div class="prow wide"><span class="lb">Movimento</span><select id="genPreset">${list.map(x => `<option value="${x[0]}" ${x[0] === genState.preset ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div>
    ${gp[2].map(([k, l, dv]) => `<div class="prow wide"><span class="lb">${l}</span><input type="number" step="0.5" data-gen="${k}" value="${genState.vals[k] ?? dv}"></div>`).join('')}
    <div class="prow wide"><span class="lb">Duração (s)</span><input type="number" step="0.5" min="0.1" id="genLen" value="${genState.len}"></div>
    <div class="prow wide"><span class="lb">Easing</span><select id="genEase"><option value="inout">Ease in-out</option><option value="in">Ease in</option><option value="out">Ease out</option><option value="linear">Linear</option></select></div>
    <div class="btnrow"><button class="pri" data-act="gen">Gerar a partir do frame ${curFrame}</button></div>
    <div class="hint">Cria keyframes procedurais a partir do estado atual. Depois refine no Graph Editor.</div>`);
  $('#insp').innerHTML = h; updateRoadHandles(); if (!isCam && d.pilot && secState.speed) drawSpeedGraph(o);
  $('#genEase') && ($('#genEase').value = genState.ease);
  refreshInspectorValues(true);
}
function refreshInspectorValues(force) {
  const o = sel && getObj(sel); if (!o) return;
  const dl = document.getElementById('dimLine'), r = rt.get(o.id);
  if (dl && r && r.size) { const sx = getVal(o, 'sx', curFrame), sy = getVal(o, 'sy', curFrame), sz = getVal(o, 'sz', curFrame); const t = `Medidas reais: C ${fmt(r.size.z * sz, 2)} × L ${fmt(r.size.x * sx, 2)} × A ${fmt(r.size.y * sy, 2)} m`; if (dl.textContent !== t) dl.textContent = t; }
  const live = pilot.on && pilot.id === o.id;
  document.querySelectorAll('#insp input[data-ch]').forEach(inp => {
    const ch = inp.dataset.ch;
    let v = getVal(o, ch, curFrame);
    if (live) { const s = pilot.s; v = { px: s.pos.x, py: s.pos.y, pz: s.pos.z, rx: s.rx / DEG, ry: s.ry / DEG, rz: s.rz / DEG, focal: s.focal }[ch] ?? v; }
    if (document.activeElement !== inp) inp.value = fmt(v, ch[0] === 'r' ? 2 : 3);
    inp.classList.toggle('animated', hasAnim(o, ch)); inp.classList.toggle('keyed', !!keyAt(o, ch, curFrame));
  });
  document.querySelectorAll('#insp .kbtn[data-key]').forEach(b => { const k = keyAt(o, b.dataset.key, curFrame); b.textContent = k ? '◆' : '◇'; b.classList.toggle('has', hasAnim(o, b.dataset.key)); });
}
// eventos do inspetor
const insp = $('#insp');
insp.addEventListener('click', e => {
  const o = sel && getObj(sel);
  const sh = e.target.closest('.sech'); if (sh) { const s = sh.parentElement.dataset.sec; secState[s] = !secState[s]; renderInspector(); return; }
  const b = e.target.closest('button'); if (!b || !o) return;
  const act = b.dataset.act;
  if (act === 'del') return deleteObject(o.id);
  if (act === 'dup') return duplicateObject(o.id);
  if (act === 'pilot') { pilot.on && pilot.id === o.id ? exitPilot() : startPilot(o.id); return; }
  if (act === 'active') { project.activeCamera = o.id; commit(); renderInspector(); renderOutliner(); return; }
  if (act === 'sbadd') { addStoryboardShot(o.id); return; }
  if (act === 'lookthru') { project.activeCamera = o.id; setView('cam'); renderInspector(); renderOutliner(); return; }
  if (act === 'fromview') { const p = editorCam.position, eu = new THREE.Euler().setFromQuaternion(editorCam.quaternion, 'YXZ'); const vals = { px: p.x, py: p.y, pz: p.z, rx: eu.x / DEG, ry: eu.y / DEG, rz: 0 }; for (const ch in vals) setChannel(o, ch, curFrame, vals[ch]); commit(); tlDirty = true; return; }
  if (b.dataset.focal) { setChannel(o, 'focal', curFrame, +b.dataset.focal); commit(); tlDirty = true; lensBarKey = ''; renderInspector(); return; }
  if (act === 'gen') { runGenerator(o); return; }
  if (b.dataset.key) { const ch = b.dataset.key, k = keyAt(o, ch, curFrame); if (k) { o.tracks[ch] = o.tracks[ch].filter(x => x !== k); autoHandles(o.tracks[ch]); bump(); } else setKey(o, ch, curFrame, getVal(o, ch, curFrame)); commit(); tlDirty = true; renderChanList(); refreshInspectorValues(); return; }
  if (b.dataset.gkey) { const g = GROUPS[b.dataset.gkey]; for (const ch of g.ch) setKey(o, ch, curFrame, getVal(o, ch, curFrame)); commit(); tlDirty = true; renderInspector(); renderChanList(); return; }
  if (b.dataset.sw) { const g = GROUPS[b.dataset.sw], on = g.ch.some(c => hasAnim(o, c)); for (const ch of g.ch) { if (on) { o.base[ch] = getVal(o, ch, curFrame); delete o.tracks[ch]; } else setKey(o, ch, curFrame, getVal(o, ch, curFrame)); } bump(); commit(); tlDirty = true; renderInspector(); renderChanList(); renderOutliner(); return; }
  if (b.dataset.nav) { const [gk, dir] = b.dataset.nav.split(':'); jumpKey(+dir, GROUPS[gk].ch); return; }
});
insp.addEventListener('change', e => {
  const o = sel && getObj(sel); if (!o) return; const t = e.target;
  if (t.id === 'objName') { o.name = t.value || o.name; renderOutliner(); renderChanList(); commit(); return; }
  if (t.dataset.ch) { const v = parseFloat(t.value); if (isFinite(v)) { setChannel(o, t.dataset.ch, curFrame, v); commit(); tlDirty = true; } return; }
  if (t.dataset.par) { const p = ASSETS[o.type].params.find(x => x.k === t.dataset.par); o.params[p.k] = p.t === 'bool' ? t.checked : (p.t === 'num' || p.t === 'int') ? clamp(+t.value, p.min, p.max) : t.value; if (o.type === 'realcar' && p.k !== 'model' && p.k !== 'color' && p.k !== 'vmax' && p.k !== 'modelName' && p.k !== 'body' && o.params.model !== 'custom') o.params.model = 'custom'; buildRuntime(o); attachGizmo(); bump(); commit(); return; }
  if (t.dataset.cons) { const k = t.dataset.cons; if (k === 'mount') { const tg = t.value && getObj(t.value); if (tg && o.type === 'person' && ASSETS[tg.type] && ASSETS[tg.type].pilot === 'car') { const r = seatInCar(o, tg); buildRuntime(o); bump(); commit(); renderInspector(); toast('Sentado no banco do motorista · folga até o teto ' + Math.round(r.headroom * 100) + ' cm'); return; } if (t.value) convertMount(o, t.value); else { const p = worldPos(o, curFrame, new THREE.Vector3()); o.cons.mount = null; delete o.tracks.px; delete o.tracks.py; delete o.tracks.pz; Object.assign(o.base, { px: p.x, py: p.y, pz: p.z }); } } o.cons[k] = (k === 'aim' || k === 'follow' || k === 'mount') ? (t.value || null) : +t.value; if (k === 'follow') convertFollow(o, t.value || null); bump(); commit(); renderInspector(); return; }
  if (t.id === 'genPreset') { genState.preset = t.value; genState.vals = {}; renderInspector(); return; }
  if (t.dataset.gen) { genState.vals[t.dataset.gen] = +t.value; return; }
  if (t.id === 'genLen') { genState.len = +t.value; return; }
  if (t.id === 'genEase') { genState.ease = t.value; return; }
});
// ao ligar "seguir", converte posição absoluta em deslocamento (mantém o objeto onde está)
function convertFollow(o, newId) {
  const prev = o._prevFollow; // não usado; conversão simples pelo frame atual
  const t = newId && getObj(newId);
  const f = curFrame;
  if (t) { const tp = worldPos(t, f, new THREE.Vector3()); for (const [ch, ax] of [['px', 'x'], ['py', 'y'], ['pz', 'z']]) { if (hasAnim(o, ch)) o.tracks[ch].forEach(k => { k.v -= worldPos(t, k.f, new THREE.Vector3())[ax]; }); else o.base[ch] -= tp[ax]; } }
}
// arrastar rótulo para ajustar valor (estilo AE)
let scrub = null;
insp.addEventListener('pointerdown', e => {
  const lb = e.target.closest('[data-scrub]'); if (!lb) return; const o = getObj(sel); if (!o) return;
  scrub = { ch: lb.dataset.scrub, x: e.clientX, v0: getVal(o, lb.dataset.scrub, curFrame), o }; lb.setPointerCapture(e.pointerId); e.preventDefault();
});
insp.addEventListener('pointermove', e => {
  if (!scrub) return; const dx = e.clientX - scrub.x, ch = scrub.ch;
  const step = (ch[0] === 'r' ? 0.5 : ch[0] === 's' ? 0.01 : ch === 'focal' ? 0.5 : 0.02) * (e.shiftKey ? 10 : e.altKey || e.ctrlKey ? 0.1 : 1);
  setChannel(scrub.o, ch, curFrame, scrub.v0 + dx * step); tlDirty = true;
});
insp.addEventListener('pointerup', () => { if (scrub) { scrub = null; commit(); } });

/* ---------- gerador de movimento ---------- */
const EASE = { linear: u => u, inout: u => u * u * (3 - 2 * u), in: u => u * u, out: u => 1 - (1 - u) * (1 - u) };
function runGenerator(o) {
  const list = o.type === 'camera' ? GEN.camera : GEN.obj, gp = list.find(x => x[0] === genState.preset);
  const P = {}; gp[2].forEach(([k, , dv]) => P[k] = genState.vals[k] ?? dv);
  const f0 = curFrame, f1 = Math.min(project.duration, f0 + Math.max(1, Math.round(genState.len * project.fps)));
  if (f1 <= f0) return toast('Sem espaço na timeline após o frame atual');
  const ez = EASE[genState.ease];
  const st = { px: getVal(o, 'px', f0), py: getVal(o, 'py', f0), pz: getVal(o, 'pz', f0), rx: getVal(o, 'rx', f0), ry: getVal(o, 'ry', f0), rz: getVal(o, 'rz', f0), focal: o.type === 'camera' ? getVal(o, 'focal', f0) : 0 };
  const yaw = st.ry * DEG, pit = st.rx * DEG;
  const fwdC = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pit), Math.sin(pit), -Math.cos(yaw) * Math.cos(pit)), right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const fwdO = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  let center = null;
  if (genState.preset === 'orbit') { const t = o.cons.aim && getObj(o.cons.aim); if (t) { center = worldPos(t, f0, new THREE.Vector3()); const fl = o.cons.follow && getObj(o.cons.follow); if (fl) center.sub(worldPos(fl, f0, new THREE.Vector3())); } else center = new THREE.Vector3(st.px, st.py, st.pz).addScaledVector(fwdC, 8); }
  if (genState.preset === 'circle') center = new THREE.Vector3(st.px, st.py, st.pz).addScaledVector(left, P.radius);
  const S = {}; const push = (ch, f, v) => (S[ch] = S[ch] || []).push({ f, v });
  for (let f = f0; f <= f1; f++) {
    const u = ez((f - f0) / (f1 - f0));
    const p = new THREE.Vector3(st.px, st.py, st.pz);
    switch (genState.preset) {
      case 'dolly': p.addScaledVector(fwdC, P.dist * u); push('px', f, p.x); push('py', f, p.y); push('pz', f, p.z); break;
      case 'truck': p.addScaledVector(right, P.dist * u); push('px', f, p.x); push('pz', f, p.z); break;
      case 'pedestal': case 'rise': push('py', f, st.py + P.dist * u); break;
      case 'orbit': case 'circle': { const a = (genState.preset === 'orbit' ? P.angle * DEG : P.turns * Math.PI * 2) * u; const r = p.clone().sub(center).applyAxisAngle(UP, a).add(center); push('px', f, r.x); push('pz', f, r.z); push('ry', f, st.ry + a / DEG); break; }
      case 'pan': push('ry', f, st.ry + P.angle * u); break;
      case 'tilt': push('rx', f, st.rx + P.angle * u); break;
      case 'spin': push('ry', f, st.ry + P.angle * u); break;
      case 'zoom': push('focal', f, lerp(st.focal, P.focal, u)); break;
      case 'dollyzoom': { const d = P.dist * u; p.addScaledVector(fwdC, d); push('px', f, p.x); push('py', f, p.y); push('pz', f, p.z); push('focal', f, clamp(st.focal * (P.subj - d) / P.subj, 4, 600)); break; }
      case 'crane': push('py', f, st.py + P.dist * u); push('rx', f, st.rx + P.angle * u); break;
      case 'forward': p.addScaledVector(fwdO, P.dist * u); push('px', f, p.x); push('pz', f, p.z); break;
      case 'bounce': { const uu = (f - f0) / (f1 - f0); push('py', f, st.py + Math.abs(Math.sin(uu * Math.PI * P.count)) * P.dist * (1 - uu * 0.5)); break; }
    }
  }
  for (const ch in S) writeSamples(o, ch, S[ch], 'simplify', ch[0] === 'r' ? 0.05 : ch === 'focal' ? 0.05 : 0.004);
  commit(); tlDirty = true; renderInspector(); renderChanList(); renderOutliner();
  toast(`Movimento gerado: frames ${f0}–${f1}`);
}

/* ---------- gizmo ---------- */
gizmo.addEventListener('dragging-changed', e => { orbit.enabled = !e.value && !(pilot.on && pilot.view !== 'free'); gizmoDragging = e.value; if (!e.value) { commit(); tlDirty = true; } });
gizmo.addEventListener('objectChange', () => {
  const o = sel && getObj(sel); if (!o) return; const g = rt.get(o.id).g, f = curFrame, mode = gizmo.getMode();
  if (mode === 'translate') {
    const p = g.position.clone(); const fl = o.cons.follow && getObj(o.cons.follow), mt = o.cons.mount && getObj(o.cons.mount); if (mt) p.sub(worldPos(mt, f, new THREE.Vector3())).applyAxisAngle(UP, -mountYaw(mt, f)); else if (fl) p.sub(worldPos(fl, f, new THREE.Vector3()));
    for (const [ch, v] of [['px', p.x], ['py', p.y], ['pz', p.z]]) if (Math.abs(v - getVal(o, ch, f)) > 1e-6) setChannel(o, ch, f, v);
  } else if (mode === 'rotate') {
    const e = new THREE.Euler().setFromQuaternion(g.quaternion, 'YXZ');
    for (const [ch, v] of [['rx', e.x / DEG], ['ry', e.y / DEG], ['rz', e.z / DEG]]) { const cur = getVal(o, ch, f); let nv = cur + (((v - cur) % 360) + 540) % 360 - 180; if (Math.abs(nv - cur) > 1e-4) setChannel(o, ch, f, nv); }
  } else {
    for (const [ch, v] of [['sx', g.scale.x], ['sy', g.scale.y], ['sz', g.scale.z]]) if (Math.abs(v - getVal(o, ch, f)) > 1e-6) setChannel(o, ch, f, v);
  }
  tlDirty = true;
});
function setGizmoMode(m) { gizmo.setMode(m); $('#tMove').classList.toggle('on', m === 'translate'); $('#tRot').classList.toggle('on', m === 'rotate'); $('#tScale').classList.toggle('on', m === 'scale'); }
$('#tMove').onclick = () => setGizmoMode('translate'); $('#tRot').onclick = () => setGizmoMode('rotate'); $('#tScale').onclick = () => setGizmoMode('scale');
$('#tSpace').onclick = () => { gizmo.setSpace(gizmo.space === 'local' ? 'world' : 'local'); $('#tSpace').classList.toggle('on', gizmo.space === 'local'); toast('Espaço do gizmo: ' + (gizmo.space === 'local' ? 'local' : 'global')); };
$('#tSnap').onclick = () => { const on = !gizmo.translationSnap; gizmo.setTranslationSnap(on ? 0.5 : null); gizmo.setRotationSnap(on ? 15 * DEG : null); gizmo.setScaleSnap(on ? 0.1 : null); $('#tSnap').classList.toggle('on', on); };
$('#tPath').onclick = () => { showPath = !showPath; $('#tPath').classList.toggle('on', showPath); pathVer = -1; };
$('#tGuides').onclick = () => { showGuides = !showGuides; $('#tGuides').classList.toggle('on', showGuides); };

/* ---------- picking ---------- */
const ray = new THREE.Raycaster(); let downPt = null;
renderer.domElement.addEventListener('pointerdown', e => { downPt = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downPt || pilot.on && pilot.view !== 'free') return; const moved = Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y); downPt = null;
  if (moved > 4 || gizmo.dragging || gizmo.axis) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const cam = currentViewCam(); if (!cam) return;
  const vr = viewRect(); const nx = ((e.clientX - rect.left - vr.x) / vr.w) * 2 - 1, ny = -((e.clientY - rect.top - (rect.height - vr.y - vr.h)) / vr.h) * 2 + 1;
  ray.setFromCamera({ x: nx, y: ny }, cam);
  const hits = ray.intersectObjects(world.children, true).filter(h => h.object.visible && (h.object.isMesh) && h.object.userData.objId);
  const visibleHit = hits.find(h => { let x = h.object; while (x) { if (!x.visible) return false; x = x.parent; } return true; });
  if (visibleHit) { if (!pilot.on) select(visibleHit.object.userData.objId); } else if (!pilot.on) select(null);
});
function frameSelected() {
  const o = sel && getObj(sel); if (!o) return; const r = rt.get(o.id);
  const p = r.g.position.clone(); p.y += Math.min(r.radius, 3) * 0.5;
  const d = editorCam.position.clone().sub(orbit.target).normalize().multiplyScalar(Math.max(3, r.radius * 3));
  orbit.target.copy(p); editorCam.position.copy(p).add(d); setView('free');
}
let viewPick = 'free';
function setView(m) {
  const cams = project.objects.filter(o => o.type === 'camera');
  if (m === 'free') viewPick = 'free';
  else if (m === 'cam') { if (!cams.length) { toast('Adicione uma câmera primeiro'); viewPick = 'free'; } else viewPick = project.shots && project.shots.length ? 'cut' : (project.activeCamera || cams[0].id); }
  else viewPick = m;
  if (viewPick !== 'free' && viewPick !== 'cut' && !getObj(viewPick)) viewPick = 'free';
  if (viewPick !== 'free' && viewPick !== 'cut') project.activeCamera = viewPick;
  viewMode = viewPick === 'free' ? 'free' : 'cam';
  renderViewSel();
}
$('#selRender').onchange = e => { renderMode = e.target.value; e.target.blur(); };
$('#selAspect').onchange = e => { project.aspect = e.target.value; commit(); e.target.blur(); };

/* ---------- navegação de keys ---------- */
function allKeyFrames(chs) { const o = sel && getObj(sel); const fr = new Set(); const objs = o ? [o] : project.objects; for (const ob of objs) for (const ch in ob.tracks) if (!chs || chs.includes(ch)) ob.tracks[ch].forEach(k => fr.add(Math.round(k.f))); return [...fr].sort((a, b) => a - b); }
function jumpKey(dir, chs) { const fr = allKeyFrames(chs); const t = dir > 0 ? fr.find(f => f > curFrame) : fr.reverse().find(f => f < curFrame); if (t !== undefined) setFrame(t); }
function keyAllSelected() { const o = sel && getObj(sel); if (!o) return; for (const ch of channelsOf(o)) setKey(o, ch, curFrame, getVal(o, ch, curFrame)); commit(); tlDirty = true; renderInspector(); renderChanList(); renderOutliner(); toast('Keyframe em todos os canais'); }

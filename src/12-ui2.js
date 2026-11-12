/* ============================================================
   CONSOLE DO DIRETOR — biblioteca, objetos, ambiente, overlays do viewport
   ============================================================ */
function syncDurUI() { $('#durIn').value = +(project.duration / project.fps).toFixed(2); }

/* ---------- ambiente ---------- */
const ENV_PRESETS = {
  studio: { lb: 'Estúdio', s: { sky: '#151516', bg2: '#1d1d1f', ground: '#232325', grid: true, groundShow: true, groundOpacity: 1, fog: 0 } },
  grey: { lb: 'Playblast cinza', s: { sky: '#4f565f', bg2: '#a7abb1', ground: '#8d9094', grid: true, groundShow: true, groundOpacity: 1, fog: 0 } },
  light: { lb: 'Playblast claro', s: { sky: '#9aa0a8', bg2: '#d9dbde', ground: '#a9acb0', grid: true, groundShow: true, groundOpacity: 1, fog: 0 } },
  dark: { lb: 'Fundo escuro', s: { sky: '#1d1f23', bg2: '#3a3d43', ground: '#5d6066', grid: true, groundShow: true, groundOpacity: 1, fog: 0 } },
  outdoor: { lb: 'Exterior (dia)', s: { sky: '#6f93c4', bg2: '#cfd9e4', ground: '#7d8670', grid: false, groundShow: true, groundOpacity: 1, fog: 0.004 } },
};
function applyEnvExtra(s) {
  const ex = s.exposure ?? 1;
  ground.visible = s.groundShow !== false;
  const op = s.groundOpacity ?? 1; ground.material.transparent = op < 1; ground.material.opacity = op; ground.material.needsUpdate = true;
  sun.intensity = s.sunInt * ex; hemi.intensity = 1.25 * ex;
}
function envPanelHTML() {
  const s = project.settings, cur = Object.keys(ENV_PRESETS).find(k => Object.entries(ENV_PRESETS[k].s).every(([a, b]) => s[a] === b)) || '';
  const tg = (k, on) => `<button class="tog ${on ? 'on' : ''}" data-envtog="${k}"></button>`;
  const rg = (k, mn, mx, st, v) => `<input type="range" data-env="${k}" min="${mn}" max="${mx}" step="${st}" value="${v}">`;
  return `<div class="secb" style="padding-top:4px">
    <div class="prow wide"><span class="lb">Preset de ambiente</span><select data-envpreset="1"><option value="">Personalizado</option>${Object.entries(ENV_PRESETS).map(([k, p]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${p.lb}</option>`).join('')}</select></div>
    <div class="prow wide"><span class="lb">Fundo (topo)</span><input type="color" data-env="sky" value="${s.sky}"></div>
    <div class="prow wide"><span class="lb">Fundo (base)</span><input type="color" data-env="bg2" value="${s.bg2 || s.sky}"></div>
    <div class="prow wide"><span class="lb">Cor do chão</span><input type="color" data-env="ground" value="${s.ground}"></div>
    <div class="prow wide"><span class="lb">Mostrar chão</span>${tg('groundShow', s.groundShow !== false)}</div>
    <div class="prow wide"><span class="lb">Opacidade do chão</span>${rg('groundOpacity', 0, 1, .05, s.groundOpacity ?? 1)}</div>
    <div class="prow wide"><span class="lb">Grade</span>${tg('grid', s.grid)}</div>
    <div class="prow wide"><span class="lb">Exposição</span>${rg('exposure', .3, 2, .05, s.exposure ?? 1)}</div>
    <div class="prow wide"><span class="lb">Sol · direção</span>${rg('sunAz', 0, 360, 1, s.sunAz)}</div>
    <div class="prow wide"><span class="lb">Sol · altura</span>${rg('sunEl', 3, 90, 1, s.sunEl)}</div>
    <div class="prow wide"><span class="lb">Névoa</span>${rg('fog', 0, .05, .001, s.fog)}</div>
    <div class="prow wide"><span class="lb">Depth máx (m)</span><input type="number" data-env="depthFar" value="${s.depthFar || 80}" min="1" max="5000"></div>
  </div>
  <div class="sec"><div class="secb" style="padding-top:12px"><div class="hint" style="margin:0;line-height:1.7"><b style="color:var(--tx2)">Como dirigir uma cena</b><br>1. Arraste personagens, veículos e cenário da <b>Biblioteca</b><br>2. Dê ações na aba 🎬 ou pilote com <kbd>P</kbd> + <kbd>R</kbd><br>3. Crie câmeras pela aba 🎥 (presets de plano e movimento)<br>4. Monte o <b>Storyboard</b> na timeline (＋)<br>5. Ou descreva tudo em <b>✨ Diretor por prompt</b><br>6. Exporte vídeo playblast / depth / segmentação para a IA</div></div></div>`;
}
insp.addEventListener('input', e => { const k = e.target.dataset.env; if (!k || sel) return; const s = project.settings, t = e.target; s[k] = t.type === 'color' ? t.value : +t.value; applyEnv(); });
insp.addEventListener('change', e => {
  if (sel) return; const t = e.target;
  if (t.dataset.envpreset != null && t.value) { Object.assign(project.settings, ENV_PRESETS[t.value].s); applyEnv(); commit(); renderInspector(); return; }
  if (t.dataset.env) commit();
});
insp.addEventListener('click', e => { const b = e.target.closest('[data-envtog]'); if (!b || sel) return; const k = b.dataset.envtog, s = project.settings; s[k] = !(s[k] !== false && s[k] !== undefined ? s[k] : k === 'groundShow'); applyEnv(); commit(); renderInspector(); });

/* ---------- miniaturas renderizadas ---------- */
let thumbR = null, thumbScene = null, thumbCam = null, thumbGround = null;
const thumbs = new Map(), thumbQ = [], thumbQueued = new Set();
function initThumbs() {
  try { thumbR = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); } catch (e) { return; }
  thumbR.setPixelRatio(1); thumbR.setSize(240, 180, false); thumbR.outputColorSpace = THREE.SRGBColorSpace; thumbR.toneMapping = THREE.NoToneMapping;
  thumbScene = new THREE.Scene();
  const c = document.createElement('canvas'); c.width = 4; c.height = 128; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#36363b'); g.addColorStop(1, '#19191b'); x.fillStyle = g; x.fillRect(0, 0, 4, 128);
  const bg = new THREE.CanvasTexture(c); bg.colorSpace = THREE.SRGBColorSpace; thumbScene.background = bg;
  thumbScene.add(new THREE.HemisphereLight('#f3f4f7', '#57534e', 1.35));
  const dl = new THREE.DirectionalLight('#ffffff', 1.7); dl.position.set(3, 6, 4); thumbScene.add(dl);
  thumbGround = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshStandardMaterial({ color: '#2a2a2d', roughness: 1 })); thumbGround.rotation.x = -Math.PI / 2; thumbScene.add(thumbGround);
  thumbCam = new THREE.PerspectiveCamera(30, 4 / 3, 0.01, 5000);
}
function queueThumb(key, fn) { if (thumbs.has(key) || thumbQueued.has(key)) return; thumbQueued.add(key); thumbQ.push({ key, fn }); }
function snapThumb(obj, camSetup) {
  thumbScene.add(obj); obj.updateMatrixWorld(true);
  if (camSetup) camSetup(thumbCam); else {
    const bb = new THREE.Box3(); obj.traverse(n => { if (n.isMesh && !isHelperNode(n)) bb.expandByObject(n); }); if (bb.isEmpty()) bb.setFromObject(obj);
    const sph = bb.getBoundingSphere(new THREE.Sphere()), r = Math.max(0.05, sph.radius), dir = new THREE.Vector3(1.05, 0.62, 1.35).normalize();
    thumbCam.fov = 30; thumbCam.aspect = 4 / 3; thumbCam.near = r / 100; thumbCam.far = r * 100; thumbCam.updateProjectionMatrix();
    thumbCam.position.copy(sph.center).addScaledVector(dir, r / Math.sin(15 * DEG) * 0.92); thumbCam.lookAt(sph.center);
    thumbGround.scale.setScalar(r * 3); thumbGround.position.set(sph.center.x, Math.min(0, bb.min.y) - 0.001, sph.center.z);
  }
  thumbR.render(thumbScene, thumbCam);
  const url = thumbR.domElement.toDataURL('image/jpeg', 0.86);
  thumbScene.remove(obj); obj.traverse(n => { if (n.geometry) n.geometry.dispose(); });
  return url;
}
function pumpThumbs() {
  if (!thumbR || !thumbQ.length) return;
  const t0 = performance.now();
  while (thumbQ.length && performance.now() - t0 < 12) {
    const { key, fn } = thumbQ.shift();
    let url = null; try { url = fn(); } catch (e) { console.warn('thumb', key, e); }
    thumbs.set(key, url);
    if (url) document.querySelectorAll(`img[data-th="${key}"]`).forEach(im => { im.src = url; im.style.display = ''; if (im.nextElementSibling) im.nextElementSibling.style.display = 'none'; });
  }
}
const idleCtx = { t: 0.4, dist: 0, speed: 0, yawRate: 0, vy: 0, y: 0 };
function assetThumb(type, params) { return () => { const d = ASSETS[type], p = Object.assign(defaultParams(type), params || {}); const g = d.build(p); if (d.anim && g.userData.rig) d.anim(g.userData.rig, { ...idleCtx, y: d.pilot === 'bird' ? 2 : 0, speed: d.pilot === 'bird' ? 5 : 0 }, p); return snapThumb(g); }; }
function mannequin() { const p = Object.assign(defaultParams('person'), { look: 'mannequin', pose: 'stand' }); const g = buildPerson(p); animPerson(g.userData.rig, idleCtx, p); return { g, p }; }
function poseThumb(kind) {
  return () => {
    const A = PERSON_ACTIONS[kind]; const { g } = mannequin(); A.pose(g.userData.rig, { lt: A.dur * 0.42, u: 0.42, w: 1 });
    return snapThumb(g, cam => { cam.fov = 30; cam.aspect = 4 / 3; cam.near = .05; cam.far = 100; cam.updateProjectionMatrix(); cam.position.set(2.2, 1.6, 4.4); cam.lookAt(0, 0.85, 0); thumbGround.scale.setScalar(4); thumbGround.position.set(0, 0, 0); });
  };
}
function quadPoseThumb(kind) {
  return () => {
    const A = QUAD_ACTIONS[kind], sp = kind === 'rear' ? 'horse' : 'dog'; const p = defaultParams(sp); const g = buildQuad(p); animQuad(g.userData.rig, idleCtx); A.pose(g.userData.rig, { lt: A.dur * 0.45, u: 0.45, w: 1 });
    return snapThumb(g);
  };
}
function camPresetThumb(key) {
  return () => {
    const P2 = CAM_PRESETS[key], root = new THREE.Group(); const { g } = mannequin(); root.add(g);
    if (P2.ots) { const m2 = mannequin().g; m2.position.set(0, 0, 1.6); m2.rotation.y = Math.PI; root.add(m2); }
    const H = 1.75, aspect = 4 / 3, focal = P2.lens || 35, vfov = focalToVFov(focal, aspect) * DEG, [frac, cy] = SHOT_SIZES[P2.size || 'MS'];
    const d = (frac * H / 2) / Math.tan(vfov / 2), aimH = cy * H, dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(UP, (P2.yaw || 0) * DEG);
    return snapThumb(root, cam => {
      cam.fov = vfov / DEG; cam.aspect = aspect; cam.near = 0.05; cam.far = 500; cam.updateProjectionMatrix(); cam.up.set(0, 1, 0);
      let pos = dir.clone().multiplyScalar(d); pos.y = aimH; let look = new THREE.Vector3(0, aimH, 0);
      if (P2.free) { pos.set(3.5, 2.2, 5.5); look.set(0, 0.9, 0); cam.fov = 40; cam.updateProjectionMatrix(); }
      if (P2.height === 'low') pos.y = 0.25; if (P2.height === 'high') pos.y = aimH + d * 0.6;
      if (P2.height === 'top') { pos.set(0, d + H, 0.01); look.set(0, 0, 0); }
      if (P2.ots) { pos.set(-0.32, H * 0.93, -0.75); look.set(0, H * 0.85, 1.6); }
      if (P2.move === 'drone') { pos.multiplyScalar(0.6); pos.y = 6; }
      if (P2.move === 'crane') pos.y += 2;
      cam.position.copy(pos); cam.lookAt(look); if (P2.roll) cam.rotateZ(P2.roll * DEG);
      thumbGround.scale.setScalar(30); thumbGround.position.set(0, 0, 0);
    });
  };
}

/* ---------- biblioteca ---------- */
const LIB_TABS = [
  { k: 'chars', ic: '👤', lb: 'Personagens', items: ['person', 'woman', 'child', 'crowd'] },
  { k: 'veh', ic: '🚗', lb: 'Veículos' },
  { k: 'animals', ic: '🐾', lb: 'Animais & aves', items: ['dog', 'cat', 'horse', 'cow', 'deer', 'bird', 'gull', 'eagle', 'flock'] },
  { k: 'scene', ic: '🏙️', lb: 'Cenário', items: ['road', 'street', 'building', 'house', 'forest', 'tree', 'pine', 'palm', 'terrain', 'rock', 'stage', 'wall', 'stairs', 'ramp', 'plane'] },
  { k: 'props', ic: '📦', lb: 'Props & produto', items: ['lamp', 'cone', 'bench', 'barrier', 'parked', 'can', 'bottle', 'box', 'phone', 'cube', 'sphere', 'cylinder', 'null'] },
  { k: 'anim', ic: '🎬', lb: 'Animações' },
  { k: 'cams', ic: '🎥', lb: 'Câmeras' },
];
let libTab = 'chars';
function card(attrs, thumbKey, icon, name, sub, dis) {
  const url = thumbKey ? thumbs.get(thumbKey) : null;
  return `<button class="card ${dis ? 'dis' : ''}" ${attrs} title="${esc(name)}"><div class="th">${thumbKey ? `<img data-th="${thumbKey}" ${url ? `src="${url}"` : 'style="display:none"'}>` : ''}<span ${url ? 'style="display:none"' : ''}>${icon}</span></div><div class="nm">${esc(name)}</div><div class="sb">${esc(sub || '')}</div></button>`;
}
function renderAssets() {
  $('#libTabs').innerHTML = LIB_TABS.map(t => `<button class="${t.k === libTab ? 'on' : ''}" data-lt="${t.k}" title="${t.lb}">${t.ic}</button>`).join('');
  const q = $('#libSearch').value.trim().toLowerCase(), m = s => !q || s.toLowerCase().includes(q);
  const tab = LIB_TABS.find(t => t.k === libTab); let h = `<div class="acat" style="margin-top:6px;color:var(--tx2);font-size:12px;font-weight:600">${tab.lb}</div>`;
  const so = sel && getObj(sel);
  const assetCards = (list) => '<div class="agrid">' + list.filter(t => ASSETS[t] && m(ASSETS[t].label)).map(t => { if (thumbR) queueThumb('a:' + t, assetThumb(t)); return card(`data-t="${t}"`, thumbR ? 'a:' + t : null, ASSETS[t].icon, ASSETS[t].label, ASSETS[t].cat); }).join('') + '</div>';
  if (tab.items) h += assetCards(tab.items);
  else if (tab.k === 'veh') {
    h += `<div class="acat">Modelos reais · ficha técnica</div><div class="agrid">` + Object.entries(CAR_DB).filter(([, v]) => m(v.name)).map(([k, v]) => { if (thumbR) queueThumb('car:' + k, assetThumb('realcar', carDefaults(k))); return card(`data-car="${k}"`, thumbR ? 'car:' + k : null, '🏁', v.name, `${fmt(v.L, 2)} × ${fmt(v.W, 2)} × ${fmt(v.H, 2)} m`); }).join('') + '</div>';
    h += `<div class="acat">Genéricos</div>` + assetCards(['realcar', 'car', 'suv', 'sportcar', 'truck', 'bus', 'moto', 'drone', 'heli']);
  } else if (tab.k === 'anim') {
    const acts = actionsFor(so), moves = movesFor(so);
    h += `<div class="libhint">${so ? `Aplica em <b>${esc(so.name)}</b> a partir do frame ${curFrame}. Os clipes aparecem na trilha dele na timeline (arraste para mover, puxe as pontas para durar mais).` : 'Selecione um personagem, animal ou veículo para aplicar animações.'}</div>`;
    h += `<div class="acat">Ações · pessoas</div><div class="agrid">` + Object.entries(PERSON_ACTIONS).filter(([, a]) => m(a.lb)).map(([k, a]) => { if (thumbR) queueThumb('pa:' + k, poseThumb(k)); return card(`data-act="${k}"`, thumbR ? 'pa:' + k : null, a.ic, a.lb, a.dur + ' s', !(so && PERSON_ACTIONS === acts)); }).join('') + '</div>';
    h += `<div class="acat">Ações · animais</div><div class="agrid">` + Object.entries(QUAD_ACTIONS).filter(([, a]) => m(a.lb)).map(([k, a]) => { if (thumbR) queueThumb('qa:' + k, quadPoseThumb(k)); return card(`data-act="${k}"`, thumbR ? 'qa:' + k : null, a.ic, a.lb, a.dur + ' s', !(so && QUAD_ACTIONS === acts)); }).join('') + '</div>';
    h += `<div class="acat">Movimento · gera trajetória</div><div class="agrid">` + Object.entries(MOVE_PRESETS).filter(([, a]) => m(a.lb)).map(([k, a]) => card(`data-mv="${k}"`, null, a.ic, a.lb, a.dur + ' s', !(so && moves[k]))).join('') + '</div>';
  } else if (tab.k === 'cams') {
    const subj = so && so.type !== 'camera' ? so : project.objects.find(o => ASSETS[o.type].pilot && o.type !== 'camera');
    const isCar = subj && ASSETS[subj.type].pilot === 'car';
    h += `<div class="libhint">${subj ? `Enquadra <b>${esc(subj.name)}</b> com distância calculada pela lente, sensor e tamanho real. Movimentos começam no frame ${curFrame}. Depois troque corpo/kit de lentes no inspetor.` : 'Adicione um personagem ou objeto para os presets enquadrarem.'}</div>`;
    for (const [g, glb] of CAM_GROUPS) h += `<div class="acat">${glb}</div><div class="agrid">` + Object.entries(CAM_PRESETS).filter(([, a]) => (a.grp || 'comp') === g && m(a.lb)).map(([k, a]) => { if (thumbR && !a.mount) queueThumb('cp:' + k, camPresetThumb(k)); return card(`data-cp="${k}"`, thumbR && !a.mount ? 'cp:' + k : null, a.ic, a.lb, a.free ? 'da vista atual' : `${a.lens}mm${a.move || a.custom ? ' · ' + (a.dur || 4) + ' s' : ''}`, a.mount ? !isCar : (!a.free && !subj)); }).join('') + '</div>';
    h += gearLibraryHTML(card, m, subj, isCar);
  }
  $('#assetList').innerHTML = h;
  $('#assetCount').textContent = Object.keys(ASSETS).length + Object.keys(CAR_DB).length + ' assets';
}
function libOnSelect() { if (libTab === 'anim' || libTab === 'cams') renderAssets(); }
$('#libTabs').addEventListener('click', e => { const b = e.target.closest('[data-lt]'); if (!b) return; libTab = b.dataset.lt; $('#libSearch').value = ''; renderAssets(); $('#assets').scrollTop = 0; });
$('#libSearch').addEventListener('input', renderAssets);
$('#assetList').addEventListener('click', e => {
  const b = e.target.closest('.card'); if (!b) return; const so = sel && getObj(sel);
  if (b.dataset.t) addObject(b.dataset.t);
  else if (b.dataset.car) { const k = b.dataset.car; addObject('realcar', { params: Object.assign(carDefaults(k), { modelName: CAR_DB[k].name }), name: CAR_DB[k].name }); }
  else if (b.dataset.act && so) { addClip(so, b.dataset.act); }
  else if (b.dataset.mv && so) { applyMovePreset(so, b.dataset.mv); }
  else if (b.dataset.gear) { const subj = so && so.type !== 'camera' ? so : project.objects.find(o => ASSETS[o.type].pilot && o.type !== 'camera'); createGearCamera(b.dataset.gear, subj); }
  else if (b.dataset.cp) { const P2 = CAM_PRESETS[b.dataset.cp]; const subj = so && so.type !== 'camera' ? so : project.objects.find(o => ASSETS[o.type].pilot && o.type !== 'camera'); const c = P2.mount ? createRigCamera(b.dataset.cp, so && ASSETS[so.type].pilot === 'car' ? so : project.objects.find(o => ASSETS[o.type].pilot === 'car')) : createPresetCamera(b.dataset.cp); if (c) setView(c.id); }
  renderAssets();
});

/* ---------- objetos (agrupados) ---------- */
const OBJ_GROUPS = [['cams', 'Câmeras', '🎥'], ['chars', 'Personagens', '👤'], ['animals', 'Animais', '🐾'], ['veh', 'Veículos', '🚗'], ['scene', 'Cenário & props', '🏙️'], ['util', 'Utilitários', '✛']];
const grpOpen = { cams: true, chars: true, animals: true, veh: true, scene: true, util: true };
function objGroup(o) { const t = o.type, a = ASSETS[t]; if (t === 'camera') return 'cams'; if (t === 'null') return 'util'; if (isPersonType(t)) return 'chars'; if (a.cat === 'Animais' || a.cat === 'Aves & voadores' && !['drone', 'heli'].includes(t)) return 'animals'; if (a.cat === 'Veículos' || t === 'drone' || t === 'heli') return 'veh'; return 'scene'; }
function renderOutliner() {
  const q = ($('#objSearch').value || '').toLowerCase(); let h = '';
  for (const [g, lb, ic] of OBJ_GROUPS) {
    const list = project.objects.filter(o => objGroup(o) === g && (!q || o.name.toLowerCase().includes(q))); if (!list.length) continue;
    h += `<div class="ogrp" data-g="${g}"><span style="color:var(--tx3);font-size:9px">${grpOpen[g] ? '▼' : '▶'}</span>${ic} ${lb}<span class="n">${list.length}</span></div>`;
    if (grpOpen[g]) h += list.map(o => { const anim = Object.values(o.tracks).some(k => k && k.length) || (o.clips && o.clips.length); const act = project.activeCamera === o.id; return `<div class="orow ${o.id === sel ? 'sel' : ''}" data-id="${o.id}" ${o.type === 'camera' ? 'draggable="true" title="Arraste para a faixa Montagem da timeline"' : ''}><span style="width:16px;text-align:center">${ASSETS[o.type].icon}</span><span class="nm">${esc(o.name)}</span>${act ? '<span style="color:var(--acc);font-size:10px" title="Câmera ativa">●</span>' : ''}${anim ? '<span class="anim" title="Animado">◆</span>' : ''}${pilot.on && pilot.id === o.id ? '<span style="color:var(--red)">⬤</span>' : ''}${o.type === 'camera' ? '<span class="ic" data-act="look" title="Olhar por esta câmera">◉</span>' : ''}<span class="ic" data-act="vis" title="Mostrar/ocultar">${o.hidden ? '◌' : '👁'}</span></div>`; }).join('');
  }
  $('#outliner').innerHTML = h || '<div class="empty">Cena vazia.<br>Adicione pela <b>Biblioteca</b> ou use<br><b>✨ Diretor por prompt</b>.</div>';
  $('#objCount').textContent = project.objects.length || '';
  renderViewSel();
}
$('#objSearch').addEventListener('input', renderOutliner);
$('#outliner').addEventListener('click', e => {
  const gh = e.target.closest('.ogrp'); if (gh) { grpOpen[gh.dataset.g] = !grpOpen[gh.dataset.g]; renderOutliner(); return; }
  const r = e.target.closest('.orow'); if (!r) return; const o = getObj(r.dataset.id);
  if (e.target.dataset.act === 'vis') { o.hidden = !o.hidden; attachGizmo(); renderOutliner(); commit(); return; }
  if (e.target.dataset.act === 'look') { setView(o.id); return; }
  select(o.id);
});
$('#outliner').addEventListener('dblclick', e => { const r = e.target.closest('.orow'); if (r) frameSelected(); });

/* ---------- vista do viewport / PiP ---------- */
function renderViewSel() {
  const cams = project.objects.filter(o => o.type === 'camera');
  const opts = [['free', 'Vista do diretor']].concat(project.shots && project.shots.length ? [['cut', 'Filme completo · todos os planos']] : []).concat(cams.map(c => [c.id, 'Câmera · ' + c.name]));
  const vs = $('#viewSel'); vs.innerHTML = opts.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join(''); vs.value = viewPick; if (vs.value !== viewPick) { vs.value = 'free'; }
  const ps = $('#pipSel'), pv = ps.value || 'auto'; ps.innerHTML = `<option value="auto">Auto · plano atual</option>` + cams.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join(''); ps.value = cams.find(c => c.id === pv) ? pv : 'auto';
}
$('#viewSel').onchange = e => { setView(e.target.value); e.target.blur(); };
$('#guideSel').innerHTML = GUIDES.map(([k, l]) => `<option value="${k}">Guia: ${l}</option>`).join('');
$('#guideSel').onchange = e => { guideMode = e.target.value; e.target.blur(); if (viewMode !== 'cam') toast('As guias aparecem na vista de câmera'); };
$('#pipSel').onchange = e => e.target.blur();
$('#pipMin').onclick = () => { $('#pip').classList.toggle('min'); $('#pipMin').textContent = $('#pip').classList.contains('min') ? '▾' : '▴'; };
let pipRect = null;
function renderPip(w, h) {
  const pip = $('#pip'); pipRect = null; if (pip.style.display === 'none' || pip.classList.contains('min') || pilot.on && pilot.view === 'chase' && false) return;
  const pv = $('#pipSel').value, cid = pv && pv !== 'auto' ? pv : shotCamAt(curFrame), r = cid && rt.get(cid); if (!r) return;
  const a = aspectNum(), pw = a >= 1 ? 300 : Math.round(170 * a * 1.6), ph = Math.round(pw / a);
  const body = $('#pipBody'); if (body.style.width !== pw + 'px') { body.style.width = pw + 'px'; body.style.height = ph + 'px'; }
  const vr = $('#vpwrap').getBoundingClientRect(), br2 = body.getBoundingClientRect();
  const x = br2.left - vr.left, yb = h - (br2.top - vr.top) - ph; pipRect = { x, y: br2.top - vr.top - 40, w: pw, h: ph + 40 };
  setHelpersVisible(false);
  { const restore = camHide(); renderScene(renderer, r.rig.cam, renderMode, pw, ph, x, yb); restore(); }
  renderer.setViewport(0, 0, w, h);
  setHelpersVisible(true);
}

/* ---------- rótulos e eixos ---------- */
const labelEls = new Map();
function updateLabels(camView, w, h) {
  const layer = $('#labels'), seen = new Set();
  if (!camView) {
    let n = 0;
    for (const o of project.objects) {
      if (n > 40) break; const isCam = o.type === 'camera'; if (o.hidden || !(ASSETS[o.type].pilot || o.id === sel || isCam)) continue;
      const r = rt.get(o.id); if (!r) continue;
      const p = r.g.position.clone(); p.y += isCam ? 0.35 : (r.size ? r.size.y * r.g.scale.y : 1) + 0.08;
      const v = p.project(editorCam); if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) continue;
      const sx = (v.x + 1) / 2 * w, sy = (1 - v.y) / 2 * h; if (pipRect && sx > pipRect.x && sx < pipRect.x + pipRect.w && sy > pipRect.y - 20 && sy < pipRect.y + pipRect.h + 14) continue;
      let el = labelEls.get(o.id); if (!el) { el = document.createElement('div'); layer.appendChild(el); labelEls.set(o.id, el); }
      const txt = isCam ? '🎥 ' + o.name : o.name; if (el.textContent !== txt) el.textContent = txt;
      el.className = 'lbl' + (isCam ? ' cam' : '') + (o.id === sel ? ' sel' : '');
      el.style.left = ((v.x + 1) / 2 * w) + 'px'; el.style.top = ((1 - v.y) / 2 * h) + 'px'; el.style.display = '';
      seen.add(o.id); n++;
    }
  }
  for (const [id, el] of labelEls) if (!seen.has(id)) { if (!getObj(id)) { el.remove(); labelEls.delete(id); } else el.style.display = 'none'; }
}
const axC = $('#axesC'), axX = axC.getContext('2d');
function drawAxes() {
  const cam = currentViewCam(), q = new THREE.Quaternion(); cam.getWorldQuaternion(q); q.invert();
  axX.clearRect(0, 0, 140, 140);
  const ax = [['X', new THREE.Vector3(1, 0, 0), '#ef5a50'], ['Y', new THREE.Vector3(0, 1, 0), '#6cc86a'], ['Z', new THREE.Vector3(0, 0, 1), '#4f9cf0']].map(([n, v, c]) => [n, v.applyQuaternion(q), c]);
  ax.sort((a, b) => a[1].z - b[1].z);
  for (const [n, v, c] of ax) { const x = 70 + v.x * 44, y = 70 - v.y * 44; axX.strokeStyle = c; axX.lineWidth = 3; axX.globalAlpha = v.z < -0.1 ? 0.45 : 1; axX.beginPath(); axX.moveTo(70, 70); axX.lineTo(x, y); axX.stroke(); axX.fillStyle = c; axX.beginPath(); axX.arc(x, y, 13, 0, 7); axX.fill(); axX.fillStyle = '#111'; axX.font = '600 15px Inter'; axX.textAlign = 'center'; axX.textBaseline = 'middle'; axX.fillText(n, x, y + 1); }
  axX.globalAlpha = 1;
  const cid = viewCamId(), co = cid && getObj(cid);
  const t = co ? `${fmt(pilot.on && pilot.id === co.id ? pilot.s.focal : getVal(co, 'focal', curFrame), 0)}mm · ${project.aspect}` : `FOV ${Math.round(editorCam.fov)}°`;
  const ft = $('#fovTxt'); if (ft.textContent !== t) ft.textContent = t;
}
$('#bResetView').onclick = () => { setView('free'); if (sel) { frameSelected(); return; } editorCam.position.set(14, 9, 18); orbit.target.set(0, 1, 0); };
$('#tPilot').onclick = () => { if (sel) { pilot.on && pilot.id === sel ? exitPilot() : startPilot(sel); } else toast('Selecione algo para pilotar'); };
$('#tFocus').onclick = () => frameSelected();
$('#bShot').onclick = () => { const cid = viewCamId() || shotCamAt(curFrame), c = cid && getObj(cid); if (!c) return toast('Adicione uma câmera'); exportPNG(c, renderMode, '1080').catch(e => toast('Erro: ' + e.message)); };

/* ---------- popup ＋ da trilha ---------- */
let popEl = null;
function closePop() { if (popEl) { popEl.remove(); popEl = null; } }
document.addEventListener('pointerdown', e => { if (popEl && !popEl.contains(e.target) && !e.target.closest('[data-add]')) closePop(); }, true);
function openAddPopup(o, anchor) {
  closePop(); if (!o) return;
  const acts = actionsFor(o), moves = movesFor(o), items = [];
  if (o.type === 'camera') { items.push(['sb', '🎬 Adicionar plano no storyboard (frame ' + curFrame + ')']); items.push(['look', '◉ Olhar por esta câmera']); }
  for (const k in acts) items.push(['act:' + k, acts[k].ic + ' ' + acts[k].lb]);
  if (Object.keys(moves).length) items.push(['-']);
  for (const k in moves) items.push(['mv:' + k, moves[k].ic + ' ' + moves[k].lb]);
  items.push(['-']); items.push(['key', '◆ Keyframe em todos os canais (K)']); if (ASSETS[o.type].pilot || o.type === 'camera') items.push(['pilot', '🎮 Pilotar e gravar (P)']);
  popEl = document.createElement('div');
  Object.assign(popEl.style, { position: 'fixed', zIndex: 40, background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: '10px', padding: '5px', boxShadow: '0 14px 40px rgba(0,0,0,.55)', maxHeight: '60vh', overflow: 'auto', minWidth: '230px' });
  popEl.innerHTML = `<div style="padding:6px 9px;color:var(--tx3);font-size:11px">${esc(o.name)} · frame ${curFrame}</div>` + items.map(([k, l]) => k === '-' ? '<div style="height:1px;background:var(--line2);margin:4px 6px"></div>' : `<button class="ghost" data-pi="${k}" style="display:block;width:100%;text-align:left;padding:6px 10px">${esc(l)}</button>`).join('');
  document.body.appendChild(popEl);
  const r = anchor ? anchor.getBoundingClientRect() : { left: innerWidth / 2 - 115, top: innerHeight / 2 - 150, bottom: innerHeight / 2 - 150 };
  const ph = popEl.offsetHeight; popEl.style.left = Math.min(innerWidth - 250, r.left) + 'px'; popEl.style.top = Math.max(8, Math.min(innerHeight - ph - 8, (r.bottom || r.top) + 4 - (anchor ? ph + 30 : 0))) + 'px';
  popEl.addEventListener('click', e => {
    const b = e.target.closest('[data-pi]'); if (!b) return; const k = b.dataset.pi; closePop();
    if (k === 'sb') addStoryboardShot(o.id); else if (k === 'look') setView(o.id);
    else if (k.startsWith('act:')) { select(o.id); addClip(o, k.slice(4)); }
    else if (k.startsWith('mv:')) { select(o.id); applyMovePreset(o, k.slice(3)); }
    else if (k === 'key') { select(o.id); keyAllSelected(); }
    else if (k === 'pilot') { select(o.id); startPilot(o.id); }
  });
}
function addStoryboardShot(camId) {
  const cams = project.objects.filter(o => o.type === 'camera'); if (!cams.length) { toast('Adicione uma câmera (aba 🎥 da biblioteca)'); return; }
  const so = sel && getObj(sel); const cid = camId || (so && so.type === 'camera' ? so.id : null) || (viewPick !== 'free' && viewPick !== 'cut' ? viewPick : null) || project.activeCamera || cams[0].id;
  normalizeShots(); const s = project.shots, f = curFrame;
  if (!s.length) project.shots = [{ cam: cid, start: 0, end: project.duration }];
  else { const i = s.findIndex(x => f >= x.start && f <= x.end); if (i >= 0) { const cur = s[i]; if (f === cur.start) cur.cam = cid; else { s.splice(i + 1, 0, { cam: cid, start: f, end: cur.end }); cur.end = f - 1; } } else { const next = s.find(x => x.start > f); s.push({ cam: cid, start: f, end: next ? next.start - 1 : project.duration }); } }
  normalizeShots(); commit(); tlDirty = true; renderViewSel(); toast('Plano adicionado ao storyboard: ' + getObj(cid).name);
}
function deleteSelection() {
  if (selClip) { const o = selClip.o; o.clips = (o.clips || []).filter(c => c !== selClip.c); selClip = null; commit(); tlDirty = true; return true; }
  if (selShot) { project.shots = project.shots.filter(s => s !== selShot); selShot = null; normalizeShots(); commit(); tlDirty = true; renderViewSel(); return true; }
  return false;
}
$('#iDel').onclick = () => { if (!deleteSelection()) deleteSelKeys(); };

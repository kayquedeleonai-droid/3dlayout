/* ============================================================
   EXPORTAÇÃO
   ============================================================ */
const sleep = ms => new Promise(r => setTimeout(r, ms));
function outSize(res) { const a = aspectNum(), long = { '540': 960, '720': 1280, '1080': 1920, '1440': 2560, '2160': 3840 }[res] || 1920; let w, h; if (a >= 1) { w = long; h = Math.round(long / a); } else { h = long; w = Math.round(long * a); } return [w - w % 2, h - h % 2]; }
function makeRenderer(w, h) { const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setPixelRatio(1); r.setSize(w, h, false); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NoToneMapping; return r; }
function exportCam() { const id = $('#exCam') ? $('#exCam').value : project.activeCamera; if (id === '__cut') return 'cut'; return id && getObj(id); }
$('#bExport').onclick = () => {
  const cams = project.objects.filter(o => o.type === 'camera');
  if (!cams.length) { toast('Adicione uma câmera para exportar vídeo/imagem'); }
  openModal('Exportar', `<div class="mgrid">
    <label>Formato</label><select id="exKind"><option value="video">Vídeo da câmera (MP4/WebM)</option><option value="png">Imagem PNG (frame atual)</option><option value="passes">Pacote de passes (vídeos shaded + depth + seg)</option><option value="glb">Cena animada GLB (Blender / Unreal / C4D)</option><option value="camjson">Dados da câmera por frame (JSON)</option><option value="project">Projeto Layout3D (JSON)</option></select>
    <label>Câmera</label><select id="exCam">${project.shots && project.shots.length ? '<option value="__cut" selected>🎬 Edição com cortes (' + project.shots.length + ' planos)</option>' : ''}${cams.map(c => `<option value="${c.id}" ${c.id === project.activeCamera && !(project.shots && project.shots.length) ? 'selected' : ''}>${esc(c.name)}</option>`).join('') || '<option value="">(nenhuma)</option>'}</select>
    <label>Passe de render</label><select id="exPass"><option value="shaded">Playblast</option><option value="clay">Clay</option><option value="depth">Depth (perto = branco)</option><option value="normal">Normal</option><option value="seg">Segmentação</option></select>
    <label>Resolução</label><select id="exRes"><option value="540">540p</option><option value="720">720p</option><option value="1080" selected>1080p</option><option value="1440">1440p</option><option value="2160">4K</option></select>
    <label>Simular óptica</label><label style="display:flex;gap:6px;align-items:center;color:var(--tx)"><input type="checkbox" id="exFX" checked> DOF, distorção e vinheta da lente (só Playblast/Clay)</label>
    <label>Frames</label><span><input id="exF0" type="number" value="0" style="width:70px"> até <input id="exF1" type="number" value="${project.duration}" style="width:70px"> <span class="hint">(${project.fps} fps, ${project.aspect})</span></span>
    </div><div class="hint" id="exHint" style="margin-top:10px">O vídeo é gravado em tempo real a partir da câmera escolhida. Mantenha esta aba visível durante a exportação.</div>
    <div class="prog" id="exProg" style="display:none"><i></i></div>
    <div class="btnrow" style="margin-top:12px"><button class="pri" id="exGo">Exportar</button></div>`, m => {
    m.querySelector('#exPass').value = renderMode;
    m.querySelector('#exGo').onclick = async () => {
      const kind = $('#exKind').value, f0 = clamp(+$('#exF0').value, 0, project.duration), f1 = clamp(+$('#exF1').value, f0, project.duration), res = $('#exRes').value, pass = $('#exPass').value, cam = exportCam();
      if (['video', 'png', 'passes', 'camjson'].includes(kind) && !cam) return toast('Escolha uma câmera');
      $('#exGo').disabled = true; $('#exProg').style.display = 'block'; const fxPrev = project.settings.lensFXGlobal; project.settings.lensFXGlobal = $('#exFX').checked;
      try {
        if (kind === 'video') await exportVideo(cam, pass, res, f0, f1, '');
        else if (kind === 'passes') { for (const ps of ['shaded', 'depth', 'seg']) await exportVideo(cam, ps, res, f0, f1, ps + ' '); }
        else if (kind === 'png') await exportPNG(cam === 'cut' ? getObj(shotCamAt(curFrame)) : cam, pass, res);
        else if (kind === 'glb') await exportGLB(f0, f1);
        else if (kind === 'camjson') { const cs = cam === 'cut' ? project.objects.filter(o => o.type === 'camera') : [cam]; const t = JSON.stringify({ shots: (project.shots || []).map(s => ({ camera: getObj(s.cam)?.name, start: s.start, end: s.end })), cameras: cs.map(c => cameraData(c, f0, f1)) }, null, 1); await saveFile(safeName(project.name) + '_cameras.json', t, t); }
        else if (kind === 'project') saveProject();
      } catch (err) { console.error(err); toast('Erro na exportação: ' + err.message, 5000); }
      exporting = false; project.settings.lensFXGlobal = fxPrev; const b = $('#exGo'); if (b) b.disabled = false;
    };
  });
};
const safeName = s => String(s).replace(/[^\w\-]+/g, '_');
function setProg(u, label) { const p = $('#exProg i'); if (p) p.style.width = (u * 100).toFixed(1) + '%'; const h = $('#exHint'); if (h && label) h.textContent = label; }
async function exportVideo(camObj, pass, res, f0, f1, tag) {
  if (typeof MediaRecorder === 'undefined') throw new Error('Este navegador não suporta gravação de vídeo');
  const [W, H] = outSize(res), rend = makeRenderer(W, H), camFor = f => rt.get(camObj === 'cut' ? shotCamAt(f) : camObj.id).rig.cam; let cam = camFor(f0);
  const types = ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mime = types.find(t => MediaRecorder.isTypeSupported(t)); if (!mime) throw new Error('Nenhum codec de vídeo disponível');
  const stream = rend.domElement.captureStream(0), track = stream.getVideoTracks()[0];
  const recd = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: Math.round(W * H * project.fps * 0.22) });
  const chunks = []; recd.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise(r => recd.onstop = r);
  exporting = true; const keepFrame = curFrame;
  setHelpersVisible(false);
  // pré-render para compilar shaders
  applyFrame(f0); renderScene(rend, cam, pass, W, H); await sleep(60);
  recd.start();
  const spf = 1000 / project.fps; let t0 = performance.now();
  for (let f = f0; f <= f1; f++) {
    applyFrame(f); cam = camFor(f); renderCamera(rend, getObj(camObj === 'cut' ? shotCamAt(f) : camObj.id), cam, pass, W, H, 0, 0, f); if (track.requestFrame) track.requestFrame();
    setProg((f - f0) / Math.max(1, f1 - f0), `${tag}Renderizando frame ${f}/${f1} — ${W}×${H} ${pass}`);
    const target = t0 + (f - f0 + 1) * spf, wait = target - performance.now(); if (wait > 0) await sleep(wait);
  }
  await sleep(spf); recd.stop(); await done; track.stop(); rend.dispose(); rend.forceContextLoss?.();
  exporting = false; setFrame(keepFrame);
  const ext = mime.includes('mp4') ? 'mp4' : 'webm', blob = new Blob(chunks, { type: mime.split(';')[0] });
  setProg(1, `Pronto: ${(blob.size / 1e6).toFixed(1)} MB (${ext.toUpperCase()})`);
  await saveFile(`${safeName(project.name)}_${camObj === 'cut' ? 'edicao' : safeName(camObj.name)}_${pass}.${ext}`, blob);
}
async function exportPNG(camObj, pass, res) {
  const [W, H] = outSize(res), rend = makeRenderer(W, H), cam = rt.get(camObj.id).rig.cam;
  setHelpersVisible(false); applyFrame(curFrame); renderCamera(rend, camObj, cam, pass, W, H);
  const blob = await new Promise(r => rend.domElement.toBlob(r, 'image/png')); rend.dispose(); rend.forceContextLoss?.();
  setProg(1, 'Imagem pronta');
  await saveFile(`${safeName(camObj.name)}_f${curFrame}_${pass}.png`, blob);
}
function cameraData(camObj, f0, f1) {
  const r = rt.get(camObj.id), out = { camera: camObj.name, fps: project.fps, aspect: project.aspect, sensor_mm: 36, coordinate_system: 'Y-up, metros, câmera olha para -Z', frames: [] };
  const p = new THREE.Vector3(), q = new THREE.Quaternion();
  for (let f = f0; f <= f1; f++) { applyFrame(f); r.g.updateMatrixWorld(true); r.rig.cam.getWorldPosition(p); r.rig.cam.getWorldQuaternion(q); const e = new THREE.Euler().setFromQuaternion(q, 'YXZ'); out.frames.push({ frame: f, time: +(f / project.fps).toFixed(4), position: [p.x, p.y, p.z].map(v => +v.toFixed(4)), quaternion: [q.x, q.y, q.z, q.w].map(v => +v.toFixed(5)), euler_yxz_deg: [e.x, e.y, e.z].map(v => +(v / DEG).toFixed(3)), focal_mm: +getVal(camObj, 'focal', f).toFixed(3), vfov_deg: +r.rig.cam.fov.toFixed(3) }); }
  applyFrame(curFrame); return out;
}
async function exportGLB(f0, f1) {
  exporting = true; setHelpersVisible(false);
  const fps = project.fps, times = [], nodes = [];
  for (const o of project.objects) { const r = rt.get(o.id); if (!r || o.hidden) continue; r.g.name = safeName(o.name); if (o.type === 'camera') r.rig.cam.name = safeName(o.name) + '_cam'; r.g.traverse(n => { if (!isHelperNode(n)) nodes.push({ n, pos: [], quat: [], scl: [] }); }); }
  for (let f = f0; f <= f1; f++) {
    times.push((f - f0) / fps); applyFrame(f);
    for (const N of nodes) { N.pos.push(...N.n.position.toArray()); N.quat.push(...N.n.quaternion.toArray()); N.scl.push(...N.n.scale.toArray()); }
    if (f % 20 === 0) { setProg((f - f0) / Math.max(1, f1 - f0) * 0.8, `Gravando animação: frame ${f}`); await sleep(0); }
  }
  const varies = (a, s) => { for (let i = s; i < a.length; i++) if (Math.abs(a[i] - a[i % s]) > 1e-5) return true; return false; };
  const tracks = [];
  for (const N of nodes) {
    if (varies(N.pos, 3)) tracks.push(new THREE.VectorKeyframeTrack(N.n.uuid + '.position', times, N.pos));
    if (varies(N.quat, 4)) tracks.push(new THREE.QuaternionKeyframeTrack(N.n.uuid + '.quaternion', times, N.quat));
    if (varies(N.scl, 3)) tracks.push(new THREE.VectorKeyframeTrack(N.n.uuid + '.scale', times, N.scl));
  }
  applyFrame(f0);
  const clip = new THREE.AnimationClip('Layout3D', -1, tracks);
  setProg(0.85, 'Gerando GLB…'); await sleep(0);
  const ex = new GLTFExporter();
  const glb = await ex.parseAsync(world, { binary: true, animations: tracks.length ? [clip] : [], onlyVisible: true });
  exporting = false; setHelpersVisible(true); setFrame(curFrame);
  setProg(1, `GLB pronto: ${tracks.length} trilhas animadas. Obs.: a focal animada vai no JSON da câmera.`);
  await saveFile(safeName(project.name) + '.glb', new Blob([glb], { type: 'model/gltf-binary' }));
}

/* ============================================================
   PROMPT DE MOVIMENTO PARA IA
   ============================================================ */
const EN_NOUN = { car: 'sedan car', suv: 'SUV', sportcar: 'sports car', truck: 'truck', bus: 'bus', moto: 'motorcyclist', person: 'man', woman: 'woman', child: 'child', crowd: 'crowd of people', dog: 'dog', cat: 'cat', horse: 'horse', cow: 'cow', deer: 'deer', bird: 'small bird', gull: 'seagull', eagle: 'eagle', flock: 'flock of birds', drone: 'drone', heli: 'helicopter', building: 'building', house: 'house', road: 'road', street: 'city street lined with buildings', tree: 'tree', pine: 'pine tree', palm: 'palm tree', forest: 'forest', terrain: 'rolling hills', rock: 'rock', lamp: 'street lamp', cone: 'traffic cone', bench: 'bench', barrier: 'concrete barrier', wall: 'wall', stairs: 'stairs', ramp: 'ramp', stage: 'platform', parked: 'parked cars', can: 'drink can', bottle: 'bottle', box: 'product box', phone: 'smartphone', cube: 'cube', sphere: 'sphere', cylinder: 'cylinder', plane: 'flat surface' };
const enName = o => { const p = o.params || {}; const sp = ASSETS[o.type].params.find(x => x.k === 'species'); return sp ? (EN_NOUN[p.species] || EN_NOUN[o.type]) : (EN_NOUN[o.type] || o.name); };
function describeScene(camId) {
  const cam = getObj(camId), fps = project.fps, f0 = 0, f1 = project.duration, dur = (f1 - f0) / fps;
  const keep = curFrame, en = [], pt = [], lines = [];
  const sample = (o, f) => { applyFrame(f); const r = rt.get(o.id); r.g.updateMatrixWorld(true); const p = new THREE.Vector3(), q = new THREE.Quaternion(); (o.type === 'camera' ? r.rig.cam : r.g).getWorldPosition(p); (o.type === 'camera' ? r.rig.cam : r.g).getWorldQuaternion(q); return { p, q }; };
  if (cam) {
    const a = sample(cam, f0), b = sample(cam, f1);
    const folO = cam.cons.follow && getObj(cam.cons.follow); const rel = (s, f) => folO ? s.p.clone().sub(worldPos(folO, f, new THREE.Vector3())) : s.p.clone();
    const ra = rel(a, f0), rb = rel(b, f1); let pathLen = 0, prev = ra.clone(); for (let f = f0 + 1; f <= f1; f += 1) { const s = rel(sample(cam, f), f); pathLen += s.distanceTo(prev); prev = s; }
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(a.q), fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(a.q);
    const d = rb.clone().sub(ra), dolly = d.dot(new THREE.Vector3(fwd.x, 0, fwd.z).normalize()), truck = d.dot(new THREE.Vector3(right.x, 0, right.z).normalize()), ped = d.y;
    const ea = new THREE.Euler().setFromQuaternion(a.q, 'YXZ'), eb = new THREE.Euler().setFromQuaternion(b.q, 'YXZ');
    let dyaw = (eb.y - ea.y) / DEG; dyaw = ((dyaw + 540) % 360) - 180; const dpitch = (eb.x - ea.x) / DEG, droll = (eb.z - ea.z) / DEG;
    const fo0 = getVal(cam, 'focal', f0), fo1 = getVal(cam, 'focal', f1), aim = cam.cons.aim && getObj(cam.cons.aim), fol = cam.cons.follow && getObj(cam.cons.follow);
    const speed = pathLen / Math.max(dur, 0.01), pace = speed < 0.4 ? 'slow' : speed < 2.5 ? 'smooth' : speed < 8 ? 'fast' : 'very fast';
    const paceP = { slow: 'lento', smooth: 'suave', fast: 'rápido', 'very fast': 'muito rápido' }[pace];
    const moves = [], movesP = [];
    const curved = pathLen > 1.35 * d.length() + 0.5;
    if (aim && curved && Math.abs(dyaw) > 25) { moves.push(`${pace} orbiting arc around the ${enName(aim)} (${Math.round(Math.abs(dyaw))}° ${dyaw > 0 ? 'counter-clockwise' : 'clockwise'})`); movesP.push(`arco orbitando ${aim.name} (${Math.round(Math.abs(dyaw))}°)`); }
    else {
      if (fol) { moves.push(`tracking shot travelling alongside the ${enName(fol)}`); movesP.push(`travelling acompanhando ${fol.name}`); }
      if (Math.abs(dolly) > 0.3) { moves.push(`${pace} dolly ${dolly > 0 ? 'in (push in)' : 'out (pull back)'} of ${fmt(Math.abs(dolly), 1)} m`); movesP.push(`dolly ${dolly > 0 ? 'in' : 'out'} de ${fmt(Math.abs(dolly), 1)} m`); }
      if (Math.abs(truck) > 0.3) { moves.push(`truck ${truck > 0 ? 'right' : 'left'} ${fmt(Math.abs(truck), 1)} m`); movesP.push(`truck para a ${truck > 0 ? 'direita' : 'esquerda'} ${fmt(Math.abs(truck), 1)} m`); }
      if (Math.abs(ped) > 0.3) { moves.push(`${Math.abs(ped) > 3 ? 'crane' : 'pedestal'} ${ped > 0 ? 'up' : 'down'} ${fmt(Math.abs(ped), 1)} m`); movesP.push(`${Math.abs(ped) > 3 ? 'grua' : 'pedestal'} ${ped > 0 ? 'subindo' : 'descendo'} ${fmt(Math.abs(ped), 1)} m`); }
      if (Math.abs(dyaw) > 4) { moves.push(`pan ${dyaw > 0 ? 'left' : 'right'} ${Math.round(Math.abs(dyaw))}°`); movesP.push(`pan para a ${dyaw > 0 ? 'esquerda' : 'direita'} ${Math.round(Math.abs(dyaw))}°`); }
      if (Math.abs(dpitch) > 3) { moves.push(`tilt ${dpitch > 0 ? 'up' : 'down'} ${Math.round(Math.abs(dpitch))}°`); movesP.push(`tilt para ${dpitch > 0 ? 'cima' : 'baixo'} ${Math.round(Math.abs(dpitch))}°`); }
    }
    if (Math.abs(droll) > 3) { moves.push(`dutch roll ${Math.round(droll)}°`); movesP.push(`roll ${Math.round(droll)}°`); }
    if (fo1 / fo0 > 1.08) { moves.push(`zoom in from ${Math.round(fo0)}mm to ${Math.round(fo1)}mm`); movesP.push(`zoom in ${Math.round(fo0)}→${Math.round(fo1)}mm`); }
    if (fo0 / fo1 > 1.08) { moves.push(`zoom out from ${Math.round(fo0)}mm to ${Math.round(fo1)}mm`); movesP.push(`zoom out ${Math.round(fo0)}→${Math.round(fo1)}mm`); }
    if (aim && !moves.some(m => m.includes('orbit'))) { moves.push(`camera stays locked on the ${enName(aim)}`); movesP.push(`câmera travada mirando ${aim.name}`); }
    if (!moves.length) { moves.push('static locked-off shot'); movesP.push('plano estático (câmera parada)'); }
    if (cam.cons.shake > 0) { moves.push(cam.cons.shake > 1 ? 'shaky handheld feel' : 'subtle handheld micro-movement'); movesP.push('câmera na mão'); }
    const h = a.p.y, ang = h < 0.8 ? ['low angle, close to the ground', 'ângulo baixo, rente ao chão'] : h < 2.2 ? ['eye-level', 'altura dos olhos'] : h < 10 ? ['high angle', 'plongée / ângulo alto'] : ['aerial drone view', 'vista aérea de drone'];
    let framing = ['', ''];
    if (aim) { const ar = rt.get(aim.id); const dist = a.p.distanceTo(worldPos(aim, f0, new THREE.Vector3())); const vf = focalToVFov(fo0, aspectNum()) * DEG; const frac = (ar.radius * 1.2) / (2 * dist * Math.tan(vf / 2)); framing = frac > 0.9 ? ['close-up', 'close-up'] : frac > 0.45 ? ['medium shot', 'plano médio'] : frac > 0.18 ? ['wide shot', 'plano aberto'] : ['extreme wide shot', 'plano geral']; }
    en.push(`${framing[0] ? framing[0][0].toUpperCase() + framing[0].slice(1) + ', ' : ''}${ang[0]}, shot on a ${Math.round(fo0)}mm lens, ${project.aspect}. Camera: ${moves.join(', ')}.`);
    pt.push(`${framing[1] ? framing[1][0].toUpperCase() + framing[1].slice(1) + ', ' : ''}${ang[1]}, lente ${Math.round(fo0)}mm, ${project.aspect}. Câmera: ${movesP.join(', ')}. Ritmo ${paceP}.`);
    lines.push(`CÂMERA "${cam.name}": início (${a.p.toArray().map(v => fmt(v, 1)).join(', ')}) → fim (${b.p.toArray().map(v => fmt(v, 1)).join(', ')}), percurso ${fmt(pathLen, 1)} m em ${fmt(dur, 1)} s, focal ${fmt(fo0, 0)}→${fmt(fo1, 0)} mm.`);
    // sujeitos
    for (const o of project.objects) {
      if (o.type === 'camera' || o.hidden || ASSETS[o.type].helperOnly) continue;
      const s0 = sample(o, f0), s1 = sample(o, f1); let len = 0, pv = s0.p.clone(); for (let f = f0 + 1; f <= f1; f += 2) { const s = sample(o, f); len += s.p.distanceTo(pv); pv = s.p; }
      if (len < 0.3) continue;
      const v = s1.p.clone().sub(s0.p), kmh = len / dur * 3.6;
      const rx = v.dot(right), fz = v.dot(fwd);
      const dirE = Math.abs(rx) > Math.abs(fz) ? (rx > 0 ? 'moves from left to right across frame' : 'moves from right to left across frame') : (fz > 0 ? 'moves away from camera' : 'moves toward camera');
      const dirP = Math.abs(rx) > Math.abs(fz) ? (rx > 0 ? 'cruza o quadro da esquerda para a direita' : 'cruza o quadro da direita para a esquerda') : (fz > 0 ? 'se afasta da câmera' : 'vem em direção à câmera');
      const e0 = new THREE.Euler().setFromQuaternion(s0.q, 'YXZ'), e1 = new THREE.Euler().setFromQuaternion(s1.q, 'YXZ'); const turn = getVal(o, 'ry', f1) - getVal(o, 'ry', f0);
      const nm = enName(o), verb = ASSETS[o.type].pilot === 'car' ? 'drives' : ASSETS[o.type].pilot === 'bird' ? 'flies' : kmh > 9 ? 'runs' : 'walks';
      en.push(`The ${nm} ${verb} ${kmh < 15 ? 'at ' + fmt(kmh, 0) + ' km/h' : 'at about ' + Math.round(kmh / 5) * 5 + ' km/h'} and ${dirE}${Math.abs(turn) > 30 ? `, turning ${turn > 0 ? 'left' : 'right'} ${Math.round(Math.abs(turn))}°` : ''}.`);
      pt.push(`${o.name} se move a ~${fmt(kmh, 0)} km/h e ${dirP}${Math.abs(turn) > 30 ? `, virando ${Math.round(Math.abs(turn))}° para a ${turn > 0 ? 'esquerda' : 'direita'}` : ''}.`);
      lines.push(`${o.name}: ${fmt(len, 1)} m em ${fmt(dur, 1)} s (média ${fmt(kmh, 1)} km/h).`);
    }
  }
  const scen = project.objects.filter(o => !ASSETS[o.type].pilot && !ASSETS[o.type].helperOnly).map(o => o.name);
  if (scen.length) { en.push(`Setting includes: ${[...new Set(project.objects.filter(o => !ASSETS[o.type].pilot && !ASSETS[o.type].helperOnly).map(enName))].join(', ')}.`); pt.push(`Cenário: ${scen.join(', ')}.`); }
  en.push(`Duration ${fmt(dur, 1)} seconds.`);
  applyFrame(keep);
  return { en: en.join(' '), pt: pt.join(' '), tech: lines.join('\n') };
}
$('#bPrompt').onclick = () => {
  const cams = project.objects.filter(o => o.type === 'camera');
  if (!cams.length) return toast('Adicione uma câmera para descrever o movimento');
  const render = (id) => { const d = describeScene(id); $('#pEn').value = d.en; $('#pPt').value = d.pt; $('#pTech').value = d.tech; };
  openModal('✦ Prompt de movimento para IA', `<div class="prow wide"><span class="lb">Câmera</span><select id="pCam">${cams.map(c => `<option value="${c.id}" ${c.id === project.activeCamera ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="grpl">Inglês (recomendado para modelos de vídeo)<span class="grow"></span><button id="cEn">Copiar</button></div><textarea id="pEn" style="min-height:110px"></textarea>
    <div class="grpl">Português<span class="grow"></span><button id="cPt">Copiar</button></div><textarea id="pPt" style="min-height:90px"></textarea>
    <div class="grpl">Dados técnicos<span class="grow"></span><button id="cTech">Copiar</button></div><textarea id="pTech" style="min-height:80px"></textarea>
    <div class="hint">Gerado proceduralmente a partir das curvas. Combine com o vídeo exportado (clay/depth) como referência de movimento.</div>`, m => {
    render($('#pCam').value); $('#pCam').onchange = e => render(e.target.value);
    $('#cEn').onclick = () => copyText($('#pEn').value); $('#cPt').onclick = () => copyText($('#pPt').value); $('#cTech').onclick = () => copyText($('#pTech').value);
  });
};

/* ============================================================
   CENA DE EXEMPLO — comercial de carro
   ============================================================ */
function demoProject() {
  const K = (pairs, interp) => pairs.map(([f, v]) => Object.assign(mkKey(f, v, interp)));
  const id = n => 'demo_' + n;
  const P = newProject(); P.name = 'Comercial carro — exemplo'; P.duration = 240; P.activeCamera = id('cam1');
  
  const base = (o = {}) => Object.assign({ px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 }, o);
  const cons = (o = {}) => Object.assign({ aim: null, aimH: 1, follow: null, shake: 0, shakeFreq: 1.5 }, o);
  const ob = (n, type, b, tracks = {}, c = {}, params = {}) => ({ id: id(n), type, name: n === 'cam1' ? 'Cam A — lateral' : n === 'cam2' ? 'Cam B — perseguição' : n === 'cam3' ? 'Cam C — drone' : { road: 'Estrada', forest: 'Floresta', terrain: 'Terreno', car: 'Carro herói', person: 'Pedestre', dog: 'Cachorro', flock: 'Bando', rock: 'Rocha', cone: 'Cone', lamp: 'Poste' }[n] || n, params: Object.assign(defaultParams(type), params), base: base(b), tracks, cons: cons(c), hidden: false });
  P.objects = [
    ob('terrain', 'terrain', { py: -0.06 }, {}, {}, { size: 600, height: 40, flat: 70, feature: 140, color: '#6f7d5a' }),
    ob('road', 'road', {}, {}, {}, { length: 400, lanes: 2 }),
    ob('forest', 'forest', {}, {}, {}, { radius: 140, count: 180, clear: 0, stripe: true, mix: 'mix', seed: 21 }),
    ob('car', 'sportcar', { px: -1.75 }, { pz: K([[0, -70], [100, -12], [240, 62]]), }, {}, { color: '#c94b3c' }),
    ob('person', 'person', { px: -7.8 }, { pz: K([[0, -6], [240, 12]], 'linear') }, {}, { shirt: '#e8e6e1' }),
    ob('dog', 'dog', { px: -7, pz: -4.5 }, { pz: K([[0, -4.5], [240, 13.5]], 'linear') }),
    ob('flock', 'flock', { py: 16, px: 30, ry: -100 }, { px: K([[0, 40], [240, -40]], 'linear'), pz: K([[0, 10], [240, -5]], 'linear') }),
    ob('lamp', 'lamp', { px: -4.6, pz: 6, ry: 90 }),
    ob('cam1', 'camera', { px: 9, py: 1.3, pz: 4, focal: 35 }, {}, { aim: id('car'), aimH: 0.6 }),
    ob('cam2', 'camera', { px: -2.5, py: 1.2, pz: -7.5, focal: 28 }, { focal: K([[0, 28], [240, 40]]) }, { aim: id('car'), aimH: 0.7, follow: id('car'), shake: 0.35, shakeFreq: 1.8 }),
    ob('cam3', 'camera', { px: 18, py: 14, pz: -40, rx: -25, ry: 150, focal: 24 }, { px: K([[0, 18], [240, 10]]), py: K([[0, 14], [240, 22]]), pz: K([[0, -40], [240, 30]]) }, { aim: id('car'), aimH: 0.5 }),
  ];
  P.objects.find(o => o.id === id('cam2')).base.focal = 28;
  return P;
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
function init() {
  initRealcarUI(); initThumbs(); initCinemaUI(); initModelUI(); initRoadUI();
  renderAssets();
  let loaded = false;
  try { const s = localStorage.getItem('layout3d.autosave'); if (s) { const d = JSON.parse(s); if (d && d.objects && d.objects.length) { loadProjectData(d); loaded = true; toast('Sessão anterior restaurada'); } } } catch (e) { }
  if (!loaded) { loadProjectData(demoProject()); }
  setTLMode('dope'); fitTime(); setFrame(0);
  requestAnimationFrame(loopFn);
}
window.__layout = { get project() { return project; }, get curFrame() { return curFrame; }, get pilot() { return pilot; }, add: (t, o) => addObject(t, o), setFrame: f => setFrame(f), select: id => select(id), cam: editorCam, orbit, ev: s => eval(s) };

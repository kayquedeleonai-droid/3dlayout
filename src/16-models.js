/* ============================================================
   TROCAR MODELO mantendo a animação + MODELO 3D PRÓPRIO (GLB/GLTF)
   o.custom = { key, name, rot, fit: 'length'|'height'|'none', size, src? }
   Arquivos ficam no IndexedDB do navegador (e embutidos no projeto se < 6 MB).
   ============================================================ */
const _gltfCache = new Map();          // key -> THREE.Object3D (cena carregada)
const _gltfLoading = new Map();
let _gltfLoader = null;
async function gltfLoader() {
  if (_gltfLoader) return _gltfLoader;
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  _gltfLoader = new GLTFLoader();
  try { const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js'); const d = new DRACOLoader(); d.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/'); _gltfLoader.setDRACOLoader(d); } catch (e) { }
  return _gltfLoader;
}
/* ---------- IndexedDB ---------- */
function idb() { return new Promise((res, rej) => { try { const r = indexedDB.open('layout3d-models', 1); r.onupgradeneeded = () => r.result.createObjectStore('m'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); }
async function idbPut(k, v) { try { const db = await idb(); await new Promise((res, rej) => { const t = db.transaction('m', 'readwrite'); t.objectStore('m').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); } catch (e) { } }
async function idbGet(k) { try { const db = await idb(); return await new Promise((res) => { const t = db.transaction('m', 'readonly'); const q = t.objectStore('m').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch (e) { return null; } }
async function hashBuf(buf) { try { const h = await crypto.subtle.digest('SHA-1', buf); return 'm' + [...new Uint8Array(h)].slice(0, 10).map(b => b.toString(16).padStart(2, '0')).join(''); } catch (e) { return 'm' + buf.byteLength + '_' + Date.now(); } }
const b64ToBuf = (s) => { const bin = atob(s.split(',').pop()); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a.buffer; };
const bufToB64 = (buf) => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return 'data:model/gltf-binary;base64,' + btoa(s); };
async function ensureModel(o) {
  const c = o.custom; if (!c || _gltfCache.has(c.key)) return;
  if (_gltfLoading.has(c.key)) return _gltfLoading.get(c.key);
  const p = (async () => {
    let buf = await idbGet(c.key);
    if (!buf && c.src) { buf = b64ToBuf(c.src); idbPut(c.key, buf); }
    if (!buf) { toast(`Modelo "${c.name}" não está neste navegador — carregue o arquivo de novo`, 5000); return; }
    const L = await gltfLoader();
    const gl = await new Promise((res, rej) => L.parse(buf, '', res, rej));
    const root = gl.scene || gl.scenes[0];
    root.traverse(n => { if (n.isMesh) { n.castShadow = n.receiveShadow = true; const ms = Array.isArray(n.material) ? n.material : [n.material]; ms.forEach(m => { if (m && m.map) m.map.colorSpace = THREE.SRGBColorSpace; }); } });
    _gltfCache.set(c.key, root);
  })().catch(e => { console.error(e); toast('Não consegui abrir o modelo 3D: ' + (e.message || e)); }).finally(() => _gltfLoading.delete(c.key));
  _gltfLoading.set(c.key, p);
  await p;
  for (const ob of project.objects) if (ob.custom && ob.custom.key === c.key) buildRuntime(ob);
  attachGizmo(); bump(); tlDirty = true; pathVer = -1;
}
// constrói o grupo do modelo próprio (chamado pelo buildRuntime)
function buildCustomGroup(o, fallbackSize) {
  const c = o.custom, src = _gltfCache.get(c.key); if (!src) { ensureModel(o); return null; }
  const g = new THREE.Group(), holder = new THREE.Group(); g.add(holder);
  const m = src.clone(true); holder.add(m); holder.rotation.y = (c.rot || 0) * DEG;
  g.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(holder), sz = bb.getSize(new THREE.Vector3());
  let k = 1; const target = +c.size || 0;
  if (c.fit === 'length' && target > 0) k = target / Math.max(1e-6, sz.z);
  else if (c.fit === 'height' && target > 0) k = target / Math.max(1e-6, sz.y);
  holder.scale.setScalar(k);
  const ctr = bb.getCenter(new THREE.Vector3()); holder.position.set(-ctr.x * k, -bb.min.y * k, -ctr.z * k);
  // rodas por nome (best-effort): giram com o deslocamento
  const rig = { wheels: [], steer: [], wb: 2.7, r: 0.33 }, wz = [];
  m.traverse(n => { const nm = (n.name || '').toLowerCase(); if (/wheel|roda|tire|tyre|pneu/.test(nm) && !/steer|volante|arch|caixa|well/.test(nm) && n.children.length < 12) { rig.wheels.push(n); } });
  // evita pegar pai + filho
  rig.wheels = rig.wheels.filter(w => !rig.wheels.some(o2 => o2 !== w && isAncestor(o2, w)));
  if (rig.wheels.length) { g.updateMatrixWorld(true); const wb = new THREE.Box3().setFromObject(rig.wheels[0]); rig.r = Math.max(0.1, wb.getSize(new THREE.Vector3()).y / 2); rig.wheels.forEach(w => { w.userData.rx0 = w.rotation.x; wz.push(w.getWorldPosition(new THREE.Vector3()).z); }); if (wz.length > 1) rig.wb = Math.max(...wz) - Math.min(...wz); }
  rig.custom = true; g.userData.rig = rig; return g;
}
function isAncestor(a, b) { let x = b.parent; while (x) { if (x === a) return true; x = x.parent; } return false; }
function animCustom(rig, c) { for (const w of rig.wheels) w.rotation.x = (w.userData.rx0 || 0) + c.dist / rig.r; }

/* ---------- trocar modelo (mesma categoria) ---------- */
function swapGroup(o) {
  const t = o.type, pl = ASSETS[t].pilot;
  if (pl === 'car') return 'veh'; if (isPersonType(t) && t !== 'crowd') return 'people'; if (ASSETS[t].params.some(p => p.k === 'species')) return 'animals'; if (pl === 'bird' && !['flock'].includes(t)) return 'fly'; return null;
}
function swapOptions(o) {
  const g = swapGroup(o); if (!g) return null;
  if (g === 'veh') return [['__lbl', 'Modelos reais'], ...Object.entries(CAR_DB).map(([k, v]) => ['realcar:' + k, v.name]), ['__lbl', 'Genéricos'], ...['car', 'suv', 'sportcar', 'truck', 'bus', 'moto'].map(t => [t, ASSETS[t].label])];
  if (g === 'people') return ['person', 'woman', 'child'].map(t => [t, ASSETS[t].label]);
  if (g === 'animals') return ['dog', 'cat', 'horse', 'cow', 'deer'].map(t => [t, ASSETS[t].label]);
  return ['bird', 'gull', 'eagle', 'drone', 'heli'].map(t => [t, ASSETS[t].label]);
}
function currentSwapValue(o) { if (o.custom) return '__custom'; if (o.type === 'realcar') return CAR_DB[o.params.model] ? 'realcar:' + o.params.model : 'realcar:custom'; return o.type; }
function swapModel(o, val) {
  const oldLabel = ASSETS[o.type].label, wasDefaultName = !o.name || o.name.startsWith(oldLabel) || (o.type === 'realcar' && CAR_DB[o.params.model] && o.name === CAR_DB[o.params.model].name);
  delete o.custom;
  if (val.startsWith('realcar:')) { const k = val.slice(8); o.type = 'realcar'; o.params = Object.assign(defaultParams('realcar'), carDefaults(k), { modelName: CAR_DB[k].name }); if (wasDefaultName) o.name = CAR_DB[k].name; }
  else { const keep = o.params || {}; o.type = val; o.params = defaultParams(val); for (const k in keep) if (k in o.params && !['species', 'style', 'length', 'width', 'height', 'model', 'body', 'span', 'flap', 'scale', 'walk', 'run', 'speed'].includes(k)) o.params[k] = keep[k]; if (wasDefaultName) o.name = ASSETS[val].label; }
  if (o.type !== 'realcar' && ASSETS[o.type].pilot !== 'car') o.clips = (o.clips || []).filter(c => (PERSON_ACTIONS[c.kind] && isPersonType(o.type)) || (QUAD_ACTIONS[c.kind] && !isPersonType(o.type)));
  buildRuntime(o); attachGizmo(); bump(); commit(); renderInspector(); renderOutliner(); tlDirty = true; pathVer = -1;
  toast(`Modelo trocado — animação, trajetória e câmeras mantidas`);
}
function modelSectionHTML(o) {
  const opts = swapOptions(o), cur = currentSwapValue(o);
  let h = '';
  if (opts) {
    let sel2 = '<select id="swapSel">'; let open = false;
    for (const [v, l] of opts) { if (v === '__lbl') { if (open) sel2 += '</optgroup>'; sel2 += `<optgroup label="${l}">`; open = true; continue; } sel2 += `<option value="${v}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`; }
    if (open) sel2 += '</optgroup>'; if (o.custom) sel2 += `<option value="__custom" selected>📦 ${esc(o.custom.name)}</option>`; sel2 += '</select>';
    h += `<div class="prow wide"><span class="lb">Trocar modelo</span>${sel2}</div>`;
  }
  h += `<div class="btnrow"><button data-cm="load">${ic('box', 14)}<span>${o.custom ? 'Trocar arquivo 3D' : 'Usar meu modelo 3D (GLB/GLTF)'}</span></button>${o.custom ? '<button data-cm="remove">Voltar ao procedural</button>' : ''}</div>`;
  if (o.custom) {
    const c = o.custom;
    h += `<div class="prow wide"><span class="lb">Ajustar escala</span><select data-cmp="fit"><option value="length" ${c.fit === 'length' ? 'selected' : ''}>pelo comprimento</option><option value="height" ${c.fit === 'height' ? 'selected' : ''}>pela altura</option><option value="none" ${c.fit === 'none' ? 'selected' : ''}>tamanho original do arquivo</option></select></div>
      ${c.fit !== 'none' ? `<div class="prow wide"><span class="lb">${c.fit === 'height' ? 'Altura' : 'Comprimento'} (m)</span><input type="number" data-cmp="size" value="${c.size}" step="0.01" min="0.01"></div>` : ''}
      <div class="btnrow"><span class="hint" style="margin:0">Frente do modelo:</span>${[0, 90, 180, 270].map(r => `<button class="chip ${(c.rot || 0) === r ? 'on' : ''}" data-cmrot="${r}">${r}°</button>`).join('')}</div>
      <div class="hint">${rt.get(o.id) && rt.get(o.id).rig && rt.get(o.id).rig.custom ? (rt.get(o.id).rig.wheels.length ? `✓ ${rt.get(o.id).rig.wheels.length} rodas detectadas pelo nome — giram com o movimento.` : 'Nenhuma roda encontrada pelo nome (wheel/roda/tire): o modelo se move sem girar as rodas.') : 'Carregando…'} Gire até a frente apontar para a seta azul (+Z) do gizmo. ${c.src ? 'Arquivo embutido no projeto.' : 'Arquivo grande: fica salvo só neste navegador (não vai no .json do projeto).'}</div>`;
  } else h += `<div class="hint">Troque por qualquer modelo da biblioteca ou pelo seu arquivo 3D: a trajetória, os keyframes, as câmeras presas/mirando e os cortes continuam iguais.</div>`;
  return h;
}
const modelFile = document.createElement('input'); modelFile.type = 'file'; modelFile.accept = '.glb,.gltf,model/gltf-binary,model/gltf+json'; modelFile.style.display = 'none'; document.body.appendChild(modelFile);
modelFile.onchange = async () => {
  const f = modelFile.files[0]; modelFile.value = ''; const o = sel && getObj(sel); if (!f || !o) return;
  try {
    let buf = await f.arrayBuffer();
    if (/\.gltf$/i.test(f.name)) { const txt = new TextDecoder().decode(buf); if (/"uri"\s*:\s*"(?!data:)/.test(txt)) { toast('Esse .gltf usa arquivos externos — exporte como .glb (binário único)', 6000); return; } }
    const key = await hashBuf(buf); await idbPut(key, buf);
    const r = rt.get(o.id), size = o.type === 'realcar' ? o.params.length : (r && r.size ? +(r.size.z * getVal(o, 'sz', curFrame)).toFixed(3) : 4.5);
    const vehicle = ASSETS[o.type].pilot === 'car';
    o.custom = { key, name: f.name.replace(/\.(glb|gltf)$/i, ''), rot: 0, fit: vehicle || o.type === 'realcar' ? 'length' : 'height', size: vehicle ? size : (r && r.size ? +(r.size.y * getVal(o, 'sy', curFrame)).toFixed(3) : 1.7) };
    if (buf.byteLength < 6e6) o.custom.src = bufToB64(buf);
    toast('Carregando modelo 3D…'); await ensureModel(o); commit(); renderInspector(); renderOutliner();
  } catch (e) { console.error(e); toast('Falha ao ler o arquivo 3D'); }
};
function initModelUI() {
  insp.addEventListener('change', e => {
    const o = sel && getObj(sel), t = e.target; if (!o) return;
    if (t.id === 'swapSel' && t.value !== '__custom') { swapModel(o, t.value); return; }
    if (t.dataset.cmp && o.custom) { o.custom[t.dataset.cmp] = t.dataset.cmp === 'size' ? Math.max(0.01, +t.value) : t.value; buildRuntime(o); attachGizmo(); bump(); commit(); renderInspector(); }
  });
  insp.addEventListener('click', e => {
    const o = sel && getObj(sel), b = e.target.closest('button'); if (!o || !b) return;
    if (b.dataset.cm === 'load') modelFile.click();
    if (b.dataset.cm === 'remove') { delete o.custom; buildRuntime(o); attachGizmo(); bump(); commit(); renderInspector(); renderOutliner(); }
    if (b.dataset.cmrot != null && o.custom) { o.custom.rot = +b.dataset.cmrot; buildRuntime(o); attachGizmo(); bump(); commit(); renderInspector(); }
  });
}

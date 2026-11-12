/* ============================================================
   CENA / RENDER
   ============================================================ */
const vpEl = $('#vp');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true }); // log depth: asfalto 3 cm acima do chão sem z-fighting a 300 m+
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
vpEl.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const world = new THREE.Group(); scene.add(world);
const hemi = new THREE.HemisphereLight('#dfe9f5', '#5a5248', 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffffff', 1.8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 400 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#8d9094', roughness: 1, metalness: 0 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.userData.ground = true; scene.add(ground);
const grid = new THREE.GridHelper(200, 200, 0x55595f, 0x3d4046); grid.position.y = 0.005; grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);
const editorCam = new THREE.PerspectiveCamera(45, 1, 0.05, 6000); editorCam.position.set(14, 9, 18);
const orbit = new OrbitControls(editorCam, renderer.domElement); orbit.enableDamping = true; orbit.dampingFactor = 0.12; orbit.target.set(0, 1, 0);
const gizmo = new TransformControls(editorCam, renderer.domElement); gizmo.setSize(0.85); scene.add(gizmo);
const selBox = new THREE.BoxHelper(undefined, 0xf2a33a); selBox.visible = false; scene.add(selBox);
const pathLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xf2a33a, transparent: true, opacity: 0.85 }));
const pathDots = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: false }));
const pathKeys = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xf2c14e, size: 9, sizeAttenuation: false }));
scene.add(pathLine, pathDots, pathKeys);
const sceneHelpers = [grid, gizmo, selBox, pathLine, pathDots, pathKeys];

/* materiais de render alternativos */
const clayMat = new THREE.MeshStandardMaterial({ color: '#d8d8d8', roughness: 0.85, flatShading: false });
const normalMat = new THREE.MeshNormalMaterial();
const depthMat = new THREE.ShaderMaterial({
  uniforms: { near: { value: 0.5 }, far: { value: 80 } },
  vertexShader: '#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying float vz; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vz = -mv.z; gl_Position = projectionMatrix*mv;\n#include <logdepthbuf_vertex>\n}',
  fragmentShader: '#include <logdepthbuf_pars_fragment>\nuniform float near; uniform float far; varying float vz; void main(){\n#include <logdepthbuf_fragment>\n float d = clamp((vz-near)/(far-near),0.0,1.0); gl_FragColor = vec4(vec3(1.0-d),1.0); }',
});
const segMats = new Map();
function segMat(hex) { let m = segMats.get(hex); if (!m) { m = new THREE.MeshBasicMaterial({ color: hex, toneMapped: false }); segMats.set(hex, m); } return m; }
const SEG_COLORS = ['#ff3b30', '#34c759', '#007aff', '#ffcc00', '#af52de', '#ff9500', '#5ac8fa', '#ff2d55', '#a2845e', '#30d158', '#64d2ff', '#bf5af2', '#ffd60a', '#0a84ff', '#ff6961', '#77dd77'];

/* ============================================================
   OBJETOS EM TEMPO DE EXECUÇÃO
   ============================================================ */
const rt = new Map(); // id -> {g, radius}
/* ---------- modo LEITURA: separa herói / pista / fundo por tom, com perspectiva atmosférica ---------- */
const _readMats = new Map(); let _readFog = null;
const HERO_PL = ['car', 'walker', 'bird'];
function readCat(o) { const t = o.type, A = ASSETS[t]; if (A.pilot && HERO_PL.includes(A.pilot) || isQuadType(t) || t === 'realcar' || t === 'crowd' || t === 'parked') return 'hero'; if (t === 'roadpath' || t === 'road' || t === 'street' || t === 'barrier' || t === 'cone') return 'road'; return 'env'; }
function readMat(m, cat) {
  if (Array.isArray(m)) return m.map(x => readMat(x, cat));
  if (!m || !m.color) return m; const k = m.uuid + cat; let r = _readMats.get(k); if (r) return r;
  r = m.clone(); const c = r.color, hsl = {}; c.getHSL(hsl); const sky = readHaze();
  if (cat === 'hero') { c.setHSL(hsl.h, Math.min(1, hsl.s * 1.25 + 0.05), clamp(hsl.l * 1.05, 0.12, 0.85)); if (r.emissive) { r.emissive = r.emissive.clone().add(c.clone().multiplyScalar(0.12)); } }
  else if (cat === 'road') { if (hsl.l < 0.32 && hsl.s < 0.25) c.set('#202124'); else if (hsl.l < 0.55 && hsl.s < 0.2) c.set('#5d6066'); else if (hsl.s > 0.25 && hsl.h < 0.2) c.setHSL(hsl.h, hsl.s, Math.min(0.75, hsl.l * 1.1)); else if (hsl.l > 0.6) c.setHSL(hsl.h, hsl.s, 0.9); else c.setHSL(hsl.h, hsl.s * 0.4, hsl.l).lerp(sky, 0.25); }
  else { c.setHSL(hsl.h, hsl.s * 0.4, clamp(hsl.l * 0.85 + 0.12, 0, 0.8)).lerp(sky, 0.3); r.roughness = 1; r.metalness = 0; }
  _readMats.set(k, r); return r;
}
function readHaze() { return new THREE.Color('#c3cad3').lerp(new THREE.Color(project.settings.bg2 || '#cfd6dd'), 0.2); }
let _readFogCol = null;
function readSwap(cam) {
  const sw = [];
  for (const o of project.objects) { const r = rt.get(o.id); if (!r || !r.g.visible) continue; const cat = readCat(o); r.g.traverse(n => { if (n.isMesh && !n.userData.helper && n.material) { sw.push([n, n.material]); n.material = readMat(n.material, cat); } }); }
  ground.material = ground.userData.readMat || (ground.userData.readMat = readMat(groundMatOrig, 'env'));
  if (scene.fog && scene.fog.density != null) { _readFog = scene.fog.density; _readFogCol = scene.fog.color.clone(); scene.fog.color.copy(readHaze()); scene.fog.density = Math.max(0.0012, scene.fog.density * 2.2); }
  return sw;
}
function readRestore() { if (_readFog != null && scene.fog) { scene.fog.density = _readFog; if (_readFogCol) scene.fog.color.copy(_readFogCol); } _readFog = null; }
function readReset() { for (const m of _readMats.values()) m.dispose && m.dispose(); _readMats.clear(); if (ground.userData.readMat) { ground.userData.readMat = null; } }
let _skipConform = false;
function buildRuntime(o) {
  const old = rt.get(o.id); if (old) { world.remove(old.g); disposeGroup(old.g); }
  const d = ASSETS[o.type];
  const p = Object.assign(defaultParams(o.type), o.params);
  let g = o.custom ? buildCustomGroup(o) : null;
  if (!g) g = d.build(p);
  buildRefs(o, g);
  g.userData.objId = o.id; g.rotation.order = 'YXZ';
  const helpers = [];
  g.traverse(n => { n.userData.objId = o.id; if (n.userData.helper) helpers.push(n); });
  const segHex = SEG_COLORS[project.objects.indexOf(o) % SEG_COLORS.length];
  g.updateMatrixWorld(true);
  const bb = new THREE.Box3(); g.traverse(n => { if (n.isMesh && !isHelperNode(n)) bb.expandByObject(n); });
  const radius = bb.isEmpty() ? 0.6 : Math.max(0.4, bb.getSize(new THREE.Vector3()).length() / 2);
  world.add(g);
  rt.set(o.id, { g, helpers, radius, segHex, rig: g.userData.rig, p, size: bb.isEmpty() ? null : bb.getSize(new THREE.Vector3()) });
  if (!_skipConform) { if (o.type === 'terrain') conformTerrain(o); else if (o.type === 'roadpath' && project.objects.some(x => x.type === 'terrain')) conformAllTerrain(); }
  return rt.get(o.id);
}
function isHelperNode(n) { let x = n; while (x) { if (x.userData && x.userData.helper) return true; x = x.parent; } return false; }
function disposeGroup(g) { g.traverse(n => { if (n.geometry) n.geometry.dispose(); }); }
function rebuildAll() { for (const [id, r] of rt) { world.remove(r.g); disposeGroup(r.g); } rt.clear(); for (const o of project.objects) buildRuntime(o); applyEnv(); }

/* ---------- ambiente (fundo em degradê estilo playblast) ---------- */
let _bgTex = null, _bgKey = '';
function gradientTex(top, bottom) {
  const key = top + bottom; if (_bgTex && _bgKey === key) return _bgTex;
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(1, bottom); x.fillStyle = gr; x.fillRect(0, 0, 4, 256);
  if (_bgTex) _bgTex.dispose(); _bgTex = new THREE.CanvasTexture(c); _bgTex.colorSpace = THREE.SRGBColorSpace; _bgKey = key; return _bgTex;
}
function applyEnv() {
  if (typeof readReset === 'function') readReset();
  const s = project.settings;
  scene.background = gradientTex(s.sky, s.bg2 || s.sky);
  scene.fog = s.fog > 0 ? new THREE.FogExp2(s.bg2 || s.sky, s.fog * 0.25) : null;
  ground.material.color.set(s.ground); ground.scale.set(s.groundSize, s.groundSize, 1);
  grid.visible = s.grid;
  const az = s.sunAz * DEG, el = s.sunEl * DEG;
  sun.position.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(150);
  sun.intensity = s.sunInt; hemi.intensity = 1.25; hemi.color.set('#f2f4f7'); hemi.groundColor.set('#6d6a66');
  depthMat.uniforms.far.value = s.depthFar || 80;
  applyEnvExtra(s);
}

/* ---------- lente ---------- */
function aspectNum(a = project.aspect) { const [w, h] = a.split(':').map(Number); return w / h; }
function focalToVFov(focal, aspect, S) {
  S = S || { w: 36, h: 24, sq: 1 }; const effW = S.w * (S.sq || 1), sensA = effW / S.h;
  if (aspect >= sensA) { const hf = 2 * Math.atan(effW / (2 * focal)); return 2 * Math.atan(Math.tan(hf / 2) / aspect) / DEG; }
  return 2 * Math.atan(S.h / (2 * focal)) / DEG;
}

/* ============================================================
   AVALIAÇÃO DE TRANSFORMAÇÕES
   ============================================================ */
const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), UP = new THREE.Vector3(0, 1, 0);
// posição "crua" (canais), sem restrições
function rawPos(o, f, out = new THREE.Vector3()) {
  if (pilot.on && pilot.id === o.id) return out.copy(pilot.s.pos);
  return out.set(getVal(o, 'px', f), getVal(o, 'py', f), getVal(o, 'pz', f));
}
// posição no mundo (inclui restrição "seguir")
function worldPos(o, f, out = new THREE.Vector3(), depth = 0) {
  rawPos(o, f, out);
  if (pilot.on && pilot.id === o.id) return out;
  const mt = o.cons && o.cons.mount && getObj(o.cons.mount);
  if (mt && mt !== o && depth < 3) { const t = worldPos(mt, f, new THREE.Vector3(), depth + 1); out.applyAxisAngle(UP, mountYaw(mt, f)).add(t); return out; }
  const fl = o.cons && o.cons.follow && getObj(o.cons.follow);
  if (fl && fl !== o && depth < 3) { const t = worldPos(fl, f, new THREE.Vector3(), depth + 1); out.add(t); return out; }
  if (_roadRelief && followsGround(o)) { const r = rt.get(o.id), gh = groundAt(out.x, out.z, r ? r._gh : null); if (gh != null) { out.y += gh; if (r && depth === 0) r._gh = gh; } else if (r && depth === 0) r._gh = 0; }
  return out;
}
function evalTransform(o, f) {
  const r = rt.get(o.id); if (!r) return;
  const g = r.g;
  const pos = worldPos(o, f, g.position);
  if (pilot.on && pilot.id === o.id) { g.rotation.set(pilot.s.rx || 0, pilot.s.ry, pilot.s.rz || 0); }
  else g.rotation.set(getVal(o, 'rx', f) * DEG, getVal(o, 'ry', f) * DEG, getVal(o, 'rz', f) * DEG);
  g.scale.set(getVal(o, 'sx', f), getVal(o, 'sy', f), getVal(o, 'sz', f));
  const c = o.cons || {};
  const mtg = c.mount && getObj(c.mount); if (mtg && mtg !== o && !(pilot.on && pilot.id === o.id)) g.rotation.y += mountYaw(mtg, f);
  const aimT = c.aim && getObj(c.aim);
  if (aimT && aimT !== o && !(pilot.on && pilot.id === o.id)) {
    const tp = worldPos(aimT, f, new THREE.Vector3()); tp.y += c.aimH ?? 1;
    if (tp.distanceToSquared(pos) > 1e-6) {
      _m.lookAt(pos, tp, UP); g.quaternion.setFromRotationMatrix(_m);
      if (o.type !== 'camera') g.rotateY(Math.PI); // objetos olham +Z
      if (o.type === 'camera' && (c.frameX || c.frameY)) { // enquadramento: põe o alvo numa linha dos terços (ou onde quiser)
        const focal = getVal(o, 'focal', f), vf = focalToVFov(focal, aspectNum(), camSensor(o)) * DEG, tv = Math.tan(vf / 2), th = tv * aspectNum();
        g.rotateY(Math.atan(th * (c.frameX || 0))); g.rotateX(Math.atan(tv * -(c.frameY || 0)));
      }
      g.rotateZ(getVal(o, 'rz', f) * DEG);
    }
  }
  if (c.shake > 0) {
    const t = f / project.fps * (c.shakeFreq || 1.5), a = c.shake * DEG;
    g.rotateX(noise1(t, 11) * a + noise1(t * 2.7, 13) * a * 0.3); g.rotateY(noise1(t, 21) * a + noise1(t * 3.1, 23) * a * 0.3); g.rotateZ(noise1(t * 0.7, 31) * a * 0.4);
  }
  if (_roadRelief && o.type !== 'camera' && followsGround(o) && !(c.mount || c.follow)) { // inclina com a rampa
    const r2 = rt.get(o.id), half = r2 && r2.size ? Math.max(0.25, r2.size.z * 0.35) : 1, fx = Math.sin(g.rotation.y), fz = Math.cos(g.rotation.y);
    const a = groundAt(pos.x + fx * half, pos.z + fz * half, r2 && r2._gh), b = groundAt(pos.x - fx * half, pos.z - fz * half, r2 && r2._gh);
    if (a != null && b != null) { const pitch = Math.atan2(a - b, 2 * half), k = isPersonType(o.type) ? 0 : isQuadType(o.type) ? 0.7 : 1; if (k) g.rotateX(-pitch * k); }
  }
  if (o.type === 'camera') {
    const focal = pilot.on && pilot.id === o.id ? pilot.s.focal : getVal(o, 'focal', f);
    r.rig.cam.fov = focalToVFov(focal, aspectNum(), camSensor(o)); r.rig.cam.aspect = aspectNum(); r.rig.cam.updateProjectionMatrix();
  }
}
/* cache de movimento: distância percorrida, velocidade, giro — alimenta animação procedural */
const mcache = new Map();
function motion(o) {
  let c = mcache.get(o.id);
  const N = project.duration + 1;
  if (c && c.ver === animVer && c.N === N) return c;
  c = { ver: animVer, N, dist: new Float32Array(N), speed: new Float32Array(N), yawRate: new Float32Array(N), vy: new Float32Array(N), y: new Float32Array(N) };
  const fps = project.fps; let px = getVal(o, 'px', 0), py = getVal(o, 'py', 0), pz = getVal(o, 'pz', 0), ry = getVal(o, 'ry', 0);
  const sc = Math.max(0.01, getVal(o, 'sy', 0)), fly = ASSETS[o.type].pilot === 'bird';
  c.y[0] = py;
  for (let f = 1; f < N; f++) {
    const x = getVal(o, 'px', f), y = getVal(o, 'py', f), z = getVal(o, 'pz', f), r = getVal(o, 'ry', f);
    const dx = x - px, dz = z - pz, dy = y - py, fx = Math.sin(r * DEG), fz = Math.cos(r * DEG);
    const hor = Math.hypot(dx, dz), sgn = (dx * fx + dz * fz) < -1e-5 ? -1 : 1;
    const ds = (fly ? Math.hypot(hor, dy) : hor * sgn) / sc;
    c.dist[f] = c.dist[f - 1] + ds; c.speed[f] = ds * fps; c.yawRate[f] = (r - ry) * DEG * fps; c.vy[f] = dy * fps; c.y[f] = y;
    px = x; py = y; pz = z; ry = r;
  }
  if (N > 1) { c.speed[0] = c.speed[1]; c.yawRate[0] = c.yawRate[1]; c.vy[0] = c.vy[1]; }
  // suaviza velocidade (evita trancos em keys)
  const sm = new Float32Array(N); for (let f = 0; f < N; f++) { let s = 0, n = 0; for (let k = -2; k <= 2; k++) { const i = f + k; if (i >= 0 && i < N) { s += c.speed[i]; n++; } } sm[f] = s / n; } c.speed = sm;
  mcache.set(o.id, c); return c;
}
function animCtx(o, f) {
  if (pilot.on && pilot.id === o.id) return { t: f / project.fps + pilot.tExtra, dist: pilot.s.dist, speed: pilot.s.v, yawRate: pilot.s.yawRate || 0, vy: pilot.s.vy || 0, y: pilot.s.pos.y };
  const c = motion(o), i = clamp(Math.floor(f), 0, c.N - 1), j = Math.min(i + 1, c.N - 1), u = clamp(f - i, 0, 1);
  return { t: f / project.fps, dist: lerp(c.dist[i], c.dist[j], u), speed: lerp(c.speed[i], c.speed[j], u), yawRate: lerp(c.yawRate[i], c.yawRate[j], u), vy: lerp(c.vy[i], c.vy[j], u), y: lerp(c.y[i], c.y[j], u) };
}
let _roadRelief = false;
function applyFrame(f) {
  _groundTick++; _roadRelief = hasRoadRelief();
  for (const o of project.objects) {
    const r = rt.get(o.id); if (!r) continue;
    r.g.visible = !o.hidden;
    if (gizmoDragging && sel === o.id) { /* gizmo controla */ }
    else evalTransform(o, f);
    const d = ASSETS[o.type];
    if (r.rig && r.rig.custom) animCustom(r.rig, animCtx(o, f)); else if (d.anim && r.rig) d.anim(r.rig, animCtx(o, f), r.p);
    if (o.clips && o.clips.length && r.rig) applyClip(o, r, f);
    if (o.type === 'camera') updateFrustum(r.rig, r.rig.cam.fov, r.rig.cam.aspect, project.activeCamera === o.id, sel === o.id ? camFocus(o, f) : 0);
  }
  if (roadHandles.userData.road) syncRoadHandles();
  updateGearViz(f); updateSpeedHud(f); seqTick(f);
}

/* ---------- render ---------- */
function setHelpersVisible(v) {
  for (const h of sceneHelpers) h.visible = v && (h !== selBox || !!sel) && (h !== grid || project.settings.grid) && (h !== gizmo || !!gizmo.object);
  if (v) updatePathVisibility();
  for (const r of rt.values()) for (const h of r.helpers) h.visible = v;
}
function renderScene(rend, cam, mode, w, h, vx = 0, vy = 0, target = null) {
  const bg = scene.background, fog = scene.fog;
  let swapped = null;
  if (mode === 'clay') scene.overrideMaterial = clayMat;
  else if (mode === 'normal') { scene.overrideMaterial = normalMat; scene.background = new THREE.Color('#8080ff'); scene.fog = null; }
  else if (mode === 'depth') { scene.overrideMaterial = depthMat; depthMat.uniforms.near.value = cam.near; scene.background = new THREE.Color('#000'); scene.fog = null; }
  else if (mode === 'read') swapped = readSwap(cam);
  else if (mode === 'seg') {
    swapped = []; scene.background = new THREE.Color('#000'); scene.fog = null;
    ground.material = ground.userData.segMat || (ground.userData.segMat = segMat('#404040'));
    for (const o of project.objects) { const r = rt.get(o.id); if (!r) continue; const m = segMat(r.segHex); r.g.traverse(n => { if (n.isMesh && !n.userData.helper) { swapped.push([n, n.material]); n.material = m; } }); }
  }
  if (target) { rend.setRenderTarget(target); rend.clear(); rend.render(scene, cam); rend.setRenderTarget(null); }
  else {
  if (vx || vy || w !== rend.domElement.width / rend.getPixelRatio()) { rend.setScissorTest(true); rend.setViewport(vx, vy, w, h); rend.setScissor(vx, vy, w, h); }
  rend.render(scene, cam);
  rend.setScissorTest(false);
  }
  scene.overrideMaterial = null; scene.background = bg; scene.fog = fog;
  if (swapped) { for (const [n, m] of swapped) n.material = m; ground.material = groundMatOrig; }
  if (mode === 'read') readRestore();
}
const groundMatOrig = ground.material;

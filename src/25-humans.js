/* ============================================================
   Corpo humano realista (base mesh)
   Modelos: Quaternius — Universal Base Characters (CC0 1.0, domínio público)
   O rig procedural continua calculando poses/animação (invisível);
   o esqueleto do modelo é "mirado" na direção de cada segmento do rig.
   ============================================================ */
const HUMAN_FILES = { m: 'models/Superhero_Male.glb', f: 'models/Superhero_Female.glb' };
// reserva para ambientes que não servem .glb (ex.: artifact): o mesmo modelo em base64 dentro de um .js
function loadHumanB64(k) { return new Promise((res, rej) => { window.__humanGLB = window.__humanGLB || {}; if (window.__humanGLB[k]) return res(window.__humanGLB[k]); const sc = document.createElement('script'); sc.src = 'models/human_' + k + '.js'; sc.onload = () => window.__humanGLB[k] ? res(window.__humanGLB[k]) : rej(new Error('base64 vazio')); sc.onerror = rej; document.head.appendChild(sc); }).then(b64 => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }); }
const _humanTpl = {}; let _skelUtils = null;
function loadHumanTpl(sex) {
  const k = sex === 'f' ? 'f' : 'm';
  if (_humanTpl[k]) return _humanTpl[k];
  return _humanTpl[k] = (async () => {
    if (!_skelUtils) _skelUtils = await import('three/addons/utils/SkeletonUtils.js');
    const L = await gltfLoader(); let g;
    try { g = await L.loadAsync(HUMAN_FILES[k]); } catch (e) { g = await L.parseAsync(await loadHumanB64(k), ''); }
    const root = g.scene; root.updateMatrixWorld(true);
    // altura real do modelo em repouso (topo do crânio) e altura da pelve
    let top = 0; root.traverse(n => { if (n.isSkinnedMesh) { n.computeBoundingBox(); const b = n.boundingBox.clone().applyMatrix4(n.matrixWorld); top = Math.max(top, b.max.y); } });
    const pelvis = root.getObjectByName('pelvis'), pY = pelvis.getWorldPosition(new THREE.Vector3()).y;
    return { root, top, pY };
  })().catch(e => { console.warn('base mesh', e); _humanTpl[k] = null; throw e; });
}
const HUMAN_CHAIN = [
  ['pelvis', 'rot', 'hips'], ['spine_01', 'rot', 'sp1'], ['spine_02', 'rot', 'sp2'], ['spine_03', 'rot', 'torso'], ['neck_01', 'rot', 'neck'], ['Head', 'rot', 'head'],
  ['upperarm_l', 'aim', 'arm', 0, 0], ['lowerarm_l', 'aim', 'arm', 0, 1], ['hand_l', 'aim', 'arm', 0, 2],
  ['upperarm_r', 'aim', 'arm', 1, 0], ['lowerarm_r', 'aim', 'arm', 1, 1], ['hand_r', 'aim', 'arm', 1, 2],
  ['thigh_l', 'aim', 'leg', 0, 0], ['calf_l', 'aim', 'leg', 0, 1], ['foot_l', 'aim', 'leg', 0, 2],
  ['thigh_r', 'aim', 'leg', 1, 0], ['calf_r', 'aim', 'leg', 1, 1], ['foot_r', 'aim', 'leg', 1, 2]
];
const CHILD_OF = { upperarm_l: 'lowerarm_l', lowerarm_l: 'hand_l', hand_l: 'middle_01_l', upperarm_r: 'lowerarm_r', lowerarm_r: 'hand_r', hand_r: 'middle_01_r', thigh_l: 'calf_l', calf_l: 'foot_l', foot_l: 'ball_l', thigh_r: 'calf_r', calf_r: 'foot_r', foot_r: 'ball_r' };
// troca o visual procedural pelo corpo realista quando o modelo terminar de carregar
function attachHuman(g, p) {
  const rig = g.userData.rig; if (!rig) return;
  g.traverse(n => { if (n.isMesh) { n.visible = false; n.userData.proxy = true; } }); // continua clicável (raycast), mas invisível
  rig.realPending = true;
  loadHumanTpl(p.sex === 'f' || (p.sex == null && p.build < 0.3) ? 'f' : 'm').then(tpl => {
    if (!g.userData.rig || g.userData.rig !== rig) return;
    const m = _skelUtils.clone(tpl.root), s = rig.H / tpl.top; m.scale.setScalar(s); m.name = 'basemesh';
    const neutral = p.skinMat === 'clay' ? (_humanTpl._clay || (_humanTpl._clay = new THREE.MeshStandardMaterial({ color: '#bdb8b0', roughness: .65 }))) : null;
    m.traverse(n => { if (n.isMesh) { if (neutral) n.material = neutral; n.castShadow = true; n.receiveShadow = true; n.frustumCulled = false; n.userData.human = true; } });
    g.add(m); m.updateMatrixWorld(true);
    const B = {}; m.traverse(n => { if (n.isBone) B[n.name] = n; });
    if (p.skinMat === 'blocks') buildBlockBody(g, m, B, rig.H);
    const restRel = {}, gInv = new THREE.Quaternion();
    g.getWorldQuaternion(gInv).invert();
    for (const [name] of HUMAN_CHAIN) { restRel[name] = gInv.clone().multiply(B[name].getWorldQuaternion(new THREE.Quaternion())); B[name].userData.restQ = B[name].quaternion.clone(); }
    // pose de repouso completa (para o mocap): rotação de cada osso relativa ao grupo e posições-chave no espaço do grupo
    const restAll = {}, gInvM = new THREE.Matrix4().copy(g.matrixWorld).invert(), loc = (b) => b.getWorldPosition(new THREE.Vector3()).applyMatrix4(gInvM);
    for (const k in B) { restAll[k] = gInv.clone().multiply(B[k].getWorldQuaternion(new THREE.Quaternion())); B[k].userData.restQ = B[k].quaternion.clone(); }
    rig.real = { m, B, restRel, restAll, kY: (tpl.pY * s) / rig.hipY, pelvisRest: B.pelvis.position.clone(), pelvisG: loc(B.pelvis), ankleG: loc(B.foot_l), legLen: loc(B.thigh_l).distanceTo(loc(B.calf_l)) + loc(B.calf_l).distanceTo(loc(B.foot_l)) };
    rig.realPending = false;
    if (rig._lastPose) retargetHuman(rig); if (typeof bump === 'function') bump();
  }).catch(() => { g.traverse(n => { if (n.userData.proxy) n.visible = true; }); rig.realPending = false; });
}
// ---- blocagem: caixas presas aos ossos do mesmo esqueleto (a animação é idêntica à do modelo realista) ----
// proporções em fração da altura (homem ~1,78 m); sem anatomia detalhada, de propósito (layout para IA / previs)
function buildBlockBody(g, m, B, H) {
  m.traverse(n => { if (n.isSkinnedMesh) n.visible = false; });
  const mat = _humanTpl._blk || (_humanTpl._blk = new THREE.MeshStandardMaterial({ color: '#c9c4bb', roughness: .7, flatShading: true }));
  const matD = _humanTpl._blkD || (_humanTpl._blkD = new THREE.MeshStandardMaterial({ color: '#9d978d', roughness: .7, flatShading: true }));
  const box = _humanTpl._box || (_humanTpl._box = new THREE.BoxGeometry(1, 1, 1));
  const k = H / 1.78, W = (n) => B[n] && B[n].getWorldPosition(new THREE.Vector3());
  const gq = g.getWorldQuaternion(new THREE.Quaternion()), FW = new THREE.Vector3(0, 0, 1).applyQuaternion(gq), UP = new THREE.Vector3(0, 1, 0).applyQuaternion(gq);
  // a: ponto inicial, b: final (mundo, em repouso), w: largura, d: profundidade (m), inset: encurta as pontas p/ juntas legíveis
  const add = (bn, a, b, w, d, o = {}) => {
    const bone = B[bn]; if (!bone || !a || !b) return;
    const dir = b.clone().sub(a), L = dir.length(); if (L < 1e-4) return; dir.normalize();
    const ins = o.inset ?? 0.06, a2 = a.clone().addScaledVector(dir, L * ins), b2 = b.clone().addScaledVector(dir, -L * ins);
    let z = (o.fw || FW).clone().addScaledVector(dir, -(o.fw || FW).dot(dir)); if (z.lengthSq() < 1e-6) z = UP.clone().addScaledVector(dir, -UP.dot(dir)); z.normalize();
    const x = new THREE.Vector3().crossVectors(dir, z);
    const M = new THREE.Matrix4().makeBasis(x, dir, z).setPosition(a2.clone().add(b2).multiplyScalar(0.5));
    const mesh = new THREE.Mesh(box, o.dark ? matD : mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.userData.human = true;
    M.multiply(new THREE.Matrix4().makeScale(w * k * (o.taper || 1), a2.distanceTo(b2) * (o.lenK || 1), d * k));
    bone.updateMatrixWorld(true); mesh.matrixAutoUpdate = true;
    new THREE.Matrix4().copy(bone.matrixWorld).invert().multiply(M).decompose(mesh.position, mesh.quaternion, mesh.scale);
    bone.add(mesh);
  };
  const up = (p, h) => p.clone().addScaledVector(UP, h * k), fwd = (p, h) => p.clone().addScaledVector(FW, h * k);
  // tronco: pelve, abdômen, peito (com largura de ombro), pescoço, cabeça
  const pel = W('pelvis'), s1 = W('spine_01'), s2 = W('spine_02'), s3 = W('spine_03'), nk = W('neck_01'), hd = W('Head');
  add('pelvis', up(pel, -0.09), s1 || up(pel, 0.08), 0.33, 0.21, { inset: 0 });
  add('spine_01', s1, s2, 0.29, 0.19, { inset: 0.02 });
  add('spine_02', s2, s3, 0.33, 0.21, { inset: 0.02 });
  add('spine_03', s3, nk, 0.40, 0.23, { inset: 0 });
  add('neck_01', nk, hd, 0.11, 0.11, { inset: 0 });
  add('Head', up(hd, -0.02), up(hd, 0.215), 0.165, 0.21, { inset: 0 });
  add('Head', fwd(up(hd, 0.06), 0.09), fwd(up(hd, 0.1), 0.115), 0.04, 0.03, { inset: 0, dark: true }); // nariz: mostra para onde ele olha
  for (const sd of ['l', 'r']) {
    add('clavicle_' + sd, W('clavicle_' + sd), W('upperarm_' + sd), 0.1, 0.12, { inset: 0.15 });
    add('upperarm_' + sd, W('upperarm_' + sd), W('lowerarm_' + sd), 0.1, 0.1, { inset: 0.03 });
    add('lowerarm_' + sd, W('lowerarm_' + sd), W('hand_' + sd), 0.085, 0.08, { inset: 0.04 });
    const mid = W('middle_01_' + sd), hnd = W('hand_' + sd); if (mid) add('hand_' + sd, hnd, mid.clone().add(mid.clone().sub(hnd).multiplyScalar(0.7)), 0.085, 0.03, { inset: 0, dark: true });
    add('thigh_' + sd, W('thigh_' + sd), W('calf_' + sd), 0.155, 0.16, { inset: 0.03 });
    add('calf_' + sd, W('calf_' + sd), W('foot_' + sd), 0.11, 0.115, { inset: 0.04 });
    const ft = W('foot_' + sd), ball = W('ball_' + sd);
    if (ft && ball) { const heel = ft.clone().addScaledVector(FW, -0.05 * k); heel.y = ft.y - 0.03 * k; const b2 = ball.clone(); b2.y = heel.y; add('foot_' + sd, heel, b2, 0.095, 0.075, { inset: 0, fw: UP, dark: true }); const toe = b2.clone().addScaledVector(FW, 0.06 * k); add('ball_' + sd, b2, toe, 0.09, 0.05, { inset: 0, fw: UP, dark: true }); }
  }
}
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _qg = new THREE.Quaternion();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3();
function relQ(node, out) { node.getWorldQuaternion(out); return out.premultiply(_qg); } // rotação relativa ao grupo da pessoa
function retargetHuman(rig) {
  rig._lastPose = true; const R = rig.real; if (!R) return;
  const g = R.m.parent; if (!g) return; g.updateMatrixWorld(true);
  g.getWorldQuaternion(_qg).invert();
  const gWorld = g.getWorldQuaternion(new THREE.Quaternion());
  const qHips = relQ(rig.hips, new THREE.Quaternion()), qTorso = relQ(rig.torso, new THREE.Quaternion()), qHead = relQ(rig.head, new THREE.Quaternion());
  const rotOf = { hips: qHips, sp1: qHips.clone().slerp(qTorso, 0.4), sp2: qHips.clone().slerp(qTorso, 0.75), torso: qTorso, neck: qTorso.clone().slerp(qHead, 0.5), head: qHead };
  // pontos do rig (mundo): ombro, cotovelo, punho, ponta da mão / quadril, joelho, tornozelo, ponta do pé
  const pts = (seg, i) => {
    if (seg === 'arm') { const A = rig.arms[i]; return [A.s.getWorldPosition(new THREE.Vector3()), A.e.getWorldPosition(new THREE.Vector3()), A.e.localToWorld(new THREE.Vector3(0, -rig.fArm, 0)), A.e.localToWorld(new THREE.Vector3(0, -rig.fArm - rig.hand, 0))]; }
    const L = rig.legs[i]; return [L.h.getWorldPosition(new THREE.Vector3()), L.k.getWorldPosition(new THREE.Vector3()), L.a.getWorldPosition(new THREE.Vector3()), L.a.localToWorld(new THREE.Vector3(0, -rig.ankH * 0.85, rig.footL * 0.7))];
  };
  const cache = {};
  // pelve: posição acompanha o quadril do rig (proporcional à altura do quadril do modelo)
  const hp = rig.hips.position; const pw = g.localToWorld(_v1.set(hp.x, hp.y * R.kY, hp.z));
  const pel = R.B.pelvis; pel.parent.updateMatrixWorld(true); pel.position.copy(pel.parent.worldToLocal(pw.clone()));
  for (const [name, kind, src, side, idx] of HUMAN_CHAIN) {
    const b = R.B[name]; if (!b) continue; b.parent.updateMatrixWorld(true);
    const parentW = b.parent.getWorldQuaternion(_q1);
    let want;
    if (kind === 'rot') want = _q2.copy(gWorld).multiply(rotOf[src]).multiply(R.restRel[name]);
    else {
      // rig: model side 0 = _l = +x (esquerda do personagem); rig.arms/legs: índice 0 = sx +1
      const key = src + side; const P = cache[key] || (cache[key] = pts(src, side));
      const dWant = _v2.subVectors(P[idx + 1], P[idx]).normalize();
      b.quaternion.copy(b.userData.restQ); b.updateMatrixWorld(true); const c = R.B[CHILD_OF[name]]; c.updateMatrixWorld(true);
      const dCur = _v3.subVectors(c.getWorldPosition(_v4), b.getWorldPosition(new THREE.Vector3())).normalize();
      want = _q2.setFromUnitVectors(dCur, dWant).multiply(b.getWorldQuaternion(_q3));
    }
    b.quaternion.copy(parentW.invert()).multiply(want); b.updateMatrixWorld(true);
  }
}

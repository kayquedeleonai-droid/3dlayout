/* ============================================================
   Corpo humano realista (base mesh)
   Modelos: Quaternius — Universal Base Characters (CC0 1.0, domínio público)
   O rig procedural continua calculando poses/animação (invisível);
   o esqueleto do modelo é "mirado" na direção de cada segmento do rig.
   ============================================================ */
const HUMAN_FILES = { m: 'models/Superhero_Male.glb', f: 'models/Superhero_Female.glb' };
const _humanTpl = {}; let _skelUtils = null;
function loadHumanTpl(sex) {
  const k = sex === 'f' ? 'f' : 'm';
  if (_humanTpl[k]) return _humanTpl[k];
  return _humanTpl[k] = (async () => {
    if (!_skelUtils) _skelUtils = await import('three/addons/utils/SkeletonUtils.js');
    const g = await (await gltfLoader()).loadAsync(HUMAN_FILES[k]);
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
    const restRel = {}, gInv = new THREE.Quaternion();
    g.getWorldQuaternion(gInv).invert();
    for (const [name] of HUMAN_CHAIN) { restRel[name] = gInv.clone().multiply(B[name].getWorldQuaternion(new THREE.Quaternion())); B[name].userData.restQ = B[name].quaternion.clone(); }
    rig.real = { m, B, restRel, kY: (tpl.pY * s) / rig.hipY, pelvisRest: B.pelvis.position.clone() };
    rig.realPending = false;
    if (rig._lastPose) retargetHuman(rig); if (typeof bump === 'function') bump();
  }).catch(() => { g.traverse(n => { if (n.userData.proxy) n.visible = true; }); rig.realPending = false; });
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

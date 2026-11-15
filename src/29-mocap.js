/* ============================================================
   MOCAP — atuação com animações de captura (Universal Animation Library,
   Quaternius, CC0) retargetadas para o humano realista.
   o.acts = [{ c: 'Sprint_Loop', f0, f1, rate: 'auto' | n, off, bl }]
     rate 'auto' → a passada acompanha a distância percorrida (pé não desliza)
   o.overlay = { kind: 'tightrope' | 'look', ... } → camadas por cima do clipe
   ============================================================ */
const UAL_URL = 'models/UAL_Standard.glb';
const UAL_LOOPS = new Set(['Crouch_Fwd_Loop', 'Crouch_Idle_Loop', 'Dance_Loop', 'Driving_Loop', 'Idle_Loop', 'Idle_Talking_Loop', 'Idle_Torch_Loop', 'Jog_Fwd_Loop', 'Jump_Loop', 'Pistol_Idle_Loop', 'Push_Loop', 'Sitting_Idle_Loop', 'Sitting_Talking_Loop', 'Spell_Simple_Idle_Loop', 'Sprint_Loop', 'Swim_Fwd_Loop', 'Swim_Idle_Loop', 'Walk_Formal_Loop', 'Walk_Loop', 'Sword_Idle']);
const UAL_PT = { Idle_Loop: 'Parado (respirando)', Idle_Talking_Loop: 'Parado conversando', Walk_Loop: 'Andar', Walk_Formal_Loop: 'Andar formal', Jog_Fwd_Loop: 'Trotar', Sprint_Loop: 'Correr (sprint)', Crouch_Fwd_Loop: 'Andar agachado', Crouch_Idle_Loop: 'Agachado parado', Jump_Start: 'Pulo — impulso', Jump_Loop: 'Pulo — no ar', Jump_Land: 'Pulo — aterrissagem', Roll: 'Rolamento', Death01: 'Queda / morte', Hit_Chest: 'Golpe no peito', Hit_Head: 'Golpe na cabeça', Punch_Jab: 'Soco jab', Punch_Cross: 'Soco cruzado', Punch_Enter: 'Guarda de luta', Push_Loop: 'Empurrar', PickUp_Table: 'Pegar objeto', Interact: 'Interagir', Fixing_Kneeling: 'Ajoelhado consertando', Sitting_Enter: 'Sentar', Sitting_Idle_Loop: 'Sentado', Sitting_Exit: 'Levantar', Driving_Loop: 'Dirigindo', Dance_Loop: 'Dançar', Pistol_Idle_Loop: 'Pistola — guarda', Pistol_Aim_Neutral: 'Pistola — mirar', Pistol_Shoot: 'Pistola — atirar', Pistol_Reload: 'Pistola — recarregar', Swim_Fwd_Loop: 'Nadar', Sword_Attack: 'Espada — golpe', Sword_Idle: 'Espada — guarda', Spell_Simple_Shoot: 'Lançar (magia)' };
// calibração medida no corpo-alvo (deslize do pé no apoio ≈ 0): o apoio do sprint dura 2–3 quadros e a estimativa automática fica curta
const UAL_CAL = { Sprint_Loop: 1.16 };
let _ual = null;
function loadUAL() {
  if (_ual) return _ual;
  return _ual = (async () => {
    if (!_skelUtils) _skelUtils = await import('three/addons/utils/SkeletonUtils.js');
    const L = await gltfLoader(); let g;
    try { g = await L.loadAsync(UAL_URL); } catch (e) { g = await L.parseAsync(await loadHumanB64('ual'), ''); }
    const root = g.scene; root.updateMatrixWorld(true);
    const clips = {}; for (const c of g.animations) clips[c.name] = c;
    const B = {}; root.traverse(n => { if (n.isBone) B[n.name] = n; });
    const height = B['DEF-head'].getWorldPosition(new THREE.Vector3()).y + 0.155; // topo do crânio ≈ 1,72 m
    // velocidade nativa de cada clipe de locomoção: velocidade do pé de apoio (perto do chão)
    const native = {}, mixer = new THREE.AnimationMixer(root), FT = [[B['DEF-footL'], B['DEF-toeL']], [B['DEF-footR'], B['DEF-toeR']]];
    for (const nm of ['Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Crouch_Fwd_Loop', 'Push_Loop']) {
      if (!clips[nm]) continue; mixer.stopAllAction(); const a = mixer.clipAction(clips[nm]); a.reset().play();
      const d = clips[nm].duration, n = 120, P = [];
      for (let i = 0; i <= n; i++) { mixer.setTime(d * i / n); root.updateMatrixWorld(true); P.push(FT.map(([fb, tb]) => [fb.getWorldPosition(new THREE.Vector3()), tb.getWorldPosition(new THREE.Vector3())])); }
      const minF = Math.min(...P.flatMap(q => q.map(x => x[0].y))), minT = Math.min(...P.flatMap(q => q.map(x => x[1].y))), vs = [];
      const onGround = (x) => x[0].y < minF + 0.02 || x[1].y < minT + 0.025;                       // apoio: calcanhar OU ponta do pé no chão
      // trecho de apoio mais longo de cada pé: velocidade = recuo do pé ÷ duração do apoio
      for (let k = 0; k < 2; k++) { let best = null, st = -1; for (let i = 0; i <= n + 1; i++) { const on = i <= n && onGround(P[i][k]); if (on && st < 0) st = i; if (!on && st >= 0) { if (!best || i - 1 - st > best[1] - best[0]) best = [st, i - 1]; st = -1; } }
        if (best && best[1] > best[0]) { const mid = (x) => P[x][k][0].clone().lerp(P[x][k][1], 0.5); vs.push((mid(best[0]).z - mid(best[1]).z) / ((best[1] - best[0]) * d / n)); } }
      native[nm] = vs.length ? Math.max(0.2, vs.reduce((a, b) => a + b, 0) / vs.length) : 1;
    }
    mixer.stopAllAction(); mixer.uncacheRoot(root);
    return { root, clips, native, height };
  })().catch(e => { console.warn('UAL', e); _ual = null; throw e; });
}
const _san = (s) => s.replace(/[.]/g, '');
const MOCAP_MAP = (() => {
  const m = [['pelvis', 'DEF-hips', 'rot'], ['spine_01', 'DEF-spine.001', 'rot'], ['spine_02', 'DEF-spine.002', 'rot'], ['spine_03', 'DEF-spine.003', 'rot'], ['neck_01', 'DEF-neck', 'rot'], ['Head', 'DEF-head', 'rot']];
  for (const [t, s] of [['l', 'L'], ['r', 'R']]) {
    m.push([`clavicle_${t}`, `DEF-shoulder.${s}`, 'rot'], [`upperarm_${t}`, `DEF-upper_arm.${s}`, 'aim', `DEF-forearm.${s}`, `lowerarm_${t}`], [`lowerarm_${t}`, `DEF-forearm.${s}`, 'aim', `DEF-hand.${s}`, `hand_${t}`], [`hand_${t}`, `DEF-hand.${s}`, 'rot']);
    for (const fg of ['index', 'middle', 'ring', 'pinky']) for (const i of [1, 2, 3]) m.push([`${fg}_0${i}_${t}`, `DEF-f_${fg}.0${i}.${s}`, 'rot']);
    for (const i of [1, 2, 3]) m.push([`thumb_0${i}_${t}`, `DEF-thumb.0${i}.${s}`, 'rot']);
  }
  for (const [t, s] of [['l', 'L'], ['r', 'R']]) m.push([`thigh_${t}`, `DEF-thigh.${s}`, 'aim', `DEF-shin.${s}`, `calf_${t}`], [`calf_${t}`, `DEF-shin.${s}`, 'aim', `DEF-foot.${s}`, `foot_${t}`], [`foot_${t}`, `DEF-foot.${s}`, 'rot'], [`ball_${t}`, `DEF-toe.${s}`, 'rot']);
  return m.map(([t, s, k, sc, tc]) => [t, _san(s), k, sc && _san(sc), tc]);
})();
// cria o esqueleto-fonte (invisível) dentro do grupo da pessoa
function mocapInit(rig) {
  if (rig.mocap || rig.mocapPending) return; rig.mocapPending = true;
  loadUAL().then(U => {
    const R = rig.real; if (!R || !R.m.parent) { rig.mocapPending = false; return; }
    const g = R.m.parent, src = _skelUtils.clone(U.root), s = rig.H / U.height;
    src.scale.setScalar(s); src.traverse(n => { if (n.isMesh) { n.visible = false; n.userData.helper = true; } }); src.name = 'mocap-src';
    g.add(src); g.updateMatrixWorld(true);
    const B = {}; src.traverse(n => { if (n.isBone) B[n.name] = n; });
    const gInv = g.getWorldQuaternion(new THREE.Quaternion()).invert(), gInvM = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const restS = {}; for (const k in B) restS[k] = gInv.clone().multiply(B[k].getWorldQuaternion(new THREE.Quaternion()));
    const locS = (n) => B[n].getWorldPosition(new THREE.Vector3()).applyMatrix4(gInvM);
    const hipsS = locS('DEF-hips'), ankS = locS('DEF-footL'), kneeS = locS('DEF-shinL'), thS = locS('DEF-thighL');
    const legS = thS.distanceTo(kneeS) + kneeS.distanceTo(ankS);
    rig.mocap = { U, src, B, restS, hipsS, ankS, k: R.legLen / legS, mixer: new THREE.AnimationMixer(src), act: {} };
    rig.mocapPending = false; if (typeof bump === 'function') bump();
  }).catch(() => { rig.mocapPending = false; });
}
// pesos e tempos dos clipes neste quadro
function mocapEval(rig, c) {
  const o = rig.obj, M = rig.mocap, U = M.U, fps = project.fps, f = c.t * fps, list = [];
  for (let ai = 0; ai < o.acts.length; ai++) {
    const a = o.acts[ai], clip = U.clips[a.c]; if (!clip) continue; const bl = a.bl ?? 6, h = bl / 2;
    if (f < a.f0 - h || f > a.f1 + h) continue;
    const ramp = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
    let w = 1; if (a.f0 > 0) w *= ramp((f - (a.f0 - h)) / Math.max(1e-6, bl)); if (a.f1 < project.duration) w *= ramp(((a.f1 + h) - f) / Math.max(1e-6, bl));
    if (w <= 1e-4) continue;
    let t;
    if (a.rate === 'auto') { const nat = (U.native[a.c] || 1) * (UAL_CAL[a.c] || 1) * (rig.H / U.height) * M.k,  /* passada do corpo-alvo = passada da fonte × razão das pernas */ d0 = animCtx(o, a.f0).dist; t = (a.off || 0) + (c.dist - d0) / nat; }
    else t = (a.off || 0) + (f - a.f0) / fps * (a.rate || 1);
    const d = clip.duration; t = UAL_LOOPS.has(a.c) && a.loop !== false ? ((t % d) + d) % d : clamp(t, 0, d - 1e-4);
    list.push({ clip, t, w, key: a.c + '#' + ai });
  }
  const sw = list.reduce((s, x) => s + x.w, 0); if (!sw) return false;
  for (const k in M.act) M.act[k].setEffectiveWeight(0);
  // uma ação por trecho (o mesmo clipe pode aparecer duas vezes, com tempos diferentes)
  for (const x of list) { let ac = M.act[x.key]; if (!ac) { const cl = x.clip.clone(); cl.name = x.key; ac = M.act[x.key] = M.mixer.clipAction(cl); } ac.enabled = true; ac.play(); ac.setEffectiveWeight(x.w / sw); ac.time = x.t; }
  M.mixer.update(0);
  return true;
}
const _mq1 = new THREE.Quaternion(), _mq2 = new THREE.Quaternion(), _mq3 = new THREE.Quaternion(), _mv1 = new THREE.Vector3(), _mv2 = new THREE.Vector3(), _mv3 = new THREE.Vector3(), _mv4 = new THREE.Vector3();
function boneSetWorldQ(b, qW) { b.parent.updateMatrixWorld(true); b.parent.getWorldQuaternion(_mq3); b.quaternion.copy(_mq3.invert().multiply(qW)); b.updateMatrixWorld(true); }
// gira o osso para que o filho aponte na direção dada (mundo)
function boneAim(b, child, dirW) { b.updateMatrixWorld(true); const p = b.getWorldPosition(_mv3), cp = child.getWorldPosition(_mv4); const cur = cp.sub(p).normalize(); const q = _mq1.setFromUnitVectors(cur, dirW.clone().normalize()); boneSetWorldQ(b, q.multiply(b.getWorldQuaternion(_mq2))); }
function mocapPose(rig, c) {
  if (!rig.mocap) { mocapInit(rig); return false; }
  if (!mocapEval(rig, c)) return false;
  const R = rig.real, M = rig.mocap, g = R.m.parent; g.updateMatrixWorld(true);
  const gQ = g.getWorldQuaternion(new THREE.Quaternion()), gInv = gQ.clone().invert(), SB = M.B;
  M.src.updateMatrixWorld(true);
  // pelve: posição da fonte, escalada pelo comprimento da perna (pé continua no chão)
  const gInvM = new THREE.Matrix4().copy(g.matrixWorld).invert(), hs = SB['DEF-hips'].getWorldPosition(new THREE.Vector3()).applyMatrix4(gInvM);
  const pg = new THREE.Vector3(R.pelvisG.x + (hs.x - M.hipsS.x) * M.k, R.ankleG.y + (hs.y - M.ankS.y) * M.k, R.pelvisG.z + (hs.z - M.hipsS.z) * M.k);
  const pel = R.B.pelvis; pel.parent.updateMatrixWorld(true); pel.position.copy(pel.parent.worldToLocal(g.localToWorld(pg)));
  for (const [t, s, kind, sc, tc] of MOCAP_MAP) {
    const tb = R.B[t], sb = SB[s]; if (!tb || !sb) continue;
    if (kind === 'rot' || !sc || !SB[sc] || !R.B[tc]) {
      const dq = _mq1.copy(gInv).multiply(sb.getWorldQuaternion(_mq2)).multiply(M.restS[s].clone().invert());
      boneSetWorldQ(tb, _mq2.copy(gQ).multiply(dq).multiply(R.restAll[t]));
    } else {
      tb.quaternion.copy(tb.userData.restQ); tb.updateMatrixWorld(true);
      const dir = SB[sc].getWorldPosition(_mv1).sub(sb.getWorldPosition(_mv2));
      boneAim(tb, R.B[tc], dir);
    }
  }
  rig._lastPose = true;
  return true;
}
// IK de 2 ossos (quadril→joelho→tornozelo) mantendo a orientação do pé
function legIK(R, side, targetW, poleW) {
  const A = R.B['thigh_' + side], Bn = R.B['calf_' + side], C = R.B['foot_' + side];
  A.updateMatrixWorld(true); const footQ = C.getWorldQuaternion(new THREE.Quaternion());
  const pa = A.getWorldPosition(new THREE.Vector3()), pb = Bn.getWorldPosition(new THREE.Vector3()), pc = C.getWorldPosition(new THREE.Vector3());
  const l1 = pa.distanceTo(pb), l2 = pb.distanceTo(pc), d = targetW.clone().sub(pa), dist = clamp(d.length(), 0.05, l1 + l2 - 1e-3), dir = d.normalize();
  const pole = (poleW ? poleW.clone() : pb.clone()).sub(pa); const perp = pole.sub(dir.clone().multiplyScalar(pole.dot(dir))); if (perp.lengthSq() < 1e-8) perp.set(0, 0, 1); perp.normalize();
  const ca = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1), knee = pa.clone().addScaledVector(dir, l1 * ca).addScaledVector(perp, l1 * Math.sqrt(1 - ca * ca));
  boneAim(A, Bn, knee.clone().sub(pa));
  const tgt = pa.clone().addScaledVector(dir, dist); boneAim(Bn, C, tgt.sub(Bn.getWorldPosition(new THREE.Vector3())));
  boneSetWorldQ(C, footQ);
}
// ---------- camadas de atuação ----------
const sampleArr = (arr, f) => { if (!arr || !arr.length) return 0; const i = clamp(Math.floor(f), 0, arr.length - 1), j = Math.min(arr.length - 1, i + 1), u = clamp(f - i, 0, 1); return arr[i] * (1 - u) + arr[j] * u; };
function applyOverlay(rig, c) {
  const o = rig.obj, ov = o.overlay, R = rig.real; if (!ov || !R) return;
  const g = R.m.parent; g.updateMatrixWorld(true);
  const f = c.t * project.fps, gQ = g.getWorldQuaternion(new THREE.Quaternion());
  const axis = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(gQ).normalize();
  const rotBone = (name, ax, ang) => { const b = R.B[name]; if (!b || !ang) return; const q = new THREE.Quaternion().setFromAxisAngle(ax, ang).multiply(b.getWorldQuaternion(new THREE.Quaternion())); boneSetWorldQ(b, q); };
  if (ov.kind === 'look' || ov.look) {
    const K = ov.look || ov.keys || []; let yaw = 0, pit = 0;
    for (let i = 0; i < K.length; i++) { const [fa, ya, pa] = K[i], nx = K[i + 1]; if (f >= fa && (!nx || f < nx[0])) { if (nx) { const u = (f - fa) / (nx[0] - fa), s = u * u * (3 - 2 * u); yaw = lerp(ya, nx[1], s); pit = lerp(pa || 0, nx[2] || 0, s); } else { yaw = ya; pit = pa || 0; } } }
    // giro distribuído como no corpo real: pouco na coluna, mais no pescoço e na cabeça; limite anatômico ~80°
    yaw = clamp(yaw, -80, 80); const up = axis(0, 1, 0);
    rotBone('spine_02', up, yaw * DEG * 0.08); rotBone('spine_03', up, yaw * DEG * 0.14); rotBone('neck_01', up, yaw * DEG * 0.33); rotBone('Head', up, yaw * DEG * 0.45);
    if (pit) rotBone('Head', axis(1, 0, 0), pit * DEG);
  }
  if (ov.kind === 'tightrope') {
    const lean = sampleArr(ov.lean, f), u = sampleArr(ov.u, f), crouch = sampleArr(ov.crouch, f), side = new THREE.Vector3(1, 0, 0);
    // tronco e quadril compensam a inclinação (o corpo gira sobre o pé; o quadril e o tronco vão para o lado oposto)
    const fwd = axis(0, 0, 1);
    // o objeto inteiro já está inclinado "lean" (pivô no pé); o quadril/tronco contra-inclinam e a cabeça volta quase a nivelar
    rotBone('spine_01', fwd, -u * 0.05 - lean * 0.35); rotBone('spine_02', fwd, -u * 0.08 - lean * 0.4); rotBone('spine_03', fwd, -u * 0.06 - lean * 0.35);
    rotBone('neck_01', fwd, lean * 0.15 + u * 0.03); rotBone('Head', fwd, lean * 0.15 + u * 0.03);  // cabeça nivelada (reflexo vestíbulo-ocular)
    rotBone('Head', axis(1, 0, 0), 0.32 + 0.1 * crouch);                               // olhar para a corda / ponto à frente
    // braços abertos: o que sobe e o que desce depende do torque de correção u; ruído de micro-ajuste nos antebraços
    for (const [sd, sx] of [['l', 1], ['r', -1]]) {
      const ub = R.B['upperarm_' + sd], lb = R.B['lowerarm_' + sd], hb = R.B['hand_' + sd]; if (!ub || !lb) continue;
      // braços perto da horizontal e um pouco à frente; a reação de equilíbrio sobe um e desce o outro
      const a = clamp(0.05 + sx * u * 0.55 + 0.32 * crouch + sampleArr(ov.n1, f + (sx > 0 ? 0 : 37)) * 0.05, -0.75, 1.0);
      const fw = 0.3 + 0.1 * crouch;
      boneAim(ub, lb, axis(sx * Math.cos(a), Math.sin(a), fw));
      const a2 = a + 0.07 + sampleArr(ov.n1, f * 1.7 + (sx > 0 ? 11 : 53)) * 0.04;   // cotovelo levemente flexionado
      boneAim(lb, hb, axis(sx * Math.cos(a2), Math.sin(a2), fw + 0.16));
      // punho reto e relaxado (segue o antebraço), mão levemente caída
      if (hb) { hb.quaternion.copy(hb.userData.restQ); hb.updateMatrixWorld(true); rotBone('hand_' + sd, axis(0, 0, 1), sx * -0.12); }
    }
    // pés na linha da corda (x = 0 no espaço da pessoa), levemente virados para fora
    for (const [sd, sx] of [['l', 1], ['r', -1]]) {
      const fb = R.B['foot_' + sd]; if (!fb) continue; const p = fb.getWorldPosition(new THREE.Vector3()), pl = g.worldToLocal(p.clone());
      pl.x = -sx * 0.006; pl.y = Math.max(pl.y, R.ankleG.y * 0.92);   // pé alinhado com a fita (meio do pé sobre a linha)
      const pole = g.localToWorld(new THREE.Vector3(sx * 0.12, 0.5, 0.8));
      legIK(R, sd, g.localToWorld(pl), pole);
      rotBone('foot_' + sd, axis(0, 1, 0), sx * 0.12);
    }
  }
}

// ---------- inspetor: seção "Atuação (mocap)" ----------
function actsSectionHTML(o) {
  const A = o.acts || [], opts = (cur) => Object.keys(UAL_PT).map(k => `<option value="${k}" ${k === cur ? 'selected' : ''}>${UAL_PT[k]}</option>`).join('');
  let h = `<div class="hint" style="margin-bottom:6px">Clipes de captura de movimento (Universal Animation Library, CC0) aplicados ao humano realista. Com <b>passada auto</b>, a passada acompanha a distância percorrida no trajeto e o pé não desliza.</div>`;
  if (A.length) h += `<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="color:var(--tx3)"><td>Ação</td><td>De</td><td>Até</td><td title="Passada acompanha o trajeto">Auto</td><td></td></tr>` + A.map((a, i) => `<tr><td><select data-act="${i}" data-k="c" style="max-width:128px">${opts(a.c)}</select></td><td><input type="number" data-act="${i}" data-k="f0" value="${a.f0}" style="width:52px"></td><td><input type="number" data-act="${i}" data-k="f1" value="${a.f1}" style="width:52px"></td><td><input type="checkbox" data-act="${i}" data-k="rate" ${a.rate === 'auto' ? 'checked' : ''}></td><td><button class="icon" data-actdel="${i}" title="Remover">✕</button></td></tr>`).join('') + `</table>`;
  h += `<div class="btnrow"><button data-actadd="1">＋ Ação no quadro atual</button>${A.length ? '<button data-actclear="1">Voltar à animação procedural</button>' : ''}</div>`;
  return h;
}
document.addEventListener('change', e => { const t = e.target; if (!t.dataset || t.dataset.act == null) return; const o = sel && getObj(sel); if (!o || !o.acts) return; const a = o.acts[+t.dataset.act]; if (!a) return; const k = t.dataset.k;
  if (k === 'c') { a.c = t.value; if (/_Loop$/.test(a.c) && /Walk|Jog|Sprint|Crouch_Fwd/.test(a.c)) a.rate = 'auto'; else if (a.rate === 'auto' && !/Walk|Jog|Sprint|Crouch_Fwd|Push|Swim_Fwd/.test(a.c)) delete a.rate; }
  else if (k === 'rate') { if (t.checked) a.rate = 'auto'; else delete a.rate; } else a[k] = Math.round(+t.value);
  o.acts.sort((x, y) => x.f0 - y.f0); commit(); bump(); renderInspector(); });
document.addEventListener('click', e => { const b = e.target.closest('[data-actadd],[data-actdel],[data-actclear]'); if (!b) return; const o = sel && getObj(sel); if (!o || o.type !== 'person') return;
  if (b.dataset.actadd) { o.acts = o.acts || []; const f0 = curFrame; o.acts.push({ c: 'Idle_Loop', f0, f1: Math.min(project.duration, f0 + 48), bl: 6 }); o.acts.sort((x, y) => x.f0 - y.f0); if (o.params.look !== 'real') { o.params.look = 'real'; buildRuntime(o); toast('Atuação por mocap usa o visual "Humano realista"'); } }
  else if (b.dataset.actdel) o.acts.splice(+b.dataset.actdel, 1);
  else if (b.dataset.actclear) { o.acts = []; delete o.overlay; }
  commit(); bump(); renderInspector(); });

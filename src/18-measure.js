/* ============================================================
   RÉGUA — mede distâncias reais no viewport (clique em 2 pontos)
   Encaixa na superfície dos objetos; sem objeto, mede no chão (y = 0).
   ============================================================ */
const measure = { on: false, a: null, b: null, grp: new THREE.Group(), lbl: null };
scene.add(measure.grp); sceneHelpers.push(measure.grp);
measure.lbl = document.createElement('div'); measure.lbl.style.cssText = 'position:absolute;pointer-events:none;background:#ffb02e;color:#111;font:600 12px Inter,sans-serif;padding:3px 7px;border-radius:6px;display:none;z-index:6;white-space:nowrap';
renderer.domElement.parentElement.appendChild(measure.lbl);
const _mRay = new THREE.Raycaster(), _mPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function measurePick(e) {
  const cam = currentViewCam(); if (!cam) return null; _mRay.setFromCamera(roadRayNDC(e), cam);
  const hit = _mRay.intersectObjects(world.children, true).find(h => h.object.isMesh && h.object.visible && !isHelperNode(h.object));
  if (hit) return hit.point.clone(); const p = new THREE.Vector3(); return _mRay.ray.intersectPlane(_mPlane, p) ? p : null;
}
function drawMeasure() {
  measure.grp.clear(); const { a, b } = measure; if (!a) return;
  const dot = (p) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffb02e', depthTest: false })); m.position.copy(p); m.renderOrder = 12; measure.grp.add(m); };
  dot(a); if (!b) return; dot(b);
  const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: '#ffb02e', depthTest: false })); ln.renderOrder = 12; measure.grp.add(ln);
  if (Math.abs(a.y - b.y) > 0.02) { const c = new THREE.Vector3(b.x, a.y, b.z); const l2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, c, b]), new THREE.LineDashedMaterial({ color: '#ffb02e', dashSize: 0.2, gapSize: 0.12, depthTest: false })); l2.computeLineDistances(); measure.grp.add(l2); }
}
function measureLabel() {
  const { a, b } = measure, el = measure.lbl; if (!measure.on || !a || !b) { el.style.display = 'none'; return; }
  const cam = currentViewCam(); if (!cam) return; const mid = a.clone().add(b).multiplyScalar(0.5).project(cam);
  if (mid.z > 1) { el.style.display = 'none'; return; }
  const rect = renderer.domElement.getBoundingClientRect(), vr = viewRect(), pr = renderer.domElement.parentElement.getBoundingClientRect();
  const d = a.distanceTo(b), dh = Math.hypot(b.x - a.x, b.z - a.z), dv = b.y - a.y;
  el.innerHTML = `${d.toFixed(2)} m` + (Math.abs(dv) > 0.02 ? ` <span style="font-weight:400">· horiz. ${dh.toFixed(2)} · vert. ${dv >= 0 ? '+' : ''}${dv.toFixed(2)}</span>` : '');
  el.style.display = 'block'; el.style.left = (rect.left - pr.left + vr.x + (mid.x + 1) / 2 * vr.w + 10) + 'px'; el.style.top = (rect.top - pr.top + (rect.height - vr.y - vr.h) + (1 - mid.y) / 2 * vr.h - 12) + 'px';
}
function setMeasure(on) { measure.on = on; $('#tMeasure').classList.toggle('on', on); if (!on) { measure.a = measure.b = null; drawMeasure(); } measureLabel(); if (on) toast('Régua: clique em dois pontos (Esc ou M para sair)'); }
renderer.domElement.addEventListener('pointerdown', e => {
  if (!measure.on || e.button !== 0) return; const p = measurePick(e); if (!p) return;
  e.stopImmediatePropagation(); e.preventDefault(); downPt = null;
  if (!measure.a || measure.b) { measure.a = p; measure.b = null; } else measure.b = p;
  drawMeasure(); measureLabel();
}, { capture: true });
function initMeasureUI() {
  $('#tMeasure').onclick = () => setMeasure(!measure.on);
  addEventListener('keydown', e => { if (e.target.matches && e.target.matches('input,textarea,select')) return; if (e.key === 'm' || e.key === 'M') setMeasure(!measure.on); if (e.key === 'Escape' && measure.on) setMeasure(false); });
  (function loop() { if (measure.on) measureLabel(); requestAnimationFrame(loop); })();
}

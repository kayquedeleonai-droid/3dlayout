/* ============================================================
   SIMULAÇÃO ÓPTICA: profundidade de campo física (sensor, focal, T-stop, foco),
   distorção, vinheta, aberração cromática e bokeh oval anamórfico.
   Aplicada na vista de câmera e na exportação (Playblast / Clay). Depth e
   Segmentação ficam limpos para a IA.
   ============================================================ */
const lensRT = new WeakMap();
const lensQuadScene = new THREE.Scene(), lensQuadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const lensMat = new THREE.ShaderMaterial({
  uniforms: { tColor: { value: null }, tDepth: { value: null }, near: { value: .1 }, far: { value: 1000 }, focus: { value: 5 }, cocK: { value: 0 }, maxR: { value: 20 }, k1: { value: 0 }, vig: { value: 0 }, ca: { value: 0 }, ov: { value: 1 }, res: { value: new THREE.Vector2(1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tColor; uniform sampler2D tDepth; uniform float near, far, focus, cocK, maxR, k1, vig, ca, ov; uniform vec2 res; varying vec2 vUv;
    float linZ(vec2 uv){ float d = texture2D(tDepth, uv).x; float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
    float coc(vec2 uv){ float z = linZ(uv); return min(maxR, cocK * abs(z - focus) / max(z, 0.001)); }
    vec2 distort(vec2 uv){ vec2 a = vec2(res.x / res.y, 1.0); vec2 p = (uv - 0.5) * a; float r2 = dot(p, p); float rc = dot(0.5 * a, 0.5 * a); p *= (1.0 + k1 * r2) / (1.0 + k1 * rc); return p / a + 0.5; }
    void main(){
      vec2 uv = distort(vUv);
      vec2 px = 1.0 / res;
      float c0 = coc(uv);
      vec3 acc = texture2D(tColor, uv).rgb; float wsum = 1.0;
      if (c0 > 0.6) {
        const int N = 48; float ga = 2.39996323;
        for (int i = 1; i < N; i++) {
          float fi = float(i); float r = sqrt(fi / float(N)) * c0; float a = fi * ga;
          vec2 o = vec2(cos(a) * r * ov, sin(a) * r) * px; vec2 su = uv + o;
          float cs = coc(su); float w = smoothstep(r - 1.5, r + 0.5, cs);
          acc += texture2D(tColor, su).rgb * w; wsum += w;
        }
      }
      vec3 col = acc / wsum;
      if (ca > 0.0) { vec2 d = (uv - 0.5) * ca * 0.0016; col.r = mix(col.r, texture2D(tColor, uv + d).r, 0.85); col.b = mix(col.b, texture2D(tColor, uv - d).b, 0.85); }
      vec2 q = (vUv - 0.5) * vec2(res.x / res.y, 1.0); float rr = length(q) / length(vec2(res.x / res.y, 1.0) * 0.5);
      col *= 1.0 - vig * smoothstep(0.35, 1.05, rr);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`,
  depthTest: false, depthWrite: false,
});
lensQuadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lensMat));
function getLensRT(rend, w, h) {
  let rt2 = lensRT.get(rend);
  if (!rt2 || rt2.width !== w || rt2.height !== h) {
    if (rt2) rt2.dispose();
    rt2 = new THREE.WebGLRenderTarget(w, h, { depthTexture: new THREE.DepthTexture(w, h), samples: 4, type: THREE.HalfFloatType });
    rt2.depthTexture.type = THREE.UnsignedIntType; lensRT.set(rend, rt2);
  }
  return rt2;
}
function lensActive(o, mode) { return o && o.type === 'camera' && (o.params || {}).lensFX !== false && (mode === 'shaded' || mode === 'clay') && project.settings.lensFXGlobal !== false; }
function setLensUniforms(o, cam, f, wpx, hpx) {
  const d = dofInfo(o, f), L = LENS_SETS[o.params.lensSet] || LENS_SETS.generic, S = d.S;
  const s = Math.max(d.focus, d.focal / 1000 * 1.05) * 1000, A = d.focal * d.focal / (d.N * (s - d.focal));
  // altura do sensor efetivamente usada no quadro entregue
  const effW = S.w * (S.sq || 1), sensA = effW / S.h, asp = wpx / hpx, usedH = asp >= sensA ? effW / asp : S.h;
  const U = lensMat.uniforms;
  U.near.value = cam.near; U.far.value = cam.far; U.focus.value = s / 1000; U.cocK.value = A / usedH * hpx * 0.5;
  U.maxR.value = hpx * 0.028;
  const wide = Math.max(0, (35 - d.focal) / 35);
  U.k1.value = (L.d || 0.04) * (0.35 + 2.2 * wide * wide);
  U.vig.value = (L.v || 0.2) * (0.6 + 0.6 * wide); U.ca.value = (L.ca || 0.2) * (0.5 + wide);
  U.ov.value = L.ov ? 0.55 : 1.0; U.res.value.set(wpx, hpx);
}
function renderLens(rend, camObj, cam, mode, w, h, vx = 0, vy = 0, f = curFrame) {
  const pr = rend.getPixelRatio(), wpx = Math.max(2, Math.round(w * pr)), hpx = Math.max(2, Math.round(h * pr));
  const rt2 = getLensRT(rend, wpx, hpx);
  const prevNear = cam.near, prevFar = cam.far; cam.near = 0.05; cam.far = 2000; cam.updateProjectionMatrix();
  renderScene(rend, cam, mode, w, h, 0, 0, rt2);
  setLensUniforms(camObj, cam, f, wpx, hpx);
  lensMat.uniforms.tColor.value = rt2.texture; lensMat.uniforms.tDepth.value = rt2.depthTexture;
  rend.setScissorTest(true); rend.setViewport(vx, vy, w, h); rend.setScissor(vx, vy, w, h);
  rend.render(lensQuadScene, lensQuadCam);
  rend.setScissorTest(false);
  cam.near = prevNear; cam.far = prevFar; cam.updateProjectionMatrix();
}
// render de câmera com ou sem óptica
function renderCamera(rend, camObj, cam, mode, w, h, vx = 0, vy = 0, f = curFrame) {
  if (lensActive(camObj, mode)) { try { renderLens(rend, camObj, cam, mode, w, h, vx, vy, f); return; } catch (e) { console.warn('lensFX', e); project.settings.lensFXGlobal = false; } }
  renderScene(rend, cam, mode, w, h, vx, vy);
}

/* ---------- barra de lente na vista de câmera ---------- */
let lensBarKey = '';
function initLensBar() {
  const bar = document.createElement('div'); bar.id = 'lensBar'; $('#vpwrap').appendChild(bar);
  bar.addEventListener('change', e => { const o = getObj(bar.dataset.cam), t = e.target; if (!o || !t.dataset.lp) return; applyCamParam(o, t.dataset.lp, t.type === 'checkbox' ? t.checked : t.value); if (sel === o.id) renderInspector(); t.blur(); });
  bar.addEventListener('input', e => { const o = getObj(bar.dataset.cam), t = e.target; if (!o) return; if (t.dataset.lp === 'zoom') { setChannel(o, 'focal', curFrame, +t.value); const lb = bar.querySelector('#lbFocal'); if (lb) lb.textContent = t.value + 'mm'; } });
  bar.addEventListener('click', e => { const o = getObj(bar.dataset.cam), b = e.target.closest('[data-lf]'); if (!o || !b) return; applyCamParam(o, 'focal', +b.dataset.lf); if (sel === o.id) renderInspector(); });
}
function updateLensBar(camView) {
  const bar = $('#lensBar'); if (!bar) return;
  const cid = camView ? viewCamId() : null, o = cid && getObj(cid);
  if (!o || o.type !== 'camera') { if (bar.style.display !== 'none') bar.style.display = 'none'; lensBarKey = ''; return; }
  const focal = Math.round(getVal(o, 'focal', curFrame) * 10) / 10, key = cid + JSON.stringify(o.params) + focal + project.aspect;
  if (bar.style.display === 'none') bar.style.display = '';
  if (key === lensBarKey) return; lensBarKey = key;
  const p = o.params, L = LENS_SETS[p.lensSet] || LENS_SETS.generic, d = dofInfo(o, curFrame);
  const bodyP = ASSETS.camera.params.find(x => x.k === 'body'), lensP = ASSETS.camera.params.find(x => x.k === 'lensSet');
  bar.dataset.cam = cid;
  bar.innerHTML = `<div class="lbrow"><span class="lbt">🎥</span><select data-lp="body" title="Corpo de câmera / sensor">${groupedOpts(bodyP.opts, p.body, bodyP.grp)}</select><select data-lp="lensSet" title="Kit de lentes">${groupedOpts(lensP.opts, p.lensSet, lensP.grp)}</select>
      <label class="lbt" title="Abertura">T<input type="number" data-lp="tstop" value="${p.tstop}" step="0.1" min="0.7" max="32"></label>
      <label class="lbt" title="Foco automático no alvo da mira"><input type="checkbox" data-lp="focusAuto" ${p.focusAuto !== false ? 'checked' : ''}>AF</label>
      ${p.focusAuto === false || !o.cons.aim ? `<label class="lbt">Foco<input type="number" data-lp="focus" value="${p.focus}" step="0.1" min="0.2" style="width:58px">m</label>` : ''}
      <label class="lbt" title="Profundidade de campo, distorção, vinheta"><input type="checkbox" data-lp="lensFX" ${p.lensFX !== false ? 'checked' : ''}>Óptica</label></div>
    <div class="lbrow">${L.zoom ? `<input type="range" data-lp="zoom" min="${L.zoom[0]}" max="${L.zoom[1]}" step="1" value="${clamp(focal, L.zoom[0], L.zoom[1])}" style="flex:1"><b id="lbFocal" class="mono">${focal}mm</b>` : L.f.map(fl => `<button class="chip ${Math.abs(focal - fl) < 0.5 ? 'on' : ''}" data-lf="${fl}">${fl}</button>`).join('')}
      <span class="lbinfo">${fmt(d.S.w, 1)}×${fmt(d.S.h, 1)}mm${d.S.sq > 1 ? ' · ' + d.S.sq + 'x' : ''} · nítido ${fmt(d.near, 2)}–${isFinite(d.far) ? fmt(d.far, 1) + 'm' : '∞'}</span></div>`;
}

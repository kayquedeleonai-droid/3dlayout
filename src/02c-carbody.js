/* ============================================================
   BASEMESH DE CARRO REAL — superfície "loft" contínua
   Seções transversais ao longo do comprimento (ombro, tumblehome, coroa do teto),
   perfil lateral e planta suaves (PCHIP), caixas de roda recortadas, vidros,
   colunas, linhas de porta, faróis/lanternas pintados na própria superfície,
   rodas com pneu (largura/perfil/aro da ficha) e aro de 5 raios.
   Templates em u: 0 = para-choque traseiro … 1 = dianteiro; alturas em fração de H.
   a_r / a_f = posição dos eixos no template (remapeados aos balanços reais).
   ============================================================ */
const CAR_TPL = {
  coupe: { // Porsche 911 (992)
    a_r: .272, a_f: .814,
    top: [[0, .46], [.008, .56], [.025, .63], [.06, .675], [.10, .695], [.16, .745], [.24, .835], [.32, .92], [.40, .975], [.48, 1], [.54, .99], [.58, .955], [.63, .80], [.68, .665], [.72, .64], [.80, .615], [.88, .585], [.95, .535], [.985, .47], [1, .39]],
    belt: [[0, .64], [.3, .655], [.5, .645], [.7, .63], [1, .60]],
    bot: [[0, .13], [.05, .04], [.15, 0], [.9, 0], [.96, .03], [1, .10]],
    wid: [[0, .93], [.12, .985], [.27, 1], [.45, .975], [.62, .935], [.81, .95], [1, .93]],
    tumble: .68, hoodK: .84, dip: .055, sq: .05, endR: [.80, .40], endF: [.60, .58],
    ws: [.58, .68], rw: [.17, .39], sw: [.30, .675], pillars: [.43], doors: [.415, .70],
    hl: { z: [.40, .12], t: [15.2, 19.6], p: 2, top: true }, tl: { z: [.035, .005], t: [16, 22], bar: true }, grille: [[.05, .34, .30, .30], [-.30, .30, .30, .30]], vents: true,
  },
  fastback: { // Tesla Model 3 / Porsche Taycan
    a_r: .207, a_f: .816,
    top: [[0, .48], [.008, .60], [.025, .665], [.06, .69], [.11, .70], [.15, .73], [.22, .83], [.30, .93], [.38, .985], [.46, 1], [.53, .99], [.57, .95], [.635, .80], [.695, .665], [.73, .64], [.82, .61], [.92, .565], [.975, .495], [1, .40]],
    belt: [[0, .66], [.3, .66], [.6, .645], [.8, .62], [1, .60]],
    bot: [[0, .12], [.04, .03], [.12, 0], [.9, 0], [.96, .03], [1, .09]],
    wid: [[0, .92], [.2, .99], [.4, 1], [.7, .985], [.85, .965], [1, .93]],
    tumble: .74, hoodK: .88, sq: .08, endR: [.80, .35], endF: [.68, .48],
    ws: [.57, .695], rw: [.155, .39], sw: [.20, .69], pillars: [.45], doors: [.235, .455, .70],
    hl: { z: [.34, .0], dy: [.10, .012] }, tl: { z: [.24, .0], dy: [.10, .02] }, grille: [[0, .2, .55, .22]],
  },
  sedan: { // Toyota Corolla
    a_r: .215, a_f: .798,
    top: [[0, .53], [.008, .64], [.03, .69], [.08, .705], [.13, .71], [.16, .725], [.20, .80], [.26, .92], [.32, .985], [.38, 1], [.52, .995], [.56, .96], [.62, .81], [.68, .675], [.72, .652], [.82, .622], [.92, .58], [.975, .515], [1, .43]],
    belt: [[0, .66], [.3, .665], [.6, .645], [.8, .63], [1, .61]],
    bot: [[0, .12], [.04, .03], [.12, 0], [.9, 0], [.96, .03], [1, .09]],
    wid: [[0, .93], [.2, .99], [.4, 1], [.7, .985], [.85, .97], [1, .93]],
    tumble: .76, hoodK: .88, sq: .15, endR: [.85, .30], endF: [.78, .36],
    ws: [.56, .68], rw: [.165, .32], sw: [.21, .675], pillars: [.45, .245], doors: [.235, .455, .70],
    hl: { z: [.36, .0], dy: [.13, .015] }, tl: { z: [.27, .0], dy: [.12, .02] }, grille: [[0, .55, .42, .16], [0, .2, .62, .22]],
  },
  hatch: { // VW Polo / BYD Dolphin
    a_r: .17, a_f: .80,
    top: [[0, .52], [.006, .64], [.015, .72], [.03, .86], [.05, .94], [.09, .985], [.16, 1], [.46, .995], [.54, .965], [.61, .82], [.685, .665], [.73, .645], [.83, .62], [.92, .582], [.975, .52], [1, .43]],
    belt: [[0, .62], [.3, .635], [.6, .625], [.8, .61], [1, .60]],
    bot: [[0, .12], [.04, .03], [.12, 0], [.9, 0], [.96, .03], [1, .09]],
    wid: [[0, .94], [.2, .99], [.4, 1], [.7, .985], [.85, .97], [1, .935]],
    tumble: .78, hoodK: .9, sq: .2, endR: [.9, .25], endF: [.76, .40],
    ws: [.54, .685], rw: [.02, .085], sw: [.10, .675], pillars: [.44, .14], doors: [.17, .445, .695],
    hl: { z: [.33, .0], dy: [.13, .02] }, tl: { z: [.14, .0], dy: [.24, .05] }, grille: [[0, .52, .40, .14], [0, .2, .6, .22]],
  },
  suv: { // Porsche Cayenne / Jeep Compass
    a_r: .20, a_f: .80,
    top: [[0, .48], [.006, .57], [.015, .64], [.03, .80], [.05, .92], [.085, .975], [.15, .995], [.48, 1], [.555, .985], [.60, .93], [.67, .75], [.715, .655], [.76, .638], [.86, .615], [.94, .578], [.985, .51], [1, .42]],
    belt: [[0, .60], [.3, .61], [.6, .60], [.8, .59], [1, .58]],
    bot: [[0, .12], [.04, .03], [.12, 0], [.9, 0], [.96, .03], [1, .10]],
    wid: [[0, .94], [.2, .99], [.4, 1], [.7, .99], [.85, .975], [1, .95]],
    tumble: .78, hoodK: .9, sq: .25, endR: [.88, .28], endF: [.82, .32],
    ws: [.60, .715], rw: [.025, .085], sw: [.08, .70], pillars: [.45, .17], doors: [.19, .455, .715],
    hl: { z: [.32, .0], dy: [.12, .02] }, tl: { z: [.16, .0], dy: [.20, .04] }, grille: [[0, .62, .55, .30], [0, .2, .65, .18]], cladding: true,
  },
  suvcoupe: { // Tesla Model Y (teto mais caído)
    a_r: .20, a_f: .80,
    top: [[0, .48], [.006, .58], [.02, .66], [.05, .72], [.09, .76], [.14, .84], [.22, .93], [.32, .985], [.45, 1], [.53, .99], [.58, .945], [.65, .78], [.705, .655], [.76, .632], [.86, .61], [.94, .57], [.985, .50], [1, .41]],
    belt: [[0, .63], [.3, .635], [.6, .615], [.8, .60], [1, .58]],
    bot: [[0, .12], [.04, .03], [.12, 0], [.9, 0], [.96, .03], [1, .09]],
    wid: [[0, .93], [.2, .99], [.4, 1], [.7, .985], [.85, .97], [1, .93]],
    tumble: .76, hoodK: .88, sq: .12, endR: [.84, .32], endF: [.70, .45],
    ws: [.58, .705], rw: [.085, .32], sw: [.15, .695], pillars: [.45], doors: [.20, .455, .71],
    hl: { z: [.32, .0], dy: [.09, .012] }, tl: { z: [.22, .0], dy: [.10, .02] }, grille: [[0, .2, .55, .2]], glassRoof: true,
  },
  boxy: { // Mercedes Classe G
    a_r: .18, a_f: .815,
    top: [[0, .52], [.002, .90], [.006, .985], [.02, 1], [.60, 1], [.615, .99], [.645, .78], [.67, .615], [.70, .60], [.95, .59], [.985, .57], [1, .50]],
    belt: [[0, .56], [1, .56]],
    bot: [[0, .08], [.03, 0], [.97, 0], [1, .06]],
    wid: [[0, .97], [.1, 1], [.9, 1], [1, .97]],
    tumble: .90, hoodK: .96, sq: .85, endR: [.97, .08], endF: [.95, .10],
    ws: [.615, .67], rw: [0, 0], sw: [.02, .66], pillars: [.39, .18], doors: [.20, .40, .665],
    hl: { round: true }, tl: { z: [.04, .0], t: [5.5, 10.5] }, grille: [[0, .62, .48, .42], [0, .16, .85, .22]], spare: true, flares: true,
  },
  pickup: { // Toyota Hilux / Fiat Strada
    a_r: .235, a_f: .815,
    top: [[0, .555], [.35, .56], [.357, .93], [.37, .985], [.40, 1], [.60, .995], [.64, .95], [.70, .74], [.735, .62], [.77, .608], [.88, .598], [.95, .585], [.985, .56], [1, .50]],
    belt: [[0, .56], [.35, .56], [.36, .59], [.7, .58], [1, .57]],
    bot: [[0, .06], [.03, 0], [.95, 0], [1, .08]],
    wid: [[0, .97], [.5, 1], [.8, .99], [1, .95]],
    tumble: .84, hoodK: .93, sq: .45, endR: [.96, .12], endF: [.90, .22],
    ws: [.64, .735], rw: [.357, .37], sw: [.375, .725], pillars: [.545], doors: [.372, .55, .735],
    bed: [.008, .35], hl: { z: [.30, .0], dy: [.14, .02] }, tl: { z: [.06, .0], dy: [.36, .03] }, grille: [[0, .6, .62, .5], [0, .18, .7, .18]], cladding: true,
  },
};
// ajustes finos por modelo (sobrepõem o template)
const CAR_SHAPE = {
  taycan: { tumble: .70, top: [[0, .47], [.008, .58], [.025, .655], [.06, .69], [.11, .70], [.15, .73], [.22, .83], [.30, .93], [.38, .985], [.46, 1], [.53, .985], [.57, .94], [.635, .78], [.70, .64], [.74, .615], [.82, .585], [.92, .545], [.975, .48], [1, .38]], hl: { z: [.34, .0], dy: [.10, .012] }, tl: { z: [.04, .005], t: [15.5, 22], bar: true }, glassRoof: false },
  model3: { glassRoof: true },
  cayenne: { tl: { z: [.04, .005], t: [15, 22], bar: true } },
  modely: { tpl: 'suvcoupe' },
  compass: { sq: .32, grille: [[0, .6, .42, .28], [0, .18, .62, .18]] },
  dolphin: { glassRoof: false, hl: { z: [.30, .0], dy: [.10, .015] }, tl: { z: [.05, .005], t: [14, 22], bar: true }, grille: [[0, .2, .55, .2]] },
  strada: { sq: .3 },
};
/* monotone cubic (Fritsch–Carlson) para curvas suaves sem overshoot */
function pchip(pts) {
  const n = pts.length, x = pts.map(p => p[0]), y = pts.map(p => p[1]);
  if (n === 1) return () => y[0];
  const h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h[i] = Math.max(1e-6, x[i + 1] - x[i]); d[i] = (y[i + 1] - y[i]) / h[i]; }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) { if (d[i - 1] * d[i] <= 0) m[i] = 0; else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); } }
  return (u) => {
    if (u <= x[0]) return y[0]; if (u >= x[n - 1]) return y[n - 1];
    let i = 0; while (i < n - 2 && u > x[i + 1]) i++;
    const t = (u - x[i]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * y[i + 1] + (t3 - t2) * h[i] * m[i + 1];
  };
}
const _carMats = {};
function carMats(color) {
  const k = color; if (_carMats[k]) return _carMats[k];
  const body = new THREE.MeshStandardMaterial({ color, roughness: .42, metalness: .15 });
  const glass = new THREE.MeshStandardMaterial({ color: '#1d252e', roughness: .12, metalness: .3 });
  const trim = new THREE.MeshStandardMaterial({ color: '#141518', roughness: .75, metalness: 0 });
  const hl = new THREE.MeshStandardMaterial({ color: '#e9eef2', roughness: .2, emissive: '#cfd8e0', emissiveIntensity: .35 });
  const tl = new THREE.MeshStandardMaterial({ color: '#8e1414', roughness: .3, emissive: '#5a0606', emissiveIntensity: .6, side: THREE.DoubleSide }); hl.side = THREE.DoubleSide;
  const clad = new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: .85 });
  return (_carMats[k] = [body, glass, trim, hl, tl, clad]);
}
const _wheelMats = { tire: new THREE.MeshStandardMaterial({ color: '#17181a', roughness: .92 }), rim: new THREE.MeshStandardMaterial({ color: '#b4b8be', roughness: .3, metalness: .6 }), well: new THREE.MeshStandardMaterial({ color: '#0e0f11', roughness: 1 }), disc: new THREE.MeshStandardMaterial({ color: '#55585d', roughness: .5, metalness: .4 }) };
function rimDiameter(spec, r) { const m = String(spec || '').match(/R\s*(\d{2})/i); return m ? +m[1] * 0.0254 : r * 1.25; }
function buildWheel(r, tw, rimD, outSign) {
  const w = new THREE.Group(), rimR = Math.min(rimD / 2, r - 0.045);
  // pneu com flanco arredondado (lathe em torno do eixo X)
  const pr = [], hw2 = tw / 2;
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + Math.PI * i / 10; pr.push(new THREE.Vector2(r - 0.022 + 0.022 * Math.cos(a) * 1.0, hw2 * Math.sin(a) * 0.98)); }
  const prof = [new THREE.Vector2(rimR, -hw2 * 0.86), new THREE.Vector2(rimR + (r - rimR) * 0.45, -hw2 * 1.0), ...pr, new THREE.Vector2(rimR + (r - rimR) * 0.45, hw2 * 1.0), new THREE.Vector2(rimR, hw2 * 0.86)];
  const tg = new THREE.LatheGeometry(prof, 36); tg.rotateZ(-Math.PI / 2); tg.computeVertexNormals();
  mesh(tg, _wheelMats.tire, 0, 0, 0, w);
  // fundo do aro (escuro) + disco de freio
  const back = new THREE.CylinderGeometry(rimR, rimR, tw * 0.3, 28); back.rotateZ(Math.PI / 2); mesh(back, _wheelMats.well, -outSign * tw * 0.2, 0, 0, w);
  const disc = new THREE.CylinderGeometry(rimR * 0.78, rimR * 0.78, 0.03, 24); disc.rotateZ(Math.PI / 2); mesh(disc, _wheelMats.disc, outSign * (hw2 * 0.25), 0, 0, w);
  // aro: anel externo + 5 raios + cubo
  const xo = outSign * (hw2 * 0.78);
  const lip = new THREE.TorusGeometry(rimR * 0.985, 0.012, 6, 36); lip.rotateY(Math.PI / 2); mesh(lip, _wheelMats.rim, xo, 0, 0, w);
  const hub = new THREE.CylinderGeometry(rimR * 0.2, rimR * 0.22, 0.05, 16); hub.rotateZ(Math.PI / 2); mesh(hub, _wheelMats.rim, xo - outSign * 0.015, 0, 0, w);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5, sp = new THREE.Group(); sp.rotation.x = a; sp.position.x = xo - outSign * 0.02; w.add(sp);
    const g2 = new THREE.BoxGeometry(0.035, rimR * 0.82, rimR * 0.2); g2.translate(0, rimR * 0.55, 0);
    const pa = g2.attributes.position; for (let j = 0; j < pa.count; j++) { const yy = pa.getY(j); pa.setZ(j, pa.getZ(j) * (0.55 + 0.6 * (yy / rimR))); } g2.computeVertexNormals();
    mesh(g2, _wheelMats.rim, 0, 0, 0, sp);
  }
  return w;
}
function buildCarLoft(p) {
  const key = p.model, sh = CAR_SHAPE[key] || {};
  const useSh = CAR_DB[key] && CAR_DB[key].body === p.body ? sh : {}, T = Object.assign({}, CAR_TPL[useSh.tpl || p.body] || CAR_TPL.sedan, useSh);
  const g = new THREE.Group(), rig = { wheels: [], steer: [] };
  const L = p.length, W = p.width, H = p.height, wb = Math.min(p.wheelbase, L * 0.9), fo = clamp(p.foverhang || (L - wb) * 0.45, 0.2, L - wb - 0.2);
  const zfa = L / 2 - fo, zra = zfa - wb, rf = tireRadius(p.tireF, 0.33), rr = tireRadius(p.tireR, rf), clr = Math.max(0.05, p.clearance);
  const twF = tireWidth(p.tireF, .225), twR = tireWidth(p.tireR, twF);
  const uz = (u) => u <= T.a_r ? lerp(-L / 2, zra, u / T.a_r) : u <= T.a_f ? lerp(zra, zfa, (u - T.a_r) / (T.a_f - T.a_r)) : lerp(zfa, L / 2, (u - T.a_f) / (1 - T.a_f));
  const zu = (z) => z <= zra ? T.a_r * (z + L / 2) / (zra + L / 2) : z <= zfa ? T.a_r + (T.a_f - T.a_r) * (z - zra) / (zfa - zra) : T.a_f + (1 - T.a_f) * (z - zfa) / (L / 2 - zfa);
  const fTop = pchip(T.top), fBelt = pchip(T.belt), fBot = pchip(T.bot), fWid = pchip(T.wid);
  const archs = [[zfa, rf + 0.045, rf], [zra, rr + 0.045, rr]];
  const archTop = (z) => { let y = -1; for (const [zc, R, r] of archs) { const dz = z - zc; if (Math.abs(dz) < R) y = Math.max(y, r + Math.sqrt(R * R - dz * dz) - 0.01); } return y; };
  const smooth = (a, b, x) => { const t = clamp((x - a) / Math.max(1e-6, b - a), 0, 1); return t * t * (3 - 2 * t); };
  const cabK = (u) => { const [r0, r1] = T.rw, [w0, w1] = T.ws; const up = r1 > r0 ? smooth(r0, r1, u) : 1; return up * (1 - smooth(w0, w1, u)); };
  const endK = (z) => { const dF = L / 2 - z, dR = z + L / 2; let k = 1; const [efR, RR] = T.endR, [efF, RF] = T.endF; if (dF < RF) k *= efF + (1 - efF) * Math.sqrt(1 - Math.pow(1 - dF / RF, 2)); if (dR < RR) k *= efR + (1 - efR) * Math.sqrt(1 - Math.pow(1 - dR / RR, 2)); return k; };
  // ---------- estações ao longo do comprimento ----------
  const zs = []; const N = 120; for (let i = 0; i <= N; i++) zs.push(-L / 2 + L * i / N);
  const addZ = (z) => { if (z > -L / 2 && z < L / 2) zs.push(z); };
  for (const [zc, R] of archs) { for (let i = -10; i <= 10; i++) addZ(zc + R * 0.999 * i / 10); addZ(zc - R - 0.003); addZ(zc + R + 0.003); }
  for (const u of [...T.ws, ...T.rw, ...T.sw, ...(T.bed || [])]) addZ(uz(u));
  for (const u of T.pillars) { addZ(uz(u) - 0.035); addZ(uz(u) + 0.035); }
  for (const u of T.doors) { addZ(uz(u) - 0.004); addZ(uz(u) + 0.004); }
  for (let i = 1; i < 8; i++) { addZ(L / 2 - 0.03 * i); addZ(-L / 2 + 0.03 * i); }
  zs.sort((a, b) => a - b); const Z = zs.filter((z, i) => i === 0 || z - zs[i - 1] > 0.0008);
  // ---------- seção transversal ----------
  const SEG = [3, 2, 3, 3, 3, 3, 2, 3]; // under | side x3 | dlo x2 | top x2
  const ZONE = ['under', 'side', 'side', 'side', 'dlo', 'dlo', 'top', 'top'];
  const halfPts = SEG.reduce((a, b) => a + b, 0) + 1;
  const sq = T.sq;
  const section = (z) => {
    const u = zu(z), ytop = fTop(u) * H, hw = W / 2 * fWid(u) * endK(z);
    let yb = clr + 0.02 + fBot(u) * H; const ybBase = yb; const at = archTop(z); const inArch = at > yb; if (inArch) yb = at;
    const yl = Math.max(yb + 0.04, Math.min(fBelt(u) * H, ytop - 0.05));
    const ys = Math.max(yb + 0.02, ybBase + (yl - ybBase) * 0.74);
    const hwt = hw * lerp(T.hoodK, T.tumble, cabK(u));
    const crown = Math.min(0.06, (ytop - yl) * 0.3) * (1 - sq * 0.75);
    const yr = ytop - crown;
    const dip = (T.dip ?? 0.012) * (1 - cabK(u)) * smooth(0, 0.12, u) * (T.bed && u < T.bed[1] + 0.01 ? 0 : 1);
    const C = [[0, yb], [hw * (0.84 + 0.12 * sq), yb], [hw * (0.95 + 0.045 * sq), yb + (ys - yb) * 0.25], [hw, ys], [hw * (0.985 + 0.012 * sq), yl],
      [hw * (0.985 + 0.012 * sq) - (hw * (0.985 + 0.012 * sq) - hwt) * 0.5, lerp(yl, yr, 0.52)], [hwt, yr], [hwt * (0.55 + 0.4 * sq), ytop - crown * 0.12 - dip * 0.75], [0, ytop - dip]];
    const Cb2 = [hw * (0.95 + 0.045 * sq), ybBase + (ys - ybBase) * 0.25];
    const out = [];
    for (let s = 0; s < SEG.length; s++) {
      const p0 = s === 3 ? Cb2 : C[Math.max(0, s - 1)], p1 = C[s], p2 = C[s + 1], p3 = C[Math.min(C.length - 1, s + 2)];
      for (let k = 0; k < SEG[s]; k++) { const t = k / SEG[s], t2 = t * t, t3 = t2 * t; const cr = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); out.push([s === 0 || sq > 0.7 ? lerp(p1[0], p2[0], t) : cr(p0[0], p1[0], p2[0], p3[0]), s === 0 ? lerp(p1[1], p2[1], t) : cr(p0[1], p1[1], p2[1], p3[1]), s]); }
    }
    out.push([0, ytop - dip, SEG.length - 1]);
    return { pts: out, u, hw, ytop, yl, yb, inArch };
  };
  const secs = Z.map(section);
  // ---------- malha ----------
  const pos = [], idxByMat = [[], [], [], [], [], []], ringN = halfPts * 2 - 1;
  const ringOf = (s) => { const r = []; for (let i = 0; i < halfPts; i++) r.push([-s.pts[i][0], s.pts[i][1], s.pts[i][2], i]); for (let i = halfPts - 2; i >= 0; i--) r.push([s.pts[i][0], s.pts[i][1], s.pts[i][2], i]); return r; };
  secs.forEach((s, si) => { for (const v of ringOf(s)) pos.push(v[0], v[1], Z[si]); });
  const zw = T.ws.map(uz), zr = T.rw.map(uz), zsw = T.sw.map(uz), zp = T.pillars.map(uz), zd = T.doors.map(uz), zbed = T.bed ? T.bed.map(uz) : null;
  const inR = (z, a) => z > Math.min(a[0], a[1]) && z < Math.max(a[0], a[1]);
  const matFor = (zc, s, i, xc, yc, sec) => {
    const zone = ZONE[s], ax = Math.abs(xc) / Math.max(0.01, sec.hw);
    if (zone === 'under') return 2;
    if (zone === 'side') {
      for (const d of zd) if (Math.abs(zc - d) < 0.004 && yc > sec.yb + 0.05) return 2;
      return 0;
    }
    if (zone === 'dlo') {
      if (inR(zc, zsw) && !zp.some(p2 => Math.abs(zc - p2) < 0.035)) return 1;
      for (const d of zd) if (Math.abs(zc - d) < 0.004) return 2;
      return 0;
    }
    // top
    const edge = i === halfPts - 1 - SEG[7] - SEG[6]; // primeira faixa do teto = coluna A/C
    if (zbed && inR(zc, zbed)) return ax < 0.9 ? 2 : 0;
    if (!edge && (inR(zc, zw) || (zr[1] > zr[0] && inR(zc, zr)) || (T.glassRoof && zc > zr[1] && zc < zw[0]))) return 1;
    return 0;
  };
  for (let si = 0; si < secs.length - 1; si++) {
    const a0 = si * ringN, b0 = (si + 1) * ringN, zc = (Z[si] + Z[si + 1]) / 2;
    const sA = secs[si], sB = secs[si + 1], sec = Math.abs(zc - Z[si]) < Math.abs(zc - Z[si + 1]) ? sA : sB;
    const rA = ringOf(sA);
    for (let j = 0; j < ringN - 1; j++) {
      const s = rA[j][3] < rA[j + 1][3] ? rA[j][2] : rA[j + 1][2], i = Math.min(rA[j][3], rA[j + 1][3]);
      const xc = (pos[(a0 + j) * 3] + pos[(a0 + j + 1) * 3]) / 2, yc = (pos[(a0 + j) * 3 + 1] + pos[(a0 + j + 1) * 3 + 1] + pos[(b0 + j) * 3 + 1] + pos[(b0 + j + 1) * 3 + 1]) / 4;
      const m = matFor(zc, s, i, xc, yc, sA.hw < sB.hw ? sA : sB);
      idxByMat[m].push(a0 + j, b0 + j + 1, a0 + j + 1, a0 + j, b0 + j, b0 + j + 1);
    }
  }
  // tampas (para-choques) em leque
  for (const [si, flip] of [[0, true], [secs.length - 1, false]]) {
    const r0 = si * ringN, s = secs[si], cy = (s.yb + s.ytop) / 2, ci = pos.length / 3; pos.push(0, cy, Z[si]);
    for (let j = 0; j < ringN - 1; j++) flip ? idxByMat[0].push(ci, r0 + j, r0 + j + 1) : idxByMat[0].push(ci, r0 + j + 1, r0 + j);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const all = []; let off = 0; idxByMat.forEach((arr, mi) => { if (arr.length) { geo.addGroup(off, arr.length, mi); all.push(...arr); off += arr.length; } });
  geo.setIndex(all); geo.computeVertexNormals();
  const mats = carMats(p.color), bodyM = mesh(geo, mats, 0, 0, 0, g);
  const dark = mats[2];
  // ---------- faróis / lanternas: lentes que seguem a superfície ----------
  const ringPt = (sec, t) => { const i = clamp(Math.floor(t), 0, halfPts - 2), f = clamp(t - i, 0, 1), a = sec.pts[i], b = sec.pts[i + 1]; return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]; };
  const tForY = (sec, y) => { for (let i = 1; i < 19; i++) { const a = sec.pts[i][1], b = sec.pts[i + 1][1]; if ((y - a) * (y - b) <= 0 && Math.abs(b - a) > 1e-6) return i + (y - a) / (b - a); } return y > sec.pts[18][1] ? 18.5 : 2; };
  const xAtY = (sec, y) => { for (let i = 1; i < 17; i++) { const a = sec.pts[i], b = sec.pts[i + 1]; if ((y - a[1]) * (y - b[1]) <= 0 && Math.abs(b[1] - a[1]) > 1e-6) return lerp(a[0], b[0], (y - a[1]) / (b[1] - a[1])); } return sec.hw; };
  const lens = (spec, front, mat) => {
    if (!spec || !spec.z) return;
    const NS = 16, NV = 8, pw = spec.p || 4;
    const zA = front ? L / 2 - spec.z[0] : -L / 2 + spec.z[0], zB = front ? L / 2 - spec.z[1] : -L / 2 + spec.z[1];
    for (const sx of [-1, 1]) {
      const P = [], I = [];
      for (let a = 0; a <= NS; a++) {
        const sN = a / NS, z = clamp(lerp(zA, zB, sN), -L / 2 + 0.002, L / 2 - 0.002), sc = section(z);
        const sR = spec.z[1] === 0 ? sN / 2 : sN, k = spec.bar ? 1 : Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * sR - 1), pw)), 1 / pw);
        let ta = spec.t ? spec.t[0] : 0, tb = spec.t ? spec.t[1] : 0;
        if (spec.dy) { ta = tForY(sc, sc.ytop - spec.dy[0]); tb = tForY(sc, sc.ytop - spec.dy[1]); }
        const tcc = (ta + tb) / 2, hh = (tb - ta) / 2;
        const t0 = spec.bar ? ta : tcc - hh * Math.max(0.15, k), t1 = spec.bar ? tb : tcc + hh * Math.max(0.15, k);
        for (let v = 0; v <= NV; v++) { const [x, y] = ringPt(sc, lerp(t0, t1, v / NV)); P.push(sx * x, y, z); }
      }
      let NR = NS;
      if (spec.z[1] === 0 && !spec.bar && !spec.top) { // continua a lente no plano do para-choque
        const last = P.slice(-(NV + 1) * 3), cw = W * (spec.cw || 0.15), zc = front ? L / 2 + 0.003 : -L / 2 - 0.003;
        for (const f2 of [0.5, 1]) { for (let v = 0; v <= NV; v++) { const x = last[v * 3], y = last[v * 3 + 1]; P.push(Math.sign(x) * Math.max(0.05, Math.abs(x) - cw * f2), y, zc); } NR++; }
      }
      for (let a = 0; a < NR; a++) for (let v = 0; v < NV; v++) { const i0 = a * (NV + 1) + v, i1 = i0 + NV + 1; const q = [i0, i1, i0 + 1, i1, i1 + 1, i0 + 1]; if ((sx > 0) !== front) { q.reverse(); } I.push(...q); }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); lg.setIndex(I); lg.computeVertexNormals();
      const pa = lg.attributes.position, na = lg.attributes.normal, ym = H * 0.45, fz = front ? 1 : -1;
      for (let i = 0; i < pa.count; i++) { let nx = na.getX(i), ny = na.getY(i), nz = na.getZ(i); if (nx * pa.getX(i) + ny * (pa.getY(i) - ym) + nz * fz * 0.6 < 0) { nx = -nx; ny = -ny; nz = -nz; } pa.setXYZ(i, pa.getX(i) + nx * 0.005, pa.getY(i) + ny * 0.005, pa.getZ(i) + nz * 0.005); }
      const lm = mesh(lg, mat, 0, 0, 0, g); lm.castShadow = false;
    }
  };
  // parte da lente no plano do para-choque (tampa), para ler de frente / de trás
  const capLens = (spec, front, mat) => {
    if (!spec || !spec.z || spec.top) return;
    const sE = front ? secs[secs.length - 1] : secs[0];
    let y0, y1; if (spec.dy) { y0 = sE.ytop - spec.dy[0]; y1 = sE.ytop - spec.dy[1]; } else { y0 = ringPt(sE, spec.t[0])[1]; y1 = ringPt(sE, Math.min(spec.t[1], 17))[1]; if (y0 > y1) [y0, y1] = [y1, y0]; }
    y1 = Math.min(y1, sE.ytop - 0.01); y0 = Math.max(y0, sE.yb + 0.04); if (y1 - y0 < 0.02) return;
    const xo = Math.min(xAtY(sE, y0), xAtY(sE, y1)) - 0.012, xi = spec.bar ? -xo : Math.max(0.05, xo - Math.max(0.12, W * (spec.cw || 0.16)));
    const rad = Math.min(0.025, (y1 - y0) / 2.2);
    const mk = (a, b) => { const s2 = new THREE.Shape(); s2.moveTo(a + rad, y0); s2.lineTo(b - rad, y0); s2.quadraticCurveTo(b, y0, b, y0 + rad); s2.lineTo(b, y1 - rad); s2.quadraticCurveTo(b, y1, b - rad, y1); s2.lineTo(a + rad, y1); s2.quadraticCurveTo(a, y1, a, y1 - rad); s2.lineTo(a, y0 + rad); s2.quadraticCurveTo(a, y0, a + rad, y0); const sg = new THREE.ShapeGeometry(s2, 4); if (!front) sg.rotateY(Math.PI); return mesh(sg, mat, 0, 0, front ? L / 2 + 0.004 : -L / 2 - 0.004, g); };
    if (spec.bar) mk(-xo, xo); else { mk(xi, xo); mk(-xo, -xi); }
  };
  lens(T.hl, true, mats[3]); lens(T.tl, false, mats[4]); if (T.tl && T.tl.bar) capLens(T.tl, false, mats[4]);
  if (T.hl && T.hl.round) { const sF2 = secs[secs.length - 1]; for (const sx of [-1, 1]) { const rl = cyl(0.095, 0.095, 0.06, mats[3], sx * W * 0.36, sF2.ytop - 0.11, L / 2 - 0.0, g, 24); rl.rotation.x = Math.PI / 2; const ring2 = new THREE.TorusGeometry(0.1, 0.018, 8, 24); mesh(ring2, mats[0], sx * W * 0.36, sF2.ytop - 0.11, L / 2 + 0.02, g); } }
  // ---------- detalhes ----------
  const secAt = (z) => section(clamp(z, -L / 2 + 0.001, L / 2 - 0.001));
  // grade / tomadas de ar na frente (no plano do para-choque)
  const sF = secs[secs.length - 1], hF = sF.ytop - sF.yb;
  for (const [cx, cyF, wF, hFr] of (T.grille || [])) {
    const gw = Math.min(sF.hw * 2 * 0.95, W * wF), gh = Math.max(0.03, hF * hFr);
    const gy = sF.yb + hF * cyF; const b = box(gw, gh, 0.03, dark, cx * W, gy, L / 2 - 0.004, g);
    if (Math.abs(cx) > 0) b.scale.x = 0.9;
  }
  // difusor / parte baixa traseira
  const sR = secs[0]; box(sR.hw * 1.6, Math.max(0.03, (sR.ytop - sR.yb) * 0.22), 0.03, dark, 0, sR.yb + (sR.ytop - sR.yb) * 0.12, -L / 2 + 0.004, g);
  // retrovisores na base da coluna A
  { const zm = zw[1] - 0.16, sm = secAt(zm), ym = sm.yl + 0.075; for (const sx of [-1, 1]) { const mg = new THREE.Group(); mg.position.set(sx * (sm.hw * 0.97 + 0.09), ym, zm); g.add(mg); const cap = sph(0.06, mats[0], 0, 0, 0, mg, 18, 12); cap.scale.set(1.3, 0.9, 1.5); const gl = box(0.13, 0.08, 0.01, dark, sx * 0.005, 0, -0.085, mg); box(0.09, 0.02, 0.04, dark, -sx * 0.07, -0.025, 0, mg); } }
  // maçanetas
  for (const d of zd.slice(0, -1)) { const zH = d + 0.17, sH = secAt(zH), yH = sH.yl - 0.06; for (const sx of [-1, 1]) box(0.012, 0.025, 0.15, dark, sx * (sH.hw * 0.99 + 0.004), yH, zH, g); }
  // picape: caçamba com bordas
  if (zbed) { const z0 = zbed[0], z1 = zbed[1], sb = secAt((z0 + z1) / 2); box(sb.hw * 2 * 0.86, 0.012, z1 - z0 - 0.04, mats[5], 0, sb.ytop - 0.18, (z0 + z1) / 2, g); }
  // estepe traseiro (Classe G)
  if (T.spare) { const sp = buildWheel(rr, Math.max(twR, .24), rimDiameter(p.tireR, rr), -1); sp.rotation.y = Math.PI / 2; sp.position.set(0, H * 0.5, -L / 2 - Math.max(twR, .24) / 2 + 0.02); g.add(sp); const cov = cyl(rr * 0.98, rr * 0.98, Math.max(twR, .24) * 0.9, mats[0], 0, H * 0.5, -L / 2 - Math.max(twR, .24) / 2, g, 28); cov.rotation.x = Math.PI / 2; }
  // molduras / lábios dos para-lamas (seguem o recorte da caixa de roda)
  for (const [zc, R, r] of archs) {
    const th = T.cladding || T.flares ? 0.035 : 0.012, mat = T.cladding || T.flares ? mats[5] : mats[0];
    for (const sx of [-1, 1]) {
      const pts = []; for (let i = 0; i <= 28; i++) { const a = Math.PI * i / 28, z = zc + (R + th * 0.6) * Math.cos(a), y = r + (R + th * 0.6) * Math.sin(a) - 0.01; const sc = section(clamp(z, -L / 2 + 0.01, L / 2 - 0.01)); pts.push(new THREE.Vector3(sx * (xAtY(sc, Math.max(y, sc.yb + 0.01)) - th * 0.15), y, z)); }
      const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, th, 6, false); const tm = mesh(tg, mat, 0, 0, 0, g); tm.scale.set(1, 1, 1);
    }
  }
  if (T.cladding) for (const sx of [-1, 1]) { const z0 = zra + archs[1][1] + 0.03, z1 = zfa - archs[0][1] - 0.03, sc = section((z0 + z1) / 2); box(0.03, 0.09, z1 - z0, mats[5], sx * (xAtY(sc, sc.yb + 0.05)), sc.yb + 0.045, (z0 + z1) / 2, g); }
  // caixas de roda (fundo escuro entre as rodas)
  for (const [zc, R, r] of archs) { const inner = Math.min(p.trackF, p.trackR) - Math.max(twF, twR) - 0.06; box(Math.max(0.2, inner), Math.max(0.05, r + R - clr - 0.04), R * 2, _wheelMats.well, 0, clr + 0.02 + (r + R - clr - 0.04) / 2, zc, g); }
  // ---------- rodas ----------
  rig.wb = wb; rig.r = (rf + rr) / 2;
  for (const [z, r, tw, track, front2, spec] of [[zfa, rf, twF, p.trackF, true, p.tireF], [zra, rr, twR, p.trackR, false, p.tireR]]) {
    for (const sx of [-1, 1]) {
      const piv = grp(sx * Math.min(track, W - tw) / 2, r, z, g); const w = buildWheel(r, tw, rimDiameter(spec, r), sx); piv.add(w);
      rig.wheels.push(w); if (front2) rig.steer.push(piv);
    }
  }
  g.userData.rig = rig; return g;
}

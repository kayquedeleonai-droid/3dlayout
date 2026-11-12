/* ============================================================
   TERRENO QUE RESPEITA A ESTRADA
   O relevo é cortado/aterrado ao longo de cada estrada (corte e aterro com talude),
   então o carro nunca "entra" na montanha. Objetos ficam apoiados no terreno.
   ============================================================ */
function baseMatrixOf(o) {
  const b = o.base, m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(b.px || 0, b.py || 0, b.pz || 0), new THREE.Quaternion().setFromEuler(new THREE.Euler((b.rx || 0) * DEG, (b.ry || 0) * DEG, (b.rz || 0) * DEG, 'YXZ')), new THREE.Vector3(b.sx || 1, b.sy || 1, b.sz || 1));
  return m;
}
function roadSamplesWorld(o) { // amostras da estrada no mundo a partir da pose base (estradas não costumam ser animadas)
  const r = rt.get(o.id); if (!r || !r.g.userData.road) return null; const R = r.g.userData.road, m = baseMatrixOf(o), v = new THREE.Vector3(), sc = o.base.sx || 1;
  return { S: R.S.map(s => { v.set(s.x, s.y, s.z).applyMatrix4(m); return { x: v.x, y: v.y, z: v.z }; }), E: R.E * sc, bridge: o.params.bridge };
}
function conformTerrain(t) {
  const r = rt.get(t.id); if (!r) return; const me = r.g.children.find(c => c.isMesh); if (!me) return;
  const geo = me.geometry, pos = geo.attributes.position;
  if (!geo.userData.natY) { const a = new Float32Array(pos.count); for (let i = 0; i < pos.count; i++) a[i] = pos.getY(i); geo.userData.natY = a; }
  const nat = geo.userData.natY, roads = project.objects.filter(o => o.type === 'roadpath' && !o.hidden).map(roadSamplesWorld).filter(Boolean);
  for (let i = 0; i < pos.count; i++) pos.setY(i, nat[i]);
  if (roads.length) {
    const CELL = 24, grid = new Map(), key = (x, z) => Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
    roads.forEach((R, ri) => R.S.forEach(s => { const k = key(s.x, s.z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push([s, R]); }));
    const m = baseMatrixOf(t), inv = m.clone().invert(), v = new THREE.Vector3(), ty = t.base.py || 0, sy = t.base.sy || 1;
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), nat[i], pos.getZ(i)).applyMatrix4(m);
      const cx = Math.floor(v.x / CELL), cz = Math.floor(v.z / CELL); let best = null, bd = 1e9;
      for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const L = grid.get((cx + a) + ',' + (cz + b)); if (!L) continue; for (const [s, R] of L) { const d = (s.x - v.x) ** 2 + (s.z - v.z) ** 2; if (d < bd) { bd = d; best = [s, R]; } } }
      if (!best) continue; const d = Math.sqrt(bd), [s, R] = best, natW = v.y, flatW = R.E + 2.5;
      if (R.bridge && s.y > 3 && natW < s.y - 3) continue; // vale sob o viaduto: mantém o relevo
      const band = Math.max(6, Math.abs(natW - s.y) * 1.6), road = s.y - 0.3;
      let y; if (d <= flatW) y = road; else if (d < flatW + band) { const u = (d - flatW) / band, k = u * u * (3 - 2 * u); y = lerp(road, natW, k); } else continue;
      if (R.bridge && s.y > 3) y = Math.min(y, natW);
      pos.setY(i, (y - ty) / sy);
    }
  }
  pos.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingBox(); geo.computeBoundingSphere();
  // com terreno, os taludes "de papel" da estrada não são necessários
  for (const o of project.objects) if (o.type === 'roadpath') { const rr = rt.get(o.id); if (rr) rr.g.traverse(n => { if (n.userData.skirt) n.visible = !project.objects.some(x => x.type === 'terrain' && !x.hidden); }); }
  _terrainCache = null;
}
function conformAllTerrain() { for (const o of project.objects) if (o.type === 'terrain') conformTerrain(o); }
/* altura do terreno em (x, z) do mundo — bilinear na malha */
let _terrainCache = null;
function terrainAt(x, z) {
  if (!_terrainCache) { _terrainCache = []; for (const o of project.objects) { if (o.type !== 'terrain' || o.hidden) continue; const r = rt.get(o.id), me = r && r.g.children.find(c => c.isMesh); if (!me) continue; const p = Object.assign(defaultParams('terrain'), o.params); _terrainCache.push({ o, pos: me.geometry.attributes.position, size: p.size, seg: me.geometry.parameters ? me.geometry.parameters.widthSegments : 140, inv: baseMatrixOf(o).invert(), m: baseMatrixOf(o) }); } }
  let best = null; const v = new THREE.Vector3();
  for (const T of _terrainCache) {
    v.set(x, 0, z).applyMatrix4(T.inv); const h = T.size / 2, c = T.size / T.seg; if (Math.abs(v.x) > h || Math.abs(v.z) > h) continue;
    const fx = (v.x + h) / c, fz = (v.z + h) / c, ix = Math.min(T.seg - 1, Math.floor(fx)), iz = Math.min(T.seg - 1, Math.floor(fz)), u = fx - ix, w = fz - iz, n = T.seg + 1, Y = (a, b) => T.pos.getY(b * n + a);
    const yl = lerp(lerp(Y(ix, iz), Y(ix + 1, iz), u), lerp(Y(ix, iz + 1), Y(ix + 1, iz + 1), u), w);
    const out = new THREE.Vector3(v.x, yl, v.z).applyMatrix4(T.m).y; best = best == null ? out : Math.max(best, out);
  }
  return best;
}

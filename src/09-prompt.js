/* ============================================================
   CRIAR CENA POR PROMPT (texto → layout animado)
   Claude (capability sample) interpreta o texto e devolve um "shot spec" JSON;
   o app converte o spec em objetos + keyframes de forma determinística.
   Sem IA disponível, um interpretador local de palavras-chave gera o spec.
   ============================================================ */
let sampleNS = null;
(async () => { try { if (window.claude && window.claude.use) sampleNS = await window.claude.use('sample'); } catch (e) { } })();

function assetCatalog() {
  return Object.values(ASSETS).filter(a => a.type !== 'camera').map(a => {
    const ps = a.params.filter(p => p.k !== 'seed').map(p => p.k + ':' + (p.t === 'select' ? p.opts.map(o => o[0]).join('|') : p.t) + '=' + p.def).join(', ');
    return `${a.type} (${a.label}, ${a.cat})${ps ? ' — ' + ps : ''}`;
  }).join('\n');
}
function specPrompt(text, presets, current) {
  return `You are a previs layout artist. Convert the shot description into a JSON "shot spec" for a 3D layout tool that renders simple playblast previs. Use REAL-WORLD scale and plausible speeds.

WORLD CONVENTIONS
- Units: meters, seconds, degrees. Y is up, ground is y=0.
- heading: 0 = facing +Z, 90 = facing +X, 180 = facing -Z.
- Roads ("road", "street" assets) are centered on x=0 and run along the Z axis; lane width 3.5 m. On a 2-lane road the lane centers are x=-1.75 and x=+1.75. Sidewalks of "street" go from |x|=3.5 to |x|=7.5; buildings start beyond |x|≈8.
- WINDING / HILLY ROADS: use type "roadpath" with params.pts = [[x, elevation, z], ...] control points (smooth spline; 30-60 m apart; grades under ~12%), params.lanes, params.closed for loops. To drive a vehicle (or walk a person) along it give that object "follow_road": {"road": "<road id>", "speed_kmh": 80, "lane": 1, "start_s": 0, "reverse": false} instead of a path (lane = 0-based index from the left; on a 2-lane road 1 = right lane) — height and pitch on ramps are automatic. Cameras can then "follow" or "aim" that object.
- Vehicles move on the road along +Z (or -Z), y=0. Birds/drones/helicopters fly at y>0 and need y in their path.
- Typical speeds: walk 1.4 m/s, run 4 m/s, car city 40-60 km/h, highway 100-130 km/h, sports car hero shot 80-160 km/h, horse gallop 12 m/s, bird 8-15 m/s. Distance = speed × time.
- Camera lenses (full frame, 36mm sensor): ultra-wide 12-16mm, wide 20-28mm, normal 35-50mm, tele 85-200mm. With ultra-wide lenses put the camera CLOSE to the subject (2-4 m) to keep it big in frame; with tele put it far.
- Cameras look at their "aim" object (aim_height = point above the object's origin, e.g. 0.6 for a car body, 1.5 for a person face).
- "follow": camera path coordinates become OFFSETS (world axes, not rotated) from the followed object's position — this is how to make travelling / tracking / chase / car-to-car shots. For a travelling (side tracking) shot of a car driving along +Z in the left lane, follow the car with an offset like {x:+3..+6, y:0.8..1.5, z:0} and aim at it.
- Scenery is built from assets (road, street, forest, terrain, trees, buildings, etc.). Make the scenery long enough for the whole move (road length ≥ distance travelled + 100 m). Use "forest" with stripe:true or "terrain" with flat area to frame a road in nature.
- Keep it to what the shot needs: 1 hero, a few supporting elements, scenery, and cameras (first camera = main shot).
- REAL CAR MODELS: when a specific real car is named use type "realcar" (precise blocking from spec sheets). params.model = one of ${Object.keys(CAR_DB).map(k => k + ' (' + CAR_DB[k].name + ')').join(', ')}. For any other real model set params.model "custom", params.modelName, params.body (coupe|fastback|sedan|hatch|suv|boxy|pickup) and the manufacturer dimensions you know in meters: length, width (without mirrors), height, wheelbase, foverhang (front overhang), trackF, trackR, clearance, tireF, tireR (e.g. "245/40R19").
- STRUCTURE: "continuous" = one main camera, "shots": []. "multishot" = several cameras with different angles/lenses/rigs telling the action, and "shots" = ordered cuts covering the whole duration without gaps: [{"camera":"cam1","start_s":0,"end_s":2.5},{"camera":"cam2","start_s":2.5,"end_s":5}, ...]. Make each camera's path/motion meaningful during ITS shot.
- CINEMA CAMERAS: each camera may set "camera_body" (one of ${Object.keys(CAMERA_BODIES).filter(k => k !== 'custom').join(', ')}) and "lens_set" (one of ${Object.keys(LENS_SETS).join(', ')}); anamorphic sets (masterana, cookeana) suit 2.39:1. Optional "tstop". Use the lens_set's real focal lengths for lens_mm.
- RIGS: a camera can be rigidly mounted to a vehicle with "mount":"<vehicle id>"; then its path coordinates are LOCAL to the vehicle (+x = vehicle's left side, +z = vehicle front, y up) and it turns with the vehicle (hood/door/bumper car-mount shots). Use "aim" too to keep looking at the vehicle.
- LOOK: "look": {"background": "studio" | "grey" | "light" | "dark" | "outdoor"} (playblast backdrop).
- ACTING: people and animals can get animation clips: "clips":[{"kind":"wave","start_s":1,"end_s":3}]. People kinds: ${Object.keys(PERSON_ACTIONS).join(', ')}. Animal kinds: ${Object.keys(QUAD_ACTIONS).join(', ')}. Walking/running comes from the path (legs animate automatically from speed).

AVAILABLE ASSET TYPES (type (label, category) — param:type=default)
${assetCatalog()}

OUTPUT: reply with ONLY one JSON object, no prose, shaped like:
{
 "name": "short shot name",
 "duration_s": 8,
 "aspect": "16:9",                       // one of 16:9, 9:16, 1:1, 4:5, 2.39:1, 4:3
 "objects": [
  {"id":"hero","type":"sportcar","name":"Porsche 911","params":{"color":"#b8bcc2"},
   "x":-1.75,"y":0,"z":-60,"heading":0,"scale":1,
   "path":[{"t":0,"x":-1.75,"z":-60},{"t":8,"x":-1.75,"z":160}],   // optional; add "y" for flyers; more points for curves
   "ease":"none"}                         // none | in | out | inout (speed ramp over the whole path)
 ],
 "cameras": [
  {"id":"cam1","name":"Travelling 14mm","lens_mm":14,"lens_end_mm":14,
   "follow":"hero","aim":"hero","aim_height":0.6,
   "path":[{"t":0,"x":3.2,"y":0.9,"z":1.0},{"t":8,"x":3.0,"y":0.9,"z":-0.5}],
   "shake":0.2, "ease":"inout",
   "look_at":null, "heading":0, "pitch":0, "roll":0}   // look_at [x,y,z] or heading/pitch only when there is no aim
 ],
 "shots": [],
 "look": {"background":"grey"},
 "notes": "one short sentence in Portuguese explaining the layout choices"
}
Rules: ids unique; "aim"/"follow" must reference object ids; params only from the list for that type; colors as hex; omit path for static objects; every path point has t in seconds within [0, duration_s].

${presets ? 'DIRECTOR PRESETS (follow them unless the description says otherwise):\n' + presets + '\n\n' : ''}${current ? 'CURRENT SCENE SPEC (edit THIS scene: apply only the requested changes, keep every other object, id, value and path identical, and return the COMPLETE updated spec):\n' + JSON.stringify(current) + '\n\nREQUESTED CHANGES:\n' : 'SHOT DESCRIPTION:\n'}${text}`;
}

/* ---------- interpretador local (sem IA) ---------- */
function localSpec(text) {
  const t = ' ' + text.toLowerCase() + ' ';
  const has = (re) => re.test(t);
  const num = (re) => { const m = t.match(re); return m ? parseFloat(m[1].replace(',', '.')) : null; };
  const HERO = [[/porsche|ferrari|lamborghini|mclaren|supercar|sports? ?car|esportivo|carro esporte/, 'sportcar'], [/\bsuv\b|jeep|range rover|4x4|pickup|picape/, 'suv'], [/truck|caminh[aã]o|lorry/, 'truck'], [/\bbus\b|[oô]nibus/, 'bus'], [/motorcycle|motorbike|\bmoto\b|\bbike\b/, 'moto'], [/helicop/, 'heli'], [/\bdrone\b(?! shot)/, 'drone'], [/flock|bando|revoada/, 'flock'], [/eagle|[aá]guia/, 'eagle'], [/gull|gaivota/, 'gull'], [/\bbird|p[aá]ssaro/, 'bird'], [/horse|cavalo/, 'horse'], [/\bdog\b|cachorro|c[aã]o\b/, 'dog'], [/\bcat\b|gato/, 'cat'], [/deer|cervo|veado/, 'deer'], [/\bcow\b|vaca/, 'cow'], [/crowd|multid[aã]o/, 'crowd'], [/woman|mulher|girl|garota/, 'woman'], [/child|crian[cç]a|\bkid\b/, 'child'], [/\bman\b|person|homem|pessoa|runner|corredor|athlete|atleta/, 'person'], [/\bcar\b|carro|sedan|sed[aã]/, 'car']];
  let heroType = 'sportcar'; for (const [re, ty] of HERO) if (has(re)) { heroType = ty; break; }
  const BRANDS = [[/taycan/, 'taycan'], [/cayenne/, 'cayenne'], [/porsche|\b911\b/, 'p911'], [/model ?y\b/, 'modely'], [/model ?3|tesla/, 'model3'], [/corolla/, 'corolla'], [/hilux/, 'hilux'], [/compass|jeep/, 'compass'], [/\bpolo\b/, 'polo'], [/strada/, 'strada'], [/dolphin|byd/, 'dolphin'], [/classe g|g-?class|g ?wagon|g ?63|g ?500/, 'gclass']];
  let realModel = null; for (const [re, k] of BRANDS) if (has(re)) { realModel = k; break; }
  if (realModel) heroType = 'realcar';
  const COLORS = [[/silver|prata|prateado/, '#b8bcc2'], [/\bred\b|vermelh/, '#b3261e'], [/black|pret/, '#1d1e21'], [/white|branc/, '#e9e8e4'], [/blue|azul/, '#2456a6'], [/yellow|amarel/, '#e0b424'], [/green|verde/, '#2f6b3f'], [/orange|laranja/, '#e0702a'], [/gr[ae]y|cinza/, '#7d8288']];
  let color = null; for (const [re, c] of COLORS) if (has(re)) { color = c; break; }
  let lens = num(/(\d{2,3})\s*mm/);
  if (!lens) lens = has(/ultra[\s-]?wide|ultra[\s-]?angular|fish[\s-]?eye|olho de peixe/) ? 14 : has(/\bwide|grande[\s-]?angular|angular/) ? 24 : has(/tele|long lens|lente longa/) ? 100 : 35;
  const dur = num(/(\d+(?:[.,]\d+)?)\s*(?:s|sec|secs|seconds|seg|segundos)\b/) || 8;
  const d = ASSETS[heroType], kind = d.pilot;
  const isSport = heroType === 'sportcar' || (realModel && ['p911', 'taycan'].includes(realModel));
  let kmh = num(/(\d+)\s*(?:km\/?h|kph)/); const mph = num(/(\d+)\s*mph/); if (mph) kmh = mph * 1.609;
  const fast = has(/fast|speed|racing|r[aá]pid|alta velocidade|running|correndo|gallop|galop/), slow = has(/slow|lent|calm|devagar|cruising|passeando/);
  let v; // m/s
  if (kmh) v = kmh / 3.6;
  else if (kind === 'car') v = (isSport ? (slow ? 50 : fast ? 130 : 100) : heroType === 'truck' || heroType === 'bus' ? 60 : (slow ? 35 : fast ? 100 : 60)) / 3.6;
  else if (kind === 'bird') v = heroType === 'heli' ? 30 : heroType === 'drone' ? 10 : 10;
  else if (heroType === 'horse') v = has(/gallop|galop|running|correndo|fast|r[aá]pid/) ? 12 : 1.8;
  else if (heroType === 'dog' || heroType === 'cat' || heroType === 'deer') v = has(/running|correndo|fast|r[aá]pid/) ? 7 : 1.3;
  else v = has(/running|correndo|jog|run\b|corre/) ? 4 : 1.4;
  if (has(/parad|static subject|standing|em p[eé]|still\b/)) v = 0;
  const dist = v * dur;
  // cenário
  const city = has(/city|cidade|urban|street|rua|downtown|avenida/), forest = has(/forest|floresta|woods|mata|bosque/), mountain = has(/mountain|montanha|hills|colina|serra|canyon/), desert = has(/desert|deserto/), road = kind === 'car' || has(/road|estrada|highway|rodovia|asphalt/);
  const objects = [], roadLen = Math.max(200, Math.ceil((dist + 160) / 50) * 50), zc = 0;
  if (city) objects.push({ id: 'street', type: 'street', params: { length: roadLen, lanes: 2 } });
  else if (road) objects.push({ id: 'road', type: 'road', params: { length: roadLen, lanes: 2 } });
  if (!forest && !city && !mountain && !desert && road) objects.push({ id: 'trees', type: 'forest', params: { radius: Math.max(80, roadLen / 2), count: 70, stripe: true, clear: 0, mix: 'mix' } });
  if (forest) objects.push({ id: 'forest', type: 'forest', params: { radius: Math.max(80, roadLen / 2), count: 220, stripe: road, clear: road ? 0 : 12, mix: 'mix' } });
  if (mountain || desert) objects.push({ id: 'terrain', type: 'terrain', y: -0.06, params: { size: Math.max(600, roadLen * 1.6), height: mountain ? 60 : 12, flat: 40, feature: mountain ? 160 : 90, color: desert ? '#c9a46b' : '#6f7d5a' } });
  const lane = road || city ? -1.75 : 0;
  const flyY = kind === 'bird' ? (heroType === 'heli' ? 30 : heroType === 'drone' ? 8 : 10) : 0;
  const hero = { id: 'hero', type: heroType, name: realModel ? CAR_DB[realModel].name : d.label, params: Object.assign(realModel ? { model: realModel } : {}, color ? { color } : {}), x: lane, y: flyY, z: -dist / 2, heading: 0 };
  if (heroType === 'person' || heroType === 'woman' || heroType === 'child') { if (color) hero.params = { shirt: color }; if (road || city) { hero.x = city ? -5 : -4.5; } }
  if (v > 0) { hero.path = [{ t: 0, x: hero.x, y: flyY, z: -dist / 2 }, { t: dur, x: hero.x, y: flyY, z: dist / 2 }]; hero.ease = has(/accelerat|acelera|arranca|starts? from/) ? 'in' : has(/brak|freia|para no final|stops?\b/) ? 'out' : 'none'; }
  objects.push(hero);
  // câmera
  const hH = { car: 0.6, walker: heroType === 'horse' ? 1.4 : (heroType === 'dog' || heroType === 'cat') ? 0.35 : 1.4, bird: 0, prop: 0.5 }[kind] ?? 0.8;
  const near = Math.max(2.2, lens * 0.2) * (kind === 'car' ? 1 : (heroType === 'dog' || heroType === 'cat') ? 0.5 : 0.7);
  let camH = has(/low[\s-]?angle|[aâ]ngulo baixo|ground level|rente ao ch[aã]o/) ? 0.4 : has(/high[\s-]?angle|[aâ]ngulo alto|plong/) ? 4 : (kind === 'car' ? 1.0 : 1.5);
  const shake = has(/handheld|na m[aã]o|shaky|tremid/) ? 0.6 : 0.15;
  const cam = { id: 'cam1', lens_mm: lens, lens_end_mm: has(/zoom in|zoom-in/) ? lens * 2 : has(/zoom out|zoom-out/) ? lens / 2 : lens, aim: 'hero', aim_height: hH, shake, ease: 'inout' };
  const side = road || city ? 1 : 1, sideX = (road || city) ? 3.5 + near * 0.5 : near;
  if (has(/drone shot|aerial|a[eé]re|top[\s-]?down|overhead|vista de cima|bird'?s[\s-]?eye/)) { Object.assign(cam, { name: `Aérea ${lens}mm`, follow: v > 0 ? 'hero' : null, path: v > 0 ? [{ t: 0, x: 12, y: 18, z: -18 }, { t: dur, x: 6, y: 14, z: 4 }] : [{ t: 0, x: 25, y: 20, z: -25 }, { t: dur, x: 10, y: 28, z: 25 }] }); }
  else if (has(/orbit|[oó]rbita|around|em volta|360|circling|circula/)) { const R = near * 1.6, pts = []; for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI * (has(/360/) ? 2 : 1); pts.push({ t: dur * i / 8, x: Math.sin(a) * R, y: camH, z: -Math.cos(a) * R }); } Object.assign(cam, { name: `Órbita ${lens}mm`, follow: v > 0 ? 'hero' : null, path: v > 0 ? pts : pts.map(p => ({ ...p, x: p.x + hero.x, z: p.z + hero.z })), ease: 'none' }); }
  else if (has(/chase|behind|following|from behind|persegui|atr[aá]s|seguindo/)) { Object.assign(cam, { name: `Perseguição ${lens}mm`, follow: 'hero', path: [{ t: 0, x: 0, y: camH + 0.3, z: -near * 1.6 }, { t: dur, x: 0.3, y: camH + 0.3, z: -near * 1.4 }] }); }
  else if (has(/front|leading|de frente|na frente|facing|reverse tracking/)) { Object.assign(cam, { name: `Frontal ${lens}mm`, follow: 'hero', path: [{ t: 0, x: 0, y: camH, z: near * 1.7 }, { t: dur, x: -0.3, y: camH, z: near * 1.5 }] }); }
  else if (has(/static|fixed|locked|parad|fixa|tripod|trip[eé]|pan\b/) || v === 0) { Object.assign(cam, { name: `Fixa ${lens}mm`, follow: null, path: [{ t: 0, x: hero.x + sideX + 2, y: camH, z: 0 }], ease: 'none' }); }
  else if (has(/dolly in|push in|aproxima/)) { Object.assign(cam, { name: `Dolly in ${lens}mm`, follow: v > 0 ? 'hero' : null, path: v > 0 ? [{ t: 0, x: sideX * 2, y: camH, z: 0 }, { t: dur, x: sideX * 0.8, y: camH, z: 0 }] : [{ t: 0, x: hero.x + near * 3, y: camH, z: hero.z + near * 2 }, { t: dur, x: hero.x + near, y: camH, z: hero.z + near * 0.6 }] }); }
  else { Object.assign(cam, { name: `Travelling ${lens}mm`, follow: v > 0 ? 'hero' : null, path: v > 0 ? [{ t: 0, x: sideX * side, y: camH, z: near * 0.6 }, { t: dur, x: sideX * side, y: camH, z: -near * 0.4 }] : [{ t: 0, x: hero.x + sideX, y: camH, z: hero.z - 4 }, { t: dur, x: hero.x + sideX, y: camH, z: hero.z + 4 }] }); }
  const cams = [cam];
  if (kind === 'car' && !has(/aerial|a[eé]re|drone shot/)) cams.push({ id: 'cam2', name: 'Aérea de apoio 24mm', lens_mm: 24, follow: 'hero', aim: 'hero', aim_height: 0.5, path: [{ t: 0, x: 10, y: 14, z: -14 }, { t: dur, x: 6, y: 18, z: 6 }], ease: 'inout' });
  return { name: text.slice(0, 48), duration_s: dur, aspect: has(/vertical|9:16|reels|stories|tiktok/) ? '9:16' : has(/2\.39|scope|anam[oó]rf|cinemascope/) ? '2.39:1' : '16:9', objects, cameras: cams, notes: 'Gerado pelo interpretador local (palavras-chave).' };
}

/* ---------- spec → projeto ---------- */
function catmull(p0, p1, p2, p3, s) { const s2 = s * s, s3 = s2 * s; return 0.5 * ((2 * p1) + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 + (-p0 + 3 * p1 - 3 * p2 + p3) * s3); }
function samplePath(path, fps, ease, fpsDur) {
  const wps = path.filter(p => isFinite(+p.t)).map(p => ({ t: +p.t, x: +p.x || 0, y: +(p.y ?? 0) || 0, z: +p.z || 0 })).sort((a, b) => a.t - b.t);
  if (wps.length < 2) return null;
  const T0 = wps[0].t, T1 = wps[wps.length - 1].t, E = EASE[ease === 'none' || !ease ? 'linear' : ease] || EASE.linear;
  const f0 = Math.max(0, Math.round(T0 * fps)), f1 = Math.min(fpsDur, Math.round(T1 * fps)), out = [];
  for (let f = f0; f <= f1; f++) {
    const u = T1 > T0 ? clamp((f / fps - T0) / (T1 - T0), 0, 1) : 0, tt = T0 + (T1 - T0) * E(u);
    let i = 0; while (i < wps.length - 2 && tt > wps[i + 1].t) i++;
    const a = wps[Math.max(0, i - 1)], b = wps[i], c = wps[i + 1], d = wps[Math.min(wps.length - 1, i + 2)];
    const s = c.t > b.t ? clamp((tt - b.t) / (c.t - b.t), 0, 1) : 0;
    const lin = wps.length === 2;
    out.push({ f, x: lin ? lerp(b.x, c.x, s) : catmull(a.x, b.x, c.x, d.x, s), y: lin ? lerp(b.y, c.y, s) : catmull(a.y, b.y, c.y, d.y, s), z: lin ? lerp(b.z, c.z, s) : catmull(a.z, b.z, c.z, d.z, s) });
  }
  return out;
}
function cleanParams(type, params) { const out = {}; for (const p of ASSETS[type].params) { if (!params || !(p.k in params)) continue; let v = params[p.k]; if (p.t === 'num' || p.t === 'int') { v = +v; if (!isFinite(v)) continue; v = clamp(p.t === 'int' ? Math.round(v) : v, p.min, p.max); } else if (p.t === 'bool') v = !!v; else if (p.t === 'select') { if (!p.opts.some(o => o[0] === v)) continue; } else if (p.t === 'color') { if (!/^#[0-9a-f]{6}$/i.test(String(v))) continue; } out[p.k] = v; } return out; }
function applySpec(spec, mode) {
  if (!spec || typeof spec !== 'object') throw new Error('Especificação vazia');
  const oldRefs = {}; if (mode === 'edit') for (const o of project.objects) if (o.refs) oldRefs[o.id] = o.refs;
  if (mode !== 'add') { loadProjectData(newProject()); }
  const fps = project.fps;
  if (mode !== 'add') { project.duration = clamp(Math.round((+spec.duration_s || 8) * fps), 24, 24 * 120); if (['16:9', '9:16', '1:1', '4:5', '2.39:1', '4:3'].includes(spec.aspect)) project.aspect = spec.aspect; if (spec.name) project.name = String(spec.name).slice(0, 60); }
  const idMap = {}, made = [];
  const eps = { px: 0.004, py: 0.004, pz: 0.004, ry: 0.08 };
  for (const so of (spec.objects || [])) {
    if (!ASSETS[so.type] || so.type === 'camera') continue;
    const sc = +so.scale > 0 ? +so.scale : 1;
    let prm = cleanParams(so.type, so.params);
    if (so.type === 'roadpath' && so.params && Array.isArray(so.params.pts)) prm.pts = so.params.pts.filter(a => Array.isArray(a) && a.length === 3).map(a => a.map(Number));
    if (so.type === 'realcar') { const mk = so.params && so.params.model; if (CAR_DB[mk] && !(so.params && so.params.profile)) prm = Object.assign(carDefaults(mk), { modelName: CAR_DB[mk].name }, prm.color ? { color: prm.color } : {}, { model: mk }); if (!so.name) so.name = (prm.modelName || (CAR_DB[mk] && CAR_DB[mk].name)); }
    const o = addObject(so.type, { silent: true, id: so.id, refs: oldRefs[so.id], name: so.name ? String(so.name).slice(0, 40) : undefined, params: prm, base: { px: +so.x || 0, py: +so.y || 0, pz: +so.z || 0, ry: +so.heading || 0, sx: sc, sy: sc, sz: sc } });
    idMap[so.id || o.id] = o.id; made.push(o);
    const pts = Array.isArray(so.path) && samplePath(so.path, fps, so.ease, project.duration);
    if (Array.isArray(so.clips)) o.clips = so.clips.filter(c => PERSON_ACTIONS[c.kind] || QUAD_ACTIONS[c.kind]).map(c => ({ id: uid('c'), kind: c.kind, start: Math.round((+c.start_s || 0) * fps), end: Math.round((+c.end_s || 1) * fps) }));
    if (pts && pts.length > 1) {
      const S = { px: [], py: [], pz: [], ry: [] }; let prevH = +so.heading || 0, first = true;
      const flyer = ASSETS[so.type].pilot === 'bird';
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[Math.min(i + 2, pts.length - 1)], r0 = pts[Math.max(i - 2, 0)];
        const dx = q.x - r0.x, dz = q.z - r0.z;
        let h = prevH; if (so.face_path !== false && Math.hypot(dx, dz) > 0.02) { h = Math.atan2(dx, dz) / DEG; if (!first) h = prevH + ((((h - prevH) % 360) + 540) % 360 - 180); first = false; }
        prevH = h; S.px.push({ f: p.f, v: p.x }); S.pz.push({ f: p.f, v: p.z }); S.ry.push({ f: p.f, v: h }); if (flyer || so.path.some(w => w.y !== undefined && +w.y !== 0)) S.py.push({ f: p.f, v: p.y });
      }
      for (const ch in S) if (S[ch].length > 1) writeSamples(o, ch, S[ch], 'simplify', eps[ch]);
      if (S.ry.length) { o.base.ry = S.ry[0].v; }
    }
  }
  for (const so of (spec.objects || [])) { const fr = so.follow_road; if (!fr || !idMap[so.id] || !idMap[fr.road]) continue; const road = getObj(idMap[fr.road]), ob = getObj(idMap[so.id]); if (road && road.type === 'roadpath' && ob) roadFollow(road, ob, +fr.speed_kmh || 60, fr.lane ?? (road.params.lanes - 1), fr.reverse ? -1 : 1, +fr.start_pct || 0, Math.round((+fr.start_s || 0) * fps), true); }
  let firstCam = null;
  for (const scam of (spec.cameras || [])) {
    const fol = scam.follow && idMap[scam.follow], aim = scam.aim && idMap[scam.aim];
    const p0 = (scam.path && scam.path[0]) || { x: 6, y: 1.5, z: 6 };
    const o = addObject('camera', { silent: true, id: scam.id, name: scam.name ? String(scam.name).slice(0, 40) : undefined, base: { px: +p0.x || 0, py: +(p0.y ?? 1.5), pz: +p0.z || 0, rx: +scam.pitch || 0, ry: +scam.heading || 0, rz: +scam.roll || 0, focal: clamp(+scam.lens_mm || 35, 6, 600) }, cons: { aim: aim || null, aimH: isFinite(+scam.aim_height) ? +scam.aim_height : 1, follow: (scam.mount && idMap[scam.mount]) ? null : (fol || null), mount: (scam.mount && idMap[scam.mount]) || null, shake: clamp(+scam.shake || 0, 0, 5), shakeFreq: 1.5 } });
    if (CAMERA_BODIES[scam.camera_body]) { o.params.body = scam.camera_body; o.params.sensorW = CAMERA_BODIES[scam.camera_body].w; o.params.sensorH = CAMERA_BODIES[scam.camera_body].h; }
    if (LENS_SETS[scam.lens_set]) { o.params.lensSet = scam.lens_set; o.params.squeeze = String(LENS_SETS[scam.lens_set].sq || 1); o.params.tstop = LENS_SETS[scam.lens_set].t; }
    if (+scam.tstop > 0) o.params.tstop = +scam.tstop;
    if (!aim && Array.isArray(scam.look_at) && scam.look_at.length === 3) {
      const n = addObject('null', { silent: true, name: 'Alvo ' + o.name, base: { px: +scam.look_at[0] || 0, py: +scam.look_at[1] || 0, pz: +scam.look_at[2] || 0 } });
      o.cons.aim = n.id; o.cons.aimH = 0;
    }
    const pts = Array.isArray(scam.path) && samplePath(scam.path, fps, scam.ease || 'inout', project.duration);
    if (pts && pts.length > 1) { const S = { px: [], py: [], pz: [] }; for (const p of pts) { S.px.push({ f: p.f, v: p.x }); S.py.push({ f: p.f, v: p.y }); S.pz.push({ f: p.f, v: p.z }); } for (const ch in S) writeSamples(o, ch, S[ch], 'simplify', 0.01); }
    const l0 = clamp(+scam.lens_mm || 35, 6, 600), l1 = clamp(+(scam.lens_end_mm ?? l0) || l0, 6, 600);
    if (Math.abs(l1 - l0) > 0.5) { setKey(o, 'focal', 0, l0); setKey(o, 'focal', project.duration, l1); }
    if (!firstCam) firstCam = o;
    idMap[scam.id || o.id] = o.id;
  }
  project.shots = [];
  if (Array.isArray(spec.shots)) for (const s of spec.shots) { const cid = idMap[s.camera]; if (!cid || getObj(cid)?.type !== 'camera') continue; project.shots.push({ cam: cid, start: Math.round((+s.start_s || 0) * fps), end: Math.round((+s.end_s || 0) * fps) - 1 }); }
  if (project.shots.length) { const last = project.shots[project.shots.length - 1]; last.end = project.duration; normalizeShots(); }
  const lk = spec.look && ENV_PRESETS[spec.look.background]; if (lk && mode !== 'add') { Object.assign(project.settings, lk.s); applyEnv(); }
  if (firstCam) project.activeCamera = firstCam.id;
  // reconstrói tudo (segmentação/cores coerentes) e foca no herói
  bump(); rebuildAll(); fitTime(); setFrame(0);
  const hero = made.find(o => ASSETS[o.type].pilot) || made[0];
  select(hero ? hero.id : null);
  if (hero) { const r = rt.get(hero.id); applyFrame(0); const p = r.g.position; orbit.target.set(p.x, p.y + 0.8, p.z); editorCam.position.set(p.x + 14, p.y + 7, p.z - 12); }
  if (firstCam) setView('cam');
  commit(); renderOutliner(); renderInspector(); renderChanList();
  syncDurUI(); $('#selAspect').value = project.aspect;
  return made.length;
}

/* ---------- cena atual → spec (para editar por prompt) ---------- */
function sceneToSpec() {
  const fps = project.fps, D = project.duration, step = Math.max(1, Math.round(fps / 2));
  const r3 = v => Math.round(v * 1000) / 1000;
  const path = (o) => { if (!['px', 'py', 'pz'].some(c => hasAnim(o, c))) return undefined; const out = []; for (let f = 0; f <= D; f += step) out.push({ t: r3(f / fps), x: r3(getVal(o, 'px', f)), y: r3(getVal(o, 'py', f)), z: r3(getVal(o, 'pz', f)) }); if ((D % step) !== 0) out.push({ t: r3(D / fps), x: r3(getVal(o, 'px', D)), y: r3(getVal(o, 'py', D)), z: r3(getVal(o, 'pz', D)) }); return out; };
  const objects = [], cameras = [];
  for (const o of project.objects) {
    if (o.type === 'camera') { cameras.push({ id: o.id, name: o.name, camera_body: o.params.body, lens_set: o.params.lensSet, tstop: o.params.tstop, mount: o.cons.mount || undefined, lens_mm: r3(getVal(o, 'focal', 0)), lens_end_mm: r3(getVal(o, 'focal', D)), follow: o.cons.follow, aim: o.cons.aim, aim_height: o.cons.aimH, shake: o.cons.shake, path: path(o) || [{ t: 0, x: r3(o.base.px), y: r3(o.base.py), z: r3(o.base.pz) }], heading: r3(getVal(o, 'ry', 0)), pitch: r3(getVal(o, 'rx', 0)), roll: r3(getVal(o, 'rz', 0)), ease: 'none' }); continue; }
    const prm = Object.assign({}, o.params); delete prm.profile;
    objects.push({ id: o.id, type: o.type, name: o.name, params: prm, x: r3(getVal(o, 'px', 0)), y: r3(getVal(o, 'py', 0)), z: r3(getVal(o, 'pz', 0)), heading: r3(getVal(o, 'ry', 0)), scale: r3(getVal(o, 'sy', 0)), path: path(o), ease: 'none', clips: (o.clips || []).map(c => ({ kind: c.kind, start_s: r3(c.start / fps), end_s: r3(c.end / fps) })) });
  }
  return { name: project.name, duration_s: r3(D / fps), aspect: project.aspect, objects, cameras, shots: (project.shots || []).map(s => ({ camera: s.cam, start_s: r3(s.start / fps), end_s: r3((s.end + 1) / fps) })) };
}

/* ---------- presets do diretor ---------- */
const DIRECTOR_PRESETS = {
  cam: { lb: 'Câmera', opts: [['auto', 'Auto'], ['travelling', 'Travelling lateral'], ['chase', 'Perseguição'], ['front', 'Frontal recuando'], ['aerial', 'Aérea / drone'], ['orbit', 'Órbita'], ['static', 'Fixa / tripé'], ['dolly', 'Dolly in'], ['crane', 'Grua'], ['handheld', 'Na mão']] },
  lens: { lb: 'Lente', opts: [['auto', 'Auto'], ['14', 'Ultra-wide 14mm'], ['24', 'Wide 24mm'], ['35', '35mm'], ['50', '50mm'], ['85', 'Tele 85mm'], ['135', 'Tele 135mm']] },
  look: { lb: 'Estética', opts: [['auto', 'Auto'], ['commercial', 'Comercial limpo'], ['cinema', 'Cinema 2.39'], ['doc', 'Documental'], ['epic', 'Épico'], ['social', 'Social 9:16']] },
  struct: { lb: 'Estrutura', opts: [['continuous', 'Plano contínuo'], ['multi3', 'Multishot · 3 planos'], ['multi5', 'Multishot · 5 planos']] },
};
const LOOK_DESC = {
  commercial: { en: 'clean premium commercial: smooth eased moves, no shake, light backdrop, 16:9', kw: ' comercial 16:9 ', bg: 'light' },
  cinema: { en: 'cinematic feature film: 2.39:1 anamorphic aspect, slower moves, subtle handheld, longer lenses, dark backdrop', kw: ' 2.39 cinema ', bg: 'dark' },
  doc: { en: 'documentary: handheld eye-level 35mm, reactive framing', kw: ' handheld na mão 35mm ', bg: 'grey' },
  epic: { en: 'epic: wide lenses, big crane and aerial moves, slow and grand', kw: ' aerial crane ', bg: 'grey' },
  social: { en: 'social media vertical 9:16, punchy, close and wide-lens energetic camera', kw: ' vertical 9:16 ', bg: 'grey' },
};
let createState = { mode: 'new', cam: 'auto', lens: 'auto', look: 'auto', struct: 'continuous', dur: 8 };
function presetsText() {
  const s = createState, L = [];
  if (s.cam !== 'auto') L.push('main camera rig: ' + DIRECTOR_PRESETS.cam.opts.find(o => o[0] === s.cam)[1]);
  if (s.lens !== 'auto') L.push('main lens: ' + s.lens + 'mm');
  if (s.look !== 'auto') L.push('aesthetic: ' + LOOK_DESC[s.look].en + ' (look.background ' + LOOK_DESC[s.look].bg + ')');
  L.push(s.struct === 'continuous' ? 'structure: continuous single shot' : `structure: multishot with ${s.struct === 'multi3' ? 3 : 5} shots (different cameras, cuts in "shots")`);
  if (s.mode === 'new' && s.dur) L.push('duration: ' + s.dur + ' s');
  return L.join('\n');
}
function presetKeywords() {
  const s = createState; let k = ' ';
  const CAMK = { travelling: 'travelling', chase: 'chase', front: 'front', aerial: 'aerial', orbit: 'orbit', static: 'static', dolly: 'dolly in', crane: 'crane', handheld: 'handheld' };
  if (s.cam !== 'auto') k += CAMK[s.cam] + ' ';
  if (s.lens !== 'auto') k += s.lens + 'mm ';
  if (s.look !== 'auto') k += LOOK_DESC[s.look].kw;
  if (s.dur) k += s.dur + 's ';
  return k;
}
// multishot no interpretador local: câmeras extras + cortes
function addLocalMultishot(spec, n) {
  const dur = spec.duration_s, hero = spec.objects.find(o => o.id === 'hero'), mv = !!(hero && hero.path);
  const extra = [
    { name: 'Plano aberto 24mm', lens_mm: 24, follow: mv ? 'hero' : null, aim: 'hero', aim_height: 0.8, path: mv ? [{ t: 0, x: 14, y: 4, z: 10 }, { t: dur, x: 12, y: 5, z: 6 }] : [{ t: 0, x: hero.x + 14, y: 4, z: hero.z + 10 }] },
    { name: 'Close 85mm', lens_mm: 85, follow: mv ? 'hero' : null, aim: 'hero', aim_height: 0.9, shake: 0.2, path: mv ? [{ t: 0, x: 6, y: 1.1, z: 5 }, { t: dur, x: 5, y: 1.1, z: 4 }] : [{ t: 0, x: hero.x + 6, y: 1.4, z: hero.z + 5 }] },
    { name: 'Perseguição 24mm', lens_mm: 24, follow: 'hero', aim: 'hero', aim_height: 0.7, path: [{ t: 0, x: 0.4, y: 1.3, z: -6 }, { t: dur, x: 0, y: 1.3, z: -5 }] },
    { name: 'Aérea 35mm', lens_mm: 35, follow: mv ? 'hero' : null, aim: 'hero', aim_height: 0.5, path: mv ? [{ t: 0, x: -8, y: 16, z: -12 }, { t: dur, x: -4, y: 20, z: 8 }] : [{ t: 0, x: hero.x - 10, y: 18, z: hero.z - 12 }] },
    { name: 'Baixo frontal 18mm', lens_mm: 18, follow: mv ? 'hero' : null, aim: 'hero', aim_height: 0.8, path: mv ? [{ t: 0, x: -1, y: 0.35, z: 7 }, { t: dur, x: -0.5, y: 0.35, z: 6 }] : [{ t: 0, x: hero.x - 1, y: 0.35, z: hero.z + 4 }] },
  ];
  let i = 0; while (spec.cameras.length < n) { const c = extra[i++ % extra.length]; spec.cameras.push(Object.assign({ id: 'cam' + (spec.cameras.length + 1), ease: 'inout' }, JSON.parse(JSON.stringify(c)))); }
  spec.cameras = spec.cameras.slice(0, n);
  spec.shots = spec.cameras.map((c, k) => ({ camera: c.id, start_s: +(dur * k / n).toFixed(3), end_s: +(dur * (k + 1) / n).toFixed(3) }));
}

/* ---------- interface do prompt ---------- */
const PROMPT_EXAMPLES = [
  'a silver Porsche 911 running on a road with a travelling camera, ultra-wide lens',
  'Taycan azul a 140 km/h numa estrada na floresta, câmera de perseguição 24mm, 6 segundos',
  'drone shot: Hilux numa estrada de montanha ao entardecer',
  'mulher correndo na rua da cidade, câmera frontal na mão, 50mm, vertical 9:16',
  'cavalo galopando no campo, travelling lateral com tele 135mm',
  'homem acenando para um carro que passa, plano médio e depois close',
];
const EDIT_EXAMPLES = ['deixe a câmera principal mais baixa e com lente 18mm', 'troque o carro por um Tesla Model Y preto', 'adicione um bando de pássaros cruzando o céu', 'faça o carro mais rápido e com 3 planos de corte', 'coloque um homem atravessando a rua na frente do carro'];
let promptCtl = null, createPromptMemory = '';
function createModalBody() {
  const s = createState, ai = !!sampleNS, edit = s.mode === 'edit';
  const chips = (key) => `<div class="pchips"><span class="pclb">${DIRECTOR_PRESETS[key].lb}</span>${DIRECTOR_PRESETS[key].opts.map(([v, l]) => `<button class="chip ${s[key] === v ? 'on' : ''}" data-pk="${key}" data-pv="${v}">${l}</button>`).join('')}</div>`;
  const ex = edit ? EDIT_EXAMPLES : PROMPT_EXAMPLES;
  return `<div class="seg" style="margin-bottom:12px">${[['new', '✨ Criar do zero'], ['edit', '✏️ Editar cena atual'], ['add', '＋ Adicionar à cena']].map(([k, l]) => `<button data-mode="${k}" class="${s.mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <textarea id="cpText" style="min-height:92px;font-family:Inter,sans-serif;font-size:13px" placeholder="${edit ? 'O que mudar? ex.: deixe a câmera mais baixa e troque a lente para 18mm' : 'Descreva o plano: assunto, ação, velocidade, cenário, câmera e lente…'}">${esc(createPromptMemory || '')}</textarea>
    <div class="btnrow">${ex.map((e, i) => `<button class="chip ghosty" data-ex="${i}">${esc(e)}</button>`).join('')}</div>
    <div class="pgrid">${chips('cam')}${chips('lens')}${chips('look')}${chips('struct')}
      ${edit ? '' : `<div class="pchips"><span class="pclb">Duração</span><input type="number" id="cpDur" value="${s.dur}" min="2" max="120" step="1" style="width:70px"> s</div>`}</div>
    <div class="mgrid" style="margin-top:10px"><label>Interpretação</label><select id="cpEngine"><option value="ai" ${ai ? '' : 'disabled'}>Claude (IA) — entende qualquer descrição${ai ? '' : ' — indisponível aqui'}</option><option value="local" ${ai && !edit ? '' : (edit ? '' : 'selected')}>Rápida (palavras-chave, sem IA)</option></select></div>
    ${edit ? '<div class="hint">A edição por prompt reconstrói a cena a partir de um resumo dela (trajetórias amostradas a cada 0,5 s). Para ajustes finos use o Graph Editor. Precisa da IA.</div>' : ''}
    <div class="hint" id="cpStatus"></div>
    <div class="btnrow" style="margin-top:10px"><button class="pri" id="cpGo">${edit ? '✏️ Aplicar mudanças' : '✨ Criar layout'}</button><button id="cpStop" style="display:none">Parar</button>${s.mode === 'new' ? '<button class="ghost" id="cpEmpty">Começar cena vazia</button>' : ''}</div>`;
}
function openCreate(mode) {
  if (mode) createState.mode = mode;
  openModal('✨ Diretor por prompt', createModalBody(), m => {
    const box = m.querySelector('.mb');
    const re = () => { const tx = $('#cpText') && $('#cpText').value; if (tx != null) createPromptMemory = tx; box.innerHTML = createModalBody(); };
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.mode) { createState.mode = b.dataset.mode; re(); return; }
      if (b.dataset.pk) { createState[b.dataset.pk] = b.dataset.pv; re(); return; }
      if (b.dataset.ex) { $('#cpText').value = (createState.mode === 'edit' ? EDIT_EXAMPLES : PROMPT_EXAMPLES)[+b.dataset.ex]; return; }
      if (b.id === 'cpStop') { promptCtl && promptCtl.abort(); return; }
      if (b.id === 'cpEmpty') { closeModal(); loadProjectData(newProject()); addObject('camera', { base: { px: 0, py: 1.6, pz: 8, rx: -4, ry: 0 } }); toast('Cena vazia criada — adicione personagens pela biblioteca'); return; }
      if (b.id === 'cpGo') { runCreate(); return; }
    });
    box.addEventListener('change', e => { if (e.target.id === 'cpDur') createState.dur = clamp(+e.target.value || 8, 2, 120); });
    setTimeout(() => $('#cpText') && $('#cpText').focus(), 30);
  });
}
$('#bCreate').onclick = () => openCreate();
async function runCreate() {
  const text = $('#cpText').value.trim(); if (!text) return toast('Escreva a descrição');
  createPromptMemory = text;
  const mode = createState.mode, engine = $('#cpEngine').value, st = $('#cpStatus');
  if ($('#cpDur')) createState.dur = clamp(+$('#cpDur').value || 8, 2, 120);
  let spec = null;
  if (mode === 'edit' && !sampleNS) { st.textContent = 'Editar por prompt precisa da IA (Claude), que não está disponível aqui.'; return; }
  if ((engine === 'ai' || mode === 'edit') && sampleNS) {
    $('#cpGo').disabled = true; $('#cpStop').style.display = ''; st.textContent = mode === 'edit' ? 'Claude está editando a cena…' : 'Claude está planejando o layout… (pode levar até ~1 min)';
    promptCtl = new AbortController();
    try { spec = await sampleNS.json(specPrompt(text, presetsText(), mode === 'edit' ? sceneToSpec() : null), { signal: promptCtl.signal, cache: false, onText: ({ text: tx }) => { st.textContent = `Recebendo especificação… ${tx.length} caracteres`; } }); }
    catch (e) {
      $('#cpGo').disabled = false; $('#cpStop').style.display = 'none';
      if (e && e.code === 'cancelled') { st.textContent = 'Cancelado.'; return; }
      const msg = { not_granted: 'Uso do Claude não autorizado nesta página.', rate_limited: 'Limite de uso atingido — tente de novo em instantes.', invalid_json: 'A resposta veio em formato inválido. Tente novamente.', sampling_disabled: 'Claude indisponível para esta conta.' }[e && e.code] || ('Falha: ' + (e && (e.message || e.code)));
      if (mode === 'edit') { st.textContent = msg; return; }
      st.textContent = msg + ' Usando o interpretador rápido…'; spec = null;
    }
    if ($('#cpGo')) { $('#cpGo').disabled = false; $('#cpStop').style.display = 'none'; }
  }
  if (!spec) {
    spec = localSpec(text + presetKeywords());
    if (createState.struct !== 'continuous') addLocalMultishot(spec, createState.struct === 'multi3' ? 3 : 5);
    if (createState.look !== 'auto') spec.look = { background: LOOK_DESC[createState.look].bg };
    if (createState.look === 'commercial') spec.cameras.forEach(c => c.shake = 0);
  }
  try {
    const n = applySpec(spec, mode === 'edit' ? 'edit' : mode === 'add' ? 'add' : 'replace');
    closeModal();
    toast(`${mode === 'edit' ? 'Cena editada' : 'Layout criado'}: ${n} objetos, ${(spec.cameras || []).length} câmera(s)${project.shots.length ? ', ' + project.shots.length + ' planos' : ''}` + (spec.notes ? ' — ' + spec.notes : ''), 6000);
    togglePlay(true);
  } catch (err) { console.error(err); st.textContent = 'Não consegui montar a cena: ' + err.message; }
}

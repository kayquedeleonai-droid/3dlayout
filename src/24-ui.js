/* ============================================================
   INTERFACE: ícones flat no lugar dos emojis + limpeza visual
   (aplicado depois que tudo foi montado)
   ============================================================ */
function applyFlatUI() {
  const set = (id, name, label) => { const el = document.getElementById(id); if (!el) return; const sub = el.querySelector('sub'); el.innerHTML = ic(name, label ? 15 : 17) + (label ? `<span>${label}</span>` : '') + (sub ? sub.outerHTML : ''); };
  set('bHelp', 'help'); set('bUndo', 'undo'); set('bRedo', 'redo'); set('bSave', 'save'); set('bOpen', 'folder');
  set('bCreate', 'sparkles', 'Diretor por prompt'); set('bPrompt', 'text', 'Descrever');
  set('bWatch', 'play', 'Assistir filme'); set('bExport', 'download', 'Exportar');
  set('tMove', 'move'); set('tRot', 'rotate'); set('tScale', 'scale'); set('tSpace', 'globe'); set('tSnap', 'magnet'); set('tPath', 'path'); set('tGuides', 'grid'); set('tMeasure', 'ruler'); set('tPilot', 'gamepad'); set('tFocus', 'target');
  if ($('#bShots')) $('#bShots').innerHTML = ic('film', 14) + '<span>Decupagem</span>';
  if ($('#bShot')) $('#bShot').innerHTML = ic('camera', 17);
  // ícones dos assets (outliner, timeline, inspetor)
  for (const t in ASSETS) ASSETS[t].icon = typeIcon(t);
  // abas da biblioteca
  const TI = { chars: 'person', veh: 'car', animals: 'paw', scene: 'building', props: 'box', anim: 'clapper', cams: 'video' };
  for (const t of LIB_TABS) t.ic = ic(TI[t.k] || 'box', 18);
  const GI = { cams: 'video', chars: 'person', animals: 'paw', veh: 'car', scene: 'building', util: 'crosshair' };
  for (const g of OBJ_GROUPS) g[2] = ic(GI[g[0]] || 'box', 13);
  if (typeof project !== 'undefined' && project) { renderAssets(); renderOutliner(); renderChanList(); renderInspector(); }
}

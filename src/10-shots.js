/* ============================================================
   CORTES (MULTISHOT): qual câmera está no ar em cada trecho da timeline
   project.shots = [{cam, start, end}] em frames. Sem cortes → câmera ativa.
   ============================================================ */
function shotCamAt(f) {
  const s = project.shots;
  if (s && s.length) for (const sh of s) if (f >= sh.start && f <= sh.end && getObj(sh.cam)) return sh.cam;
  return project.activeCamera;
}
const CAM_COLS = ['#f2a33a', '#4f9cf0', '#6cc86a', '#e8584f', '#af7be8', '#5ac8c8', '#e8c84f', '#e87fb0'];
function camColor(id) { const cams = project.objects.filter(o => o.type === 'camera'); const i = cams.findIndex(o => o.id === id); return CAM_COLS[(i < 0 ? 0 : i) % CAM_COLS.length]; }
function drawShotsBand(ctx) {
  const s = project.shots; if (!s || !s.length) return;
  ctx.save(); ctx.font = '600 9px Inter, sans-serif'; ctx.textBaseline = 'middle';
  for (const sh of s) {
    const x0 = fx(sh.start), x1 = fx(sh.end + 1), o = getObj(sh.cam); if (!o || x1 < 0 || x0 > tl.W) continue;
    ctx.fillStyle = camColor(sh.cam); ctx.globalAlpha = 0.9; ctx.fillRect(x0 + 1, 14, Math.max(2, x1 - x0 - 2), 9);
    ctx.globalAlpha = 1; ctx.fillStyle = '#111'; ctx.save(); ctx.beginPath(); ctx.rect(x0 + 1, 14, Math.max(2, x1 - x0 - 2), 9); ctx.clip(); ctx.fillText('🎥 ' + o.name, x0 + 4, 18.5); ctx.restore();
  }
  ctx.restore();
}
function normalizeShots() {
  const s = (project.shots || []).filter(x => getObj(x.cam)).map(x => ({ cam: x.cam, start: clamp(Math.round(x.start), 0, project.duration), end: clamp(Math.round(x.end), 0, project.duration) })).filter(x => x.end >= x.start).sort((a, b) => a.start - b.start);
  project.shots = s;
}
function renderShotsModal() {
  normalizeShots();
  const cams = project.objects.filter(o => o.type === 'camera');
  const opt = (cur) => cams.map(c => `<option value="${c.id}" ${c.id === cur ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const rows = project.shots.map((s, i) => `<div style="display:grid;grid-template-columns:14px 1fr 70px 70px 28px;gap:6px;align-items:center;margin:4px 0"><span style="width:10px;height:10px;border-radius:2px;background:${camColor(s.cam)}"></span><select data-sh="${i}" data-k="cam">${opt(s.cam)}</select><input type="number" data-sh="${i}" data-k="start" value="${s.start}" title="Frame inicial"><input type="number" data-sh="${i}" data-k="end" value="${s.end}" title="Frame final"><button class="ghost" data-shdel="${i}" title="Remover">✕</button></div>`).join('');
  return `<div class="hint" style="margin-top:0">Monte a edição: cada corte define qual câmera está no ar. A vista <b>Câmera ativa</b> e a exportação "Edição com cortes" seguem esta lista. Sem cortes, vale a câmera ativa (plano contínuo).</div>
    <div style="display:grid;grid-template-columns:14px 1fr 70px 70px 28px;gap:6px;color:var(--tx3);font-size:10.5px;margin-top:8px"><span></span><span>Câmera</span><span>Início</span><span>Fim</span><span></span></div>
    ${rows || '<div class="hint">Nenhum corte — plano contínuo.</div>'}
    <div class="btnrow" style="margin-top:10px"><button data-shact="here" ${cams.length ? '' : 'disabled'}>✂ Cortar no frame ${curFrame}</button><button data-shact="even" ${cams.length > 1 ? '' : 'disabled'}>Distribuir entre ${cams.length} câmeras</button><button data-shact="clear">Plano contínuo (limpar)</button></div>`;
}
function openShots() {
  openModal('✂ Cortes / multishot', renderShotsModal(), m => {
    const rerender = () => { m.querySelector('.mb').innerHTML = renderShotsModal(); tlDirty = true; };
    m.addEventListener('change', e => { const t = e.target; if (t.dataset.sh == null) return; const s = project.shots[+t.dataset.sh]; s[t.dataset.k] = t.dataset.k === 'cam' ? t.value : +t.value; normalizeShots(); commit(); rerender(); });
    m.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.shdel != null) { project.shots.splice(+b.dataset.shdel, 1); commit(); rerender(); return; }
      const cams = project.objects.filter(o => o.type === 'camera');
      if (b.dataset.shact === 'clear') { project.shots = []; commit(); rerender(); }
      if (b.dataset.shact === 'even') { const n = cams.length, D = project.duration + 1; project.shots = cams.map((c, i) => ({ cam: c.id, start: Math.round(i * D / n), end: Math.round((i + 1) * D / n) - 1 })); commit(); rerender(); }
      if (b.dataset.shact === 'here') {
        normalizeShots(); const f = curFrame, s = project.shots;
        if (!s.length) { const a = project.activeCamera || cams[0].id, other = (cams.find(c => c.id !== a) || cams[0]).id; project.shots = f > 0 ? [{ cam: a, start: 0, end: f - 1 }, { cam: other, start: f, end: project.duration }] : [{ cam: a, start: 0, end: project.duration }]; }
        else { const i = s.findIndex(x => f > x.start && f <= x.end); if (i >= 0) { const cur = s[i], idx = cams.findIndex(c => c.id === cur.cam), next = cams[(idx + 1) % cams.length].id; s.splice(i + 1, 0, { cam: next, start: f, end: cur.end }); cur.end = f - 1; } }
        commit(); rerender();
      }
    });
  });
}
$('#bShots').onclick = openShots;

/* ============================================================
   Painel "Cores do Clay" — aparece no viewport quando o modo Clay está ativo
   ============================================================ */
const clayBar = document.createElement('div'); clayBar.id = 'clayBar';
$('#vpwrap').appendChild(clayBar);
let _clayKey = '';
function renderClayBar(force) {
  const on = renderMode === 'clay' && !document.body.classList.contains('cinema') && typeof project !== 'undefined' && project;
  clayBar.style.display = on ? '' : 'none'; if (!on) return;
  const st = project.settings.clay || {}, heroes = project.objects.filter(o => o.clayHero);
  const key = JSON.stringify(st) + heroes.map(o => o.id + o.name).join() + (sel || '') + clayBar.classList.contains('min');
  if (key === _clayKey && !force) return; _clayKey = key;
  const so = sel && getObj(sel);
  clayBar.innerHTML = `<div class="cbh"><b>Cores do Clay</b><span class="grow"></span><button class="icon" data-cb="reset" title="Voltar às cores padrão">↺</button><button class="icon" data-cb="min" title="Recolher">${clayBar.classList.contains('min') ? '▾' : '▴'}</button></div>
    <div class="cbb">${CLAY_LABELS.map(([k, lb]) => `<label class="cbr"><input type="color" data-ck="${k}" value="${clayCol(k)}"><span>${lb}</span></label>`).join('')}
    <div class="cbhero">${heroes.length ? 'Principal: ' + heroes.map(o => esc(o.name)).join(', ') : 'Nenhum objeto marcado como principal'}</div>
    ${so && so.type !== 'camera' ? `<button data-cb="hero">${so.clayHero ? '✕ Tirar "' + esc(so.name) + '" do destaque' : '★ Marcar "' + esc(so.name) + '" como principal'}</button>` : '<div class="cbhint">Selecione um objeto para marcá-lo como principal</div>'}</div>`;
}
clayBar.addEventListener('input', e => { const k = e.target.dataset.ck; if (!k) return; project.settings.clay = Object.assign({}, project.settings.clay || {}, { [k]: e.target.value }); bump(); });
clayBar.addEventListener('change', e => { if (e.target.dataset.ck) commit(); });
clayBar.addEventListener('click', e => { const b = e.target.closest('[data-cb]'); if (!b) return; const k = b.dataset.cb;
  if (k === 'min') clayBar.classList.toggle('min');
  else if (k === 'reset') { project.settings.clay = {}; commit(); bump(); }
  else if (k === 'hero') { const o = sel && getObj(sel); if (o) { o.clayHero = o.clayHero ? undefined : true; commit(); bump(); renderInspector(); } }
  renderClayBar(true); });
setInterval(() => renderClayBar(), 300);

/* ============================================================
   LAYOUT RESPONSIVO — mesmo app, layout adaptado a celular e tablet
   desktop: 3 colunas + timeline  ·  tablet: colunas estreitas (paisagem) ou gavetas (retrato)
   celular: viewport em tela cheia, gavetas (Biblioteca / Objetos / Propriedades / Timeline),
            barra de transporte compacta e menu ⋯ com as ações do topo.
   Forçar: ?ui=phone | tablet | desktop  (ou pelo menu ⋯ → Layout)
   ============================================================ */
const UI = { dev: '', built: false, homes: new Map() };
function uiForced() { let f = new URLSearchParams(location.search).get('ui'); try { f = f || localStorage.getItem('layout3d-ui'); } catch (e) { } return f && f !== 'auto' ? f : null; }
function detectDevice() {
  const f = uiForced(); if (f) return f;
  const w = innerWidth, h = innerHeight, s = Math.min(w, h), coarse = matchMedia('(pointer: coarse)').matches;
  if (w < 700 || (coarse && s < 560)) return 'phone';
  if (w < 1180 || (coarse && s < 1100)) return 'tablet';
  return 'desktop';
}
function uiSheet(name) {
  const cur = document.body.dataset.sheet || '';
  const next = name === cur ? '' : (name || '');
  document.body.dataset.sheet = next;
  document.querySelectorAll('#mTabs [data-sh]').forEach(b => b.classList.toggle('on', b.dataset.sh === next));
  if (next === 'tl' && typeof resizeTL === 'function') setTimeout(resizeTL, 240);
  if (next === 'prop' && typeof renderInspector === 'function') renderInspector();
}
// move um elemento para outro lugar guardando a posição original (para voltar no desktop)
function uiMove(el, dest) { if (!el) return; if (!UI.homes.has(el)) { const ph = document.createComment('home:' + el.id); el.parentNode.insertBefore(ph, el); UI.homes.set(el, ph); } dest.appendChild(el); }
function uiRestore() { for (const [el, ph] of UI.homes) ph.parentNode.insertBefore(el, ph.nextSibling); }
function buildMobileChrome() {
  if (UI.built) return; UI.built = true;
  const app = $('#app');
  // barra de transporte compacta (play, quadro a quadro, scrub, tempo)
  const tr = document.createElement('div'); tr.id = 'mTransport';
  tr.innerHTML = `<button class="icon" data-mt="start" title="Início">⏮</button><button class="icon" data-mt="prev" title="Quadro anterior">‹</button><button class="icon mplay" data-mt="play" title="Tocar / pausar">▶</button><button class="icon" data-mt="next" title="Próximo quadro">›</button><input type="range" id="mScrub" min="0" max="100" value="0" step="1"><span id="mTime" class="mono">00:00</span>`;
  app.appendChild(tr);
  // abas inferiores
  const tabs = document.createElement('div'); tabs.id = 'mTabs';
  tabs.innerHTML = [['lib', 'Biblioteca', 'M4 5h16v14H4zM4 10h16M10 10v9'], ['obj', 'Objetos', 'M4 6h16M4 12h16M4 18h10'], ['prop', 'Propriedades', 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6'], ['tl', 'Timeline', 'M3 12h18M7 8v8M12 6v12M17 9v6'], ['more', 'Menu', 'M5 12h.01M12 12h.01M19 12h.01']]
    .map(([k, lb, d]) => `<button data-sh="${k}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg><span>${lb}</span></button>`).join('');
  app.appendChild(tabs);
  // menu ⋯ (ações do topo)
  const menu = document.createElement('div'); menu.id = 'mMenu'; menu.className = 'panel';
  const act = [['bCreate', '✨ Diretor por prompt'], ['bPrompt', '✦ Descrever para IA de vídeo'], ['bDemo', '🎬 Exemplos'], ['bNew', '＋ Nova cena'], ['bSave', '💾 Salvar projeto'], ['bOpen', '📂 Abrir projeto'], ['bExport', '⤓ Exportar vídeo / imagem'], ['bShot', '📷 Capturar quadro'], ['bHelp', '? Ajuda']];
  menu.innerHTML = `<div class="ph">Menu</div><div class="mmBody"><div class="mmGrid">${act.map(([id, lb]) => `<button data-proxy="${id}">${lb}</button>`).join('')}</div>
    <div class="mmRow"><span>Modo de render</span><span id="mmRender"></span></div>
    <div class="mmRow"><span>Proporção</span><span id="mmAspect"></span></div>
    <div class="mmRow"><span>Layout</span><select id="mmLayout"><option value="auto">Automático</option><option value="phone">Celular</option><option value="tablet">Tablet</option><option value="desktop">Desktop</option></select></div></div>`;
  document.body.appendChild(menu);
  const scrim = document.createElement('div'); scrim.id = 'mScrim'; document.body.appendChild(scrim);
  // botão ⋯ no topo (celular)
  const more = document.createElement('button'); more.id = 'bMore'; more.className = 'icon'; more.title = 'Menu'; more.textContent = '⋯'; $('#top').appendChild(more);
  // eventos
  tabs.addEventListener('click', e => { const b = e.target.closest('[data-sh]'); if (b) uiSheet(b.dataset.sh); });
  more.onclick = () => uiSheet('more');
  scrim.onclick = () => uiSheet('');
  menu.addEventListener('click', e => { const b = e.target.closest('[data-proxy]'); if (!b) return; uiSheet(''); const t = document.getElementById(b.dataset.proxy); if (t) setTimeout(() => t.click(), 60); });
  const lay = menu.querySelector('#mmLayout'); try { lay.value = localStorage.getItem('layout3d-ui') || 'auto'; } catch (e) { }
  lay.onchange = () => { try { localStorage.setItem('layout3d-ui', lay.value); } catch (e) { } uiSheet(''); applyDevice(true); };
  tr.addEventListener('click', e => { const b = e.target.closest('[data-mt]'); if (!b) return; const k = b.dataset.mt; const map = { start: 'pStart', prev: 'pPrev', play: 'pPlay', next: 'pNext' }; const t = document.getElementById(map[k]); if (t) t.click(); });
  const scrub = tr.querySelector('#mScrub'); scrub.addEventListener('input', () => setFrame(+scrub.value));
  // no celular, depois de escolher algo na biblioteca a gaveta fecha para ver o resultado
  $('#assetList').addEventListener('click', () => { if (UI.dev === 'phone') setTimeout(() => uiSheet(''), 120); });
  // tocar num objeto no painel Objetos → vai para Propriedades
  $('#outliner').addEventListener('click', e => { if (UI.dev === 'phone' && e.target.closest('.orow, [data-id]') && !e.target.closest('button,input,select')) setTimeout(() => uiSheet('prop'), 120); });
  // sincroniza o transporte com o quadro atual
  const sync = () => { if (UI.dev !== 'desktop' && typeof project !== 'undefined' && project) { if (+scrub.max !== project.duration) scrub.max = project.duration; if (document.activeElement !== scrub) scrub.value = curFrame; const s = curFrame / project.fps; $('#mTime').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + (s % 60).toFixed(1).padStart(4, '0'); tr.querySelector('.mplay').textContent = playing ? '❚❚' : '▶'; } requestAnimationFrame(sync); };
  requestAnimationFrame(sync);
}
function applyDevice(force) {
  const dev = detectDevice(), portrait = innerHeight > innerWidth, b = document.body;
  b.classList.toggle('portrait', portrait); b.classList.toggle('landscape', !portrait);
  b.classList.toggle('touch', matchMedia('(pointer: coarse)').matches);
  if (dev === UI.dev && !force) return;
  UI.dev = dev;
  b.classList.remove('dev-phone', 'dev-tablet', 'dev-desktop'); b.classList.add('dev-' + dev);
  if (dev !== 'desktop') {
    buildMobileChrome();
    if (dev === 'phone') { uiMove($('#selRender'), $('#mmRender')); uiMove($('#selAspect'), $('#mmAspect')); }
    else uiRestore();
  } else { uiRestore(); }
  uiSheet(''); document.body.dataset.sheet = '';
  if (typeof resizeTL === 'function') setTimeout(resizeTL, 50);
  if (typeof tlDirty !== 'undefined') tlDirty = true;
}
addEventListener('resize', () => applyDevice());
addEventListener('orientationchange', () => setTimeout(() => applyDevice(true), 200));
addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.dataset.sheet) uiSheet(''); }, true);

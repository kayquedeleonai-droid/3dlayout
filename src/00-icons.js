/* ============================================================
   ÍCONES FLAT (traço 1,75, 24×24, currentColor) — substituem os emojis da interface
   ============================================================ */
const ICONS = {
  move: 'M12 3v18M3 12h18M12 3 9.5 5.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5',
  rotate: 'M20 12a8 8 0 1 1-2.3-5.6M20 4v4.5h-4.5',
  scale: 'M4 14v6h6M4 20l7-7M20 10V4h-6M20 4l-7 7',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 9h17M3.5 15h17M12 3c-2.8 3-2.8 15 0 18M12 3c2.8 3 2.8 15 0 18',
  magnet: 'M5 4h4v8a3 3 0 0 0 6 0V4h4v8a7 7 0 0 1-14 0zM5 8h4M15 8h4',
  path: 'M4 18c3-9 6 1 9-6s5-6 7-6M4 18h.01M20 6h.01',
  grid: 'M4 4h16v16H4zM9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16',
  ruler: 'M3 16 16 3l5 5L8 21zM7.5 11.5l2 2M10.5 8.5l2 2M13.5 5.5l2 2',
  gamepad: 'M7 8h10a4 4 0 0 1 3.9 4.8l-.7 3.2a2.4 2.4 0 0 1-4.1 1.2L14.5 15.5h-5l-1.6 1.7a2.4 2.4 0 0 1-4.1-1.2l-.7-3.2A4 4 0 0 1 7 8zM8 10.5v3M6.5 12h3M15.5 11h.01M17.5 13h.01',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3',
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
  save: 'M5 3h11l3 3v15H5zM8 3v5h7V3M8 21v-7h8v7',
  folder: 'M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5z',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.5M12 17h.01',
  sparkles: 'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6zM18.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
  text: 'M4 6h16M4 12h11M4 18h14',
  play: 'M7 4.5v15l12.5-7.5z',
  download: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14',
  camera: 'M4 8h3.2L9 5.5h6L16.8 8H20v11H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  video: 'M3 7h12v10H3zM15 10.5l6-3.5v10l-6-3.5',
  film: 'M3 5h18v14H3zM7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4',
  person: 'M12 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6.5 12l5.5-2 5.5 2M12 10v5.5M8.5 21l3.5-5.5 3.5 5.5',
  car: 'M3 16.5V13l2.2-5h13.6L21 13v3.5zM5 13h14M7 16.5v1.5M17 16.5v1.5M7.5 13.01v0M16.5 13.01v0',
  paw: 'M8 6.5a1.5 2 0 1 0 0 .01zM16 6.5a1.5 2 0 1 0 0 .01zM5 11a1.5 1.8 0 1 0 0 .01zM19 11a1.5 1.8 0 1 0 0 .01zM12 11c-3 0-5.5 3.5-5.5 6 0 1.6 1.4 2.5 2.8 2.1L12 18.5l2.7.6c1.4.4 2.8-.5 2.8-2.1 0-2.5-2.5-6-5.5-6z',
  building: 'M4 21V6l8-3v18M12 9l8 3v9M3 21h18M7 8h2M7 12h2M7 16h2M15 15h2M15 18h2',
  box: 'M3.5 7.5 12 3.5l8.5 4L12 11.5zM3.5 7.5v9l8.5 4 8.5-4v-9M12 11.5v9',
  clapper: 'M4 10h16v10H4zM4 10 5.6 5.2 19.4 4l.6 6M9.5 4.7 8.2 10M14.8 4.3l-1.3 5.7',
  tree: 'M12 3l5.5 8h-3.5l4.5 6H5.5l4.5-6H6.5zM12 17v4',
  road: 'M9 3 5 21M15 3l4 18M12 4v2.5M12 10v3M12 16.5V20',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  scissors: 'M6 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 14.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8.2 8.2 20 18M8.2 15.8 20 6',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  bird: 'M3 13c3-.5 5-4 9-4 2 0 3 .8 4 2l5-1-3 3.2c-.2 3.8-3.6 6.8-8.5 6.8-2.6 0-4.6-1-5.5-2.8 2 0 3.6-1 4.6-2.7',
  drone: 'M4 6h5M15 6h5M6.5 6v3M17.5 6v3M7 9h10v4H7zM10 13v2.5h4V13',
  crosshair: 'M12 5v14M5 12h14',
  layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5',
  watch: 'M3 5h18v14H3zM10 9v6l5-3z',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
};
function ic(name, size = 16, extra = '') {
  const d = ICONS[name]; if (!d) return '';
  const fill = name === 'play' || name === 'watch' && false ? 'currentColor' : 'none';
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}><path d="${d}"/></svg>`;
}
const CAT_IC = { 'Veículos': 'car', 'Pessoas': 'person', 'Animais': 'paw', 'Aves & voadores': 'bird', 'Cenário': 'building', 'Natureza': 'tree', 'Props': 'box', 'Produto': 'box', 'Primitivas': 'box', 'Câmera & utilitários': 'crosshair' };
function typeIcon(t) { if (t === 'camera') return ic('video'); if (t === 'roadpath' || t === 'road' || t === 'street') return ic('road'); if (t === 'drone') return ic('drone'); const a = ASSETS[t]; return ic(CAT_IC[a && a.cat] || 'box'); }

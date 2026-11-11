// Gera public/index.html a partir de src/ (um único arquivo, three.js via CDN)
import fs from 'node:fs';
import path from 'node:path';
const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const S = (f) => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const ORDER = ['01-core.js', '02-assets.js', '02b-realcar.js', '03-scene.js', '04-pilot.js', '05-ui.js', '06-timeline.js', '07-main.js', '08-export.js', '09-prompt.js', '10-shots.js', '11-clips.js', '13-cinema.js', '14-lensfx.js', '12-ui2.js', '15-standalone.js', '99-start.js'];
const THREE_VER = '0.160.0';
const html = S('head.html')
  + `<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@${THREE_VER}/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@${THREE_VER}/examples/jsm/"}}</script>\n`
  + '<script type="module">\n' + ORDER.map(S).join('\n') + '\n</script>\n</body></html>\n';
fs.mkdirSync(path.join(root, 'public'), { recursive: true });
fs.writeFileSync(path.join(root, 'public', 'index.html'), html);
console.log(`public/index.html — ${(html.length / 1024).toFixed(0)} KB`);

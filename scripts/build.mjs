// Gera public/index.html a partir de src/ (um único arquivo, three.js via CDN)
import fs from 'node:fs';
import path from 'node:path';
const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const S = (f) => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const ORDER = ['00-icons.js', '01-core.js', '02-assets.js', '02b-realcar.js', '02c-carbody.js', '03-scene.js', '04-pilot.js', '05-ui.js', '06-timeline.js', '07-main.js', '08-export.js', '09-prompt.js', '10-shots.js', '11-clips.js', '13-cinema.js', '14-lensfx.js', '12-ui2.js', '15-standalone.js', '16-models.js', '17-roads.js', '18-measure.js', '19-gear.js', '20-speed.js', '21-sequencer.js', '22-commercial.js', '23-terrain.js', '24-ui.js', '99-start.js'];
const THREE_VER = '0.160.0';
const html = S('head.html')
  + `<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@${THREE_VER}/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@${THREE_VER}/examples/jsm/"}}</script>\n`
  + '<script type="module">\n' + ORDER.map(S).join('\n') + '\n</script>\n</body></html>\n';
fs.mkdirSync(path.join(root, 'public'), { recursive: true });
fs.writeFileSync(path.join(root, 'public', 'index.html'), html);
console.log(`public/index.html — ${(html.length / 1024).toFixed(0)} KB`);
// checagem de sintaxe do módulo (falha o build em vez de publicar uma página quebrada)
{
  const { execFileSync } = await import('node:child_process'); const os = await import('node:os');
  const tmp = path.join(os.tmpdir(), 'layout3d-check.mjs'); fs.writeFileSync(tmp, ORDER.map(S).join('\n'));
  try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); } catch (e) { console.error(String(e.stderr || e)); process.exit(1); }
}

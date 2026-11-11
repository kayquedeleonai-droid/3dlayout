/* ============================================================
   MODO SITE PRÓPRIO (fora do claude.ai)
   Sem window.claude, os recursos de IA usam o Worker em /api/claude
   (precisa do segredo ANTHROPIC_API_KEY na Cloudflare). Downloads usam link direto.
   ============================================================ */
(async () => {
  if (window.claude && window.claude.use) return;
  try { const r = await fetch('/api/health', { cache: 'no-store' }); if (!r.ok) return; const h = await r.json(); if (!h.ai) return; } catch (e) { return; }
  const b64 = (b) => new Promise(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.readAsDataURL(b); });
  const getPass = () => { try { return localStorage.getItem('layout3d.pass') || ''; } catch (e) { return ''; } };
  async function call(input, opts = {}, wantJson, retried) {
    const images = []; for (const b of [].concat(opts.images || [])) if (b) images.push({ media_type: b.type || 'image/png', data: await b64(b) });
    const prompt = typeof input === 'string' ? input : input.map(m => m.content).join('\n\n');
    let r;
    try { r = await fetch('/api/claude', { method: 'POST', headers: { 'content-type': 'application/json', 'x-layout3d-pass': getPass() }, body: JSON.stringify({ prompt, images, json: !!wantJson, tier: opts.modelTier || 'default' }), signal: opts.signal }); }
    catch (e) { if (e && e.name === 'AbortError') throw { code: 'cancelled', message: 'cancelado' }; throw { code: 'upstream_error', message: String(e) }; }
    if (r.status === 401 && !retried) { const p = window.prompt('Senha do Layout3D (APP_PASSCODE):'); if (p) { try { localStorage.setItem('layout3d.pass', p); } catch (e) { } return call(input, opts, wantJson, true); } throw { code: 'not_granted', message: 'senha necessária' }; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw { code: r.status === 429 ? 'rate_limited' : 'upstream_error', message: j.error || ('HTTP ' + r.status) };
    const text = j.text || '';
    if (opts.onText) try { opts.onText({ text, delta: text }); } catch (e) { }
    return { text, truncated: j.stop === 'max_tokens' };
  }
  function parseJSON(t) {
    try { return JSON.parse(t); } catch (e) { }
    const m = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) { try { return JSON.parse(m[1]); } catch (e) { } }
    const a = Math.min(...['{', '['].map(c => { const i = t.indexOf(c); return i < 0 ? Infinity : i; })), b = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
    if (isFinite(a) && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { } }
    throw { code: 'invalid_json', message: 'resposta sem JSON válido', text: t };
  }
  const fn = (input, opts) => call(input, opts, false);
  fn.json = async (input, opts) => parseJSON((await call(input, opts, true)).text);
  fn.limits = async () => ({ maxPromptBytes: 200000, images: { maxCount: 4, maxInputBytes: 20e6, mediaTypes: ['image/png', 'image/jpeg', 'image/webp'] } });
  sampleNS = fn;
})();

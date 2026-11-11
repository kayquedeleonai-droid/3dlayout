// Worker do Layout3D: serve o app estático (public/) e a rota de IA /api/claude.
// Segredos (Cloudflare → Workers → 3dlayout → Settings → Variables and Secrets):
//   ANTHROPIC_API_KEY  (obrigatório para os recursos de IA)
//   APP_PASSCODE       (opcional, recomendado: senha pedida pelo app antes de usar a IA)
//   MODEL / MODEL_QUICK (opcionais)
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/api/health') return Response.json({ ok: true, ai: !!env.ANTHROPIC_API_KEY, pass: !!env.APP_PASSCODE });
    if (url.pathname === '/api/claude') {
      if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      if (!env.ANTHROPIC_API_KEY) return Response.json({ error: 'IA não configurada (ANTHROPIC_API_KEY)' }, { status: 503 });
      if (env.APP_PASSCODE && req.headers.get('x-layout3d-pass') !== env.APP_PASSCODE) return Response.json({ error: 'unauthorized' }, { status: 401 });
      let b; try { b = await req.json(); } catch (e) { return Response.json({ error: 'JSON inválido' }, { status: 400 }); }
      const content = [];
      for (const im of (b.images || []).slice(0, 4)) content.push({ type: 'image', source: { type: 'base64', media_type: im.media_type || 'image/png', data: im.data } });
      content.push({ type: 'text', text: String(b.prompt || '').slice(0, 250000) + (b.json ? '\n\nReply with only the JSON value, no prose.' : '') });
      const model = b.tier === 'quick' ? (env.MODEL_QUICK || 'claude-haiku-5-5') : (env.MODEL || 'claude-sonnet-5-5');
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 16000, messages: [{ role: 'user', content }] }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return Response.json({ error: (j.error && j.error.message) || 'erro na API' }, { status: r.status === 429 ? 429 : 502 });
      const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
      return Response.json({ text, stop: j.stop_reason });
    }
    return env.ASSETS.fetch(req);
  },
};

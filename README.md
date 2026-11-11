# Layout3D — Director

Previz / layout 3D procedural no navegador para dirigir cenas e gerar referências de movimento para IA de vídeo.

**Site:** https://3dlayout.kayquedeleon.app

## O que faz
- **Console do diretor**: biblioteca com miniaturas (personagens, veículos, animais, cenário, props, animações, câmeras), painel de objetos, propriedades, preview da câmera (PiP), timeline em trilhas e storyboard de planos.
- **Escala real**: pessoas com antropometria média, animais pela altura de cernelha, **carros de modelo real** construídos pela ficha técnica (entre-eixos, balanços, bitolas, pneus, vão livre) + model sheet de referência na escala e traçado de silhueta com IA.
- **Câmeras de cinema**: corpos com sensor real (ARRI, Sony, RED, Panavision, Canon, Blackmagic, DJI), kits de lentes reais (Signature, Cooke, Supreme, Summilux-C, Primo 70, Master Anamorphic, Orion, Optimo…), anamórfico com squeeze, **óptica simulada** (profundidade de campo física, distorção, vinheta, aberração, bokeh oval), guias de composição e frame lines.
- **Animação**: pilotar e gravar (carro, pessoa, animal, ave, câmera drone), keyframes estilo After Effects, Graph Editor com Easy Ease, clipes de ação para personagens, presets de movimento, 35+ presets de câmera e rigs presos ao carro.
- **Diretor por prompt**: criar do zero, editar a cena atual ou adicionar, com presets de câmera, lente, estética e estrutura (contínuo / multishot).
- **Exportação**: vídeo (Playblast, Clay, Depth, Normal, Segmentação; edição com cortes), PNG, GLB animado, JSON de câmera por frame, prompt de movimento em texto.

## Estrutura
```
src/            código-fonte (módulos concatenados em ordem — ver scripts/build.mjs)
scripts/        build.mjs → gera public/index.html (arquivo único, three.js via CDN)
public/         site estático publicado
worker/         Cloudflare Worker: serve public/ e a rota de IA /api/claude
wrangler.jsonc  configuração do Worker + domínio 3dlayout.kayquedeleon.app
docs/           referências técnicas (fichas de carros e sensores, com fontes)
```

## Desenvolvimento
```bash
npm install
npm run dev      # build + wrangler dev em http://localhost:8787
npm run build    # só gera public/index.html
```

## Deploy (Cloudflare)
O repositório está conectado ao **Cloudflare Workers Builds**: cada push na `main` roda `npm run build` e `npx wrangler deploy`.
O `wrangler.jsonc` publica o Worker **3dlayout** com o domínio personalizado `3dlayout.kayquedeleon.app` (DNS e certificado automáticos; a zona `kayquedeleon.app` precisa estar na mesma conta).

### IA no site próprio (opcional)
Dentro do claude.ai o app usa a conta do Claude do usuário. No domínio próprio, os recursos de IA (diretor por prompt, editar cena, traçar silhueta, preencher ficha) passam pelo Worker:
- Cloudflare → Workers → **3dlayout** → Settings → Variables and Secrets:
  - `ANTHROPIC_API_KEY` (secret) — chave da API Anthropic
  - `APP_PASSCODE` (secret, recomendado) — senha que o app pede antes de usar a IA, para ninguém gastar seus créditos
Sem a chave, o app funciona normalmente com o interpretador rápido (sem IA).

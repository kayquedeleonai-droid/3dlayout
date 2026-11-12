# Layout3D — estudo de UI/UX

Objetivo: uma ferramenta de previs que pareça um set de filmagem — direta, limpa, com o filme sempre à vista — sem perder a precisão (escala real, lentes, equipamentos, velocidade).

## 1. Quem usa e o que precisa fazer

| Momento | O que o diretor quer | Onde acontece hoje |
|---|---|---|
| Montar | colocar carro, pessoas, estrada, cenário | Biblioteca (esquerda) + viewport |
| Animar | trajetória, velocidade, ações | Inspetor (direita) + timeline |
| Filmar | câmeras, lentes, equipamentos, enquadramento | Biblioteca › Câmeras, barra de lente, inspetor |
| Editar | ordem dos planos, cortes, ritmo | Trilha **Montagem** + Decupagem |
| Assistir / entregar | ver o filme inteiro, exportar para IA | **Assistir filme**, Exportar |

## 2. Diagnóstico (antes)

1. **Ícones inconsistentes** — emojis coloridos de famílias diferentes competiam com o conteúdo 3D e mudavam de aparência em cada sistema.
2. **A edição estava escondida** — o storyboard ficava no rodapé da timeline e só existia no modo Dope; "assistir o filme" dependia de achar a opção certa num seletor.
3. **Timeline poluída** — cada árvore e rocha virava uma linha, empurrando o carro e as câmeras para fora da tela.
4. **Leitura da cena fraca** — carro, asfalto e fundo com tons parecidos; difícil perceber profundidade.
5. **Excesso de texto técnico no viewport** — informação útil, mas sempre ligada.
6. **Painel de propriedades longo** — muitas seções abertas ao mesmo tempo.

## 3. Princípios

- **O filme é o centro**: a montagem fica sempre visível no topo da timeline e o filme roda com um clique.
- **Revelação progressiva**: o básico aparece primeiro; o técnico (ficha, limites, curvas) fica em seções recolhíveis.
- **Um idioma visual**: ícones de traço único (24 px, traço 1,75), monocromáticos; cor só para significado (câmera de cada plano, aviso, gravação).
- **Separação por tom**: herói saturado, pista escura, fundo dessaturado com névoa — a profundidade se lê sem esforço.
- **Erros visíveis e explicados**: limites de equipamento, terreno x estrada, velocidade — sempre com o porquê e onde.

## 4. O que já foi aplicado

- Conjunto de **ícones flat próprios** (barra superior, ferramentas do viewport, abas da biblioteca, tipos de objeto no outliner e na timeline).
- **Trilha Montagem** no topo da timeline: planos numerados, miniatura, lente e duração; arrastar câmeras do painel Objetos; arrastar um plano sobre outro troca a ordem; bordas aparam.
- **Assistir filme** em tela cheia, com barra de planos clicável e repetição.
- Timeline mostra **só objetos animados** por padrão (cenário estático fica fora; um clique mostra tudo).
- Modo **Playblast · leitura** como padrão.
- Seletores de vista sem emojis ("Vista do diretor", "Filme completo · todos os planos", "Câmera · …").

## 5. Próximos passos propostos

1. **Três espaços de trabalho** na barra superior — *Montar · Animar · Filmar* — que só reorganizam painéis (biblioteca certa aberta, seções do inspetor certas, timeline em Dope/Curvas/Montagem).
2. **Barra flutuante contextual** perto do objeto selecionado (mover, girar, pilotar, câmera olhar para) em vez de procurar no inspetor.
3. **Inspetor em abas**: Objeto · Movimento · Câmera/Lente · Equipamento; seções técnicas recolhidas.
4. **Paleta de comandos (Ctrl+K)**: "adicionar Technocrane", "carro a 120 km/h", "plano 3 para 85 mm".
5. **HUD do viewport enxuto**: uma linha com câmera · lente · tempo; detalhes ao passar o mouse.
6. **Estados vazios que ensinam**: cena nova sugere "Estrada + carro + 3 câmeras" e explica a Montagem.
7. **Miniaturas da biblioteca em estilo único** (mesmo fundo, luz e ângulo) e busca por intenção ("perseguição", "drone").
8. **Acessibilidade**: contraste AA nos textos secundários, foco de teclado visível, atalhos na dica de cada botão.

## 6. Como medir

- Tempo até o primeiro filme assistido numa cena nova (meta: < 3 min).
- Cliques para trocar a câmera de um plano (meta: 1 arraste).
- Nº de seções do inspetor abertas por padrão (meta: ≤ 3).

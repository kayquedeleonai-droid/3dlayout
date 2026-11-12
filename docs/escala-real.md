# Escala real — referências usadas no Layout3D

Unidade única: **1 unidade = 1 metro**. Y para cima, chão em y = 0. Toda medida abaixo foi conferida no app medindo o bounding box de cada asset (script de auditoria) ou com a régua 📏.

## Vias (CONTRAN, Manual Brasileiro de Sinalização de Trânsito, vol. IV, 2022)

| Elemento | Valor no app | Referência |
|---|---|---|
| Largura de faixa | 3,50 m (ajustável 2,5–4,5) | rodovia 3,5–3,6 m; urbana 3,0–3,5 m |
| Acostamento (estrada com curvas) | 2,50 m (ajustável) | rodovia classe I: 2,5–3,0 m |
| Linha de bordo (LBO) | 0,15 m rodovia / 0,10 m cidade | 0,10 m (<80 km/h), 0,15 m (≥80 km/h), a 0,10–0,20 m da borda |
| Tracejado (LFO-2 / LMS-2) | rodovia 4 m traço / 12 m espaço; cidade 2 m / 4 m | ≥80 km/h: 4/12 (largura 0,15); <60 km/h: 2/4 (largura 0,10) |
| Linha dupla amarela (LFO-3) | 0,15 m cada, 0,12 m entre elas | 0,10–0,15 m cada, 0,10–0,15 m entre elas |
| Meio-fio | 0,15 m de altura | padrão urbano 0,15 m |
| Calçada | 3–4 m | mínimo usual 1,5–2,5 m |
| Guard-rail (defensa) | topo a 0,80 m, postes a cada 4 m | defensa metálica ~0,75–0,80 m |
| Viaduto | laje 0,9 m, pilares Ø 1,2 m a cada 24 m | — |

## Veículos

Carros reais usam a ficha técnica (comprimento, largura sem retrovisores, altura, entre-eixos, balanços, bitolas, pneus). Os genéricos usam o mesmo gerador de carroceria com medidas típicas:

| Asset | C × L × A (m) |
|---|---|
| Sedã | 4,70 × 1,83 × 1,45 |
| SUV | 4,80 × 1,95 × 1,75 |
| Esportivo | 4,50 × 1,94 × 1,25 |
| Caminhão (baú) | 9,0 × 2,5 × 3,7 (máx. legal BR: 2,60 de largura, 4,40 de altura) |
| Ônibus urbano | 12,0 × 2,58 × 3,05 |

## Pessoas e animais

| Asset | Medida |
|---|---|
| Homem | 1,75 m (topo do crânio = altura) |
| Mulher | 1,65 m |
| Criança | 1,15 m (cabeça proporcionalmente maior) |
| Cachorro (porte labrador) | cernelha 0,57 m |
| Cavalo | cernelha 1,60 m, largura 0,60 m |
| Vaca | cernelha 1,40 m, largura 0,72 m |

## Objetos

Lata 350 ml 0,122 × Ø0,066 · garrafa 0,31 m · smartphone 0,16 × 0,08 · cone 0,75 m · barreira New Jersey 0,83 m · degrau 0,18 / 0,30 m · andar de prédio 3,2 m · poste 7 m.

## Como conferir

- **Régua 📏 (tecla M):** clique em dois pontos; mostra distância total, horizontal e vertical.
- O inspetor mostra as dimensões do objeto selecionado.
- Escala (sx/sy/sz) diferente de 1 muda o tamanho real: prefira mudar os parâmetros em metros.

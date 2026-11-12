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

## Equipamentos de filmagem (limites usados na verificação)

| Equipamento | Limites no app | Fonte |
|---|---|---|
| Tripé + cabeça fluida | lente 0,15–2,0 m; câmera não se desloca | típico (baby legs/hi-hat a padrão) |
| Slider 1,2 m | deslocamento ≤ 1,2 m em linha reta, ≤ 1 m/s | típico |
| Dolly Chapman Super PeeWee IV | lente 0,48–1,53 m; ≤ 3 m/s; bitola 0,62 m | Chapman/Leonard (modo baixo 48 cm, extensor 1,53 m) |
| Steadicam | lente 0,4–1,9 m; ≤ 4,5 m/s | típico (operador correndo) |
| Gimbal de mão | lente 0,2–2,1 m; ≤ 6 m/s | típico |
| Câmera na mão | lente 0,3–1,9 m; ≤ 5 m/s; tremor | típico |
| Jib 4 m | alcance 0,6–4 m do pivô (1,5 m); lente ≤ 5,5 m | típico |
| Technocrane SuperTechno 30 | alcance 2,65–9,14 m do poste; lente ≤ 9,2 m; telescópio ≤ 1,83 m/s; base 1,49 × 1,65 m | Panavision / Cinemoves |
| Russian Arm (U-Crane) | braço 4,3 m; carro ≤ 150 km/h | Bickers / XD Motion |
| Car mount | carro ≤ 100 km/h | típico — confirmar com o rigger |
| DJI Inspire 3 | ≤ 94 km/h; sobe/desce 8 m/s; altura ≤ 120 m | DJI |
| Drone FPV de cinema | ≤ ~120 km/h; altura ≤ 120 m | típico |
| Cable cam | linha reta, ≤ 10 m/s, lente 2–40 m | típico |

## Velocidade e quilometragem

- Velocidade e odômetro medidos em 3D (inclui rampas da estrada), com 4 sub-amostras por frame.
- O perfil de velocidade (tempo, km/h) é integrado de forma exata e o objeto é reposicionado na mesma trajetória pelo comprimento de arco. Teste: 0→100 km/h em 4 s → 55,56 m em 4 s e 222,22 m em 10 s (erro < 0,2 km/h).

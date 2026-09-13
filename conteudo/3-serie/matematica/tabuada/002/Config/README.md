# Posições do computador — jogo 002

Edite `monitor_position.json`. Cada item em `positions` descreve uma posição reutilizável; em `levels`, informe o `id` ou uma lista de `id`s para cada fase. Se a lista tiver mais de um item, o jogo escolhe um deles aleatoriamente.

```json
{
  "id": 4,
  "description": "Centro, plataforma do meio",
  "left": "46%",
  "top": "41.647%",
  "stand": { "x": 390, "y": 183, "toleranceX": 18, "toleranceY": 12 },
  "exitRoute": "center"
}
```

## O que cada campo faz

- `left` e `top`: posição visual do computador em porcentagem da sala. Eles movem somente a imagem.
- `stand`: zona lógica que abre o monitor lateral. `x` e `y` são a posição do canto superior esquerdo do personagem na malha interna de 800 × 425. `toleranceX` e `toleranceY` são a margem permitida em cada direção.
- `exitRoute`: rota segura que o personagem segue depois de clicar em **Atravessar a porta**. Ela é escolhida pela plataforma onde o computador está, não pela fase.

O monitor nunca abre por proximidade apenas horizontal: o personagem precisa estar dentro da zona `stand` e apoiado em uma plataforma.

## Posições que já existem

| Posição visual | `stand` | `exitRoute` |
| --- | --- | --- |
| Coluna 1, linha 1 | `x: 86, y: 113` | `upper-left` |
| Coluna 1, linha 2 | `x: 22, y: 283` | `lower-left` |
| Coluna 2, linha 1 | `x: 402, y: 58` | `top-center` |
| Coluna 2, linha 2 | `x: 390, y: 183` | `center` |
| Coluna 3, linha 1 | `x: 606, y: 108` | `upper-right` |
| Coluna 3, linha 2 | `x: 618, y: 243` | `lower-right` |

Use `toleranceX: 18` e `toleranceY: 12` como padrão. Eles criam uma área pequena o bastante para exigir que a criança esteja diante do computador, sem tornar a chegada difícil.

## Como escolher `stand` depois de mudar `left` e `top`

1. Posicione visualmente o computador sobre uma das plataformas existentes.
2. Escolha a rota da mesma plataforma na tabela acima.
3. Defina `stand.y` como `top da plataforma - 32`, pois o personagem tem 32 unidades de altura. Defina `stand.x` em um ponto seguro da plataforma, mantendo `x + 28` dentro dos limites dela.
4. Abra o jogo e teste: o monitor deve ficar escondido no começo, aparecer somente ao chegar à frente do computador e a saída deve chegar à porta sem choque.

Como primeiro palpite para uma posição que siga o mesmo encaixe visual dos seis computadores atuais, use `stand.x ≈ left(%) × 8 + 22` e `stand.y ≈ top(%) × 4,25 + 6`; em seguida, confirme que o resultado está exatamente sobre a plataforma escolhida.

As rotas disponíveis são `upper-left`, `lower-left`, `top-center`, `center`, `upper-right` e `lower-right`. Se o computador ficar em uma plataforma nova, perto de um arco, ou fora dessas seis áreas, não reutilize uma rota por aproximação: será preciso criar uma nova rota segura em `jogo.js` e documentá-la aqui.

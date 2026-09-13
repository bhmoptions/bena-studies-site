# Jogo 003 — A caixa dos produtos

Jogo 3 de Matemática → Tabuada, na 3ª série. Abra pelo catálogo ou em
[servidor local](http://localhost:8765/conteudo/3-serie/matematica/tabuada/003/index.html).
Usa o mesmo servidor estático do README principal. Não há compilação nem instalação de dependências.

## Como jogar

Há uma prateleira fixa com todos os tipos de frasco em frente a cada uma das
quatro balanças. Arraste um frasco da mesa ou do painel até qualquer prato
visível. Também é possível selecioná-lo no painel e clicar em **Colocar aqui**.

Para retirar, segure um frasco que está no prato e solte-o fora da balança:
ele volta à prateleira. Soltar no mesmo prato não altera os grupos.
Escape, perda de foco ou cancelamento do gesto devolvem o frasco à origem.
Arrastar entre pratos faz uma transferência: se o destino estiver cheio,
resolvido ou tiver outro tipo, o frasco volta à origem. **− 1** e **Esvaziar**
continuam disponíveis como alternativas. Cada prato comporta dez frascos e
até cem bolinhas. Lados resolvidos permanecem bloqueados durante a rodada.

A conferência acontece no próprio objeto 3D, sem um botão genérico no painel:

| Lado | Controle para conferir |
| --- | --- |
| Roxo | Clicar no botão verde no canto inferior direito |
| Amarelo | Clicar no botão amarelo central |
| Vermelho | Arrastar a engrenagem pequena no canto inferior esquerdo para girá-la |
| Azul | Arrastar a engrenagem central para girá-la |

Uma engrenagem precisa girar ao menos 45° em um único gesto; a resposta é
enviada ao soltar. Clique, giro curto, retorno à posição inicial ou Escape
não enviam resposta. Cada gesto envia no máximo uma resposta.
Perto do eixo, um arraste lateral também gira a engrenagem, para facilitar o uso.
As áreas de toque acompanham a projeção e a posição real dos objetos.

Nas três balanças de ponteiro, forme grupos iguais até alcançar a marca.
Na roxa, os pratos precisam de totais iguais com tipos diferentes de frasco.
Cada mecanismo tem sua dica em um bilhete físico à direita da balança, na cor
correspondente à sua face da caixa; ela não é repetida no painel de controles.
O prato mais pesado desce. Mover, retirar e tentar misturar frascos não são
respostas submetidas e não geram erros de pontuação.

No acerto, a face fica entreaberta na dobradiça esquerda, seu fundo acende
com a cor correspondente e uma breve fumaça sai pela fresta.
No erro válido, a face tenta abrir, emperra e volta a fechar.
O mascote compartilhado mantém o feedback pedagógico aprovado.
O quarto acerto abre a tampa e revela o pergaminho com a pontuação.

Arraste o fundo para orbitar, role para aproximar ou use os botões de câmera.
Segure **Shift** enquanto arrasta ou arraste com o botão direito para deslocar o enquadramento sobre a mesa;
as quatro setas ao lado dos controles fazem o mesmo para mouse, toque e teclado.
Ao aproximar, a câmera sobe levemente e desloca o foco para a balança ativa,
mantendo os frascos da prateleira frontal no enquadramento. **Centralizar**
restaura distância, ângulo e foco desse mecanismo.
No foco do cenário, ← e → giram a câmera; ↑, ↓, + e − controlam a distância.
Tab também alcança o controle físico de cada face visível: Enter/Espaço
pressiona os botões; as setas giram as engrenagens em passos de 15°.
Escape cancela qualquer arraste ou fecha as instruções. A redução de movimento
mantém os resultados e os gestos diretos, mas remove fumaça e oscilações passivas.

## Integração e pontuação

- Contrato existente: `window.BENA_JOGO.iniciar(container, voltar)`, com retorno de limpeza.
- Registro: `conteudo/catalogo.js`, entrada `003`, com `pagina` e `arquivo`.
- Pontuação: `BenaPontuacao.iniciarRodada('3-serie/matematica/tabuada/003')` e
  `BenaPontuacao.calcular`. N = 4, sem bônus de tempo.
- A = mecanismos resolvidos sem erro anterior. E = todas as respostas erradas válidas.
  A mesma combinação já rejeitada fica impedida de novo envio; editar até uma
  combinação diferente libera nova resposta. Acertos ficam bloqueados contra duplicatas.
- A rodada começa depois da criação bem-sucedida da cena. Abandonar rende zero.
- O resultado usa dados do componente central, tanto no pergaminho 3D quanto
  no resumo HTML acessível. Não há fórmula alternativa nem ranking.
- Repete dentro da página: a rodada aumenta e os descontos compartilhados se aplicam.
  Sair/recarregar zera a memória provisória, como nas outras páginas independentes.
- Mascote: `BenaFeedback.mostrar`, com títulos/animações aprovados e orientação
  de arraste pelo quarto argumento já existente.
- Áudio: sinais breves sintetizados, sem música. Preferência local
  `bena-audio-muted`; nenhum áudio toca antes de interação. O site ainda não tinha
  controle global de áudio. Essa chave pode ser compartilhada por controles futuros.
- Configurações recentes ficam em `sessionStorage['bena-caixa-puzzles']` apenas
  para variar os próximos desafios; não contêm aluno, pontos ou progresso.

## Organização

| Arquivo | Responsabilidade |
| --- | --- |
| `logica.mjs` | Gerador por produtos válidos, validadores, estado, eventos e dados para pontuação |
| `modelos.mjs` | Geometria original, materiais, texturas procedurais, caixa, balanças, frascos e pergaminho |
| `cena.mjs` | Iluminação, câmera, raycasting, encaixe, ponteiros, equilíbrio, abertura e descarte |
| `interacao.mjs` | Arraste, retirada, transferência, cancelamento e seleção alternativa |
| `mecanismos.mjs` | Mapa dos quatro controles e regras puras do gesto de rotação |
| `controles-caixa.mjs` | Botões e engrenagens 3D com rotação, clique e foco projetado de teclado |
| `efeitos.mjs` | Dobradiças, abertura parcial, fumaça, iluminação e emperramento |
| `audio.mjs` | Efeitos sonoros e preferência de som |
| `app.mjs` | Interface, fluxo, integração de feedback/pontos e ciclo da rodada |
| `jogo.js` / `pagina.js` | Contrato do site, carregamento, série ativa e saída |
| `estilo.css` | Interface da oficina e adaptação a diferentes tamanhos de tela |

As três balanças de ponteiro leem as configurações de
`assets/files/3rd grade/math/003/Multiplication Box Puzzle.json`. A cada rodada,
o jogo sorteia uma entrada até 24 para a azul, uma de 25 a 40 para a amarela e
uma acima de 40 para a vermelha. Cada uma mostra somente os seus cinco frascos
e aceita exclusivamente os pares `correct` do arquivo — não são inferidos
novos pares pela multiplicação. Os frascos comportam de 2 a 12 bolinhas.
Além disso, as três balanças recebem aleatoriamente uma operação cada (1 soma, 1 subtração
e 1 divisão, sem repetição) a partir de `assets/files/3rd grade/math/003/Contas.json`. O bilhete
físico exibe a dica correspondente: "Essa é fácil..." com `X + Y = ?`, "Vamos subtrair?"
com `X - Y = ?` ou "Você sabe dividir?" com `X ÷ Y = ?`. A balança roxa continua com
sua regra própria de equilibrar dois tipos diferentes de frasco, sorteando os seus cinco frascos
entre quatro grupos autorizados: `[3, 4, 5, 7, 12]`, `[4, 6, 7, 9, 10]`, `[2, 3, 5, 7, 8]` ou `[2, 5, 6, 9, 12]`.
As relações da roxa são verificadas entre tipos diferentes com no máximo
dez frascos por prato. As oito configurações recentes orientam a antirrepetição.

## Apresentação e desempenho

Direção: **oficina mágica de mecanismos antigos**, com madeira, latão envelhecido,
engrenagens, luz de cor em cada mecanismo e pergaminho físico.
Avaliação de design (DFII): impacto 5, contexto 5, viabilidade 4, desempenho 4,
risco de consistência 3 → **15**. O caderno e a tipografia do site permanecem
na interface; o pergaminho 3D usa Georgia para legibilidade.
Espaçamento em passos de aproximadamente 4–8 px. Movimento serve à câmera,
ao peso, ao destravamento e à revelação.

Os modelos são originais e usam as imagens fornecidas apenas como referências
de estilo. Nenhuma fotografia de referência foi incorporada ou retocada.
A caixa é oca, com quatro faces reais e tampa articulada, sem painéis HTML
substituindo o volume. Os frascos têm instâncias de esferas correspondentes
exatamente ao valor. Miniaturas da prateleira são renderizadas a partir
dos mesmos modelos 3D, não de desenhos aproximados.

Three.js **0.180.0**, OrbitControls e BufferGeometryUtils estão versionados
localmente em `assets/vendor/three`, com licença MIT. Não há CDN em execução.
Documentação de referência:
[OrbitControls](https://threejs.org/docs/pages/OrbitControls.html) e
[WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html).

Ornamentos estáticos são combinados por material; bolas usam InstancedMesh.
Geometrias e materiais são reutilizados, a resolução de renderização é limitada
a 1,5 × e a sombra principal a 2048². O loop para de desenhar em aba oculta;
nova rodada e saída liberam eventos, áudio, controles, contexto e recursos.
A redução de movimento retira interpolação prolongada e mostra a recompensa
sem sequência de espera. ResizeObserver acompanha a área real disponível.
WebGL 2 e acesso HTTP são necessários; há mensagens de recuperação para
abertura direta por arquivo, falha de carga e perda do contexto.

## Verificação

Na raiz do projeto, com o servidor local ativo para os testes de navegador:

```text
node --test verificacao/caixa-logica.mjs
node verificacao/pontuacao.cjs
node verificacao/caixa-browser.cjs
node verificacao/caixa-preview.cjs
node verificacao/check.cjs
```

A suíte matemática cobre 5.000 configurações, regras de ambos os tipos de
balança, limites, mistura, direção de inclinação, estado, tentativas,
bloqueio de duplicatas, abandono, repetição e os quatro mecanismos.
A suíte de navegador joga por controles reais, verifica a inclinação 3D,
câmera, arraste, teclado, pontuação, abertura do pergaminho, nova rodada,
redução de movimento, tamanhos 1440/1024/390 e liberação de recursos.
As imagens de verificação ficam em `verificacao/caixa-*.png`.

`#game.benaInspect()` fornece apenas uma cópia de leitura do estado e
telemetria da cena para os testes. Não é uma API para submeter respostas.
Como nos demais jogos, as respostas individuais do navegador ainda precisam
de validação no servidor antes que qualquer ranking seja considerado resistente
a manipulação.



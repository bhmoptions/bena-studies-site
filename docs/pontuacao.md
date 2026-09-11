# Pontuação e ranking — regras v1.0.0

Regra do projeto para todos os jogos. É uma decisão de produto, ajustável pelo responsável após observar o uso real. Fonte executável: `config/pontuacao.js` e `assets/componentes/pontuacao.js`. Não criar fórmulas próprias por jogo.

## Objetivo
Valorizar aprender com precisão, reduzir o ganho de repetir o mesmo jogo e tornar os erros mais relevantes nas repetições. Velocidade nunca substitui precisão. Não retirar pontos já conquistados nem impedir treino.

## Definições obrigatórias
- N: número de questões previstas para uma rodada completa, fixado antes de começar.
- A: questões acertadas na PRIMEIRA resposta, sem dica solicitada. Corrigir uma questão depois de errar não transforma essa questão em acerto de primeira.
- E: número total de respostas erradas, incluindo vários erros na mesma questão. Cliques em respostas já desabilitadas e eventos duplicados não contam. Resposta vazia não deve ser enviada.
- P = A / N: precisão oficial, exibida como percentual de acertos na primeira tentativa. Não usar questões eventualmente resolvidas / N, pois nos jogos com novas tentativas isso terminaria sempre em 100%.
- r: número da rodada INICIADA pelo mesmo aluno, no mesmo jogo, na mesma temporada. Começa em 1. Reabrir o jogo não zera r.
- Uma rodada só recebe pontos se for concluída. Sair, fechar a janela ou abandonar rende zero e consome aquela rodada. É permitido continuar treinando. No futuro, falhas técnicas comprovadas devem permitir retomar o mesmo identificador de rodada, sem consumir outra.
- Jogos com dica voluntária, pular ou tempo limite devem tratar a questão como não acertada de primeira e registrar pelo menos um erro por questão não resolvida sem ajuda; não podem simplesmente diminuir N. Se várias dessas ações ocorrerem na mesma questão, evitar duplicar uma única ocorrência. Registrar os eventos para auditoria.

## Fórmula

```text
P = A / N
pesoErro = 0,15 × [1 + 0,5 × (r − 1)]
qualidade = máximo(0, P² − pesoErro × E/N)
fatorRepetição = 0,5^(r − 1), para r de 1 a 5; depois é zero
pontos = arredondar(1000 × qualidade × fatorRepetição × (1 + bônusTempo))
```

Arredondar apenas no fim, ao inteiro mais próximo (metades para cima, como Math.round para números positivos). Usar precisão completa no cálculo; percentual visual com no máximo uma casa decimal. Rodadas incompletas sempre valem zero. Não há pontuação negativa.

Acertos e erros são normalizados pelo tamanho da rodada: jogos longos não recebem pontos extras só por terem mais perguntas. Não há bônus por iniciar jogos, clicar, sequência de dias ou volume bruto. Cada jogo representa uma unidade pedagógica com escopo razoável; não dividir o mesmo exercício em dezenas de jogos para multiplicar pontos.

### Repetição
| Rodada | Fator dos pontos | Peso do erro |
| --- | --- | --- |
| 1 | 100% | 0,15 |
| 2 | 50% | 0,225 |
| 3 | 25% | 0,30 |
| 4 | 12,5% | 0,375 |
| 5 | 6,25% | 0,45 |
| 6 em diante | 0% — treino livre | sem efeito nos pontos |

A penalidade do erro cresce no cálculo da qualidade, antes do desconto por repetição. O valor absoluto de cada erro em pontos pode cair porque a rodada inteira vale menos. Não existe punição acumulada que retire pontos anteriores.

### Exemplos: dez questões, sem tempo
| A | E | Precisão | Rodada | Pontos |
| --- | --- | --- | --- | --- |
| 10 | 0 | 100% | 1 | 1000 |
| 9 | 1 | 90% | 1 | 795 |
| 8 | 2 | 80% | 1 | 610 |
| 9 | 1 | 90% | 2 | 394 |
| 9 | 1 | 90% | 3 | 195 |
| 0 | 10 | 0% | 1 | 0 |
| 10 | 0 | 100% | 6 | 0 |

Cinco rodadas perfeitas do mesmo jogo somam 1938 pontos sem tempo (1000 + 500 + 250 + 125 + 63). Portanto, um jogo sozinho tem um teto. Repetir com erros rende menos.

## Tempo opcional
Desativado por padrão. Somente o responsável pode decidir quais jogos contam tempo. A configuração por jogo fica em `config/pontuacao.js`, com `tempoAtivo` e `tempoReferenciaSegundos`. Na tabuada 001, está DESATIVADO. O valor 120 é apenas uma referência preparada, a calibrar antes de ativar.

T é o tempo decorrido em segundos, do início da primeira questão até a resposta que conclui a última. Inclui leitura, dicas, animações e intervalos entre questões; não inclui a escolha do jogo nem a espera na tela final. Não pausar por trocar de aba: isso permitiria manipular o bônus. Sem tempo limite e sem perder pontos por demorar. Mostrar aviso quando tempo valer pontos, antes ou junto da primeira pergunta. Se um jogo tiver timeout, definir seu tratamento antes de habilitar esse modo.

```text
Se tempo desativado ou P < 0,80: bônusTempo = 0
Caso contrário:
bônusTempo = 0,10 × limitar[2 × (1 − T / referência), entre 0 e 1]
```

No tempo de referência ou mais lento: nenhum bônus. Na metade da referência ou mais rápido: bônus máximo de 10%. Com referência de 120s: 120s → 0%; 90s → 5%; 60s → 10%. Acerto perfeito na primeira rodada: respectivamente 1000, 1050 e 1100 pontos. O bônus incide depois das penalidades e não aumenta pontos de qualidade zero.

Não usar tempo de jogos sem cronômetro para desempatar. Não comparar velocidade entre jogos com regras diferentes. Jogos cronometrados e não cronometrados devem estar disponíveis igualmente para os participantes do mesmo ranking. O teto de cinco rodadas perfeitas com bônus máximo é 2132 pontos, pelo arredondamento individual.

## Ranking oficial futuro
Ainda não existe login nem persistência. As regras abaixo são contrato para a futura implementação, não funcionalidades já entregues.

- Separar rankings por turma/série, temporada e conjunto de jogos disponível para todos. Não comparar alunos de séries diferentes.
- Temporada é criada/encerrada explicitamente pelo responsável (por exemplo, preparação para uma prova). Não reiniciar o limite de repetições por dia, atualização de página ou edição visual do jogo.
- Chave de repetição: aluno + temporada + identificador pedagógico completo do jogo. Exemplo: `3-serie/matematica/tabuada/001`. IDs 001 de temas diferentes não são o mesmo jogo. Atualizar perguntas ou visual não renova a cota; uma atividade realmente nova deve ser cadastrada pelo responsável.
- Total do ranking = soma dos pontos das rodadas concluídas elegíveis (no máximo as cinco primeiras rodadas iniciadas por jogo). Guardar também jogos distintos concluídos, rodadas iniciadas, concluídas e abandonadas, A, E, N e tempo quando ativo.
- Desempate: 1) maior total de pontos; 2) maior quantidade de jogos distintos concluídos com pelo menos 80% de precisão em uma rodada pontuável; 3) maior precisão agregada das rodadas pontuáveis concluídas, soma(A)/soma(N); 4) empate real, mesma posição. Sem desempate por quem começou antes, velocidade em jogos sem tempo, ou nome.
- Rodadas de treino (6+) não afetam nem pontos nem desempate. Quantidade de jogos distintos só beneficia desempate; não há bônus duplicado por diversidade.
- Congelar conjunto de jogos e configurações na temporada. Se houver mudanças relevantes de fórmula, usar nova versão/temporada; não misturar pontuações calculadas sob regras distintas sem recálculo explícito e auditável.
- O servidor deve gerar o ID da rodada e reservar r de forma atômica antes da primeira pergunta, autenticando o aluno e impedindo rodadas simultâneas do mesmo jogo. Requisições repetidas para a mesma rodada não geram novos pontos.
- Validar as respostas e calcular A/E/N/tempo/pontos no servidor. Nunca aceitar pontos, número da repetição ou acertos declarados pelo navegador como verdade. Registrar eventos, configurações, versão da fórmula e timestamps; rejeitar durações impossíveis, respostas fora da rodada e duplicatas. Usar relógio do servidor no ranking oficial.

## Implementação atual e contrato de uso
- `BenaPontuacao.calcular({total, acertosPrimeira, erros, rodada, concluida, tempoAtivo, segundos, referenciaSegundos})`: cálculo puro, validado, retorna pontos e detalhes. Quando tempo não é ativo, o tempo não influencia e o retorno é null para segundos.
- `BenaPontuacao.iniciarRodada(chave)`: contador provisório em memória desta aba. Consumido ao abrir a primeira questão; reabrir o jogo ou clicar “Jogar de novo” incrementa. ATUALIZAR A PÁGINA ZERA O CONTADOR. Não é identificado por aluno, persistido ou seguro para ranking. Não usar esse contador no ranking oficial.
- As páginas carregam `config/pontuacao.js` antes de `assets/componentes/pontuacao.js` e do jogo. Novas páginas independentes devem carregar essas dependências.
- A tabuada registra cada erro válido e acerto de primeira, apresenta pontos, percentual, erros e repetição ao final. O mascote aprovado continua igual. Pontos exibidos são apenas demonstração.
- Tempo futuro em novos jogos: medir do início efetivo à conclusão, congelar na última resposta e passar em segundos. A tabuada já possui medição condicional, sem tempo valendo pontos hoje. Não passar milissegundos ao cálculo.

## Verificações obrigatórias
Exemplos numéricos da tabela; rodadas perfeitas; vários erros na mesma questão; desempenho zero; repetição 6+; rodada abandonada; reinício e reabertura; precisão inferior a 80% sem bônus; tempo lento sem penalidade; bônus limitado a 10%; tempo desativado; rejeição de dados inconsistentes. O teste `verificacao/pontuacao.cjs` cobre o motor; `verificacao/check.cjs` cobre a integração na tabuada.

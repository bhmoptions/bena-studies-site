# Padrão aprovado: mascote do caderno

Este padrão foi aprovado pelo usuário para os jogos do Bena Studies. Público: crianças de 8–9 anos. Use o jogo `conteudo/3-serie/matematica/tabuada/001/jogo.js` como exemplo de integração.

## Apresentação e mensagens
Coloque o feedback perto da pergunta e antes das opções. Deve ficar claro por texto, símbolo e cor se houve acerto ou erro. A mensagem permanece depois da animação.

- `ready`: mascote sorridente, “Vamos nessa!” e “Estou torcendo por você.”
- `success`: painel verde, “✓ ACERTOU!”, “Boa descoberta!” e a resposta/explicação específica do exercício. O mascote levanta os braços, pula duas vezes e aparecem estrelas (cerca de 1,3 segundo no total).
- `error`: painel coral, “× AINDA NÃO!” e “Vamos pensar juntos?”. O mascote fica pensativo e inclina a cabeça suavemente durante cerca de 1 segundo. A dica aparece separada, com “Uma dica para você”.

Não substituir por uma frase pequena abaixo das respostas. Não adicionar sons de susto, flashes, animações contínuas ou mensagens que humilhem a criança. Respeitar `prefers-reduced-motion`: remover movimentos mantendo os símbolos e mensagens.

## Componente compartilhado
Implementação: `assets/componentes/feedback.js`. Estilos: bloco de mascote em `assets/site.css`. As páginas existentes já carregam o componente antes de `assets/site.js`. Novas páginas independentes também precisam carregar ambos os arquivos.

Crie a região uma vez por pergunta, antes dos controles de resposta:

```html
<div class="feedback" role="status" aria-live="polite" aria-atomic="true"></div>
```

Passe o elemento, um dos três estados e texto simples (não HTML):

```js
const area = container.querySelector('.feedback');
BenaFeedback.mostrar(area, 'ready');
BenaFeedback.mostrar(area, 'error', '2 × 3 é o mesmo que somar 2 + 2 + 2.');
BenaFeedback.mostrar(area, 'success', '2 × 3 = 6');
```

A dica e a explicação mudam conforme o exercício. A estrutura visual, os títulos e as animações são compartilhados. Não copie o SVG ou a implementação do componente para cada jogo.

## Comportamento do jogo
O componente apresenta feedback; o jogo continua responsável por avaliar respostas, tentativas, progresso e botões.

- Ao errar: marcar a alternativa escolhida com × e identificação acessível, desabilitar apenas essa alternativa e permitir outra tentativa. Exibir uma dica pedagógica. Não avançar automaticamente.
- Ao acertar: marcar a resposta com ✓ e identificação acessível, impedir respostas duplicadas e disponibilizar “Próxima conta” / “Próxima pergunta”. A criança decide quando continuar.
- Ao mudar de pergunta: voltar ao estado `ready`, limpar os marcadores e reativar as respostas.
- Para múltipla escolha, manter a orientação “Escolha outra resposta abaixo ↓”. Para outro tipo de interação (digitação, arrastar etc.), adaptar essa orientação no componente de forma reutilizável ao implementar o novo jogo, sem mudar o padrão aprovado de acerto/erro.
- Manter foco de teclado útil e anunciar o resultado pela região de status. Não depender de cor ou movimento para comunicar o resultado.
- Resultado de rodada não implica ranking nem persistência: não adicionar essas regras sem definição do usuário.

## Verificação ao criar ou alterar jogos
Conferir acerto direto, erro seguido de acerto, bloqueio de respostas duplicadas, nova pergunta e reinício. Conferir celular, teclado e redução de movimento. Testar a dica específica do conteúdo. O teste existente `verificacao/check.cjs` cobre o jogo de tabuada; adapte ou amplie conforme as regras do novo jogo.

Mudanças no componente afetam todos os jogos: preservar o padrão aprovado e verificar seus consumidores. Uma solicitação explícita posterior do usuário pode alterar este padrão; atualizar o guia junto da implementação.

### Exceção específica — jogo 002, De novo essa fase?
Por solicitação explícita do responsável, o estado `ready` não é mostrado antes da criança abrir o computador e a mensagem introdutória “O painel está esperando…” não aparece. A região de feedback permanece no DOM e apresenta normalmente os estados `error` e `success` depois de uma tentativa, com as mensagens e animações compartilhadas aprovadas. Não aplicar essa exceção a outros jogos sem nova solicitação.

### Orientação para outros controles
O quarto argumento opcional de `BenaFeedback.mostrar(area, estado, detalhe, orientacao)` adapta apenas a instrução de tentativa (texto simples). Exemplo: `BenaFeedback.mostrar(area, 'error', dica, 'Ajuste o painel e tente novamente.')`. Os três primeiros argumentos e as mensagens aprovadas permanecem iguais.

# Bena Studies

Abra `index.html` no navegador ou acesse http://localhost:8765 com o servidor local ligado. O visual escolhido é o Caderno Noturno.

Para desenvolvimento, inicie o servidor com atualização automática na pasta do projeto:

`python scripts/servidor_dev.py`

Depois de abrir http://localhost:8765/, salve qualquer arquivo do projeto e a página será recarregada automaticamente. O servidor observa alterações em HTML, CSS, JavaScript, imagens e demais arquivos usados pelo site. Para servir os arquivos sem atualização automática, ainda é possível usar `python -m http.server 8765 --bind 127.0.0.1`.

## Série exibida
Em `config/site.js`, altere `serieAtual: 3`. Apenas a série escolhida aparece.

## Organização do conteúdo
Cada jogo tem sua própria pasta numerada dentro do tema:

```text
conteudo/
  catalogo.js
  3-serie/
    matematica/
      tabuada/
        001/
          jogo.js
        002/       ← De novo essa fase?
        003/       ← A caixa dos produtos
```

As pastas 001, 002 e 003 já estão cadastradas no tema Tabuada.

`conteudo/catalogo.js` é a lista de séries, matérias, temas e jogos que o site mostra. Cada tema contém uma lista `jogos`. Pastas não são detectadas automaticamente: ao adicionar ou remover uma pasta, atualize também o catálogo.

Para cadastrar outro jogo, crie sua pasta (por exemplo, `002`) e adicione uma entrada na lista `jogos` do tema, separada da anterior por vírgula:

```js
{
  id: '002',
  nome: 'Nome do novo jogo',
  descricao: 'Uma frase explicando a brincadeira.',
  arquivo: 'matematica/tabuada/002/jogo.js'
}
```

O caminho `arquivo` começa dentro da pasta da série. Os números 001, 002 etc. podem ser reutilizados em outros temas. O nome apresentado à criança é o campo `nome`.

## Jogo 001 — Desafio da tabuada
Caminho: `conteudo/3-serie/matematica/tabuada/001/jogo.js`.
O jogo começa diretamente com as tabuadas do 2 ao 10 misturadas, sem etapa de escolha. A rodada tem dez contas com multiplicadores de 1 a 10 em ordem aleatória. Cada conta oferece três respostas diferentes. Ao errar, a criança recebe uma dica de adição e pode tentar novamente. Ao acertar, avança manualmente. No fim, vê quantas contas acertou na primeira tentativa e pode recomeçar. O tempo não vale pontos. Para alunos conectados, abrir o jogo registra um depósito de participação de 100 pontos; concluir devolve o depósito e salva a pontuação da rodada. Repetições da interface ainda contam apenas nesta aba.

O catálogo define a apresentação; o arquivo do jogo define suas regras. Novos tipos de jogo precisam de sua própria implementação. Os jogos são abertos pelo contrato `window.BENA_JOGO.iniciar(container, voltar)`, usado pelo site para mostrar a brincadeira e retornar à lista de jogos.

## Próximas etapas
Login, contas e o registro de pontuação por partida já estão integrados. Próximas evoluções: validar cada resposta no servidor antes de consolidar rankings e organizar rankings por turma, temporada e temas pessoais.

## Visual
A página principal é `index.html`. As propostas anteriores continuam em `paginas/`. Os estilos compartilhados estão em `assets/site.css`. As fontes usam Google Fonts, com alternativas locais quando não há internet.

## Padrão visual dos jogos
O mascote de acerto/erro é compartilhado por todos os jogos. Consulte [o padrão aprovado](docs/padrao-feedback-jogos.md), também referenciado em `AGENTS.md`. A implementação está em `assets/componentes/feedback.js`.

## Pontuação
Leia [as regras de pontuação](docs/pontuacao.md). O cálculo é compartilhado por todos os jogos; sua configuração está em `config/pontuacao.js`. Partidas de alunos conectados são mantidas no histórico de pontuação.

## Jogo 002 — De novo essa fase?
Protótipo de plataforma e puzzles em `conteudo/3-serie/matematica/tabuada/002/`. Cinco fases na mesma sala, com resultado, fator ausente, grupos de cristais, pares de fatores e conta intrusa. As setas ← → movem e ↑ pula. O computador abre somente quando o personagem chega à sua frente, sem tecla E. O botão Instruções explica o objetivo e os controles. Os controles visuais abaixo do cenário foram removidos. Resolver libera a porta: a criança pode alcançá-la andando ou clicar em “Atravessar a porta”, que faz o personagem seguir uma rota física segura com saltos antes dos arcos do piso. Ao alterar a sala, preserve e teste essa rota; ela não pode encostar nos perigos.

Cada fase é uma questão para pontuação: total 5, cada confirmação errada válida conta um erro, erros de movimentação não contam. Usa a fórmula compartilhada, sem tempo e sem multiplicador de dificuldade. Contagem de rodadas usa chave própria `3-serie/matematica/tabuada/002`. As cinco regras e contas são fixas nesta prévia. Não é ainda um padrão aprovado para outros temas.

Jogos com controles ou animação podem retornar uma função de limpeza de `iniciar(container, voltar)`. O carregador chama essa função ao sair, fechar ou trocar o jogo; o jogo 002 libera eventos e sua animação desse modo.

O jogo 002 agora abre em página própria: `conteudo/3-serie/matematica/tabuada/002/index.html`. O catálogo usa `pagina` para essa navegação; o jogo 001 continua no modal. “Voltar aos jogos” retorna à lista de Tabuada. A página própria ocupa a área do navegador e não usa a API de tela cheia. Para alunos conectados, abrir a página registra o depósito de participação e a conclusão salva a pontuação e o reembolso. O contador de repetição mostrado no jogo permanece em memória da aba. A pergunta e o mecanismo aparecem no monitor lateral somente quando o personagem alcança a frente do computador.

### Plataformas e eletricidade (jogo 002)
A sala usa oito plataformas e quatro arcos elétricos, com geometria definida em `platforms` e `hazards` no `jogo.js`. As mesmas coordenadas lógicas (800 × 425) alimentam o desenho e as colisões. As plataformas são sólidas no topo, embaixo e nas laterais; a criança pode pular por cima delas, mas não atravessá-las. O computador fica sobre a plataforma central; alcançar sua frente abre o desafio diretamente.

Encostar em um arco dispara um choque curto e reaparecimento no ponto inicial da fase. Não altera respostas, acertos, erros de tabuada, pontos ou número da rodada. Não há limite de vidas. O efeito não usa flashes e respeita redução de movimento. Após resolver a questão, entrar na porta avança a fase; o botão “Atravessar a porta” faz o personagem caminhar pela rota segura até ela. Teste específico: `verificacao/eletricidade.cjs`.

## Jogo 003 — A caixa dos produtos
Jogo 3D de tabuada em `conteudo/3-serie/matematica/tabuada/003/`, aberto em página própria pelo catálogo. Quatro mecanismos: três balanças de ponteiro e uma de dois pratos. A criança arrasta frascos transparentes com bolinhas, forma grupos e confere sua descoberta. Resolver os quatro abre a caixa e revela um pergaminho com a pontuação compartilhada. Os desafios são gerados a cada rodada e sempre têm solução.

Usa Three.js local, sem dependências de rede para os objetos do jogo. Requer WebGL 2 e o servidor local indicado no início deste README. Permite mouse, alternativa de clique/teclado e redução de movimento. Pontuação: quatro questões, sem tempo; movimentos livres não contam erros, apenas respostas confirmadas. Repetir dentro da página mantém o contador provisório. Consulte [os detalhes do jogo 003](conteudo/3-serie/matematica/tabuada/003/README.md) para arquitetura, controles e testes.


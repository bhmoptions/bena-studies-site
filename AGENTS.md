# Instruções para agentes — Bena Studies

## Answer-Only rule
Se a mensagem do usuário começar com `Q:` ou `q:`, apenas responda ou explique. Não modifique código nem presuma implementação.

## Padrão obrigatório dos jogos
Antes de criar ou alterar qualquer jogo, leia e siga [Padrão de feedback dos jogos](docs/padrao-feedback-jogos.md).
O mascote do caderno foi aprovado pelo usuário. Reutilize `assets/componentes/feedback.js` e os estilos compartilhados; não crie cópias ou substitua as mensagens/animações por outro padrão sem uma solicitação do usuário.

## Uso obrigatório de templates para novos jogos
Ao criar um novo jogo baseado em um template (exemplo: `templates/jogo-duas-areas/`):
- **PROIBIDO recriar ou codificar do zero**: O agente **NUNCA** deve tentar recriar, reprogramar ou gerar código sintético aproximado com base no template.
- **Cópia obrigatória da pasta**: O agente deve **copiar a pasta do template na íntegra** para a pasta de destino do novo jogo (ex.: `Copy-Item -Path "templates/jogo-duas-areas/*" -Destination "conteudo/{serie}-serie/{materia}/{tema}/{id}/" -Recurse -Force`).
- **Ajustes permitidos**: O agente deve apenas ajustar os caminhos relativos de importação para os arquivos compartilhados (como `../../../../` para scripts, CSS e o atributo `data-base`), o título da página e conectar o arquivo `jogo.js` daquele jogo específico, mantendo toda a estrutura de classes, IDs, variáveis e CSS do template intactos.
- **Bloqueio de arquivos / nuvem**: Se houver falha de leitura ou bloqueio de arquivos locais por serviços como OneDrive, o agente **NÃO deve inventar ou aproximar código**; deve resolver o acesso aos arquivos reais e realizar a cópia exata do template original.

## Organização
Conteúdo em `conteudo/{serie}-serie/{materia}/{tema}/{001,002,...}/`. Cada tema tem uma lista `jogos` em `conteudo/catalogo.js`. Atualize o catálogo ao adicionar ou remover conteúdo. A série ativa é definida em `config/site.js`.
Leia também o `README.md` para navegação e execução local.

## Root Folder
Evite salvar/criar arquivos na pasta raiz do projeto. Se possível, a pasta raiz do projeto deve ter apenas os arquivos necessários (exemplos: ".env", ".gitignore") e o arquivo AGENTS.md

## Bancos de dados
Se precisar consultar bancos e não houver instruções específicas no projeto, leia `{odfolder}/Personal/Trabalho/BHM/Python/Auxiliares/Shared/Databases/db instructions.md`, onde `odfolder` é a pasta do OneDrive. Não coloque credenciais nos arquivos públicos do site.

## Pontuação obrigatória
Antes de criar ou alterar jogos ou ranking, leia e siga [Regras de pontuação](docs/pontuacao.md). Reutilize `config/pontuacao.js` e `assets/componentes/pontuacao.js`; não implemente fórmulas próprias. Registre acertos de primeira, todas as respostas erradas válidas, total de questões e rodada iniciada. Tempo só vale pontos quando explicitamente ativado pelo responsável. O contador atual é demonstração em memória da aba; ranking oficial exige validação e persistência por aluno no servidor, conforme o guia.

## Páginas de jogos
As páginas dos jogos NÃO devem ter hero section ou footer. Apenas a área efetiva do jogo e área de instruções, dicas, ferramentas, comandos, etc...

### Padrão obrigatório de cabeçalho dos jogos
Todas as páginas próprias de jogos e templates de jogos devem seguir estritamente o seguinte padrão de cabeçalho (`<header class="game-template-header">`):
1. **Estrutura e elementos**:
   - Elemento da esquerda: link para retornar (`<a href="...">← Voltar aos jogos</a>`).
   - Elemento da direita: marca do site (`<span>Bena Studies <b>✦</b></span>`).
   - **NÃO incluir o nome do jogo no cabeçalho** (apenas os dois elementos acima, alinhados às extremidades via `display: flex; justify-content: space-between; align-items: center;`).
2. **Estilo visual**:
   - Fundo sólido na cor `#191d29` (sem transparência e sem o padrão quadriculado/grid de caderno visível no cabeçalho).
   - Borda inferior sutil `1px solid #303646`.
   - Altura padrão de 62px com preenchimento lateral `padding: 0 clamp(18px, 3vw, 32px)`.
   - Marca "Bena Studies" em tipografia serif/display de 22px (`font-family: var(--display, Georgia), serif; font-size: 22px; color: #f3ecdc;`).
   - Símbolo `✦` em destaque dourado/brass (`#d7b36a`).

## Servidor
Quando o usuário pedir para abrir o servidor, use "http://localhost:8765/"

## Controle de versão
### 1. Backup obrigatório antes de iniciar alterações
Antes de realizar qualquer alteração, criação ou remoção de arquivos no projeto:
1. Verifique o status do repositório (`git status`).
2. Se houver alterações locais ou arquivos pendentes, faça apenas commit antes de prosseguir (`git add .`, `git commit -m "checkpoint: <descrição>"`). **NÃO faça push.**
3. Somente inicie a nova tarefa/implementação após assegurar que o estado prévio do projeto está salvo no repositório local.

### 2. Commit obrigatório ao concluir tarefas
Ao finalizar com sucesso qualquer alteração, correção ou implementação de funcionalidade:
1. Verifique o status do repositório (`git status`).
2. Faça commit de todas as alterações com mensagem semântica clara (ex.: `feat: ...`, `fix: ...`, `chore: ...`).
3. **NÃO execute push.** O agente não deve realizar push para o repositório remoto.
4. Informe o usuário sobre a conclusão para que ele possa revisar as alterações locais.

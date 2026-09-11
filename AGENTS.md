# Instruções para agentes — Bena Studies

## Answer-Only rule
Se a mensagem do usuário começar com `Q:` ou `q:`, apenas responda ou explique. Não modifique código nem presuma implementação.

## Padrão obrigatório dos jogos
Antes de criar ou alterar qualquer jogo, leia e siga [Padrão de feedback dos jogos](docs/padrao-feedback-jogos.md).
O mascote do caderno foi aprovado pelo usuário. Reutilize `assets/componentes/feedback.js` e os estilos compartilhados; não crie cópias ou substitua as mensagens/animações por outro padrão sem uma solicitação do usuário.

## Organização
Conteúdo em `conteudo/{serie}-serie/{materia}/{tema}/{001,002,...}/`. Cada tema tem uma lista `jogos` em `conteudo/catalogo.js`. Atualize o catálogo ao adicionar ou remover conteúdo. A série ativa é definida em `config/site.js`.
Leia também o `README.md` para navegação e execução local.

## Bancos de dados
Se precisar consultar bancos e não houver instruções específicas no projeto, leia `{odfolder}/Personal/Trabalho/BHM/Python/Auxiliares/Shared/Databases/db instructions.md`, onde `odfolder` é a pasta do OneDrive. Não coloque credenciais nos arquivos públicos do site.

## Pontuação obrigatória
Antes de criar ou alterar jogos ou ranking, leia e siga [Regras de pontuação](docs/pontuacao.md). Reutilize `config/pontuacao.js` e `assets/componentes/pontuacao.js`; não implemente fórmulas próprias. Registre acertos de primeira, todas as respostas erradas válidas, total de questões e rodada iniciada. Tempo só vale pontos quando explicitamente ativado pelo responsável. O contador atual é demonstração em memória da aba; ranking oficial exige validação e persistência por aluno no servidor, conforme o guia.

## Páginas de jogos
As páginas dos jogos NÃO devem ter hero section ou footer. Apenas a área efetiva do jogo e área de instruções, dicas, ferramentas, comandos, etc...

## Servidor
Quando o usuário pedir para abrir o servidor, use "http://localhost:8765/"

## Controle de versão e deploy (GitHub e Vercel)
### 1. Backup obrigatório antes de iniciar alterações
Antes de realizar qualquer alteração, criação ou remoção de arquivos no projeto:
1. Verifique o status do repositório (`git status`).
2. Se houver alterações locais ou arquivos pendentes, faça commit e push para o GitHub antes de prosseguir (`git add .`, `git commit -m "checkpoint: <descrição>"`, `git push origin main`).
3. Somente inicie a nova tarefa/implementação após assegurar que o estado prévio do projeto está preservado no repositório remoto.

### 2. Commit e push obrigatório ao concluir tarefas
Ao finalizar com sucesso qualquer alteração, correção ou implementação de funcionalidade:
1. Verifique o status do repositório (`git status`).
2. Faça commit de todas as alterações com mensagem semântica clara (ex.: `feat: ...`, `fix: ...`, `chore: ...`).
3. Execute `git push origin main` para acionar imediatamente o build e deploy contínuo na Vercel.
4. Informe o usuário sobre a conclusão e disponibilize o link de produção (ou da tela alterada) para facilitar os testes.

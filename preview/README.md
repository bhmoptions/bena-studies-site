# Três propostas de página inicial

Estas páginas são independentes. Não substituem nem alteram `/index.html`, `assets/site.js`, `assets/site.css`, autenticação, catálogo ou jogos.

| Proposta | Endereço local | Interação |
| --- | --- | --- |
| Um livro, muitos mundos | http://localhost:8765/preview/livro/ | A capa abre em perspectiva e revela as matérias. |
| Sala de descobertas | http://localhost:8765/preview/sala/ | Uma ilustração original com movimento suave, luz e partículas; o botão abre as descobertas disponíveis. |
| Constelação do conhecimento | http://localhost:8765/preview/constelacao/ | A estrela central revela um mapa de matérias conectado por linhas animadas. |

O seletor discreto no fim de cada página permite comparar as três versões. O logotipo retorna à página inicial atual. As prévias têm `noindex, nofollow`.

## Direção visual

Objetivo: convidar a criança a explorar e chegar aos jogos usando uma composição principal, com poucos elementos visíveis antes da interação.

- **Livro — fantasia editorial tátil.** Âncora: capa com relevo, papel e marcador, que se abre para um pequeno mundo de números, palavras e ciência. DFII: 15 (impacto 5 + adequação 5 + viabilidade 4 + desempenho 4 − risco de consistência 3).
- **Sala — ilustração acolhedora de livro infantil.** Âncora: três crianças curiosas ao redor da mesma mesa, com materiais de papel, tecido e madeira. DFII: 15 (5 + 5 + 4 + 4 − 3).
- **Constelação — cartografia celeste lúdica.** Âncora: uma estrela que se torna navegação, revelando constelações de matérias. DFII: 15 (4 + 5 + 5 + 4 − 3).

Cada proposta usa uma cena central como identidade visual; o conteúdo detalhado aparece por interação. Assim, a composição não depende de uma sequência de cartões e blocos.

## Sistema visual preservado

- Fontes existentes: Kalam nos títulos, DM Sans no texto, Fredoka na marca, sem novos arquivos de fontes.
- Cores e modo escuro herdados integralmente de `assets/site.css`: `--paper`, `--ink`, `--accent`, `--yellow`, `--blue`, `--pink` e demais variáveis do Caderno Noturno.
- Cabeçalho: mesma marca, botão Entrar, estrutura e estilos da página original; apenas o endereço relativo do logotipo foi adaptado.
- Espaçamento: ritmo principal de 8 px, margens maiores ao redor da cena e ajustes para telas de 320 px em diante.
- Movimento: abertura por ação do usuário e animações ambientes leves em CSS. O botão de pausa mantém a preferência entre as prévias na mesma aba. A preferência do dispositivo por movimento reduzido é respeitada.

## Conteúdo e navegação

`preview.js` lê `config/site.js` e `conteudo/catalogo.js`. A série e os jogos disponíveis acompanham a configuração atual. Matemática abre os jogos já existentes. Ciências e Português são caminhos ilustrativos e mostram “Em breve” enquanto não houver jogos dessas matérias no catálogo.

Os jogos com `pagina` abrem nas páginas existentes. Para entradas antigas que tenham somente `arquivo`, o link volta à seleção na página inicial, responsável por carregar jogos nesse formato. Estas prévias não iniciam partidas, registram respostas ou calculam pontos.

A autenticação usa o componente existente `assets/componentes/auth.js`. O diálogo de descobertas é separado do diálogo de conta. A experiência da sala é uma ilustração com animação de câmera, iluminação e partículas em CSS, sem vídeo pré-renderizado ou áudio.

## Verificação

Com o servidor do projeto ligado na porta 8765:

```text
node verificacao/previas-landing.cjs
```

O teste compara o cabeçalho com a página original em 1440, 768, 390 e 320 px; verifica ausência de rolagem horizontal, imagem, abertura e fechamento, diálogos, links dos jogos, matérias futuras, teclado, restauração de foco, pausa persistente e movimento reduzido. As capturas vão para a pasta temporária `bena-previas-landing`, sem adicionar arquivos de teste visual à publicação.

O teste usa Playwright e Edge locais, seguindo o ambiente já usado pelo projeto. Outros ambientes podem definir `BENA_PLAYWRIGHT` (caminho do módulo), `BENA_BROWSER` (executável) e `BENA_TEST_URL` (origem do servidor).

Com acesso à internet, `BENA_REQUIRE_NETWORK=1` também exige as três fontes originais carregadas e verifica a abertura do formulário de login compartilhado, sem enviar credenciais.

## Ilustração original

- Arquivo de produção: `preview/assets/sala-descobertas.png` (1536 × 1024).
- Gerada com a ferramenta integrada `image_gen`, sem usar API/CLI alternativo.
- Livro e constelações são construídos com CSS e SVG para permitir interação real.
- Prompt final usado na ferramenta:

> Use case: illustration-story. Asset type: original hero illustration for a Brazilian children's learning website, wide landscape 1536x1024. Create a beautiful premium tactile 3D clay-and-paper storybook diorama, not a website screenshot. Three joyful curious Brazilian primary school children around one generous curved wooden study table in a cozy nighttime imaginary classroom. A dark-skinned girl with curly natural hair and blue cardigan on the left leans eagerly toward a small glowing glass terrarium with a sprouting plant; a brown-skinned boy with dark curly hair in the middle wears a muted terracotta sweater and excitedly holds up a small handmade paper planet; a light-skinned girl with short dark bob and cream top on the right is engrossed in an open book, smiling at her friends. A little brass telescope at the left side of the table, one simple wooden geometric model at right. Children are the main subject, large expressive faces, believable hands. One quiet composition, not a collage. Color palette constrained to the existing Bena Studies night notebook: deep slate navy #191d29 background, #242b3c, warm cream #f3ecdc, muted peach #f3ac8e, muted brass #e9c675, dusty sky #9ebfd3 and rose #dcabc3. Warm small pool of lamp-like golden light across their faces, soft shadows, exquisite paper/ceramic/linen textures. Scene centered, table curves horizontally, strong balanced silhouette. The entire composition fades naturally into completely plain dark navy #191d29 around outer edges, no floor line, no rectangular room or window frame, no border. Leave generous dark breathing room at top (15 percent) and sides (10 percent) and bottom, every child and table object fits comfortably inside the image. Camera at children's eye level, slight elevated view of tabletop. Premium animated feature concept art with handcrafted materials, natural expressions, sophisticated restrained colors, charming not babyish. No letters, numbers, readable text, logo, watermark, UI, buttons, excessive floating objects or visual clutter.

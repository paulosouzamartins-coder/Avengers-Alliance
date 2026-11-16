# MAA PvP Simulator — notas

## Como atualizar os dados
1. Edite `dados/maa.xlsx` (abas **Characters** e **Skills**, mesmas colunas de sempre; a aba Skills ganhou a coluna **One Ally**).
2. Peça para eu rodar `python3 tools/importar.py` (reescreve o bloco de dados do `index.html`) ou me envie a planilha.
Heróis, golpes e números vêm só da planilha; o código não tem números de conteúdo.

## Regras de combate (como entendi — confirmar)
- **Dano por hit** = (Total damage ÷ Hits) × (Ataque ÷ Defesa do alvo) — confirmado. Ataque = defesa → dano puro; 50% maior → ×1,5; 50% menor → ×0,5. A defesa alta reduz o dano pela mesma conta.
- **Chance de acerto** = Hit Chance do golpe × (Precisão ÷ Evasão do alvo), no máximo 100% — confirmado.
- **Crítico**: chance da coluna Critical (valores > 1 na planilha são lidos como %, ex.: 11 = 11%); dano × 1,5 (**provisório**, `config.danoCritico`).
- **Ordem de turno**: Evasão (maior primeiro; empate sorteado), recalculada a cada rodada.
- **Stamina**: todos começam com 100%; cada golpe gasta o valor da coluna Stamina (em %); +20% no início de cada turno do herói. O atributo "Stamina" do herói (124 etc.) ainda não é usado.
- **Cooldown**: o golpe fica indisponível nos N turnos seguintes do próprio herói.
- **Status** (Bleeding, Stun…) e **Special Properties** (Quick Action, Deadly Crits…) aparecem só como etiquetas, sem efeito, até existirem as bibliotecas. Repetir o mesmo status soma ×N (ex.: "Bleeding x2" = 2).
- Colunas de efeito (cada grupo vale por si, independente do alvo do golpe — dá para atacar todos os inimigos e buffar todos os aliados; coluna opcional **All Allies** na aba Skills para isso): One Enemy = alvo do golpe; Self = o próprio herói; All Enemies = todos os inimigos (ou todos os aliados, quando o golpe é All allies); One Ally = o aliado escolhido. Em golpes que causam dano, o status só entra em quem foi acertado.

## Assets (a extensão pode ser webp, png, jpg ou jpeg)
- `assets/face/<Heroi>_Icon_Large_1.webp` — ícone na grade de seleção (ex.: `Black_Widow_Icon_Large_1.webp`)
- `assets/smallportrait/<Heroi>_Dialogue_1.webp` — herói confirmado nas laterais e barra de ordem de turnos
- `assets/portrait/<Heroi>_Portrait_Art.webp` — retrato grande da seleção e da arena (imagem inteira, centralizada)
- `assets/skills/<Heroi>-<Golpe>.webp` — ícone do golpe, ex.: `Black_Widow-Martial_Arts_Combo.webp` (espaços viram `_`, maiúsculas, ponto, hífen e apóstrofo são mantidos; se o arquivo tiver o apóstrofo removido — `Black_Widow-Widows_Bite` — também é encontrado)
- Lado da Equipe B (laterais, palco e arena) é espelhado automaticamente; a arte deve olhar para a direita.

Ids dos heróis: 


## Modos futuros (nada de rede/IA ainda)
Sempre 3x3: 1 jogador x máquina, jogador x jogador, 3 jogadores x 3 jogadores (1 herói cada). Cada vaga já guarda `{ heroi, dono }` (dono = null = local) e os modos estão em `config.modos`.

## Menu, música e batalha (v0.3)
- O jogo abre num **menu**: Partida PVE (a que existe), Partida PVP e Partida 3v3 (marcadas "A implementar").
- **Música**: `assets/music/seleção.mp3` toca na escolha de heróis (em qualquer modo); na batalha toca uma sorteada entre `assets/music/battle1.mp3`, `battle2.mp3`, ... (procura em sequência até faltar um número) e sorteia outra quando termina. O botão 🔊 no topo liga/desliga. Navegadores só liberam áudio após um clique, por isso a música começa ao sair do menu.
- **Escolha de alvo**: todo golpe pede confirmação clicando — 1 inimigo/aliado: no escolhido; todos os inimigos/aliados: em qualquer um do grupo; self: no próprio herói. Clicar de novo no golpe ou apertar Esc cancela.
- **Textos**: o texto do golpe aparece ao passar o mouse no ícone (e o do herói, ao passar o mouse nele). O topo mostra "TURNO DE PLAYER 1 - HERÓI" (os nomes dos jogadores ficam em `players` no código, prontos para serem nomeados no futuro).
- **Hits e crítico**: cada hit que acerta soma no contador gigante e esmaecido atrás dos heróis (do lado de quem apanha); crítico mostra "CRÍTICO!" em vermelho no lado oposto.
- Os nomes só aparecem atrás dos retratos enquanto a imagem não existe; com a imagem carregada o nome some.

## Ajustes v0.3.1
- Fichas de HP/stamina/status ficam no **trilho lateral** da arena (A à esquerda, B à direita), nunca sobre os heróis; a ficha também é clicável como alvo. A arte dos heróis é ~2x maior e se sobrepõe um pouco, formando o oval.
- Ícones de golpe são exibidos em **50x50 px** (tamanho original, sem escalar) na batalha e na seleção.
- **Efeitos sonoros**: golpes com tipo *Melee* tocam `assets/sfx/punch.mp3` a cada hit que acerta, sem interromper a música. O botão 🔊 também silencia os efeitos.

## Ajustes v0.3.2
- **Fonte**: estilo condensado inspirado no Marvel Strike Force (Barlow Condensed, carregada do Google Fonts — precisa de internet na primeira abertura). Para usar a fonte que você quiser, coloque `assets/fonts/MAA.woff2` (ou `MAA.ttf`): ela tem prioridade.
- **Sequência de um golpe**: o herói vai até o meio da arena → aparece "Fulano usou Golpe" no alto → ataca (golpe em 1 inimigo: vai até o sprite do alvo) → volta ao lugar. "Animações rápidas" fica no mini menu ☰ (canto superior direito), junto com Som e "Voltar ao lobby"; o cabeçalho some durante a batalha.
- **Escolha de alvo único**: só brilha o inimigo/aliado sob o mouse; golpes em grupo/self mostram o grupo todo.
- **Status**: vermelho = debuff (vindo de inimigo), verde = buff (de si/aliado) — regra provisória até existir a biblioteca.
- **Seleção**: o small portrait aparece na próxima vaga assim que o herói é escolhido (clicar nele confirma). As imagens ficam em cache, então confirmar não pisca mais um bloco colorido.

## v0.4
- **Stamina**: custo da planilha é valor fixo exato (não %). Herói começa com stamina cheia (= atributo Stamina). Regenera 10% do máximo no início de cada turno (`config.staminaRecupera`).
- **Recarga** (5ª ação, botão ⟳): passa o turno e recupera 50% da stamina máxima (`config.staminaRecarga`). A máquina usa Recarga quando não há golpe possível.
- Painel de golpes com rótulos SKILL 1/2/3 e ULTIMATE.
- Contador de hits e CRÍTICO! ficam na frente dos sprites.
- Sprites sem corte nas bordas durante o "flutuar" (overflow visível).
- **Escala**: coluna `Scale` na aba Characters (1 = normal; multiplica o tamanho do sprite, mantendo os pés no mesmo lugar).
- Derrotas e status só aparecem depois que o atacante termina a animação e volta ao lugar.
- Deslocamento até o alvo e retorno 50% mais rápidos.
- **Sons**: colunas `Cast Sound` (toca ao ir ao meio da tela) e `Hit Sound` (a cada hit bem-sucedido) na aba Skills; nome do arquivo em `assets/sfx/` (com ou sem `.mp3`). Hit vazio + golpe melee = `punch.mp3`.
- Seleção: herói já escolhido fica marcado e não repete (nem no sorteio); colunas laterais 30% mais largas.
- Mantenha as colunas novas (`Scale`, `Cast Sound`, `Hit Sound`) ao atualizar a planilha.

## v0.4.1
- Contador de hits z-index 200 e mais opaco; sem rolagem na batalha (arena dimensiona pela altura da janela); botão "Passar turno" removido (Recarga é a ação de passar); histórico com ~3 linhas; descrição do golpe fixa no painel inferior direito.
- v0.4.2: descrição do golpe em 3 colunas + efeitos em faixa única; contador de hits ao lado interno dos heróis atingidos.

## v0.5 — pacote visual
- Impacto: tremor de tela, hit stop (congela ~55 ms / 120 ms no crítico), flash branco + recuo do alvo, zoom no crítico e nos hits de ultimate.
- Efeitos por tipo (campo Type da planilha): Slashing = cortes; Explosion = bola de fogo; Magic = roxo; Energy/Tech/Sonic/Vibranium = ciano; Gun/Kinetic/Ranged = faíscas amarelas; demais (melee) = impacto branco. Crítico adiciona anel dourado.
- Golpes Ranged/Gun/Sonic (sem Melee) agora atiram um projétil do centro até cada alvo (não correm mais até o inimigo). Melee continua correndo até o alvo.
- Números de dano proporcionais ao dano; crítico dourado.
- Cenário gerado por código (3 estilos aleatórios, parallax) + partículas ambiente. Para usar imagem própria: `assets/arena/fundo.webp|png|jpg`.
- Halo da cor do time no herói da vez, sombra no chão, resto da arena escurece durante o golpe.
- Tela VS antes da luta (clique para pular); cena de ULTIMATE (retrato cruzando a tela) no último golpe de cada herói.
- Barra de vida com faixa branca que desce depois; ícones de status (buff verde / debuff vermelho, contador de stacks). Ícone próprio: `assets/status/<Nome_do_Status>.webp`.
- Derrota com fumaça e fade; vitória com confete e MVP (maior dano causado).
- v0.5.1: corrigido herói preso/fora do lugar (a seleção da arte pegava o ícone de status em vez do sprite) e ícones de status gigantes (cinza).
- v0.5.2: voz de seleção: ao clicar num herói toca assets/sfx/select_<nome>.wav (aceita id como black_widow, Black_Widow, blackwidow; também .mp3/.ogg). Sem arquivo = silêncio.
- v0.6: voz de seleção só ao confirmar; status com nome completo; sombra usa a coluna `Feet` (% da altura da arte onde ficam os pés; vazio = detecta pela imagem, ou 97%); ULTIMATE toca `assets/sfx/ultimate.wav` e mostra a arte alinhada pelo topo; derrota toca `assets/sfx/ko.wav`; efeitos de hit/projétil no peito; barra superior numa linha só (turno + rodada + ordem) e arena mais alta.

## v0.7 — draft
- Sorteio de quem bane primeiro. Ordem: banimento (1º time, 2º time) → picks 1 / 2 / 2 / 1 (1º time começa pegando 1; o 2º pega 2; o 1º pega 2; o 2º fecha com 1). Banidos aparecem na área "Banido pela equipe X" e ficam marcados na grade. `BANS` (no código) define banimentos por equipe (hoje 1).
- Aleatório completa o draft que falta; Limpar reinicia (novo sorteio). Draft completo: arte central e grade somem até clicar em Iniciar batalha.
- Slots com barra na cor da classe (classe + nome grande, animada); cabeçalho do site escondido na seleção (menu ☰ no canto); botão "Filtrar classe" à esquerda da ficha do herói.

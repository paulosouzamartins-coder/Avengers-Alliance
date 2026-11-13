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

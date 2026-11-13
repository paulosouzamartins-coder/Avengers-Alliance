# MAA PvP Simulator v0.2 — notas

**Estrutura:** `index.html` (dados + engine + interface num arquivo só) e `assets/`. `tests/` é só para desenvolvimento (`node tests/test.js`, `node tests/ui.js`).

## Imagens (você adiciona em assets/)
- Ícone na grade do meio da seleção: `assets/face/<id>.png`
- Herói confirmado nas laterais (e barra de ordem): `assets/smallportrait/<id>.png`
- Retrato grande no meio da seleção (onde no LoL fica o chat) e na arena: `assets/portrait/<id>.png`
- (antigo, não é mais usado) `assets/portraits/<id>.png` — ex.: `iron_man.png`, `captain_america.png`, `hulk.png`, `wolverine.png`, `spider_man.png`, `beast.png`
- Arena usa o mesmo `assets/portrait/<id>.png`
- Ícone de golpe: `assets/skills/<nome>.jpg` — ex.: `repulsor_ray.jpg`, `shield_bash.jpg` (os caminhos exatos estão na aba Dados > Golpes). Sem a imagem, aparece um bloco colorido com o nome.

## Onde mexer
Tudo em `<script id="data">`: `config` (escala de tiers, stamina, crítico), `efeitos` (debuffs/buffs), `propriedades`, `herois`, `golpes`. Golpes só citam ids de efeito; duração e números ficam na biblioteca.

## Provisório (a wiki não informa — adaptação minha, reescreva)
Lock-On +25% Ranged · Burning 5% vida/turno e −20% DEF · Dizzy −25 pontos de Hit · Target Focus +25% · Deflector Shield absorve 1500 · Unibeam Focus +10% dano/+5 hit/+5 crit por acúmulo · Deadly Crits ×2,0 · crítico ×1,5 · dano mínimo 10% · escala de tiers · proteção do Shield Guard contra área (só o Cap é atingido).

## Pendente
- Hulk, Wolverine, Spider-Man, Beast: bloqueados (sem stats/golpes/afiliação).
- Tiers lidos das barras (Bar01=cheia, 5 barras na wiki em vez de 6): confirmar.
- Iron Man: dano n/a na wiki base → 0. Efeito do Unibeam Focus está no próprio Iron Man (nota de patch).
- Classes sem vantagem/desvantagem (por pedido). Afiliações guardadas mas ainda sem efeito no jogo.

- Formato das imagens: o simulador procura `.webp`, `.png`, `.jpg`, `.jpeg` (nessa ordem) para cada nome; pode misturar formatos. Ícones de golpe: `assets/skills/<nome_do_golpe_em_minusculas_com_underscore>.<ext>` (ex.: `repulsor_ray`, `missile_barrage`, `deflector_shield`, `unibeam`, `shield_bash`, `leading_strike`, `shield_throw`, `shield_guard`).

## Seleção (layout champ select)
- Centro: portrait grande no topo (`assets/portrait/<id>`, redimensionado para caber inteiro e centralizado), nome + 4 ícones de golpe abaixo, e a grade de faces (`assets/face/<id>`) embaixo — só ela tem scroll.
- Laterais: `assets/smallportrait/<id>`. Equipe B e unidades B na batalha aparecem espelhadas (scaleX(-1)). Supõe-se que a arte original olha para a direita.
- Modos futuros (só registrados em `config.modos`, nada de rede/IA ainda): 1 jogador x máquina, jogador x jogador 3v3, 3 x 3 jogadores (1 herói cada). Cada vaga da seleção já guarda `{ heroi, dono }` (dono = null = local).

#!/usr/bin/env python3
"""Lê dados/maa.xlsx (abas Characters e Skills) e reescreve o bloco <script id="data"> do index.html.
Uso: python3 tools/importar.py   (rode de dentro da pasta do projeto)"""
import json, re, sys, unicodedata, openpyxl
XLSX, HTML = 'dados/maa.xlsx', 'index.html'
slug = lambda s: re.sub(r'_+', '_', re.sub(r'[^a-z0-9]+', '_', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower().replace("'", ''))).strip('_')
def num(v, default=None):
    if v is None or str(v).strip() == '' or str(v).strip().lower() in ('n/a', 'na'): return default
    return float(str(v).replace('%', '').replace(',', '.'))
def pct(v):  # aceita 0.88 ou 88 -> 88 ; vazio -> None
    n = num(v); return None if n is None else round(n * 100 if n <= 1 else n, 2)
def lst(v): return [x.strip() for x in str(v).split(',') if x.strip()] if v else []
def status(v):  # "Bleeding x2" -> {nome:'Bleeding', x:2}
    out = []
    for t in lst(v):
        m = re.match(r'^(.*?)\s*[x×]\s*(\d+)$', t, re.I)
        out.append({'nome': m.group(1).strip(), 'x': int(m.group(2))} if m else {'nome': t, 'x': 1})
    return out
ALVO = {'one enemy': 'enemy1', 'all enemies': 'enemyAll', 'self': 'self', 'all allies': 'allyAll', 'one ally': 'ally1'}
fname = lambda t: re.sub(r'\s+', '_', t.strip())   # "Black Widow" -> Black_Widow (mantém maiúsculas, apóstrofo, ponto e hífen)
wb = openpyxl.load_workbook(XLSX, data_only=True)
H, G, avisos = [], [], []
rows = lambda ws: [r for r in ws.iter_rows(min_row=2, values_only=True) if r[0]]
HC = {str(c.value).strip(): i for i, c in enumerate(wb['Characters'][1]) if c.value}
for r in rows(wb['Characters']):
    r = list(r) + [None] * 20
    g = lambda name: r[HC[name]] if name in HC else None
    hid = slug(r[0])
    esc_ = num(g('Scale'), 1) or 1
    H.append({'id': hid, 'nome': r[0].strip(), 'classe': (g('Class') or 'Generalist').strip(), 'hp': num(g('Health'), 0), 'stamina': num(g('Stamina'), 0), 'atk': num(g('Attack'), 0), 'def': num(g('Defense'), 0), 'acc': num(g('Accuracy'), 0), 'eva': num(g('Evasion'), 0),
              'escala': esc_, 'pes': (lambda v: (float(v) / 100 if v not in (None, '') else None))(g('Feet')), 'afiliacoes': lst(g('Organization')), 'passivas': lst(g('Effects')), 'bio': (g('Bio') or '').strip(), 'golpes': [],
              'face': 'assets/face/' + fname(r[0]) + '_Icon_Large_1.webp', 'smallportrait': 'assets/smallportrait/' + fname(r[0]) + '_Dialogue_1.webp', 'portrait': 'assets/portrait/' + fname(r[0]) + '_Portrait_Art.webp', 'bloqueado': False})
byname = {h['nome']: h for h in H}
HD = {str(c.value).strip(): i for i, c in enumerate(wb['Skills'][1]) if c.value}
for r in rows(wb['Skills']):
    r = list(r) + [None] * 20
    h = byname.get(r[0].strip())
    if not h: avisos.append('Golpe de herói inexistente: ' + r[0]); continue
    alvo = ALVO.get(str(r[3]).strip().lower())
    if not alvo: avisos.append(f'Alvo desconhecido em {r[0]}/{r[1]}: {r[3]}'); alvo = 'enemy1'
    ap = {}
    col = lambda name: r[HD[name]] if name in HD else None   # colunas lidas pelo nome do cabeçalho
    if status(col('One Enemy')): ap['enemy1'] = status(col('One Enemy'))
    if status(col('Self')): ap['self'] = status(col('Self'))
    if status(col('All Enemies')): ap['allyAll' if alvo == 'allyAll' else 'enemyAll'] = status(col('All Enemies'))  # golpe "All allies": a coluna vale para o grupo do golpe
    if status(col('One Ally')): ap['ally1'] = status(col('One Ally'))
    if status(col('All Allies')): ap['allyAll'] = status(col('All Allies'))   # coluna opcional: golpe que ataca inimigos e buffa todos os aliados
    sid = h['id'] + '__' + slug(r[1])
    h['golpes'].append(sid)
    G.append({'id': sid, 'heroi': h['id'], 'nome': r[1].strip(), 'icone': 'assets/skills/' + fname(h['nome']) + '-' + fname(r[1]) + '.webp', 'custo': num(r[2], 0), 'alvo': alvo, 'dano': num(r[4], 0), 'recarga': int(num(r[5], 0)), 'golpes': int(num(r[6], 0)),
              'hit': pct(r[7]), 'crit': pct(r[8]) or 0, 'somCast': str(col('Cast Sound') or '').strip(), 'somHit': str(col('Hit Sound') or '').strip(), 'tipos': str(r[9]).split() if r[9] else [], 'props': lst(r[10]), 'aplica': ap})
cfg = {'modos': {'pve': '1 jogador x máquina (3 heróis do jogador)', 'pvp': '1 jogador x 1 jogador (3 heróis cada)', 'pvp6': '3 jogadores x 3 jogadores (1 herói por jogador)'},
       'staminaRecupera': 10, 'staminaRecarga': 50, 'danoCritico': 1.5}   # % da stamina máxima por turno / ao usar Recarga
cls = {c: {'vantagens': [], 'desvantagens': []} for c in ['Blaster', 'Bruiser', 'Scrapper', 'Infiltrator', 'Tactician', 'Generalist']}
J = lambda o: json.dumps(o, ensure_ascii=False)
out = ('<script id="data">\n/* GERADO por tools/importar.py a partir de dados/maa.xlsx — para mudar números, edite a planilha e rode o importador.\n'
       '   Fórmulas (engine): dano por hit = (Total damage / Hits) × (Ataque ÷ Defesa do alvo); chance de acerto = Hit Chance × (Precisão ÷ Evasão do alvo), máx. 100%;\n'
       '   crítico = dano × config.danoCritico (PROVISÓRIO); ordem de turno = Evasão. Status (debuff/buff/propriedade) só são nomes, sem efeito, até as bibliotecas existirem. */\n'
       'const DATA = {\n  versao: \'0.3.0\',\n  config: ' + J(cfg) + ',\n  classes: ' + J(cls) + ',\n  herois: [\n' + ',\n'.join('    ' + J(h) for h in H) + '\n  ],\n  golpes: [\n' + ',\n'.join('    ' + J(g) for g in G) + '\n  ]\n};\n</script>')
s = open(HTML, encoding='utf8').read()
a = s.index('<script id="data">'); b = s.index('</script>', a) + len('</script>')
open(HTML, 'w', encoding='utf8').write(s[:a] + out + s[b:])
print(len(H), 'heróis,', len(G), 'golpes'); [print('AVISO:', x) for x in avisos]

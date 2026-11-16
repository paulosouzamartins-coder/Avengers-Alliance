/* Testes da engine e dos dados. Uso: node tests/test.js  (lê direto o index.html; sem dependências) */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const part = (id) => html.match(new RegExp('<script id="' + id + '">([\\s\\S]*?)</script>'))[1];
function load() { const ctx = vm.createContext({}); vm.runInContext(part('data') + '\n' + part('engine') + '\nthis.DATA=DATA;this.createBattle=createBattle;', ctx); return ctx; }
let ok = 0, fail = 0;
function test(name, fn) { try { fn(); ok++; console.log('ok   -', name); } catch (e) { fail++; console.log('FAIL -', name, '\n      ', e.message); } }
/* rng: sequência fixa de valores (repete o último) */
const seq = (...v) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const mk = (a, b, rng, mut) => { const c = load(); if (mut) mut(c.DATA); return c.createBattle(c.DATA, [a, b], { rng: rng || (() => 0.99) }); };
const unit = (b, h, team) => b.units.find((u) => u.heroId === h && (team == null || u.team === team));
function until(b, uid) { let g = 0; while (b.current && b.current.uid !== uid && g++ < 50) b.pass(); assert.strictEqual(b.current.uid, uid); }
const X = (v) => JSON.parse(JSON.stringify(v));

test('dados: 10 heróis da planilha, 4 golpes cada, referências válidas', () => {
  const { DATA: D } = load();
  assert.strictEqual(D.herois.length, 10); assert.strictEqual(D.golpes.length, 40);
  D.herois.forEach((h) => { assert.strictEqual(h.golpes.length, 4, h.id); h.golpes.forEach((g) => assert.ok(D.golpes.find((s) => s.id === g && s.heroi === h.id), g)); assert.ok(h.hp > 0 && h.atk > 0 && h.def > 0, h.id); });
  assert.strictEqual(new Set(D.golpes.map((s) => s.id)).size, 40, 'ids únicos');
});
test('dados: valores da planilha (Wolverine / Dr. Strange / crítico normalizado)', () => {
  const { DATA: D } = load(), w = D.herois.find((h) => h.id === 'wolverine'), g = (id) => D.golpes.find((s) => s.id === id);
  assert.deepStrictEqual(X({ hp: w.hp, atk: w.atk, def: w.def, acc: w.acc, eva: w.eva }), { hp: 137, atk: 41, def: 35, acc: 35, eva: 31 });
  const c = g('wolverine__adamantium_claws'); assert.strictEqual(c.dano, 8); assert.strictEqual(c.golpes, 2); assert.strictEqual(c.hit, 88); assert.strictEqual(c.crit, 35);
  assert.strictEqual(g('cyclops__optic_blast').crit, 11, '"11" na planilha = 11%'); assert.strictEqual(g('hawkeye__sure_shot').hit, 100);
  assert.deepStrictEqual(X(g('wolverine__adamantium_claws').aplica), { enemy1: [{ nome: 'Ravaged', x: 1 }, { nome: 'Bleeding', x: 2 }] });
  assert.strictEqual(g('dr_strange__shield_of_the_seraphim').alvo, 'ally1'); assert.deepStrictEqual(X(g('cyclops__evasive_maneuvers').aplica.allyAll.map((s) => s.nome)), ['Combat Awareness', 'Agile']);
});
test('dano: ataque = defesa → dano puro do golpe (por hit = total ÷ hits)', () => {
  const b = mk(['iron_man', 'iron_man', 'iron_man'], ['iron_man', 'iron_man', 'iron_man']);
  const a = b.current, t = b.units.find((u) => u.team !== a.team);
  assert.strictEqual(a.stats.atk, t.stats.def);
  assert.strictEqual(b.perHit(a, t, b.SK['iron_man__repulsor_ray']), 8); // 16 total ÷ 2 hits, ataque = defesa → 8 puro
});
test('dano: fórmula atk/def (Wolverine → Hulk) e acerto com rng baixo', () => {
  const b = mk(['wolverine', 'hulk', 'hulk'], ['hulk', 'hulk', 'hulk'], seq(0.5, 0.99, 0.5, 0.99, 0.5, 0.99, 0.5, 0.99));
  const w = unit(b, 'wolverine'); until(b, w.uid);
  const hulk = b.units.find((u) => u.team === 1);
  const per = (8 / 2) * (41 / 38);
  assert.ok(Math.abs(b.perHit(w, hulk, b.SK['wolverine__adamantium_claws']) - per) < 1e-9);
  const evs = b.act('wolverine__adamantium_claws', hulk.uid), d = evs.filter((e) => e.t === 'dmg');
  assert.ok(d.length >= 1); assert.strictEqual(d[0].amount, Math.round(per * 10) / 10); assert.strictEqual(hulk.hp, Math.round((162 - d.reduce((s, e) => s + e.amount, 0)) * 10) / 10);
});
test('dano: ataque 50% maior que a defesa → ×1,5; 50% menor → ×0,5', () => {
  const b = mk(['hulk', 'hulk', 'hulk'], ['hulk', 'hulk', 'hulk'], null, (D) => { D.herois.find((h) => h.id === 'hulk').atk = 57; });
  const a = b.units[0], t = b.units[3]; a.stats.atk = 57; t.stats.def = 38; const sk = b.SK['hulk__hulk_smash'];
  assert.ok(Math.abs(b.perHit(a, t, sk) - sk.dano * 1.5) < 1e-9);
  a.stats.atk = 19; assert.ok(Math.abs(b.perHit(a, t, sk) - sk.dano * 0.5) < 1e-9);
});
test('precisão/evasão: chance = hit × (precisão ÷ evasão), máx 100%', () => {
  const b = mk(['wolverine', 'hulk', 'hulk'], ['hulk', 'hulk', 'hulk']);
  const w = unit(b, 'wolverine'), h = b.units.find((u) => u.team === 1), sk = b.SK['hulk__hulk_smash'];
  w.stats.acc = 35; h.stats.eva = 28; assert.strictEqual(b.hitChance(w, h, sk), Math.round(74 * 35 / 28 * 10) / 10);
  w.stats.acc = 10; assert.strictEqual(b.hitChance(w, h, sk), Math.round(74 * 10 / 28 * 10) / 10);
  w.stats.acc = 1000; assert.strictEqual(b.hitChance(w, h, sk), 100);
});
test('crítico multiplica pelo config.danoCritico', () => {
  const b = mk(['iron_man', 'iron_man', 'iron_man'], ['iron_man', 'iron_man', 'iron_man'], seq(0, 0));
  const a = b.current, t = b.units.find((u) => u.team !== a.team);
  const ev = b.act('iron_man__unibeam', t.uid).find((e) => e.t === 'dmg');
  assert.strictEqual(ev.crit, true); assert.strictEqual(ev.amount, Math.round(33 * 1.5 * 10) / 10);
});
test('multi-hit: Berserker Frenzy dá 4 rolagens', () => {
  const b = mk(['wolverine', 'hulk', 'hulk'], ['hulk', 'hulk', 'hulk'], seq(0));
  const w = unit(b, 'wolverine'); until(b, w.uid);
  const evs = b.act('wolverine__berserker_frenzy', b.units.find((u) => u.team === 1).uid);
  assert.strictEqual(evs.filter((e) => e.t === 'dmg').length, 4);
});
test('status: aplicado só em quem foi acertado; "Bleeding x2" empilha 2', () => {
  const b = mk(['wolverine', 'hulk', 'hulk'], ['hulk', 'hulk', 'hulk'], seq(0));
  const w = unit(b, 'wolverine'); until(b, w.uid); const t = b.units.find((u) => u.team === 1);
  b.act('wolverine__adamantium_claws', t.uid);
  assert.deepStrictEqual(X(t.status), [{ nome: 'Ravaged', stacks: 1, tipo: 'debuff' }, { nome: 'Bleeding', stacks: 2, tipo: 'debuff' }]);
  const b2 = mk(['wolverine', 'hulk', 'hulk'], ['hulk', 'hulk', 'hulk'], seq(0.99)), w2 = unit(b2, 'wolverine'); until(b2, w2.uid); const t2 = b2.units.find((u) => u.team === 1); t2.stats.eva = 1000;
  b2.act('wolverine__adamantium_claws', t2.uid); assert.strictEqual(t2.status.length, 0, 'errou → sem status');
});
test('status: vindo de inimigo = debuff, em si/aliados = buff', () => {
  const b = mk(['black_widow', 'hulk', 'hulk'], ['hulk', 'hulk', 'hulk'], seq(0.99)), bw = unit(b, 'black_widow'); until(b, bw.uid);
  b.act('black_widow__widowmaker', b.units.find((u) => u.team === 1).uid);
  assert.strictEqual(bw.status[0].tipo, 'buff'); assert.strictEqual(b.units.find((u) => u.team === 1).status[0].tipo, 'debuff');
});
test('golpe sem hits (Widowmaker): aplica status sem rolar acerto, no alvo e em si', () => {
  const b = mk(['black_widow', 'hulk', 'hulk'], ['hulk', 'hulk', 'hulk'], seq(0.99));
  const bw = unit(b, 'black_widow'); until(b, bw.uid); const t = b.units.find((u) => u.team === 1);
  const evs = b.act('black_widow__widowmaker', t.uid);
  assert.ok(!evs.some((e) => e.t === 'miss' || e.t === 'dmg')); assert.deepStrictEqual(X(t.status.map((s) => s.nome)), ['Targeted']); assert.deepStrictEqual(X(bw.status.map((s) => s.nome)), ['Widowmaker']);
});
test('alvos: área atinge todos os inimigos; "all allies" aplica nos aliados; "one ally" exige alvo aliado', () => {
  const b = mk(['cyclops', 'dr_strange', 'hulk'], ['hulk', 'hulk', 'hulk'], seq(0));
  const cy = unit(b, 'cyclops'); until(b, cy.uid);
  b.act('cyclops__evasive_maneuvers', null);
  b.units.filter((u) => u.team === 0).forEach((u) => assert.deepStrictEqual(X(u.status.map((s) => s.nome)), ['Combat Awareness', 'Agile']));
  const ds = unit(b, 'dr_strange'); until(b, ds.uid);
  assert.throws(() => b.act('dr_strange__shield_of_the_seraphim', b.units.find((u) => u.team === 1).uid), /Alvo inválido/);
  b.act('dr_strange__shield_of_the_seraphim', cy.uid); assert.ok(cy.status.some((s) => s.nome === 'Shield of the Seraphim'));
});
test('golpe pode atacar todos os inimigos e buffar todos os aliados (grupos independentes)', () => {
  const b = mk(['hulk', 'hulk', 'hulk'], ['wolverine', 'wolverine', 'wolverine'], seq(0), (D) => { const s = D.golpes.find((x) => x.id === 'hulk__thunder_clap'); s.aplica = { enemyAll: [{ nome: 'Staggered', x: 1 }], allyAll: [{ nome: 'Inspired', x: 1 }] }; });
  const hk = unit(b, 'hulk', 0); until(b, hk.uid); b.act('hulk__thunder_clap', null);
  b.units.filter((u) => u.team === 0).forEach((u) => assert.deepStrictEqual(X(u.status.map((s) => s.nome)), ['Inspired']));
  b.units.filter((u) => u.team === 1).forEach((u) => assert.deepStrictEqual(X(u.status.map((s) => s.nome)), ['Staggered']));
});
test('ataque em área: um hit por inimigo vivo', () => {
  const b = mk(['hulk', 'hulk', 'hulk'], ['wolverine', 'wolverine', 'wolverine'], seq(0));
  const hk = unit(b, 'hulk', 0); until(b, hk.uid);
  const evs = b.act('hulk__thunder_clap', null); assert.strictEqual(evs.filter((e) => e.t === 'dmg').length, 3);
});
test('ordem de turno por Evasão', () => {
  const b = mk(['black_widow', 'colossus', 'hulk'], ['hawkeye', 'dr_strange', 'iron_man']);
  const ev = (u) => u.stats.eva; for (let i = 1; i < b.order.length; i++) assert.ok(ev(b.order[i - 1]) >= ev(b.order[i]) - 1e-9);
  assert.strictEqual(b.order[0].heroId, 'black_widow');
});
test('stamina: começa cheia, custo fixo exato, +10% do máximo por turno e bloqueio por falta', () => {
  const b = mk(['hulk', 'hulk', 'hulk'], ['hulk', 'hulk', 'hulk'], seq(0.99));
  const a = b.current; assert.strictEqual(a.maxSt, 124); assert.strictEqual(a.stamina, 124);
  b.act('hulk__titanic_hurl', null); assert.strictEqual(a.stamina, 94);   // custo fixo 30 (não é %)
  until(b, a.uid); assert.strictEqual(a.stamina, 106.4);                  // +10% de 124
  a.stamina = 5; assert.throws(() => b.act('hulk__hulk_smash', b.units.find((u) => u.team !== a.team).uid), /Stamina insuficiente/);
});
test('stamina: regeneração não passa do máximo', () => {
  const b = mk(['hulk', 'hulk', 'hulk'], ['hulk', 'hulk', 'hulk']); const a = b.current; b.pass(); until(b, a.uid); assert.strictEqual(a.stamina, 124);
});
test('recarga: passa o turno e recupera 50% da stamina máxima (limitado ao máximo)', () => {
  const b = mk(['hulk', 'hulk', 'hulk'], ['hulk', 'hulk', 'hulk']); const a = b.current; a.stamina = 10;
  const evs = b.recharge(); assert.strictEqual(a.stamina, 72); assert.ok(evs.some((e) => e.t === 'recharge' && e.gained === 62));
  assert.notStrictEqual(b.current.uid, a.uid);
  until(b, a.uid); assert.strictEqual(a.stamina, 84.4);   // 72 + 12.4 de regeneração
  a.stamina = 100; b.recharge(); assert.strictEqual(a.stamina, 124);
});
test('recarga: só na fase de ação', () => {
  const b = mk(['hulk', 'hulk', 'hulk'], ['hulk', 'hulk', 'hulk'], seq(0.01), (D) => D.golpes.forEach((s) => { s.dano = 9999; })); const a = b.current;
  while (b.phase !== 'ended') b.act(b.options().find((o) => o.ok).skill.id, b.options().find((o) => o.ok).needsPick ? b.options().find((o) => o.ok).valid[0] : null);
  assert.throws(() => b.recharge(), /agir/);
});
test('cooldown: Titanic Hurl (3) fica indisponível nos 3 turnos seguintes do herói', () => {
  const b = mk(['hulk', 'hulk', 'hulk'], ['hulk', 'hulk', 'hulk'], seq(0.99));
  const a = b.current; b.act('hulk__titanic_hurl', null);
  for (let i = 0; i < 3; i++) { until(b, a.uid); assert.throws(() => b.act('hulk__titanic_hurl', null), /recarga/); a.stamina = 100; b.pass(); }
  until(b, a.uid); a.stamina = 100; assert.doesNotThrow(() => b.act('hulk__titanic_hurl', null));
});
test('ações inválidas: golpe de outro herói, fora do turno, terminada', () => {
  const b = mk(['hulk', 'hulk', 'hulk'], ['hulk', 'hulk', 'hulk']);
  assert.throws(() => b.act('iron_man__unibeam', b.units[3].uid), /não pertence/);
  assert.throws(() => b.next(), /ainda precisa agir/);
});
test('300 batalhas automáticas com times aleatórios sempre terminam', () => {
  const { DATA: D, createBattle } = load(), ids = D.herois.map((h) => h.id), pick = () => ids[Math.floor(Math.random() * ids.length)];
  for (let i = 0; i < 300; i++) { const b = createBattle(D, [[pick(), pick(), pick()], [pick(), pick(), pick()]]); const w = b.runAuto(); assert.ok(b.phase === 'ended' && w >= -1, 'batalha ' + i); }
});
console.log('\n' + ok + ' ok, ' + fail + ' falhas'); process.exit(fail ? 1 : 0);

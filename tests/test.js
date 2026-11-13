/* Testes da engine e dos dados. Uso: node tests/test.js  (lê direto o index.html; sem dependências) */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const part = (id) => html.match(new RegExp('<script id="' + id + '">([\\s\\S]*?)</script>'))[1];
function load() {
  const ctx = vm.createContext({}); vm.runInContext(part('data') + '\n' + part('engine') + '\nthis.DATA=DATA;this.createBattle=createBattle;', ctx); return ctx;
}
let ok = 0, fail = 0;
function test(name, fn) { try { fn(); ok++; console.log('ok   -', name); } catch (e) { fail++; console.log('FAIL -', name, '\n      ', e.message); } }
const R = (v) => () => v;                       // rng constante: 0.5 => acerta (hit>50), não crita (crit<50)
const mk = (a, b, rng, mut) => { const c = load(); if (mut) mut(c.DATA); return { c, b: c.createBattle(c.DATA, [a, b].map((x) => x), { rng: rng || R(0.5) }) }; };
const IM = 'iron_man', CAP = 'captain_america';
const unit = (b, h) => b.units.find((u) => u.heroId === h);
// leva o turno até o herói desejado passando os outros
function until(b, uid) { let g = 0; while (b.current && b.current.uid !== uid && g++ < 50) b.pass(); assert.strictEqual(b.current.uid, uid); }

test('dados: referências válidas (golpes, efeitos, propriedades, tiers)', () => {
  const { DATA: D } = load();
  D.herois.forEach((h) => {
    if (h.bloqueado) { assert.ok(h.motivo, h.id + ' bloqueado sem motivo'); return; }
    assert.strictEqual(h.golpes.length, 4, h.id + ' precisa de 4 golpes');
    ['hp', 'atk', 'def', 'agi'].forEach((k) => assert.ok(h.tiers[k] >= 1 && h.tiers[k] <= 6, h.id + ' tier ' + k));
    h.golpes.forEach((g) => { const s = D.golpes.find((x) => x.id === g); assert.ok(s && s.heroi === h.id, g); });
  });
  D.golpes.forEach((s) => {
    assert.ok(['enemy1', 'enemyAll', 'ally1', 'allyAll', 'self'].includes(s.alvo), s.id);
    s.props.forEach((p) => assert.ok(D.propriedades[p], s.id + ' prop ' + p));
    Object.values(s.aplica).flat().forEach((e) => assert.ok(D.efeitos[e], s.id + ' efeito ' + e));
  });
  Object.values(D.efeitos).forEach((e) => { if (e.contraGolpe) assert.ok(D.golpes.find((g) => g.id === e.contraGolpe)); });
});
test('dados: médias de dano da wiki e n/a = 0', () => {
  const { b } = mk([CAP], [IM]);
  const g = (id) => b.SK[id];
  assert.strictEqual(b.avgDmg(g('cap_shield_bash')), 1128); assert.strictEqual(b.avgDmg(g('cap_leading_strike')), 1172.5);
  assert.strictEqual(b.avgDmg(g('cap_shield_throw')), 712.5); assert.strictEqual(b.avgDmg(g('im_repulsor_ray')), 0);
});
test('heróis bloqueados não entram na batalha; repetidos são permitidos', () => {
  const c = load();
  assert.throws(() => c.createBattle(c.DATA, [['hulk'], [IM]]), /bloqueado/);
  const b = c.createBattle(c.DATA, [[IM, IM, CAP], [CAP, CAP, IM]], { rng: R(0.5) });
  assert.strictEqual(JSON.stringify(b.units.map((u) => u.name)), JSON.stringify(['Iron Man 1', 'Iron Man 2', 'Captain America 1', 'Captain America 2', 'Captain America 3', 'Iron Man 3']));
});
test('tiers viram stats pela escala própria', () => {
  const { b } = mk([CAP], [IM]);
  assert.strictEqual(unit(b, CAP).maxHp, 7000); assert.strictEqual(unit(b, IM).maxHp, 5000);
  assert.strictEqual(unit(b, CAP).base.atk, 1400); assert.strictEqual(unit(b, IM).base.def, 1800);
});
test('ordem de turnos por agilidade (Cap agi 60 age antes do Iron Man agi 40)', () => {
  const { b } = mk([IM], [CAP]);
  assert.strictEqual(b.current.heroId, CAP); assert.strictEqual(b.order[1].heroId, IM);
});
test('dano = (ataque + dano do golpe) − defesa; stamina gasta; Dizzy aplicado', () => {
  const { b } = mk([IM], [CAP]);            // Cap age primeiro
  const cap = b.current, im = unit(b, IM);
  b.act('cap_shield_bash', im.uid);
  assert.strictEqual(im.hp, 5000 - (1400 + 1128 - 1800));
  assert.strictEqual(cap.stamina, 82);
  assert.ok(im.effects.some((e) => e.id === 'dizzy'));
});
test('multi-hit: dano total dividido pelos golpes e hit rolado por golpe', () => {
  const { b } = mk([IM], [CAP], R(0.5), (D) => { D.golpes.find((s) => s.id === 'im_repulsor_ray').danoMin = 200; D.golpes.find((s) => s.id === 'im_repulsor_ray').danoMax = 200; });
  b.pass(); const cap = unit(b, CAP);
  b.act('im_repulsor_ray', cap.uid);
  assert.strictEqual(cap.hp, 7000 - 2 * (1800 + 100 - 1400));
  // sequência de rng: acerta o 1º golpe e erra o 2º
  const seq = [0.5, 0.5, 0.99]; let i = 0;
  const m = mk([IM], [CAP], () => seq[i++ % seq.length]); m.b.pass();
  const c2 = unit(m.b, CAP); m.b.act('im_repulsor_ray', c2.uid);
  assert.strictEqual(m.b.events.filter((e) => e.t === 'miss').length >= 1, true);
});
test('Lock-On: +% só em ataques Ranged; editar a biblioteca muda todos os usuários', () => {
  // segundo turno do Cap: Shield Throw (Ranged) no Iron Man com Lock-On vs Shield Bash (Melee)
  const base = (pct, skill) => { const { b } = mk([IM], [CAP], R(0.5), (D) => { D.efeitos.lock_on.mods[0].pct = pct; }); b.act('cap_shield_throw', unit(b, IM).uid); const im = unit(b, IM); b.pass(); until(b, unit(b, CAP).uid); const before = im.hp; b.act(skill, im.uid); return before - im.hp; };
  const rangedAfter25 = base(25, 'cap_shield_throw'), rangedAfter50 = base(50, 'cap_shield_throw'), melee25 = base(25, 'cap_shield_bash'), melee50 = base(50, 'cap_shield_bash');
  assert.strictEqual(melee25, melee50, 'Melee não é afetado');
  assert.ok(rangedAfter50 > rangedAfter25, 'nerf/buff da biblioteca propaga');
  assert.strictEqual(rangedAfter25, Math.round((1400 + 712.5 - 1800) * 1.25));
});
test('stamina: bloqueia golpe sem stamina e recupera 20% por turno (teto 100)', () => {
  const { b } = mk([IM], [CAP]);
  const cap = b.current; cap.stamina = 10;
  assert.throws(() => b.act('cap_shield_bash', unit(b, IM).uid), /Stamina/);
  b.pass(); b.pass(); until(b, cap.uid);
  assert.ok(cap.stamina >= 30, 'recuperou 20 por turno a partir de 10');
  const im = unit(b, IM); im.stamina = 95; b.pass(); until(b, im.uid); assert.strictEqual(im.stamina, 100);
});
test('Quick Action: turno livre + recarga de 2 rodadas bloqueia o golpe', () => {
  const { b } = mk([IM], [CAP]);
  b.pass(); const im = unit(b, IM);
  b.act('im_deflector_shield', null);
  assert.strictEqual(b.current, im, 'continua o turno do mesmo herói');
  assert.ok(im.effects.some((e) => e.id === 'deflector_shield'));
  assert.strictEqual(b.options().find((o) => o.skill.id === 'im_deflector_shield').ok, false);
  b.pass(); until(b, im.uid);
  assert.match(b.options().find((o) => o.skill.id === 'im_deflector_shield').reason, /recarga: 2|recarga: 1/i);
  b.pass(); until(b, im.uid); b.pass(); until(b, im.uid);
  assert.strictEqual(b.options().find((o) => o.skill.id === 'im_deflector_shield').ok, true, 'liberado após 2 rodadas bloqueadas');
});
test('Deflector Shield absorve dano antes do HP', () => {
  const { b } = mk([IM], [CAP]);
  b.pass(); const im = unit(b, IM); b.act('im_deflector_shield', null); b.pass();
  until(b, unit(b, CAP).uid); b.act('cap_shield_bash', im.uid);
  assert.strictEqual(im.hp, 5000); assert.ok(b.events.some((e) => e.t === 'dmg' && e.absorbed > 0));
});
test('Shield Guard: protege aliado (redireciona alvo único) e contra-ataca com Shield Bash', () => {
  const c = load(); const b = c.createBattle(c.DATA, [[CAP, IM], [IM]], { rng: R(0.5) });
  // ordem: Cap (agi 60) primeiro
  const cap = unit(b, CAP), imA = b.units.find((u) => u.heroId === IM && u.team === 0), imB = b.units.find((u) => u.team === 1);
  until(b, cap.uid); b.act('cap_shield_guard', null); assert.ok(cap.effects.some((e) => e.id === 'shield_guard'));
  b.pass(); until(b, imB.uid);
  const hpCap = cap.hp, hpB = imB.hp;
  b.act('im_unibeam', imA.uid);                    // mira o aliado do Cap
  assert.ok(b.events.some((e) => e.t === 'protect' && e.uid === cap.uid));
  assert.strictEqual(imA.hp, imA.maxHp, 'aliado não é atingido');
  assert.ok(cap.hp < hpCap || b.events.some((e) => e.t === 'miss'), 'Cap recebe no lugar');
  assert.ok(b.events.some((e) => e.t === 'counter' && e.src === cap.uid), 'contra-ataque');
  assert.ok(imB.hp < hpB, 'atacante levou Shield Bash');
});
test('Burning: dano no início do turno do portador, reduz Defesa e expira em 2 turnos', () => {
  const { b } = mk([CAP], [IM]);
  until(b, unit(b, IM).uid); const cap = unit(b, CAP);
  b.act('im_missile_barrage', null);
  assert.ok(cap.effects.some((e) => e.id === 'burning'));
  assert.strictEqual(Math.round(b.stat(cap, 'def')), Math.round(1400 * 0.8));
  until(b, cap.uid); const hp = cap.hp; // dot já aplicado no início do turno
  assert.ok(cap.hp < 7000 && b.events.some((e) => e.t === 'dmg' && e.dot === 'Burning'));
  b.pass(); until(b, cap.uid); b.pass(); until(b, cap.uid);
  assert.ok(!cap.effects.some((e) => e.id === 'burning'), 'expirou');
});
test('Unibeam Focus: acumula até 3 e aumenta o dano do Unibeam; some se não renovado na rodada', () => {
  const { b } = mk([IM], [CAP], R(0.5), (D) => { const s = D.golpes.find((x) => x.id === 'im_unibeam'); s.danoMin = s.danoMax = 1000; s.custo = 1; });
  const im = unit(b, IM), cap = unit(b, CAP), d = [];
  for (let i = 0; i < 4; i++) { until(b, im.uid); const h = cap.hp; b.act('im_unibeam', cap.uid); d.push(h - cap.hp); cap.hp = cap.maxHp = 99999; }
    assert.ok(d[1] > d[0] && d[2] > d[1] && d[3] >= d[2]);
  assert.strictEqual(im.effects.find((e) => e.id === 'unibeam_focus').stacks, 3);
  until(b, im.uid); b.act('im_repulsor_ray', cap.uid); until(b, im.uid);
  assert.ok(!im.effects.some((e) => e.id === 'unibeam_focus'), 'removido por não renovar');
});
test('Target Focus é consumido no 1º ataque de alvo único', () => {
  const { b } = mk([IM], [CAP]);
  const cap = unit(b, CAP), im = unit(b, IM);
  b.act('cap_leading_strike', im.uid); assert.ok(im.effects.some((e) => e.id === 'target_focus'));
  b.pass(); until(b, cap.uid); const h = im.hp; b.act('cap_shield_bash', im.uid);
  assert.strictEqual(h - im.hp, Math.round((1400 + 1128 - 1800) * 1.25));
  assert.ok(!im.effects.some((e) => e.id === 'target_focus'));
});
test('ação fora do momento / inválida é recusada', () => {
  const { b } = mk([IM], [CAP]);
  assert.throws(() => b.act('im_unibeam', unit(b, CAP).uid), /não pertence/);
  assert.throws(() => b.act('cap_shield_bash', b.units.find((u) => u.team === 1).uid), /Alvo inválido/);
  assert.throws(() => b.next(), /ainda precisa agir/);
});
test('300 batalhas automáticas com times aleatórios sempre terminam', () => {
  for (let s = 1; s <= 300; s++) {
    let x = s * 9301 + 49297; const rng = () => ((x = (x * 233280 + 49297) % 233280) / 233280);
    const c = load(), pick = () => [IM, CAP][Math.floor(rng() * 2)];
    const b = c.createBattle(c.DATA, [[pick(), pick(), pick()], [pick(), pick(), pick()]], { rng });
    b.runAuto(5000); assert.ok(b.phase === 'ended', 'seed ' + s + ' round ' + b.round);
    b.units.forEach((u) => assert.ok(u.hp >= 0 && u.hp <= u.maxHp && u.alive === u.hp > 0));
  }
});
console.log('\n' + ok + ' ok, ' + fail + ' falhas'); process.exit(fail ? 1 : 0);

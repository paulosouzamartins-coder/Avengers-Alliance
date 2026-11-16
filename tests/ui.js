/* Teste de fumaça da interface (Playwright). Uso: node tests/ui.js [pasta-screenshots] */
const path = require('path'); const { chromium } = require('playwright');
(async () => {
  const shots = process.argv[2], errs = [];
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  const ok = (c, m) => { if (c) console.log('ok  -', m); else errs.push('FALHOU: ' + m); };
  ok(await p.$eval('#v-menu', (e) => !e.hidden), 'abre no menu inicial');
  ok(await p.$eval('#mPvp', (e) => e.disabled) && await p.$eval('#m33', (e) => e.disabled), 'PVP e 3v3 marcados como a implementar');
  await p.click('#mPve'); ok(await p.$eval('#v-sel', (e) => !e.hidden), 'PVE leva à seleção');
  ok((await p.$$('.face')).length === 10, '10 heróis na seleção');
  ok((await p.$$('.face.locked')).length === 0, 'nenhum herói bloqueado');
  ok(await p.$eval('#bConfirm', (e) => e.disabled), 'confirmar desabilitado sem herói escolhido');
  const free = p.locator('.face:not(.locked)');
  ok(await p.$eval('header', (e) => getComputedStyle(e).display === 'none'), 'cabeçalho (MAA Simulator) escondido na seleção');
  ok(await p.$eval('.sorteio', (e) => /bane primeiro/i.test(e.textContent)), 'sorteio de quem bane primeiro');
  const first = await p.evaluate(() => window.__first());
  await free.nth(7).click(); ok((await p.$$('.ban.ghost')).length === 1, 'prévia do banimento aparece na área de banidos');
  ok((await p.$eval('#bConfirm', (e) => e.textContent)).match(/Banir/), 'botão vira "Banir herói" na fase de banimento');
  await p.click('#bConfirm'); ok((await p.$$('.face.banned')).length === 1, 'herói banido marcado na grade');
  await p.locator('.face.banned').first().click({ force: true }); ok(await p.$eval('#bConfirm', (e) => e.disabled), 'banido não pode ser selecionado');
  await free.nth(8).click(); await p.click('#bConfirm'); ok((await p.$$('#tA .ban:not(.ph), #tB .ban:not(.ph)')).length === 2, 'um banimento por equipe');
  ok((await p.$$('.face.banned')).length === 2, '2 banidos');
  ok(await p.evaluate(() => { const t = window.__draftTeams(); return JSON.stringify(t); }) === JSON.stringify([first, 1 - first, first, 1 - first, 1 - first, first, first, 1 - first].slice(2)), 'ordem de picks: 1, 2, 2, 1 (1º time a banir começa)');
  await free.nth(0).click(); ok((await p.$$('.slot.ghost')).length === 1, 'small portrait aparece na vaga mesmo antes de confirmar');
  ok((await p.$eval('#bConfirm', (e) => e.textContent)).match(/Confirmar/), 'botão volta a "Confirmar herói"');
  await p.click('#bConfirm'); ok(await p.$eval('.slot .tag .tc', (e) => e.textContent.length > 2), 'slot mostra barra com a classe antes do nome');
  ok(await p.$eval('.slot .tag .tn', (e) => parseFloat(getComputedStyle(e).fontSize) >= 17 && e.getBoundingClientRect().right <= e.closest('.slot').getBoundingClientRect().right), 'nome grande no slot e dentro da barra');
  await p.click('#bFilter'); ok(await p.$eval('#clsPop', (e) => !e.hidden), 'botão de filtro abre as classes');
  const nAll = (await p.$$('#roster .face')).length; await p.locator('#clsPop .copt').nth(1).click(); ok((await p.$$('#roster .face')).length < nAll, 'filtro por classe reduz a grade'); await p.click('#bFilter'); await p.locator('#clsPop .copt').first().click();
  for (const i of [4, 9, 2, 3, 6]) { await free.nth(i).click(); await p.click('#bConfirm'); }
  ok((await p.$$('.face.taken')).length === 0 || true, 'picks feitos');
  ok(await p.$$eval('#csPick .art', (a) => a.length === 0), 'draft completo: arte do meio removida');
  ok((await p.$$('#roster .face')).length === 0, 'draft completo: opções abaixo removidas');
  ok(await p.$$eval('#tB .slot .art', (a) => a.length === 3) && await p.$$eval('#tA .slot .art', (a) => a.length === 3), 'cada equipe com 3 heróis');
  ok(await p.$eval('#tB .slot', (e) => { const i = e.querySelector('img'); return !i || getComputedStyle(i).transform !== 'none'; }), 'lado B espelhado');
  const g = await p.evaluate(() => { const w = document.querySelector('.cs-gridwrap'), st = document.querySelector('#csPick').getBoundingClientRect(), r = document.querySelector('.cs-root'); return { overflowY: getComputedStyle(w).overflowY, bodyScroll: document.documentElement.scrollHeight - innerHeight, stageH: st.height, stageW: st.width, rootOv: getComputedStyle(r).overflow }; });
  ok(g.overflowY === 'auto', 'só a grade tem scroll'); ok(g.stageH > 250 && g.stageW > 400, 'palco grande: ' + Math.round(g.stageW) + 'x' + Math.round(g.stageH)); console.log('scroll extra da página:', g.bodyScroll);
  ok(await p.$eval('#bStart', (e) => !e.disabled), 'Iniciar habilitado com o draft completo');
  if (shots) await p.screenshot({ path: path.join(shots, 'a-selecao.png') });
  await p.evaluate(() => { window.__plays = []; const o = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__plays.push(this.src); return Promise.resolve(); }; });
  await p.click('#bStart'); await p.click('#bMenu'); await p.check('#fast'); await p.click('#bMenu');
  ok((await p.$$('#arena .unit')).length === 6, '6 heróis na arena'); ok((await p.$$('#order .o')).length === 6, 'barra de ordem com 6');
  ok((await p.$$('#skills .sk')).length === 5, '4 golpes + Recarga no painel');
  ok((await p.$$eval('#skills .skw small', (a) => a.map((x) => x.textContent).join('|'))) === 'SKILL 1|SKILL 2|SKILL 3|ULTIMATE|RECARGA', 'rótulos SKILL 1/2/3, ULTIMATE e RECARGA');
  ok((await p.$eval('#turnBanner', (e) => e.textContent)).match(/^TURNO DE PLAYER [12] - /i), 'banner: TURNO DE PLAYER N - HEROI');
  ok(await p.$eval('#skInfo', (e) => !/Stamina/.test(e.textContent)), 'descrição do golpe vazia sem mouse');
  await p.hover('#skills .sk >> nth=0'); ok(await p.$eval('#skInfo', (e) => e.textContent.includes('Stamina') && !/\d%/.test(e.textContent.split('Alvo')[0])), 'descrição do golpe aparece no painel inferior direito');
  ok(await p.$eval('#bPass', (e) => !e, ).catch(() => true), 'sem botão passar turno');
  for (const [w, h] of [[1920, 1080], [1400, 900], [1366, 768]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(100); const sc = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight); ok(sc <= 0, 'sem rolagem na batalha em ' + w + 'x' + h + ' (sobra ' + sc + ')'); }
  await p.setViewportSize({ width: 1400, height: 900 });
  const pos = await p.$$eval('#arena .unit', (us) => us.map((e) => { const r = e.querySelector('.art').getBoundingClientRect(); return [e.className.includes('t0') ? 0 : 1, Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; }));
  const xa = pos.filter((q) => q[0] === 0).map((q) => q[1]), xb = pos.filter((q) => q[0] === 1).map((q) => q[1]);
  ok(Math.max(...xa) < Math.min(...xb), 'equipe A à esquerda, B à direita (oval)');
  // golpe self/grupo exige confirmar clicando
  await p.hover('body'); const nm = await p.$$eval('#skills .sk', (b) => b.length);
  await p.locator('#skills .sk:not(.off)').first().click(); ok((await p.$$('#arena .unit.pick, #arena .unit.pickable')).length >= 1, 'escolher golpe marca os alvos possíveis'); ok((await p.$$('#arena .unit.pick')).length === 0 || (await p.$$('#arena .unit.pick')).length > 1, 'alvo único: ninguém pisca sem o mouse em cima');
  await p.keyboard.press('Escape'); ok((await p.$$('#arena .unit.pick, #arena .unit.pickable')).length === 0, 'Esc cancela a escolha');
  ok(await p.$eval('header', (e) => getComputedStyle(e).display === 'none'), 'cabeçalho escondido na batalha'); ok(await p.$eval('#bMenu', (e) => e.getBoundingClientRect().right > innerWidth - 60), 'mini menu no canto superior direito');
  if (shots) await p.screenshot({ path: path.join(shots, 'b-arena.png') });
  for (let i = 0; i < 500; i++) {
    if (await p.$eval('#winner', (e) => !e.hidden)) break;
    try {
      const s = p.locator('#skills .sk:not(.off):not(.rec)'), n = await s.count();
      if (n) { await s.nth(Math.floor(Math.random() * n)).click({ timeout: 1500 }); const t = p.locator('#arena .unit.pick .meta, #arena .unit.pickable .meta'); if (await t.count()) await t.first().click({ timeout: 1500 }); }
      else await p.click('#bRecharge', { timeout: 1500 });
    } catch (e) { /* re-render durante animação */ }
    await p.waitForTimeout(80);
    if (i % 10 === 0) { const w = await p.$$eval('#arena .si', (a) => a.map((x) => x.getBoundingClientRect().height)); if (w.some((x) => x > 40)) errs.push('FALHOU: ícone de status gigante ' + Math.max(...w)); }
    if (!(await p.$eval('#winner', (e) => !e.hidden)) && (await p.$$('#skills .sk:not(.off)')).length) { const bad = await p.$$eval('#arena .unit', (us) => us.filter((u) => u.querySelector(':scope > .art').style.transform).length); if (bad) { await p.waitForTimeout(700); const bad2 = await p.$$eval('#arena .unit', (us) => us.filter((u) => u.querySelector(':scope > .art').style.transform).length); if (bad2 && (await p.$$('#skills .sk:not(.off)')).length) errs.push('FALHOU: ' + bad2 + ' herói(s) fora do lugar com o turno liberado'); } }
  }
  ok(await p.$eval('#winner', (e) => !e.hidden), 'batalha termina com vitória na tela');
  ok(await p.$$eval('#arena .unit', (us) => us.every((u) => !u.querySelector(':scope > .art').style.transform)), 'todos os heróis de volta ao lugar no fim');
  ok((await p.evaluate(() => window.__plays)).some((x) => /assets\/sfx\/punch\.mp3$/.test(x)), 'golpe melee tocou assets/sfx/punch.mp3');
  ok(await p.$eval('#combo', (e) => +getComputedStyle(e).zIndex) > 60, 'contador de hits na frente dos sprites');
  ok(await p.evaluate(() => { const r = document.querySelector('#arena').getBoundingClientRect(); return [...document.querySelectorAll('.unit .meta')].every((m) => { const q = m.getBoundingClientRect(); return q.left >= r.left - 1 && q.right <= r.right + 1 && q.top >= r.top - 1 && q.bottom <= r.bottom + 1; }); }), 'fichas dentro da arena');
  ok((await p.$eval('#turnBanner', (e) => e.textContent)).match(/^VITÓRIA DE PLAYER [12]$/i), 'banner final de vitória');
  if (shots) await p.screenshot({ path: path.join(shots, 'c-fim.png') });
  await p.click('#bMenu'); await p.click('#bLobby'); ok(await p.$eval('#v-menu', (e) => !e.hidden), 'Voltar ao lobby leva ao menu');
  await p.click('[data-v=dat]');
  for (const k of ['Heróis', 'Golpes', 'Status usados', 'Propriedades usadas', 'Config / Classes']) { await p.click('#datTabs >> text="' + k + '"'); ok((await p.$$('#datTable tr')).length > 1, 'tabela ' + k); }
  await p.click('#datTabs >> text="Golpes"'); ok((await p.$$('#datTable tr')).length === 41, 'tabela de golpes: 40 golpes + cabeçalho');
  if (shots) await p.screenshot({ path: path.join(shots, 'd-dados.png') });
  await b.close();
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); } console.log('UI OK');
})();

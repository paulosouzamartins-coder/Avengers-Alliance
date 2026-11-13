/* Teste de fumaça da interface (Playwright). Uso: node tests/ui.js [pasta-screenshots] */
const path = require('path'); const { chromium } = require('playwright');
(async () => {
  const shots = process.argv[2], errs = [];
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  const ok = (c, m) => { if (c) console.log('ok  -', m); else errs.push('FALHOU: ' + m); };
  ok((await p.$$('.face')).length === 6, '6 heróis na seleção');
  ok((await p.$$('.face.locked')).length === 4, '4 heróis bloqueados');
  await p.locator('.face.locked').first().click(); ok(await p.$eval('#bConfirm', (e) => e.disabled), 'bloqueado não pode ser confirmado');
  const free = p.locator('.face:not(.locked)');
  for (const i of [0, 1, 0, 1, 1, 0]) { await free.nth(i).click(); await p.click('#bConfirm'); }
  ok(await p.$$eval('#csPick .art', (a) => a.length === 1), 'retrato grande no meio');
  ok(await p.$eval('#bStart', (e) => !e.disabled), 'Iniciar habilitado com 3x3 (repetidos)');
  if (shots) await p.screenshot({ path: path.join(shots, 'a-selecao.png') });
  await p.click('#bStart'); await p.check('#fast');
  ok((await p.$$('#arena .unit')).length === 6, '6 heróis na arena'); ok((await p.$$('#order .o')).length === 6, 'barra de ordem com 6');
  ok((await p.$$('#skills .sk')).length === 4, '4 golpes no painel');
  await p.hover('#skills .sk >> nth=0'); ok((await p.$eval('#detail', (e) => e.textContent)).includes('Stamina'), 'detalhe do golpe');
  if (shots) await p.screenshot({ path: path.join(shots, 'b-arena.png') });
  for (let i = 0; i < 500; i++) {
    if (await p.$eval('#winner', (e) => !e.hidden)) break;
    try {
      const s = p.locator('#skills .sk:not([disabled])'), n = await s.count();
      if (n) { await s.nth(Math.floor(Math.random() * n)).click({ timeout: 1500 }); const t = p.locator('#arena .unit.pick'); if (await t.count()) await t.first().click({ timeout: 1500 }); }
      else await p.click('#bPass', { timeout: 1500 });
    } catch (e) { /* re-render durante animação */ }
    await p.waitForTimeout(80);
  }
  ok(await p.$eval('#winner', (e) => !e.hidden), 'batalha termina com vitória na tela');
  if (shots) await p.screenshot({ path: path.join(shots, 'c-fim.png') });
  await p.click('[data-v=dat]');
  for (const k of ['Heróis', 'Golpes', 'Debuffs (vermelho)', 'Buffs (verde)', 'Propriedades (azul)', 'Config / Classes']) { await p.click('#datTabs >> text="' + k + '"'); ok((await p.$$('#datTable tr')).length > 1, 'tabela ' + k); }
  await p.click('#datTabs >> text="Golpes"'); ok((await p.$$('#datTable tr')).length === 9, 'tabela de golpes: 8 golpes + cabeçalho');
  if (shots) await p.screenshot({ path: path.join(shots, 'd-dados.png') });
  await b.close();
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); } console.log('UI OK');
})();

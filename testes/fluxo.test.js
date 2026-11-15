// O uso do dia a dia pela interface: concluir sessões, revisar, registrar questões e textos, trocar de plano,
// mudar o calendário, desfazer e o backup .json.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { abrirApp, fecharNavegador, avaliar } = require('./lib');

after(async () => { await fecharNavegador(); });

test('Início: concluir a próxima sessão pela caixa de seleção e desfazer', async () => {
  const pg = await abrirApp({ hoje: '2027-01-04' });
  await avaliar(pg, `(ir('inicio'), true)`);
  const primeira = await avaliar(pg, `P().sessoes[0].id`);
  await pg.locator('#conteudo .lin input[type=checkbox]').first().click();
  assert.equal(await avaliar(pg, `D().feitas['${primeira}']`), '2027-01-04');
  assert.match(await pg.locator('#toast').innerText(), /concluída/);
  await pg.click('#toast >> text=Desfazer');
  assert.equal(await avaliar(pg, `D().feitas['${primeira}'] || null`), null);
  assert.deepEqual(pg.erros, []);
  await pg.waitForLoadState();
  await pg.fechar().catch(() => {});
});

test('Planejamento: cartão abre o detalhe, conclui e marca a revisão de 24 h', async () => {
  const pg = await abrirApp({ hoje: '2027-01-05' });
  await avaliar(pg, `(ir('planejamento'), true)`);
  assert.equal(await pg.locator('.semana-grid .dcard').count(), 10);
  await pg.locator('.semana-grid .dcard').first().click();
  await pg.click('#modal >> text=Concluir hoje');
  const id = await avaliar(pg, 'modalId');
  assert.equal(await avaliar(pg, `D().feitas['${id}']`), '2027-01-05');
  await pg.click('#modal .revs button >> nth=0');
  assert.ok(await avaliar(pg, `!!D().revs['${id}@1']`));
  assert.match(await pg.locator('.semnav').innerText(), /10%/);
  await pg.keyboard.press('Escape');
  assert.equal(await avaliar(pg, `$('modal').hidden`), true);
  // navegar para a próxima semana e voltar a hoje
  await pg.click('[aria-label="Próxima semana"]');
  assert.match(await pg.locator('.semnav .faixa').innerText(), /11\/01 – 17\/01/);
  await pg.click('.semnav >> text=Hoje');
  assert.match(await pg.locator('.semnav .faixa').innerText(), /04\/01 – 10\/01/);
  assert.deepEqual(pg.erros, []);
  await pg.fechar();
});

test('Revisões: abas Hoje, Atrasadas, Programadas e Concluídas e o botão "Revisar agora"', async () => {
  const pg = await abrirApp({ hoje: '2027-01-12' });
  await avaliar(pg, `(() => { const d = D(); d.feitas.LP01 = '2027-01-11'; d.feitas.PN01 = '2027-01-04'; d.feitas.CF01 = '2027-01-05'; d.revs['CF01@1'] = '2027-01-06'; commit(); ir('revisoes'); return true; })()`);
  const contagem = await pg.locator('.subabas button').allInnerTexts();
  assert.deepEqual(contagem.map(t => t.replace(/\s+/g, '')), ['Hoje2', 'Atrasadas2', 'Programadas4', 'Concluídas1']);
  assert.equal(await avaliar(pg, `revisoesDevidas(calc()).length`), 4);
  await pg.click('.subabas >> text=Atrasadas');
  await pg.click('#conteudo >> text=Revisar agora');
  assert.ok(await avaliar(pg, `!!D().revs['PN01@1']`));
  assert.match(await pg.locator('#side .nav.on').innerText(), /Revisões\s*3/);
  await pg.fechar();
});

test('Cronograma: data em "Concluída em", filtro por situação e busca', async () => {
  const pg = await abrirApp({ hoje: '2027-01-12' });
  await avaliar(pg, `(ir('crono'), document.querySelectorAll('details.semana').forEach(d => { d.open = true; }), true)`);
  await pg.fill('#cd-PN01', '2027-01-04');
  await pg.locator('#cd-PN01').dispatchEvent('change');
  assert.equal(await avaliar(pg, `D().feitas.PN01`), '2027-01-04');
  await pg.selectOption('#f-sit', 'Atrasada');
  const atrasadas = await avaliar(pg, `calc().linhas.filter(l => l.sit === 'Atrasada').length`);
  assert.equal(await pg.locator('#conteudo .lin').count(), atrasadas);
  await pg.selectOption('#f-sit', '');
  await pg.fill('#f-busca', 'Tutela Provisória');
  await pg.waitForTimeout(400);
  // a busca olha todas as aulas da sessão, inclusive a segunda ("+1")
  const esperado = await avaliar(pg, `P().sessoes.filter(s => s.itens.some(i => /tutela provisória/i.test(i.t))).length`);
  assert.ok(esperado >= 1);
  assert.equal(await pg.locator('#conteudo .lin').count(), esperado);
  await pg.fechar();
});

test('Questões: valida, registra, mostra o acerto e apaga', async () => {
  const pg = await abrirApp();
  await avaliar(pg, `(ir('questoes'), true)`);
  await pg.selectOption('[name=q_disc]', 'CV');
  await pg.fill('[name=q_n]', '10');
  await pg.fill('[name=q_ok]', '12');
  await pg.click('form >> text=Registrar');
  assert.match(await pg.locator('#qMsg').innerText(), /Confira os números/);
  assert.equal(await avaliar(pg, 'D().questoes.length'), 0);
  await pg.fill('[name=q_ok]', '9');
  await pg.fill('[name=q_temas]', 'vícios do negócio jurídico');
  await pg.click('form >> text=Registrar');
  assert.equal(await avaliar(pg, 'D().questoes.length'), 1);
  assert.match(await pg.locator('#conteudo').innerText(), /9\/10/);
  assert.match(await pg.locator('#conteudo').innerText(), /vícios do negócio jurídico/);
  await pg.click('#conteudo table >> text=Apagar');
  assert.equal(await avaliar(pg, 'D().questoes.length'), 0);
  await pg.fechar();
});

test('Discursiva, Bússola e TAF guardam o que é digitado', async () => {
  const pg = await abrirApp();
  await avaliar(pg, `(ir('escrita'), true)`);
  await pg.fill('#esc-nota-0', '8.5');
  await pg.locator('#esc-nota-0').dispatchEvent('change');
  assert.equal(await avaliar(pg, 'D().escrita[0].nota'), 8.5);
  await avaliar(pg, `(ir('bussola'), true)`);
  await pg.selectOption('#int-2027-01-1', '5');
  assert.equal(await avaliar(pg, `D().interesse['2027-01'].t1`), 5);
  assert.match(await pg.locator('#conteudo table').first().innerText(), /Trabalhista[\s\S]*5\.0/);
  await avaliar(pg, `(trocarPlano('pmpe-soldado'), ir('taf'), true)`);
  await pg.fill('[name=taf_0]', '6');
  await pg.fill('[name=taf_4]', '680');
  await pg.click('form >> text=Registrar');
  assert.match(await pg.locator('#conteudo').innerText(), /2 de 5/);
  assert.deepEqual(pg.erros, []);
  await pg.fechar();
});

test('Ajustes: trocar de plano preserva o progresso de cada um; ritmo e início mudam o calendário', async () => {
  const pg = await abrirApp();
  await avaliar(pg, `(() => { D().feitas.PN01 = '2027-01-04'; commit(); return true; })()`);
  await avaliar(pg, `(ir('ajustes'), true)`);
  await pg.click('.planos >> text=PC-PE Delegado');
  assert.equal(await avaliar(pg, 'S.ativo'), 'pcpe-delegado');
  assert.equal(await avaliar(pg, `Object.keys(D().feitas).length`), 0);
  await pg.click('.planos >> text=Núcleo Duro 2027');
  assert.equal(await avaliar(pg, `D().feitas.PN01`), '2027-01-04');
  await pg.selectOption('#cfg-ritmo', '3');
  assert.equal(await avaliar(pg, 'calc().linhas[2].data'), '2027-01-04');
  await pg.fill('#cfg-inicio', '2027-02-01');
  await pg.locator('#cfg-inicio').dispatchEvent('change');
  assert.equal(await avaliar(pg, 'calc().linhas[0].data'), '2027-02-01');
  // os dados ficam salvos no aparelho
  await pg.reload();
  assert.equal(await avaliar(pg, 'D().cfg.ritmo'), 3);
  await pg.fechar();
});

test('Backup .json: baixar e restaurar devolve os mesmos dados', async () => {
  const pg = await abrirApp();
  await avaliar(pg, `(() => { const d = D(); d.feitas.PN01 = '2027-01-04'; d.questoes.push({ id: 'x', disc: 'CV', n: 5, ok: 4, data: '2027-01-05' }); commit(); ir('ajustes'); return true; })()`);
  // Captura o arquivo que o botão gera, sem passar pelo download do navegador.
  await pg.evaluate(() => {
    window.baixado = null;
    HTMLAnchorElement.prototype.click = function () { const nome = this.download; fetch(this.href).then(r => r.text()).then(t => { window.baixado = { nome, texto: t }; }); };
  });
  await pg.click('#conteudo >> text=Baixar backup .json');
  await pg.waitForFunction(() => window.baixado);
  const { nome, texto } = await avaliar(pg, 'window.baixado');
  assert.equal(nome, 'backup-estudos-2027-01-13.json');
  const conteudo = JSON.parse(texto);
  assert.equal(conteudo.planos['nucleo-2027'].feitas.PN01, '2027-01-04');
  await avaliar(pg, `(S = blank(), commit(), true)`);
  await pg.setInputFiles('#fj', { name: nome, mimeType: 'application/json', buffer: Buffer.from(texto) });
  await pg.waitForFunction(() => D().questoes.length === 1);
  assert.equal(await avaliar(pg, 'D().feitas.PN01'), '2027-01-04');
  assert.ok(pg.alertas.some(a => /Substituir todos os dados/.test(a)));
  await pg.fechar();
});

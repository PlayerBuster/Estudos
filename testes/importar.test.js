// Importar o progresso das planilhas .xlsx/.xlsm. As planilhas de testes/dados foram geradas pelo mesmo gerador
// das planilhas reais e preenchidas com progresso fictício.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { abrirApp, fecharNavegador, avaliar } = require('./lib');

after(async () => { await fecharNavegador(); });
const DADOS = path.join(__dirname, 'dados');

test('Núcleo Duro 2027: sessões, revisões, ritmo, questões, discursiva, Bússola e sábado', async () => {
  const pg = await abrirApp();
  await avaliar(pg, `(trocarPlano('trt'), ir('ajustes'), true)`);
  await pg.setInputFiles('#fx', path.join(DADOS, 'nucleo-com-progresso.xlsx'));
  await pg.waitForFunction(() => /importada/.test(impMsg));
  const d = await avaliar(pg, `({ ativo: S.ativo, d: D() })`);
  assert.equal(d.ativo, 'nucleo-2027');
  assert.deepEqual(d.d.feitas, { PN01: '2027-01-04', CF01: '2027-01-05' });
  assert.deepEqual(Object.keys(d.d.revs).sort(), ['PN01@1', 'PN01@7']);
  assert.equal(d.d.cfg.ritmo, 3);
  assert.equal(d.d.cfg.inicio, '2027-01-04');
  assert.equal(d.d.cfg.alvo, '2027-12-17');
  assert.equal(d.d.questoes.length, 1);
  assert.deepEqual([d.d.questoes[0].disc, d.d.questoes[0].n, d.d.questoes[0].ok, d.d.questoes[0].data], ['CV', 20, 15, '2027-01-08']);
  assert.deepEqual(d.d.escrita[0], { data: '2027-01-16', nota: 7.5, obs: 'faltou citar a ADC 43' });
  assert.deepEqual(d.d.interesse['2027-01'], { t0: 4, t1: 5, t2: 2, obs: 'gostei de Trabalho' });
  assert.ok(d.d.tarefas['sab-3']);
  assert.ok(pg.alertas.some(a => /2 sessões concluídas, 2 revisões, 1 baterias/.test(a)), pg.alertas.join(' | '));
  // a linha de exemplo da planilha não é importada
  assert.ok(!d.d.questoes.some(q => /Exemplo/.test(q.temas)));
  assert.deepEqual(pg.erros, []);
  await pg.fechar();
});

test('TRT: reconhece a planilha mais antiga (aba "Estudo de caso") pelo título', async () => {
  const pg = await abrirApp();
  await avaliar(pg, `(ir('ajustes'), true)`);
  await pg.setInputFiles('#fx', path.join(DADOS, 'trt-com-progresso.xlsx'));
  await pg.waitForFunction(() => /importada/.test(impMsg));
  const d = await avaliar(pg, `({ ativo: S.ativo, d: D() })`);
  assert.equal(d.ativo, 'trt');
  assert.deepEqual(d.d.feitas, { DT01: '2026-10-26' });
  assert.deepEqual([d.d.questoes[0].disc, d.d.questoes[0].ok], ['DT', 7]);
  assert.equal(d.d.escrita[0].nota, 8);
  await pg.fechar();
});

test('Importar não mexe nos outros planos e pode ser desfeito', async () => {
  const pg = await abrirApp();
  await avaliar(pg, `(() => { S.planos = {}; trocarPlano('pmpe-oficial'); D().feitas.PN01 = '2027-01-04'; commit(); ir('ajustes'); return true; })()`);
  await pg.setInputFiles('#fx', path.join(DADOS, 'nucleo-com-progresso.xlsx'));
  await pg.waitForFunction(() => /importada/.test(impMsg));
  assert.equal(await avaliar(pg, `S.planos['pmpe-oficial'].feitas.PN01`), '2027-01-04');
  await pg.click('#toast >> text=Desfazer');
  assert.equal(await avaliar(pg, `S.ativo`), 'pmpe-oficial');
  assert.equal(await avaliar(pg, `S.planos['nucleo-2027'] ? Object.keys(S.planos['nucleo-2027'].feitas).length : 0`), 0);
  await pg.fechar();
});

test('Arquivo que não é planilha de plano: avisa e não altera nada', async () => {
  const pg = await abrirApp();
  await avaliar(pg, `(ir('ajustes'), true)`);
  await pg.setInputFiles('#fx', { name: 'outra.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('não é uma planilha') });
  await pg.waitForFunction(() => /Não consegui abrir|não é de nenhum/.test(impMsg));
  assert.equal(await avaliar(pg, `Object.keys(D().feitas).length`), 0);
  await pg.fechar();
});

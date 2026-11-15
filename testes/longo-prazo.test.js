// Recursos de longo prazo: feriados e férias no calendário, replanejar, ritmo de 1 a 4, cronômetro,
// anotações, minutos por dia, sequência de dias e meta semanal.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { abrirApp, fecharNavegador, avaliar } = require('./lib');

after(async () => { await fecharNavegador(); });

test('feriados nacionais calculados a partir da Páscoa', async () => {
  const pg = await abrirApp();
  const f = await avaliar(pg, `({ p26: pascoa(2026), p27: pascoa(2027), p28: pascoa(2028), f27: feriadosNacionais(2027) })`);
  assert.deepEqual([f.p26, f.p27, f.p28], ['2026-04-05', '2027-03-28', '2028-04-16']);
  assert.equal(f.f27['2027-02-08'], 'Carnaval');
  assert.equal(f.f27['2027-02-09'], 'Carnaval');
  assert.equal(f.f27['2027-03-26'], 'Sexta-feira Santa');
  assert.equal(f.f27['2027-05-27'], 'Corpus Christi');
  assert.equal(f.f27['2027-11-20'], 'Consciência Negra');
  assert.equal(Object.keys(f.f27).length, 13);
  await pg.fechar();
});

test('folgas empurram as sessões; sem folgas o calendário é o da planilha', async () => {
  const pg = await abrirApp();
  const r = await avaliar(pg, `(() => {
    const p = PL['nucleo-2027'], d = D(p);
    const sem = calc(p, d);
    d.cfg.folgas = { '2027-01-05': 'Viagem', '2027-01-06': 'Viagem' };
    const com = calc(p, d);
    return { sem: sem.linhas.slice(0, 6).map(l => l.data), com: com.linhas.slice(0, 6).map(l => l.data), fimSem: sem.fimTeoria, fimCom: com.fimTeoria };
  })()`);
  assert.deepEqual(r.sem, ['2027-01-04', '2027-01-04', '2027-01-05', '2027-01-05', '2027-01-06', '2027-01-06']);
  assert.deepEqual(r.com, ['2027-01-04', '2027-01-04', '2027-01-07', '2027-01-07', '2027-01-08', '2027-01-08']);
  assert.equal(r.fimSem, '2027-09-17');
  assert.equal(r.fimCom, '2027-09-21');
  await pg.fechar();
});

test('Ajustes: férias pelo formulário, feriados nacionais e remover um período', async () => {
  const pg = await abrirApp();
  await avaliar(pg, `(ir('ajustes'), true)`);
  await pg.fill('[name=fg_de]', '2027-07-05');
  await pg.fill('[name=fg_ate]', '2027-07-16');
  await pg.fill('[name=fg_nome]', 'Férias');
  await pg.click('form >> text=Adicionar');
  assert.equal(await avaliar(pg, `Object.values(D().cfg.folgas).filter(v => v === 'Férias').length`), 12);
  assert.match(await pg.locator('#conteudo').innerText(), /05\/07\/2027 a 16\/07\/2027\s+Férias/);
  await pg.click('text=Adicionar feriados nacionais (2027 a 2029)');
  assert.equal(await avaliar(pg, `Object.keys(D().cfg.folgas).length`), 12 + 39);
  assert.equal(await avaliar(pg, `calc().fimTeoria > '2027-09-17'`), true);
  await pg.locator('tr', { hasText: 'Férias' }).locator('text=Remover').click();
  assert.equal(await avaliar(pg, `Object.values(D().cfg.folgas).filter(v => v === 'Férias').length`), 0);
  // datas inválidas
  await pg.fill('[name=fg_de]', '2027-08-10');
  await pg.fill('[name=fg_ate]', '2027-08-01');
  await pg.click('form >> text=Adicionar');
  assert.match(await pg.locator('#fgMsg').innerText(), /data final depois/);
  await pg.fechar();
});

test('Replanejar: a próxima sessão pendente passa a cair hoje e o que foi feito continua feito', async () => {
  const pg = await abrirApp({ hoje: '2027-02-10' });
  await avaliar(pg, `(() => { const d = D(); P().sessoes.slice(0, 5).forEach(s => { d.feitas[s.id] = '2027-01-05'; }); commit(); ir('inicio'); return true; })()`);
  assert.match(await pg.locator('#conteudo').innerText(), /sessões atrás do calendário/);
  await pg.click('text=Replanejar a partir de hoje');
  const r = await avaliar(pg, `(() => { const c = calc(); const l = c.linhas.find(x => !x.feita); return { data: l.data, i: l.i, atrasadas: c.atrasadas, feitas: c.feitas }; })()`);
  assert.equal(r.i, 5);
  assert.equal(r.data, '2027-02-10');
  assert.equal(r.atrasadas, 0);
  assert.equal(r.feitas, 5);
  // num sábado, vai para a segunda seguinte
  await avaliar(pg, `(window.HOJE = '2027-02-13', replanejar(), true)`);
  assert.equal(await avaliar(pg, `calc().linhas.find(x => !x.feita).data`), '2027-02-15');
  await pg.fechar();
});

test('ritmo de 1 a 4 sessões por dia', async () => {
  const pg = await abrirApp();
  const r = await avaliar(pg, `(() => { const p = PL['trt'], d = D(p), out = {};
    for (const n of [1, 4, 9]) { d.cfg.ritmo = n; out[n] = calc(p, d).linhas.slice(0, 5).map(l => l.data); out['r' + n] = calc(p, d).ritmo; }
    return out; })()`);
  assert.deepEqual(r[1], ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']);
  assert.deepEqual(r[4], ['2026-10-26', '2026-10-26', '2026-10-26', '2026-10-26', '2026-10-27']);
  assert.equal(r.r9, 2);
  await pg.fechar();
});

test('cronômetro: registra o tempo na sessão e o tempo substitui a duração padrão', async () => {
  const pg = await abrirApp({ hoje: '2027-01-04' });
  await avaliar(pg, `(ir('inicio'), true)`);
  await pg.locator('#conteudo .lin').first().locator('text=Cronômetro').click();
  assert.equal(await pg.locator('#crono').isVisible(), true);
  const id = await avaliar(pg, 'crono.sessao');
  // simula 47 minutos estudados
  await avaliar(pg, `(crono.desde = Date.now() - 47 * 60000, salvarCrono(), true)`);
  await pg.waitForTimeout(1100);
  assert.match(await pg.locator('#cronoTempo').innerText(), /^47:0\d$/);
  await pg.click('#crono >> text=Pausar');
  assert.equal(await avaliar(pg, 'crono.rodando'), false);
  await pg.click('#crono >> text=Encerrar e registrar');
  const r = await avaliar(pg, `({ tempos: D().tempos.map(t => [t.min, t.sessao]), crono, guardado: localStorage.getItem('est-crono') })`);
  assert.deepEqual(r.tempos, [[47, id]]);
  assert.equal(r.crono, null);
  assert.equal(r.guardado, null);
  // concluída a sessão, conta o tempo do cronômetro (47) e não a duração padrão (80)
  await avaliar(pg, `(concluir('${id}', '2027-01-04'), true)`);
  assert.equal(await avaliar(pg, `minutosPorDia()['2027-01-04']`), 47);
  await avaliar(pg, `(concluir(P().sessoes[1].id, '2027-01-04'), true)`);
  assert.equal(await avaliar(pg, `minutosPorDia()['2027-01-04']`), 47 + 80);
  await pg.fechar();
});

test('o cronômetro continua depois de recarregar a página; menos de 1 minuto não registra', async () => {
  const pg = await abrirApp();
  await avaliar(pg, `(iniciarCrono('', 25), crono.desde = Date.now() - 5 * 60000, salvarCrono(), true)`);
  await pg.reload();
  await pg.waitForTimeout(1100);
  assert.match(await pg.locator('#cronoTempo').innerText(), /^(19|20):\d\d$/);
  await avaliar(pg, `(crono.desde = Date.now(), crono.acum = 0, salvarCrono(), true)`);
  await pg.click('#crono >> text=Encerrar e registrar');
  assert.equal(await avaliar(pg, 'D().tempos.length'), 0);
  assert.match(await pg.locator('#toast').innerText(), /Menos de 1 minuto/);
  await pg.fechar();
});

test('anotações da sessão ficam salvas no detalhe', async () => {
  const pg = await abrirApp();
  await avaliar(pg, `(ir('planejamento'), abrirSessao('PN01'), true)`);
  await pg.fill('#modal-nota', 'Princípio da legalidade: art. 1º do CP.');
  await pg.locator('#modal-nota').dispatchEvent('change');
  assert.equal(await avaliar(pg, `D().anotacoes.PN01`), 'Princípio da legalidade: art. 1º do CP.');
  await pg.reload();
  await avaliar(pg, `(abrirSessao('PN01'), true)`);
  assert.equal(await pg.locator('#modal-nota').inputValue(), 'Princípio da legalidade: art. 1º do CP.');
  await pg.fechar();
});

test('sequência de dias: domingo e folga não quebram; um dia útil sem estudo quebra', async () => {
  const pg = await abrirApp({ hoje: '2027-01-13' });
  const r = await avaliar(pg, `(() => {
    const d = D();
    // seg 04 a sáb 09 (sem domingo 10), folga seg 11, ter 12 e hoje 13 (qua) ainda sem estudo
    ['2027-01-04', '2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08', '2027-01-09', '2027-01-12'].forEach((x, i) => d.tempos.push({ id: 't' + i, data: x, min: 60, sessao: '', disc: '' }));
    d.cfg.folgas = { '2027-01-11': 'Feriado local' };
    const a = sequencias(P(), d, '2027-01-13');
    d.cfg.folgas = {};
    const b = sequencias(P(), d, '2027-01-13');
    return { a, b, meta: metaHoras(), metaCustom: (d.cfg.metaHoras = 20, metaHoras()) };
  })()`);
  assert.deepEqual(r.a, { atual: 7, recorde: 7 });
  assert.deepEqual(r.b, { atual: 1, recorde: 6 });
  assert.equal(r.meta, 13);
  assert.equal(r.metaCustom, 20);
  await pg.fechar();
});

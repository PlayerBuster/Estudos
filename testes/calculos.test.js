// Cálculos do calendário, das revisões, da Bússola e do TAF. Os valores esperados de datas e da Bússola
// foram lidos das planilhas .xlsm depois de o Excel recalcular as fórmulas, então o app e a planilha dão o mesmo resultado.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { abrirApp, fecharNavegador, avaliar } = require('./lib');

let pg;
before(async () => { pg = await abrirApp(); });
after(async () => { await pg.fechar(); await fecharNavegador(); });

const resumo = id => avaliar(pg, `(() => { const p = PL['${id}'], c = calc(p, D(p)); return { n: c.total, fimTeoria: c.fimTeoria, ini2: c.ini2, fimPlano: c.fimPlano, folga: c.folga, semTeoria: c.semTeoria, d1: c.linhas[0].data, d2: c.linhas[1].data, d3: c.linhas[2].data }; })()`);

test('Núcleo Duro 2027: mesmas datas da planilha (início 04/01/2027, 2 sessões por dia)', async () => {
  const r = await resumo('nucleo-2027');
  assert.equal(r.n, 370);
  assert.deepEqual([r.d1, r.d2, r.d3], ['2027-01-04', '2027-01-04', '2027-01-05']);
  assert.equal(r.fimTeoria, '2027-09-17');
  assert.equal(r.ini2, '2027-09-20');
  assert.equal(r.fimPlano, '2027-10-17');
  assert.equal(r.semTeoria, 37);
  assert.equal(r.folga, 61);
});

test('Planos de Pernambuco e TRT: fim da teoria, fim do plano e folga iguais aos do Excel', async () => {
  const esperado = {
    'pmpe-soldado': ['2027-01-04', '2027-02-07', 14],
    'pmpe-oficial': ['2027-01-11', '2027-02-14', 7],
    'pcpe-agente': ['2027-01-08', '2027-02-07', 28],
    'pcpe-delegado': ['2027-01-14', '2027-02-14', 28],
    'trt': ['2027-01-15', '2027-02-14', null],
  };
  for (const [id, [ft, fp, folga]] of Object.entries(esperado)) {
    const r = await resumo(id);
    assert.equal(r.fimTeoria, ft, id + ' fim da teoria');
    assert.equal(r.fimPlano, fp, id + ' fim do plano');
    assert.equal(r.folga, folga, id + ' folga');
  }
});

test('Ritmo 3: só dias úteis, 3 sessões por dia', async () => {
  const r = await avaliar(pg, `(() => { const p = PL['nucleo-2027'], d = D(p); d.cfg.ritmo = 3; const c = calc(p, d); d.cfg.ritmo = 2;
    return { datas: c.linhas.slice(0, 7).map(l => l.data), fim: c.fimTeoria }; })()`);
  assert.deepEqual(r.datas, ['2027-01-04', '2027-01-04', '2027-01-04', '2027-01-05', '2027-01-05', '2027-01-05', '2027-01-06']);
  // 370 sessões / 3 = 124 dias úteis a partir de 04/01/2027
  let d = new Date(Date.UTC(2027, 0, 3)), k = 0;
  while (k < 124) { d.setUTCDate(d.getUTCDate() + 1); if (d.getUTCDay() % 6 !== 0) k++; }
  assert.equal(r.fim, d.toISOString().slice(0, 10));
});

test('Data de início numa quarta: a primeira sessão cai no próprio dia e o sábado não recebe sessão', async () => {
  const r = await avaliar(pg, `(() => { const p = PL['trt'], d = D(p); const antes = d.cfg.inicio; d.cfg.inicio = '2026-11-18'; const c = calc(p, d); d.cfg.inicio = antes;
    return c.linhas.slice(0, 10).map(l => l.data); })()`);
  assert.deepEqual(r, ['2026-11-18', '2026-11-18', '2026-11-19', '2026-11-19', '2026-11-20', '2026-11-20', '2026-11-23', '2026-11-23', '2026-11-24', '2026-11-24']);
});

test('Revisões: 24 h, 7 e 30 dias e a situação de cada sessão', async () => {
  const r = await avaliar(pg, `(() => {
    S = blank(); S.ativo = 'trt'; const p = P(), d = D(p);
    d.feitas.DT01 = '2027-01-10'; d.revs['DT01@1'] = '2027-01-11';
    d.feitas.PT01 = '2026-10-20'; d.revs['PT01@1'] = 'x'; d.revs['PT01@7'] = 'x'; d.revs['PT01@30'] = 'x';
    const c = calc(p, d, '2027-01-13'), l = id => c.linhas.find(x => x.s.id === id);
    return { revs: l('DT01').revs.map(x => [x.data, x.feito]), dt01: l('DT01').sit, pt01: l('PT01').sit, cf01: l('CF01').sit, ultima: c.linhas[c.linhas.length - 1].sit,
      devidas: revisoesDevidas(c, '2027-01-17').map(x => x.l.s.id + '@' + x.r.n), feitas: c.feitas, vencidas: c.vencidas };
  })()`);
  assert.deepEqual(r.revs, [['2027-01-11', true], ['2027-01-17', false], ['2027-02-09', false]]);
  assert.equal(r.dt01, 'Em dia');
  assert.equal(r.pt01, 'Ciclo completo');
  assert.equal(r.cf01, 'Atrasada');
  assert.equal(r.ultima, 'Pendente');
  assert.deepEqual(r.devidas, ['DT01@7']);
  assert.equal(r.feitas, 2);
});

test('Fases: sábados, Fase 2 com 15 dias úteis e Fase 3 com 7 dias', async () => {
  const r = await avaliar(pg, `(() => { S = blank(); const p = PL['nucleo-2027'], c = calc(p, D(p));
    return { s1: c.semanas[0], s3: c.semanas[2], s38: c.semanas[37], s41: c.semanas[40], s42: c.semanas[41], d2: c.dias2.map(x => x.data), d3: c.dias3.map(x => x.data), rot: [c.dias2[0].a, c.dias2[0].b] }; })()`);
  assert.equal(r.s1.sabado, '2027-01-09');
  assert.equal(r.s1.fase, 'Teoria');
  assert.equal(r.s1.tema, '');
  assert.ok(r.s3.tema.startsWith('Presunção de inocência'));
  assert.equal(r.s38.fase, 'Revisão');
  assert.equal(r.s41.fase, 'Planejamento 2028');
  assert.equal(r.s42.fase, '—');
  assert.equal(r.d2.length, 15);
  assert.equal(r.d2[0], '2027-09-20');
  assert.equal(r.d2[14], '2027-10-08');
  assert.deepEqual([r.d3[0], r.d3[6]], ['2027-10-11', '2027-10-17']);
});

test('Bússola de carreira: mesmos números do Excel', async () => {
  // Mesmo cenário testado na planilha: Civil 8/10, Trabalho 6/10; interesse jan (4, 5, 2) e fev (2, -, -).
  const r = await avaliar(pg, `(() => {
    S = blank(); S.ativo = 'nucleo-2027'; const p = P(), d = D(p);
    d.questoes = [{ id: 'a', data: '2027-01-08', disc: 'CV', n: 10, ok: 8 }, { id: 'b', data: '2027-01-08', disc: 'DT', n: 10, ok: 6 }];
    d.interesse = { '2027-01': { t0: 4, t1: 5, t2: 2 }, '2027-02': { t0: 2 } };
    return bussola(p, d).map(l => [l.acerto === null ? null : Math.round(l.acerto * 100), l.interesse, l.pontos === null ? null : Math.round(l.pontos * 100) / 100, l.posicao]);
  })()`);
  assert.deepEqual(r, [[80, 3, 3.5, 2], [70, 5, 4.25, 1], [null, 2, 2, 3]]);
});

test('TAF: índices por sexo e contagem de testes no índice', async () => {
  const r = await avaliar(pg, `(() => {
    S = blank(); const p = PL['pmpe-soldado'], d = D(p);
    const m = tafIndices(p, d), noM = tafNoIndice(m, [6, 3.4, 55, 41, 700]);
    d.taf.sexo = 'F'; const f = tafIndices(p, d);
    const pc = PL['pcpe-agente'], dpc = D(pc); dpc.taf.alvos['0M'] = 3;
    const ipc = tafIndices(pc, dpc);
    return { m: m.map(t => t.valor), noM, f: f.map(t => t.valor), pc: ipc.map(t => [t.valor, t.editavel]), noPc: tafNoIndice(ipc, [4, 2, 55, 2400]) };
  })()`);
  assert.deepEqual(r.m, [5, 3.6, 60, 40, 690]);
  assert.equal(r.noM, 3);
  assert.deepEqual(r.f, [25, 2.8, 70, 36, 810]);
  assert.deepEqual(r.pc, [[3, true], [null, true], [null, true], [null, true]]);
  assert.equal(r.noPc, 1);
});

test('Acerto por disciplina e faixas de cor', async () => {
  const r = await avaliar(pg, `(() => {
    S = blank(); S.ativo = 'trt'; const p = P(), d = D(p);
    d.questoes = [{ id: 'a', disc: 'DT', n: 15, ok: 12 }, { id: 'b', disc: 'DT', n: 5, ok: 5 }, { id: 'c', disc: 'PT', n: 10, ok: 6 }];
    const c = calc(p, d), x = k => c.porDisc.find(y => y.k === k);
    return { dt: [x('DT').q, x('DT').ok, acertoTexto(x('DT').acerto)], pt: acertoTexto(x('PT').acerto), cf: acertoTexto(x('CF').acerto), geral: Math.round(c.acerto * 1000) / 1000 };
  })()`);
  assert.deepEqual(r.dt, [20, 17, 'Meta atingida']);
  assert.equal(r.pt, 'Prioridade');
  assert.equal(r.cf, 'Sem registro');
  assert.equal(r.geral, 0.767);
});

test('Sem erros de JavaScript ao abrir', () => { assert.deepEqual(pg.erros, []); });

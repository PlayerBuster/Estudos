// Sincronização: dois aparelhos e um Drive falso em memória. Testa a cifragem e a mesclagem de verdade do app.
// O login no Google e o Drive real não entram aqui; isso só dá para testar com a conta do usuário.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { abrirApp, abrirNavegador, fecharNavegador, avaliar } = require('./lib');

after(async () => { await fecharNavegador(); });

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
const PRINCIPAL = 'plano-de-estudos.enc';
function driveFalso() {
  const d = { arquivos: {}, n: 0 };
  Object.defineProperty(d, 'conteudo', { get() { const a = Object.values(d.arquivos).find(x => x.name === PRINCIPAL); return a ? a.conteudo : null; } });
  d.nomes = () => Object.values(d.arquivos).map(a => a.name).sort();
  d.ligar = pg => pg.route('https://www.googleapis.com/**', async route => {
    const req = route.request(), u = new URL(req.url()), metodo = req.method();
    if (metodo === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const id = (u.pathname.match(/files\/([^/]+)$/) || [])[1];
    if (metodo === 'GET' && u.searchParams.get('alt') === 'media') return route.fulfill({ status: 200, headers: CORS, body: d.arquivos[id].conteudo });
    if (metodo === 'GET') {
      const q = u.searchParams.get('q') || '', exato = q.match(/name='([^']+)'/), contem = q.match(/name contains '([^']+)'/);
      const files = Object.entries(d.arquivos).filter(([, a]) => (exato ? a.name === exato[1] : contem ? a.name.includes(contem[1]) : true)).map(([i, a]) => ({ id: i, name: a.name }));
      return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ files }) });
    }
    if (metodo === 'DELETE') { delete d.arquivos[id]; return route.fulfill({ status: 204, headers: CORS }); }
    const corpo = req.postData();
    let alvo = id;
    if (metodo === 'PATCH') d.arquivos[id].conteudo = corpo;
    else {
      const meta = JSON.parse(corpo.split('\r\n\r\n')[1].split('\r\n--')[0]);
      alvo = 'arq' + (++d.n);
      d.arquivos[alvo] = { name: meta.name, conteudo: corpo.split('application/octet-stream\r\n\r\n')[1].split('\r\n--')[0] };
    }
    return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ id: alvo }) });
  });
  return d;
}
const conectar = (pg, senha = 'senha-de-teste') => pg.evaluate(s => {
  syncCfg.clientId = 'teste';
  ssSet('est-token', 't'); ssSet('est-exp', String(Date.now() + 3600000)); ssSet('est-senha', s);
}, senha);
const sincronizarJa = async pg => {
  await pg.evaluate(async () => {
    clearTimeout(envioAgendado);
    while (sincronizando) await new Promise(r => setTimeout(r, 50));
    pendente = false;
    await sincronizar();
  });
  return avaliar(pg, 'syncEstado');
};
// Dois "aparelhos": contextos separados (armazenamento separado) ligados ao mesmo Drive falso.
async function doisAparelhos(drive) {
  const b = await abrirNavegador();
  const a1 = await abrirApp({ contexto: await b.newContext() }), a2 = await abrirApp({ contexto: await b.newContext() });
  for (const pg of [a1, a2]) { await drive.ligar(pg); await conectar(pg); }
  a1.fecharTudo = async () => { await a1.context().close(); await a2.context().close(); };
  return [a1, a2];
}

test('o arquivo no Drive é cifrado e o outro aparelho recebe todo o progresso', async () => {
  const drive = driveFalso();
  const [a1, a2] = await doisAparelhos(drive);
  await avaliar(a1, `(() => { const d = D(); d.feitas.PN01 = '2027-01-04'; d.revs['PN01@1'] = '2027-01-05'; d.questoes.push({ id: 'q1', disc: 'CV', n: 10, ok: 8, data: '2027-01-05', temas: 'segredo do caderno' });
    d.escrita[0] = { data: '2027-01-09', nota: 7, obs: '' }; d.interesse['2027-01'] = { t0: 4 }; S.planos['pmpe-soldado'] = blankPlano(PL['pmpe-soldado']); S.planos['pmpe-soldado'].taf.registros.push({ id: 't', data: '2027-01-02', v: [5, 3, 60, 40, 700], obs: '' }); commit(); return true; })()`);
  assert.match(await sincronizarJa(a1), /^Sincronizado/);
  assert.ok(drive.conteudo, 'nada foi gravado no Drive');
  assert.doesNotMatch(drive.conteudo, /segredo|PN01/);
  assert.match(await sincronizarJa(a2), /^Sincronizado/);
  const d2 = await avaliar(a2, `({ feitas: D().feitas, revs: D().revs, q: D().questoes.length, esc: D().escrita[0].nota, int: D().interesse['2027-01'].t0, taf: S.planos['pmpe-soldado'].taf.registros.length })`);
  assert.deepEqual(d2, { feitas: { PN01: '2027-01-04' }, revs: { 'PN01@1': '2027-01-05' }, q: 1, esc: 7, int: 4, taf: 1 });
  assert.ok(drive.nomes().some(n => n.startsWith('plano-de-estudos-copia-')), 'sem cópia diária');
  await a1.fecharTudo();
});

test('alterações diferentes nos dois aparelhos são combinadas, inclusive apagar', async () => {
  const drive = driveFalso();
  const [a1, a2] = await doisAparelhos(drive);
  await avaliar(a1, `(() => { const d = D(); d.feitas.PN01 = '2027-01-04'; d.feitas.CF01 = '2027-01-04'; commit(); return true; })()`);
  await sincronizarJa(a1); await sincronizarJa(a2);
  await avaliar(a1, `(() => { const d = D(); d.feitas.LP01 = '2027-01-05'; delete d.feitas.CF01; commit(); return true; })()`);
  await avaliar(a2, `(() => { const d = D(); d.questoes.push({ id: 'q2', disc: 'PN', n: 15, ok: 12, data: '2027-01-05' }); d.revs['PN01@1'] = '2027-01-05'; commit(); return true; })()`);
  await sincronizarJa(a1); await sincronizarJa(a2); await sincronizarJa(a1);
  for (const pg of [a1, a2]) {
    const r = await avaliar(pg, `({ feitas: Object.keys(D().feitas).sort(), q: D().questoes.map(q => q.id), revs: Object.keys(D().revs) })`);
    assert.deepEqual(r, { feitas: ['LP01', 'PN01'], q: ['q2'], revs: ['PN01@1'] });
  }
  assert.deepEqual(a1.alertas.concat(a2.alertas).filter(a => /alterado/.test(a)), []);
  await a1.fecharTudo();
});

test('senha errada não altera nada e avisa', async () => {
  const drive = driveFalso();
  const [a1, a2] = await doisAparelhos(drive);
  await avaliar(a1, `(() => { D().feitas.PN01 = '2027-01-04'; commit(); return true; })()`);
  await sincronizarJa(a1);
  await conectar(a2, 'outra-senha');
  assert.match(await sincronizarJa(a2), /senha de sincronização incorreta/);
  assert.equal(await avaliar(a2, `Object.keys(D().feitas).length`), 0);
  await a1.fecharTudo();
});

test('sem internet: avisa e tenta de novo depois', async () => {
  const b = await abrirNavegador();
  const pg = await abrirApp({ contexto: await b.newContext() });
  await pg.route('https://www.googleapis.com/**', r => r.abort('internetdisconnected'));
  await conectar(pg);
  assert.match(await sincronizarJa(pg), /sem conexão com o Drive/);
  assert.ok(await avaliar(pg, 'novaTentativa !== null'));
  await pg.context().close();
});

// Todas as telas de todos os planos abrem sem erro, no computador e no celular (375px, sem rolagem lateral).
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { abrirApp, fecharNavegador, avaliar } = require('./lib');

after(async () => { await fecharNavegador(); });

// Um pouco de progresso em cada plano, para as telas mostrarem listas, revisões e gráficos preenchidos.
const POPULAR = `(() => {
  S = blank();
  PLANOS.forEach(p => {
    const d = D(p);
    p.sessoes.slice(0, 12).forEach((s, i) => { d.feitas[s.id] = addD(p.inicio, Math.floor(i / 2)); });
    d.revs[p.sessoes[0].id + '@1'] = hoje();
    d.questoes.push({ id: 'q1', data: p.inicio, disc: p.disciplinas[0].k, n: 20, ok: 15, temas: 'tema de teste', caderno: 'FCC' });
    d.escrita[0] = { data: p.inicio, nota: 7, obs: 'citar a lei' };
    if (p.taf) d.taf.registros.push({ id: 't1', data: p.inicio, v: p.taf.map(() => 1), obs: '' });
    if (p.bussola) d.interesse[p.inicio.slice(0, 7)] = { t0: 4, t1: 3, t2: 5 };
  });
  salvar(); return true;
})()`;

for (const [nome, largura, altura] of [['computador', 1280, 900], ['celular', 375, 800]]) {
  test(`todas as abas de todos os planos · ${nome}`, async () => {
    const pg = await abrirApp({ largura, altura, hoje: '2027-02-10' });
    await avaliar(pg, POPULAR);
    const planos = await avaliar(pg, 'PLANOS.map(p => p.id)');
    for (const id of planos) {
      await avaliar(pg, `(trocarPlano('${id}'), true)`);
      const abas = await avaliar(pg, `ABAS().map(a => a[0]).filter(k => k !== '-')`);
      for (const aba of abas) {
        await avaliar(pg, `(ir('${aba}'), true)`);
        const r = await avaliar(pg, `({ texto: $('conteudo').innerText.length, larg: document.documentElement.scrollWidth, janela: innerWidth })`);
        assert.ok(r.texto > 40, `${id}/${aba}: tela vazia`);
        assert.ok(r.larg <= r.janela, `${id}/${aba}: rolagem lateral (${r.larg} > ${r.janela})`);
      }
      await avaliar(pg, `(ir('planejamento'), abrirSessao(P().sessoes[0].id), true)`);
      assert.equal(await avaliar(pg, `$('modal').hidden`), false, id + ': detalhe da sessão não abriu');
      await avaliar(pg, 'fecharModal()');
    }
    assert.deepEqual(pg.erros, []);
    await pg.fechar();
  });
}

test('no celular, o menu abre como gaveta e fecha ao escolher uma aba', async () => {
  const pg = await abrirApp({ largura: 375, altura: 800 });
  const fora = await avaliar(pg, `$('side').getBoundingClientRect().right <= 0`);
  assert.equal(fora, true);
  await pg.click('.topo button');
  await pg.waitForTimeout(300);
  assert.ok(await avaliar(pg, `$('side').getBoundingClientRect().left >= 0`));
  await pg.click('#side .nav >> text=Questões');
  assert.equal(await avaliar(pg, 'aba'), 'questoes');
  assert.equal(await avaliar(pg, `document.body.classList.contains('menu')`), false);
  await pg.fechar();
});

test('tema escuro e claro aplicam os tokens de cor', async () => {
  const pg = await abrirApp();
  await avaliar(pg, `(setTema('dark'), true)`);
  const escuro = await avaliar(pg, `getComputedStyle(document.body).backgroundColor`);
  await avaliar(pg, `(setTema('light'), true)`);
  const claro = await avaliar(pg, `getComputedStyle(document.body).backgroundColor`);
  assert.notEqual(escuro, claro);
  assert.equal(claro, 'rgb(245, 247, 246)');
  await pg.fechar();
});

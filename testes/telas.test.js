// Todas as telas de todos os planos abrem sem erro, no computador e no celular (375px, sem rolagem lateral).
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { abrirApp, fecharNavegador, avaliar } = require('./lib');

after(async () => { await fecharNavegador(); });

// Um pouco de progresso em cada plano, para as telas mostrarem listas, revisões e gráficos preenchidos.
const POPULAR = `(() => {
  S = blank();
  // um plano criado no app, com Discursiva e TAF, para as telas desse tipo de plano
  S.custom['c-teste'] = { id: 'c-teste', nome: 'Plano criado no app', banca: 'FGV', inicio: '2027-01-04', ritmo: 2, voltas: { v2: true },
    escrita: { nome: 'Redação', temas: [['Tema um', 'Lei 1', 'Aula 1']] }, taf: 'pcpe',
    disciplinas: [{ k: 'D1', nome: 'Português', peso: 4, topicos: [{ id: 'D1-001', t: 'Crase', p: 12 }, { id: 'D1-002', t: 'Regência' }] },
                  { k: 'D2', nome: 'Direito Penal', peso: 2, topicos: [{ id: 'D2-001', t: 'Teoria do crime', ext: 1 }] }] };
  montarRegistro();
  const d0 = D(PL['c-teste']); d0.tempos.push({ id: 'tt', data: '2027-01-05', min: 50, sessao: 'D1-001', disc: 'D1' }); d0.anotacoes['D1-001'] = 'nota';
  d0.cfg.folgas = { '2027-01-06': 'Feriado' };
  listaPlanos().forEach(p => {
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
    const planos = await avaliar(pg, 'listaPlanos().map(p => p.id)');
    assert.ok(planos.includes('c-teste'));
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
    // editor de planos, vazio e com um plano carregado
    await avaliar(pg, `(novoPlano(), true)`);
    assert.ok(await avaliar(pg, `document.documentElement.scrollWidth <= innerWidth`), 'editor: rolagem lateral');
    await avaliar(pg, `(editarPlano('c-teste'), true)`);
    assert.equal(await pg.locator('[id^=ed-dn-]').count(), 2);
    assert.ok(await avaliar(pg, `document.documentElement.scrollWidth <= innerWidth`), 'editor com plano: rolagem lateral');
    // cronômetro aberto não cria rolagem lateral
    await avaliar(pg, `(iniciarCrono('D1-001', 25), ir('inicio'), true)`);
    await pg.waitForTimeout(1100);
    assert.ok(await avaliar(pg, `document.documentElement.scrollWidth <= innerWidth && $('crono').getBoundingClientRect().right <= innerWidth`), 'cronômetro fora da tela');
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

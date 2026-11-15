// Planos criados no app: leitura do edital colado, montagem das sessões, códigos estáveis ao editar,
// cópia de um modelo, exportar e importar, excluir. Pela interface e pelas funções do app.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { abrirApp, fecharNavegador, avaliar } = require('./lib');

after(async () => { await fecharNavegador(); });

const EDITAL = `LÍNGUA PORTUGUESA: 1 Compreensão e interpretação de textos. 2 Tipologia textual. 3 Ortografia oficial. 4 Emprego da crase.

Direito Constitucional (peso 5)
- Princípios fundamentais | 20
- Direitos e garantias fundamentais | 35
- Organização do Estado

NOÇÕES DE DIREITO PENAL [2]
1. Lei penal: aplicação no tempo e no espaço
2. Teoria do crime
3. Lei de Drogas | externo`;

test('lerEdital: formato corrido, lista com marcadores, numeração, peso, páginas e "externo"', async () => {
  const pg = await abrirApp();
  const r = await avaliar(pg, `lerEdital(${JSON.stringify(EDITAL)})`);
  assert.deepEqual(r.map(x => [x.nome, x.peso, x.topicos.length]), [['Língua Portuguesa', 3, 4], ['Direito Constitucional', 5, 3], ['Noções de Direito Penal', 2, 3]]);
  assert.deepEqual(r[0].topicos.map(t => t.t), ['Compreensão e interpretação de textos', 'Tipologia textual', 'Ortografia oficial', 'Emprego da crase']);
  assert.deepEqual(r[1].topicos[0], { t: 'Princípios fundamentais', p: 20 });
  assert.deepEqual(r[2].topicos[0], { t: 'Lei penal: aplicação no tempo e no espaço' });
  assert.deepEqual(r[2].topicos[2], { t: 'Lei de Drogas', ext: 1 });
  assert.deepEqual(await avaliar(pg, `lerEdital('texto sem tópicos')`), []);
  await pg.fechar();
});

test('montarPlano: sessões de teoria e de questões, peso, intercalação e rotação da Fase 2', async () => {
  const pg = await abrirApp();
  const r = await avaliar(pg, `(() => {
    const def = { id: 'c-x', nome: 'Teste', banca: 'FCC', inicio: '2027-01-04', ritmo: 2, voltas: { v2: true, v3: false },
      disciplinas: [{ k: 'A', nome: 'Alfa', peso: 5, topicos: Array.from({ length: 6 }, (_, i) => ({ id: 'A-00' + (i + 1), t: 'a' + i })) },
                    { k: 'B', nome: 'Beta', peso: 1, topicos: Array.from({ length: 6 }, (_, i) => ({ id: 'B-00' + (i + 1), t: 'b' + i, p: 10 })) }] };
    const p = montarPlano(def), c = calc(p, blankPlano(p));
    let seguidas = 0; for (let i = 1; i < p.sessoes.length; i++) if (p.sessoes[i].d === p.sessoes[i - 1].d) seguidas++;
    return { n: p.sessoes.length, praticaA: p.sessoes.filter(s => s.d === 'A' && s.prat).length, praticaB: p.sessoes.filter(s => s.d === 'B' && s.prat).length,
      seguidas, rot: p.rotacao.length, rotA: p.rotacao.filter(k => k === 'A').length, primeira: p.sessoes[0].id, paginas: c.paginasTotal, banca: p.banca,
      grupos: p.disciplinas.map(x => x.grupo), ids: p.sessoes.filter(s => s.prat).map(s => s.id).slice(0, 2) };
  })()`);
  // Volta 2: round(6 × 0,9 × peso/3) → Alfa (peso 5) 9, Beta (peso 1) 2
  assert.equal(r.praticaA, 9);
  assert.equal(r.praticaB, 2);
  assert.equal(r.n, 12 + 11);
  assert.ok(r.seguidas <= 6, 'muitas sessões seguidas da mesma disciplina: ' + r.seguidas);
  assert.equal(r.rot, 30);
  // sem repetir a mesma disciplina em seguida, Alfa fica com a metade dos 30 dias
  assert.equal(r.rotA, 15);
  assert.equal(r.paginas, 60);
  assert.deepEqual(r.grupos, ['5', '1']);
  assert.ok(r.ids.every(id => /^[AB]-V2-\d{3}$/.test(id)));
  await pg.fechar();
});

test('criar plano pela interface colando o edital', async () => {
  const pg = await abrirApp({ hoje: '2027-01-06' });
  await avaliar(pg, `(ir('planos'), true)`);
  await pg.click('#conteudo >> text=Criar plano');
  assert.equal(await avaliar(pg, 'aba'), 'editor');
  await pg.fill('#ed-nome', 'TJ-PE Técnico 2027');
  await pg.fill('#ed-colar', EDITAL);
  await pg.click('text=Preencher disciplinas');
  assert.equal(await pg.locator('[id^=ed-dn-]').count(), 3);
  await pg.fill('#ed-inicio', '2027-01-11');
  await pg.locator('#ed-inicio').dispatchEvent('change');
  // 10 tópicos + Volta 2: 4 (peso 3), 5 (peso 5) e 2 (peso 2) sessões de questões
  assert.match(await pg.locator('#edPrevia').innerText(), /Sessões\s*\n?\s*21 \(11 de questões\)/);
  await pg.click('text=Criar e ativar o plano');
  const r = await avaliar(pg, `({ ativo: S.ativo, nome: P().nome, n: P().sessoes.length, inicio: D().cfg.inicio, aba })`);
  assert.match(r.ativo, /^c-/);
  assert.equal(r.nome, 'TJ-PE Técnico 2027');
  assert.equal(r.n, 21);
  assert.equal(r.inicio, '2027-01-11');
  assert.equal(r.aba, 'planejamento');
  assert.equal(await pg.locator('.semana-grid .dcard').count(), 10);
  assert.equal(await avaliar(pg, `localStorage.getItem('est-rascunho-plano')`), null);
  assert.deepEqual(pg.erros, []);
  await pg.fechar();
});

test('o editor valida: sem nome ou com disciplina sem tópicos não salva', async () => {
  const pg = await abrirApp();
  await avaliar(pg, `(novoPlano(), true)`);
  await pg.click('text=Criar e ativar o plano');
  assert.match(await pg.locator('#edMsg').innerText(), /Dê um nome/);
  await pg.fill('#ed-nome', 'Plano X');
  await pg.fill('#ed-dn-0', 'Direito Civil');
  await pg.click('text=Criar e ativar o plano');
  assert.match(await pg.locator('#edMsg').innerText(), /sem tópicos/);
  assert.equal(await avaliar(pg, `Object.keys(S.custom).length`), 0);
  await pg.fechar();
});

test('editar mantém o código e o progresso dos tópicos que continuam; tópico novo ganha código novo', async () => {
  const pg = await abrirApp();
  await avaliar(pg, `(() => { novoPlano(); ed.nome = 'Meu plano'; ed.v2 = false; ed.disciplinas = [{ k: null, nome: 'Civil', peso: 3, txt: 'Pessoas\\nBens\\nNegócio jurídico' }]; salvarPlano(); return true; })()`);
  const antes = await avaliar(pg, `P().sessoes.map(s => s.id + '=' + s.itens[0].t)`);
  assert.deepEqual(antes, ['D1-001=Pessoas', 'D1-002=Bens', 'D1-003=Negócio jurídico']);
  await avaliar(pg, `(() => { D().feitas['D1-002'] = '2027-01-05'; commit(); return true; })()`);
  await avaliar(pg, `(editarPlano(S.ativo), true)`);
  await pg.fill('#ed-dt-0', 'Pessoas naturais e jurídicas\nBens\nNegócio jurídico\nPrescrição e decadência');
  await pg.click('text=Adicionar disciplina');
  await pg.fill('#ed-dn-1', 'Processo Civil');
  await pg.fill('#ed-dt-1', '- Normas fundamentais\n- Tutela provisória');
  await pg.click('text=Salvar alterações');
  const depois = await avaliar(pg, `P().sessoes.map(s => s.id + '=' + s.itens[0].t).sort()`);
  assert.deepEqual(depois, ['D1-002=Bens', 'D1-003=Negócio jurídico', 'D1-004=Pessoas naturais e jurídicas', 'D1-005=Prescrição e decadência', 'D2-001=Normas fundamentais', 'D2-002=Tutela provisória']);
  assert.equal(await avaliar(pg, `calc().feitas`), 1);
  assert.equal(await avaliar(pg, `D().feitas['D1-002']`), '2027-01-05');
  await pg.fechar();
});

test('"Fazer minha versão" de um modelo leva o progresso; exportar, importar e excluir', async () => {
  const pg = await abrirApp();
  await avaliar(pg, `(() => { D().feitas.PN01 = '2027-01-04'; D().questoes.push({ id: 'q', disc: 'CV', n: 10, ok: 9, data: '2027-01-05' }); commit(); ir('planos'); return true; })()`);
  await pg.locator('.discs .card').first().locator('text=Fazer minha versão').click();
  assert.ok(pg.alertas.some(a => /Levar também o progresso/.test(a)));
  const copia = await avaliar(pg, `(() => { const id = ed.id; return { id, nome: S.custom[id].nome, feitas: Object.keys(S.planos[id].feitas), q: S.planos[id].questoes.length, aba }; })()`);
  assert.match(copia.nome, /Núcleo Duro 2027 \(minha versão\)/);
  assert.deepEqual(copia.feitas, ['PN01']);
  assert.equal(copia.q, 1);
  assert.equal(copia.aba, 'editor');
  await pg.click('text=Salvar alterações');
  await avaliar(pg, `(trocarPlano('${copia.id}'), true)`);
  const n = await avaliar(pg, `P().sessoes.length`);
  assert.equal(await avaliar(pg, `calc().feitas`), 1);
  // exportar e importar
  await pg.evaluate(() => { window.baixado = null; HTMLAnchorElement.prototype.click = function () { const nome = this.download; fetch(this.href).then(r => r.text()).then(t => { window.baixado = { nome, texto: t }; }); }; });
  await avaliar(pg, `(exportarPlano('${copia.id}'), true)`);
  await pg.waitForFunction(() => window.baixado);
  const { nome, texto } = await avaliar(pg, 'window.baixado');
  assert.match(nome, /^plano-nucleo-duro-2027-minha-versao\.json$/);
  await pg.setInputFiles('#fp', { name: nome, mimeType: 'application/json', buffer: Buffer.from(texto) });
  await pg.waitForFunction(id => S.ativo !== id && S.ativo.startsWith('c-'), copia.id);
  assert.equal(await avaliar(pg, `P().sessoes.length`), n);
  assert.equal(await avaliar(pg, `calc().feitas`), 0);
  // excluir
  await avaliar(pg, `(excluirPlano('${copia.id}'), true)`);
  assert.equal(await avaliar(pg, `!!S.custom['${copia.id}'] || !!S.planos['${copia.id}']`), false);
  assert.equal(await avaliar(pg, `Object.keys(S.custom).length`), 1);
  assert.deepEqual(pg.erros, []);
  await pg.fechar();
});

test('arquivo .json que não é plano: avisa e não cria nada', async () => {
  const pg = await abrirApp();
  await pg.setInputFiles('#fp', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"planos":{}}') });
  await pg.waitForFunction(() => !$('toast').hidden);
  assert.match(await pg.locator('#toast').innerText(), /não é um plano/);
  assert.equal(await avaliar(pg, `Object.keys(S.custom).length`), 0);
  await pg.fechar();
});

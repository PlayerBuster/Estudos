// Service worker: um servidor local imita o GitHub Pages. Confere que o app abre sem internet
// e que uma versão nova publicada aparece na abertura seguinte.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { RAIZ, abrirNavegador, fecharNavegador } = require('./lib');

after(async () => { await fecharNavegador(); });

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png' };
function servidor(trocas = {}) {
  const s = http.createServer((req, res) => {
    let arq = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/Estudos\/?/, '/');
    if (arq === '/') arq = '/index.html';
    const ext = path.extname(arq);
    const corpo = trocas[arq] !== undefined ? trocas[arq] : (fs.existsSync(path.join(RAIZ, arq)) ? fs.readFileSync(path.join(RAIZ, arq)) : null);
    if (corpo === null) { res.writeHead(404); return res.end(); }
    // Como o GitHub Pages: cache de 10 minutos.
    res.writeHead(200, { 'Content-Type': TIPOS[ext] || 'application/octet-stream', 'Cache-Control': 'max-age=600' });
    res.end(corpo);
  });
  return new Promise(ok => s.listen(0, '127.0.0.1', () => ok(s)));
}

test('o app instalado abre sem internet e recebe a versão nova na abertura seguinte', async () => {
  const trocas = {};
  const srv = await servidor(trocas);
  const url = `http://127.0.0.1:${srv.address().port}/Estudos/`;
  const b = await abrirNavegador();
  const ctx = await b.newContext();
  const pg = await ctx.newPage();
  const erros = [];
  pg.on('pageerror', e => erros.push(e.message));
  await pg.goto(url);
  await pg.evaluate(() => navigator.serviceWorker.ready);
  await pg.reload();
  await pg.waitForFunction(() => !!navigator.serviceWorker.controller);
  // sem internet
  await ctx.setOffline(true);
  await pg.reload();
  assert.match(await pg.locator('#side').innerText(), /Planejamento/);
  assert.ok((await pg.evaluate(() => PLANOS.length)) >= 6);
  await ctx.setOffline(false);
  // versão nova publicada
  trocas['/index.html'] = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace('<title>Plano de Estudos</title>', '<title>Plano de Estudos</title><meta name="versao" content="nova">');
  await pg.reload();
  assert.equal(await pg.evaluate(() => document.querySelector('meta[name=versao]') && document.querySelector('meta[name=versao]').content), 'nova');
  assert.deepEqual(erros, []);
  await ctx.close();
  srv.close();
});

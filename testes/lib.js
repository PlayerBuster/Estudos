// Base comum dos testes: abre o app (index.html) num Chromium do Playwright e roda código dentro da página.
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..');
const URL_APP = 'file:///' + path.join(RAIZ, 'index.html').replace(/\\/g, '/');
const SHEETJS_LOCAL = require.resolve('xlsx/dist/xlsx.full.min.js');

let navegador = null;
async function abrirNavegador() {
  // PW_CANAL=msedge usa o Edge instalado no Windows, quando o Chromium do Playwright não está disponível.
  if (!navegador) navegador = await chromium.launch(process.env.PW_CANAL ? { channel: process.env.PW_CANAL } : {});
  return navegador;
}
async function fecharNavegador() {
  if (navegador) await navegador.close();
  navegador = null;
}

// Página nova com armazenamento limpo. Aceita confirm/alert e guarda erros de JS em pagina.erros.
// "hoje" fixa a data do app (window.HOJE) antes de qualquer script rodar.
async function abrirApp({ largura = 1280, altura = 900, hoje = '2027-01-13', contexto = null } = {}) {
  const b = await abrirNavegador();
  const ctx = contexto || await b.newContext({ viewport: { width: largura, height: altura } });
  const pagina = await ctx.newPage();
  pagina.erros = [];
  pagina.alertas = [];
  pagina.on('pageerror', e => pagina.erros.push(e.message));
  pagina.on('console', m => { if (m.type() === 'error') pagina.erros.push(m.text()); });
  pagina.on('dialog', d => { pagina.alertas.push(d.message()); d.accept().catch(() => {}); });
  // O leitor de planilhas vem da internet no app; no teste, vem da cópia instalada pelo npm.
  await pagina.route('https://cdnjs.cloudflare.com/ajax/libs/xlsx/**', r => r.fulfill({ path: SHEETJS_LOCAL, contentType: 'application/javascript' }).catch(() => {}));
  if (hoje) await pagina.addInitScript(h => { window.HOJE = h; }, hoje);
  await pagina.goto(URL_APP);
  // Fecha a página antes do contexto: fechar o contexto direto deixava uma promessa interna do Playwright rejeitada.
  pagina.fechar = async () => { await pagina.close().catch(() => {}); if (!contexto) await ctx.close().catch(() => {}); };
  return pagina;
}

// Avalia uma expressão JS na página (com acesso às funções do app) e devolve o resultado.
const avaliar = (pagina, expr) => pagina.evaluate(`(() => (${expr}))()`);

module.exports = { RAIZ, URL_APP, abrirNavegador, abrirApp, fecharNavegador, avaliar };

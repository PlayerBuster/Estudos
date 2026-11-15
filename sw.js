// Service worker: guarda o app para abrir sem internet.
// Usa a rede primeiro e sempre confere com o servidor (cache: 'no-cache'), para que uma versão nova
// apareça na próxima abertura, sem esperar os 10 minutos de cache do GitHub Pages. Mesmo esquema do Controle Financeiro.
const CACHE = 'plano-de-estudos-v1';
const ARQUIVOS = ['./', './index.html', './planos.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k.startsWith('plano-de-estudos-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Busca no servidor ignorando o cache do navegador; se o servidor redirecionar, usa a requisição original.
const daRede = req => fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
  .then(resp => (resp.redirected ? fetch(req) : resp));

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  // Só o próprio site: nunca guarda respostas do Google (login e Drive) nem do leitor de planilhas.
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    daRede(req)
      .then(resp => {
        if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
        return resp;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});

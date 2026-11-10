import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); return; }
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/manus-routes.json') pathname = '/public/manus-routes.json';
  const candidate = path.resolve(root, `.${pathname}`);
  const safe = candidate === root || candidate.startsWith(`${root}${path.sep}`) ? candidate : path.join(root, 'index.html');
  const filePath = existsSync(safe) && statSync(safe).isFile() ? safe : path.join(root, 'index.html');
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { 'content-type': mime[path.extname(filePath)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(content);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain' }); res.end('Unable to load application');
  }
});
server.listen(port, '0.0.0.0', () => console.log(`Savings Manager listening on ${port}`));

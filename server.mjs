import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/_next/image') {
      res.writeHead(200, {
        'content-type': 'image/jpeg',
        'content-length': (await stat(path.join(root, '_next', 'image'))).size,
        'cache-control': 'public, max-age=31536000, immutable'
      });
      createReadStream(path.join(root, '_next', 'image')).pipe(res);
      return;
    }

    const route = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    let file = path.join(root, path.normalize(route).replace(/^([.][.][/\\])+/, ''));
    if (!file.startsWith(root)) throw new Error('Forbidden');

    // serve index.html for directories (e.g. /tarot → /tarot/index.html)
    if (file.endsWith('/')) file += 'index.html';
    else if ((await stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html');

    const info = await stat(file);
    const type = url.pathname === '/resources'
      ? 'text/html; charset=utf-8'
      : types[path.extname(file).toLowerCase()] ?? 'application/octet-stream';

    res.writeHead(200, {
      'content-type': type,
      'content-length': info.size,
      'cache-control': 'no-cache'
    });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Trae clone → http://127.0.0.1:${port}/`);
  console.log(`Tarot app   → http://127.0.0.1:${port}/tarot/`);
});

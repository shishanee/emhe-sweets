const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const publicFiles = new Set(['index.html', 'styles.css', 'app.js', 'menu-data.js']);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const initialPort = Number(process.argv[2] || process.env.PORT || 4173);
if (!Number.isInteger(initialPort) || initialPort < 1 || initialPort > 65535) {
  console.error('Use a port from 1 to 65535: node preview-server.cjs 4174');
  process.exit(1);
}
let port = initialPort;
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root, relative);
  const assetsRoot = path.join(root, 'assets') + path.sep;
  if (!((publicFiles.has(relative) && path.dirname(file) === root) || file.startsWith(assetsRoot))) {
    res.writeHead(404); res.end('Not found'); return;
  }
  fs.readFile(file, (error, content) => {
    if (error) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(content);
  });
});
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE' && port < Math.min(initialPort + 10, 65535)) {
    console.log('Port ' + port + ' is busy, trying the next one.');
    port += 1;
    server.listen(port, '127.0.0.1');
    return;
  }
  console.error('Unable to start server: ' + error.message);
  process.exitCode = 1;
});
server.on('listening', () => {
  console.log('EmHe.Sweets: http://127.0.0.1:' + port + '/');
  console.log('Press Ctrl+C to stop.');
});
server.listen(port, '127.0.0.1');

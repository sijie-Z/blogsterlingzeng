/* 极简静态服务器:E2E 脚本内自管理(解决 hexo server 后台不稳) */
const http = require('http');
const fs = require('fs');
const path = require('path');

function startServer(port = 4140, root = path.join(__dirname, '..', 'public')) {
  const MIME = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.xml': 'application/xml', '.txt': 'text/plain', '.woff2': 'font/woff2',
    '.mp3': 'audio/mpeg', '.moc': 'application/octet-stream', '.mtn': 'application/octet-stream',
  };
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(root, urlPath);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('404');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

module.exports = { startServer };

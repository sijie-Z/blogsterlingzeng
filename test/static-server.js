/* 极简静态服务器:E2E 脚本内自管理(解决 hexo server 后台不稳) */
const http = require('http');
const fs = require('fs');
const path = require('path');

function startServer(port = Number(process.env.PORT) || 4140, root = path.join(__dirname, '..', 'public')) {
  const MIME = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.xml': 'application/xml', '.txt': 'text/plain', '.woff2': 'font/woff2',
    '.mp3': 'audio/mpeg', '.moc': 'application/octet-stream', '.moc3': 'application/octet-stream', '.mtn': 'application/octet-stream',
  };
  const server = http.createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(req.url.split('?')[0]);
    } catch (e) {
      res.writeHead(400);
      res.end('400');
      return;
    }
    if (urlPath === '/') urlPath = '/index.html';
    const rootDir = path.resolve(root);
    let filePath = path.resolve(rootDir, '.' + urlPath);
    if (filePath !== rootDir && !filePath.startsWith(rootDir + path.sep)) {
      res.writeHead(403);
      res.end('403');
      return;
    }
    fs.stat(filePath, (statErr, stat) => {
      // 与 GitHub Pages 一致:目录路径返回 index.html
      if (!statErr && stat.isDirectory()) filePath = path.join(filePath, 'index.html');
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
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

module.exports = { startServer };

/* 内链检查:构建产物里的站内 href 必须能落到文件 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public');
const files = [];
const walk = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith('.html')) files.push(p);
  }
};
walk(ROOT);

const broken = new Map();
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    let href = m[1].replace(/\s+/g, '');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') ||
        href.startsWith('http') || href.startsWith('//') || href.startsWith('javascript:')) continue;
    href = href.split('#')[0].split('?')[0];
    if (!href) continue;
    if (!href.startsWith('/')) {
      const base = '/' + path.relative(ROOT, path.dirname(file)).replace(/\\/g, '/');
      href = path.posix.normalize(path.posix.join(base, href));
    }
    let target = path.join(ROOT, decodeURIComponent(href));
    if (href.endsWith('/')) target = path.join(target, 'index.html');
    const exists = fs.existsSync(target) ||
      fs.existsSync(target + '.html') ||
      fs.existsSync(path.join(target, 'index.html'));
    if (!exists && !broken.has(href)) broken.set(href, file);
  }
}

for (const [href, from] of broken) {
  const source = path.relative(ROOT, from).replace(/\\/g, '/');
  console.log('BROKEN', href, '<-', source);
  // GitHub Actions 注解:无需登录也能通过 check-runs API 读到具体断链
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::error file=${source},line=1::BROKEN ${href} <- ${source}`);
  }
}
console.log(`\n${files.length} 个 HTML,${broken.size} 个断链`);
process.exit(broken.size ? 1 : 0);

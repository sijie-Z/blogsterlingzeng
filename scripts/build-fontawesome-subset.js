/* 重新生成 FontAwesome 子集:扫描全站用到的图标,按码点裁剪三个字体 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FA_CSS_DIR = path.join(ROOT, 'public', 'fontawesome');
const FONT_SRC = path.join(ROOT, 'node_modules', 'hexo-theme-redefine', 'source', 'webfonts');
const OUT_DIR = path.join(ROOT, 'source', 'fontawesome', 'webfonts');

const UTILITY = new Set([
  'fa-5x', 'fa-animation-duration', 'fa-beat', 'fa-brands', 'fa-fw', 'fa-lg', 'fa-regular',
  'fa-sm', 'fa-solid', 'fa-spin', 'fa-spin-pulse', 'fa-2x', 'fa-3x', 'fa-4x', 'fa-1x',
  'fa-ul', 'fa-li', 'fa-border', 'fa-inverse', 'fa-stack', 'fa-pulse', 'fa-fade',
]);

function collectUsedNames() {
  const names = new Set();
  const roots = [
    path.join(ROOT, 'public'),
    path.join(ROOT, 'source', 'js'),
    path.join(ROOT, 'node_modules', 'hexo-theme-redefine', 'layout'),
    path.join(ROOT, 'node_modules', 'hexo-theme-redefine', 'source', 'js'),
  ];
  const walk = dir => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(html|js|ejs|pug)$/.test(p)) {
        const text = fs.readFileSync(p, 'utf8');
        for (const m of text.matchAll(/fa-[a-z0-9-]+/g)) names.add(m[0]);
      }
    }
  };
  roots.forEach(walk);
  return names;
}

function buildCodepointMap() {
  const map = new Map();
  if (!fs.existsSync(FA_CSS_DIR)) {
    throw new Error('缺少 public/fontawesome,请先运行 npm run build');
  }
  for (const file of fs.readdirSync(FA_CSS_DIR).filter(f => f.endsWith('.css'))) {
    const css = fs.readFileSync(path.join(FA_CSS_DIR, file), 'utf8');
    for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = rule[1];
      if (!/:before/.test(selector)) continue;
      const content = rule[2].match(/content:"\\([0-9a-f]{2,6})/i);
      if (!content) continue;
      for (const m of selector.matchAll(/\.fa-([a-z0-9-]+)(?=:before)/g)) {
        const name = 'fa-' + m[1];
        if (!UTILITY.has(name) && !map.has(name)) map.set(name, content[1].toLowerCase());
      }
    }
  }
  return map;
}

const used = [...collectUsedNames()].filter(n => !UTILITY.has(n));
const map = buildCodepointMap();
const icons = used.filter(n => map.has(n)).sort();
const codepoints = [...new Set(icons.map(n => map.get(n)))].sort();
if (!codepoints.length) throw new Error('没有扫描到任何图标');

const unicodes = codepoints.map(c => 'U+' + c.toUpperCase().padStart(4, '0')).join(',');
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const weight of ['solid-900', 'regular-400', 'brands-400']) {
  const input = path.join(FONT_SRC, `fa-${weight}.ttf`);
  const output = path.join(OUT_DIR, `fa-${weight}.subset.woff2`);
  const args = [input, `--unicodes=${unicodes}`, '--flavor=woff2', `--output-file=${output}`];
  try {
    execFileSync('pyftsubset', args, { stdio: 'inherit' });
  } catch (err) {
    execFileSync('python', ['-m', 'fontTools.subset', ...args], { stdio: 'inherit' });
  }
  const kb = Math.round(fs.statSync(output).size / 1024);
  console.log(`[fa-subset] ${path.basename(output)} ${kb} KB`);
}

console.log(`[fa-subset] ${icons.length} 个图标 / ${codepoints.length} 个码点`);

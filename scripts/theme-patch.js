/**
 * Theme Patch — remove "Powered by Hexo" and "Theme Redefine" from footer.
 *
 * Redefine 模板强制渲染这两行(作者要求保留,配置无法关闭)。
 * 在 npm install / npm ci 后自动执行(postinstall),从源头删除。
 * 若主题升级导致模板结构变化,打印警告但不中断构建。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname, '..', 'node_modules',
  'hexo-theme-redefine', 'layout', 'components', 'footer', 'footer.ejs'
);

try {
  let content = fs.readFileSync(target, 'utf8');
  const original = content;

  // 按行删除包含 powered_by 的行("由 Hexo 驱动")
  content = content.split('\n')
    .filter(line => !line.includes('powered_by'))
    .join('\n');

  // 按行删除渲染主题信息的行("主题 Redefine vX.Y.Z")
  content = content.split('\n')
    .filter(line => !/__\(["']theme["']\)/.test(line))
    .join('\n');

  // 禁用 odometer 翻页动画:删除含 new Odometer 的 script 块。
  // 用户要求运行时间数字直接更新(21->22 直接换),不要翻页滚动效果。
  // 主题 runtime.js 仍会每秒用 innerHTML 填数字,span 保持普通文本。
  // 注意:不能用正则从 <script 起匹配(会误删前面的 vercount script 块),
  // 必须从 new Odometer 定位再向前后扩展。
  const odomIdx = content.indexOf('new Odometer');
  if (odomIdx !== -1) {
    const start = content.lastIndexOf('<script', odomIdx);
    const end = content.indexOf('</script>', odomIdx) + '</script>'.length;
    content = content.slice(0, start) + content.slice(end);
    console.log('[theme-patch] 已移除 footer 的 odometer 初始化 script 块');
  }

  fs.writeFileSync(target, content, 'utf8');

  // scripts.ejs:移除 odometer 库加载。
  // odometer.min.js 自带 DOMContentLoaded 自动初始化(扫描 .odometer),
  // 只删 footer 的显式初始化不够——库本身会接管元素并翻页。
  // runtime.js 仍会用 innerHTML 填数字,span 保持普通文本直接更新。
  const scriptsTarget = path.join(
    __dirname, '..', 'node_modules',
    'hexo-theme-redefine', 'layout', 'components', 'scripts.ejs'
  );
  let scripts = fs.readFileSync(scriptsTarget, 'utf8');
  const scriptsOriginal = scripts;
  scripts = scripts.split('\n')
    .filter(line => !line.includes('odometer.min.js') && !line.includes('odometer-theme-minimal.css'))
    .join('\n');
  if (scripts !== scriptsOriginal) {
    fs.writeFileSync(scriptsTarget, scripts, 'utf8');
    console.log('[theme-patch] 已移除 scripts.ejs 的 odometer 库加载');
  }
} catch (e) {
  console.error('[theme-patch] 失败(不影响构建):', e.message);
}

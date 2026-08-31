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

  // 禁用 odometer 翻页组件。
  // odometer 在部分字体/布局下 ribbon 高度塌陷为 0,数字被裁剪,
  // 静止时不可见、仅滑动瞬间露出。改用 custom.js 的轻量滑动动画。
  // 1) 删除 footer.ejs 的显式初始化
  const odomIdx = content.indexOf('new Odometer');
  if (odomIdx !== -1) {
    const start = content.lastIndexOf('<script', odomIdx);
    const end = content.indexOf('</script>', odomIdx) + '</script>'.length;
    content = content.slice(0, start) + content.slice(end);
  }

  if (content !== original) {
    fs.writeFileSync(target, content, 'utf8');
    console.log('[theme-patch] footer.ejs: 已删 powered/theme 行与 odometer 初始化');
  }

  // 2) scripts.ejs:移除 odometer 库(自带 DOMContentLoaded 自动初始化)
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
    console.log('[theme-patch] scripts.ejs: 已移除 odometer 库加载');
  }
} catch (e) {
  console.error('[theme-patch] 失败(不影响构建):', e.message);
}

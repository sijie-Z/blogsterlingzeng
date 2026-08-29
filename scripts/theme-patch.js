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

  if (content === original) {
    console.log('[theme-patch] footer.ejs 无匹配行(可能已 patch 或模板已变),跳过');
  } else {
    fs.writeFileSync(target, content, 'utf8');
    console.log('[theme-patch] 已移除 powered_by 与 theme 两行');
  }
} catch (e) {
  console.error('[theme-patch] 失败(不影响构建):', e.message);
}

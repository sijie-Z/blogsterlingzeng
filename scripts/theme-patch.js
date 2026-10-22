/**
 * Theme Patch — footer cleanups and odometer init removal.
 *
 * 1. 删除 "Powered by Hexo" 与 "Theme Redefine" 两行。
 * 2. 删除 footer 里的 odometer 内联脚本:它带 data-swup-reload-script,
 *    Swup 每次换页都会重跑数字动画,造成 ~70-100ms 长任务。
 *    改由 custom.js 在字体就绪后只初始化一次。
 *
 * 在 npm install / npm ci 后自动执行(postinstall),从源头修改。
 * 找不到标记时静默跳过(通常说明模板已打过补丁),不中断构建。
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

  // 删除带 data-swup-reload-script 的 odometer 内联初始化脚本
  const odometerRe = /\s*<script[^>]*>[^<]*?try \{\s*function odometer_init\(\)[\s\S]*?<\/script>/;
  if (odometerRe.test(content)) {
    content = content.replace(odometerRe, '');
  } else if (!/odometer_init/.test(content)) {
    // 已打过补丁:没有 odometer 脚本,正常
  } else {
    console.warn('[theme-patch] 找到 odometer_init 但未能移除脚本,请检查 footer.ejs');
  }

  if (content !== original) {
    fs.writeFileSync(target, content, 'utf8');
    console.log('[theme-patch] 已清理 footer 模板');
  }
} catch (e) {
  console.error('[theme-patch] 失败(不影响构建):', e.message);
}

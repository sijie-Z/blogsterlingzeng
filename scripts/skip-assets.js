/**
 * Skip Assets — 可选地从构建产物中移除已被替换的源文件。
 *
 * Live2D 纹理已从 1.7MB PNG 换成 308KB WebP（index.json 指向 .webp）。
 * 但浏览器可能仍缓存着旧的 index.json（GitHub Pages 默认 10 分钟），
 * 这段时间里如果 PNG 不存在，模型会缺纹理。因此默认保留 PNG 作为
 * 兼容回退；确认缓存过期后，可在部署环境设置
 * CJ_SKIP_OLD_TEXTURES=1 再构建，省掉这 1.7MB 的部署体积。
 */

'use strict';

const SKIP = process.env.CJ_SKIP_OLD_TEXTURES === '1'
  ? ['live2d/model/ds-whale-girl/textures/texture_00.png']
  : [];

hexo.extend.filter.register('after_generate', function () {
  for (const path of SKIP) {
    try {
      if (hexo.route.get(path)) {
        hexo.route.remove(path);
      }
    } catch (e) {
      // route 不存在时忽略
    }
  }
});

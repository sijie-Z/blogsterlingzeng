/**
 * Related Posts — data generator
 * 构建时生成 /related-data.json:所有文章的标题/链接/标签/分类/封面/日期。
 * 文章页由 custom.js 读取该文件,按标签相似度计算并渲染"相关阅读"。
 *
 * 为什么不用 after_post_render:该阶段其他文章的 tags 关联尚未加载,
 * 拿不到完整数据;generate 阶段的数据是完整的。
 */

'use strict';

hexo.extend.generator.register('related-data', function (locals) {
  const data = locals.posts.sort('-date').map(post => ({
    title: post.title,
    path: post.path,
    tags: (post.tags && post.tags.data || []).map(t => t.name),
    categories: (post.categories && post.categories.data || []).map(c => c.name),
    cover: post.cover || '',
    date: post.date.format('YYYY-MM-DD'),
  }));

  return {
    path: 'related-data.json',
    data: JSON.stringify(data),
  };
});

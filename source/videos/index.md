---
title: 视频库
description: 自己收藏和授权视频的播放列表。
date: 2026-11-01 12:00:00
---

<div class="video-library" id="video-library">
  <p class="video-library-lede">这里放我自己收藏或获得授权的视频。收藏只保存在这台设备上，可以导出 JSON 备份；视频文件建议放在自己的存储里，不依赖第三方实时接口。</p>

  <div class="video-toolbar">
    <label class="video-search">
      <span class="sr-only">搜索视频</span>
      <input id="video-search" type="search" placeholder="搜索标题、描述、话题或标签" autocomplete="off" aria-label="搜索视频">
    </label>
    <div class="video-filters" role="group" aria-label="视频筛选">
      <button type="button" class="video-filter is-active" data-filter="all" aria-pressed="true">全部视频 <span id="video-total">0</span></button>
      <button type="button" class="video-filter" data-filter="favorites" aria-pressed="false">只看收藏 <span id="video-fav-count">0</span></button>
    </div>
    <div class="video-backup">
      <button type="button" id="video-export">导出收藏</button>
      <label class="video-import">导入
        <input id="video-import" type="file" accept="application/json,.json">
      </label>
    </div>
  </div>

  <div class="video-categories" id="video-categories" role="group" aria-label="视频话题"></div>
  <p class="video-status" id="video-status" role="status" aria-live="polite"></p>
  <div class="video-grid" id="video-grid"></div>
  <div class="video-empty" id="video-empty" hidden>
    <p>还没有视频。</p>
    <p>把视频文件放进 <code>source/videos/media/</code>，或在 Pages CMS 的“视频”里添加一条。</p>
  </div>
</div>

<dialog class="video-dialog" id="video-dialog" aria-labelledby="video-dialog-title">
  <div class="video-dialog-inner">
    <button type="button" class="video-dialog-close" id="video-dialog-close" aria-label="关闭播放器">×</button>
    <video id="video-player" controls playsinline preload="metadata"></video>
    <div class="video-dialog-meta">
      <div class="video-dialog-heading">
        <h2 id="video-dialog-title"></h2>
        <button type="button" class="video-dialog-fav" id="video-dialog-fav" aria-pressed="false">
          <span class="video-fav-icon" aria-hidden="true">☆</span>
          <span class="video-fav-label">收藏</span>
        </button>
      </div>
      <p id="video-dialog-desc"></p>
      <div class="video-dialog-tags" id="video-dialog-tags"></div>
    </div>
  </div>
</dialog>

<noscript>
  <p class="video-noscript">视频库需要 JavaScript 才能显示播放列表和收藏。</p>
</noscript>

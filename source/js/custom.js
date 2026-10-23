/**
 * Custom JavaScript - Sterling Zeng's Blog
 * Enhances the blog with additional interactivity
 */

(function() {
  'use strict';

  // 页脚数字由主题 runtime 每秒直接写文本,不需要 odometer 的数字滚动动画。
  // 在 DOMContentLoaded 之前关掉自动初始化,避免一次 ~300ms 长任务。
  if (window.Odometer && window.Odometer.options) {
    window.Odometer.options.auto = false;
  }

  // HTML 转义(供相关阅读与项目卡片共用)
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // swup 换页会重新执行整个脚本,实例内的闭包标记会被重置;
  // 用 window 标记保证文档级/全局监听在整个会话中只注册一次
  function onceGlobal(key, fn) {
    const flag = '__cj_once_' + key;
    if (window[flag]) return;
    window[flag] = true;
    fn();
  }

  // ============================
  // Smooth scroll for anchor links
  // ============================
  function initSmoothScroll() {
    // 事件委托 + 捕获阶段:兼容主题动态生成的目录链接,也先于主题自身处理
    document.addEventListener('click', e => {
      const anchor = e.target.closest('a[href^="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      // 中文标题的 id 在 HTML 里是原文,href 却是 percent-encoded,先解码再查
      let id = href.slice(1);
      try { id = decodeURIComponent(id); } catch (_) {}
      const target = document.getElementById(id) || document.getElementById(href.slice(1));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, true);
  }

  // ============================
  // Keyboard shortcuts
  // ============================
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const isCmdK = (e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K');
      const isSlash = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey;
      if (isCmdK || isSlash) {
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) ||
          (document.activeElement && document.activeElement.isContentEditable);
        const overlayOpen = !!document.querySelector('.search-pop-overlay.active');
        if (!typing && !overlayOpen) {
          e.preventDefault();
          const searchBtn = document.querySelector('.desktop .search-popup-trigger') ||
            document.querySelector('.search-popup-trigger');
          if (searchBtn) searchBtn.click();
        }
      }

      // Escape: 退出管中窥豹
      if (e.key === 'Escape' && document.body.classList.contains('flashlight-mode')) {
        toggleFlashlight();
      }
    });
  }

  // APlayer 的图标按钮默认只有 SVG,补上可访问名称
  function initAplayerA11y() {
    const labels = {
      'aplayer-icon-play': '播放',
      'aplayer-icon-pause': '暂停',
      'aplayer-icon-volume-up': '音量',
      'aplayer-icon-volume-down': '静音',
      'aplayer-icon-loop': '循环模式',
      'aplayer-icon-order': '顺序播放',
      'aplayer-icon-lrc': '歌词',
      'aplayer-icon-menu': '播放列表',
      'aplayer-icon-back': '上一首',
      'aplayer-icon-forward': '下一首',
    };
    document.querySelectorAll('.aplayer button').forEach(btn => {
      if (btn.dataset.cjA11y) return;
      const cls = [...btn.classList].find(name => labels[name]);
      if (!cls) return;
      btn.dataset.cjA11y = '1';
      btn.setAttribute('aria-label', labels[cls]);
    });
  }

  // ============================
  // External link handler
  // ============================
  function initExternalLinks() {
    document.querySelectorAll('a[href^="http"]').forEach(link => {
      if (link.hostname !== window.location.hostname) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.classList.add('external-link');
      }
    });
  }

  // ============================
  // Reading position — 记住每篇文章读到哪，下次给一个“继续阅读”胶囊
  // ============================
  const READING_POS_KEY = 'cj-reading-positions';
  const READING_POS_TTL = 30 * 24 * 60 * 60 * 1000;

  function readReadingPositions() {
    try { return JSON.parse(localStorage.getItem(READING_POS_KEY) || '{}') || {}; } catch (e) { return {}; }
  }

  function writeReadingPositions(map) {
    try { localStorage.setItem(READING_POS_KEY, JSON.stringify(map)); } catch (e) {}
  }

  function hideResumePill() {
    clearTimeout(window.__cjResumeTimer);
    const pill = document.querySelector('.reading-resume');
    if (pill) pill.classList.remove('show');
  }

  function saveReadingPosition() {
    if (!document.querySelector('.post-page-container .article-content')) return;
    const max = (window.__cjScrollHeight || document.documentElement.scrollHeight) - window.innerHeight;
    if (max <= 0) return;
    const percent = window.scrollY / max;
    const path = window.location.pathname;
    const map = readReadingPositions();
    if (percent > 0.95) {
      delete map[path];
      writeReadingPositions(map);
      return;
    }
    if (window.scrollY < 300 || percent < 0.03) return;
    map[path] = {
      y: Math.round(window.scrollY),
      percent: Number(percent.toFixed(3)),
      ts: Date.now(),
    };
    const cutoff = Date.now() - READING_POS_TTL;
    for (const key of Object.keys(map)) {
      if (!map[key] || map[key].ts < cutoff) delete map[key];
    }
    writeReadingPositions(map);
  }

  function showResumePill() {
    if (!document.querySelector('.post-page-container .article-content')) return;
    const saved = readReadingPositions()[window.location.pathname];
    if (!saved || !Number.isFinite(saved.y)) return;
    if (Date.now() - saved.ts > READING_POS_TTL) return;
    if (saved.percent < 0.05 || saved.percent > 0.92 || saved.y < 300) return;
    // 浏览器后退/Swup 已恢复位置时不要再提示;整页刷新仍保留胶囊
    if (window.__cjSpaVisit && window.scrollY > 300 && Math.abs(window.scrollY - saved.y) < 200) return;
    // Swup 换页后旧胶囊还在 DOM 里,不清掉就不会为新文章生成
    const oldPill = document.querySelector('.reading-resume');
    if (oldPill) oldPill.remove();
    clearTimeout(window.__cjResumeTimer);

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'reading-resume';
    pill.setAttribute('aria-label', '继续上次阅读');
    pill.innerHTML = `<span class="reading-resume-dot" aria-hidden="true"></span>
      <span class="reading-resume-text">上次读到 <b>${Math.round(saved.percent * 100)}%</b> · 继续</span>
      <span class="reading-resume-close" aria-hidden="true">×</span>`;
    document.body.appendChild(pill);

    const dismiss = () => hideResumePill();
    pill.addEventListener('click', e => {
      if (e.target.closest('.reading-resume-close')) { dismiss(); return; }
      const reduced = window.__l2dReducedMotion || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      // 按百分比恢复,跨设备/文章变短时比绝对像素稳
      const target = Number.isFinite(saved.percent) ? Math.round(saved.percent * max) : saved.y;
      window.scrollTo({ top: Math.min(Math.max(0, target), max), behavior: reduced ? 'auto' : 'smooth' });
      dismiss();
    });
    requestAnimationFrame(() => pill.classList.add('show'));
    window.__cjResumeTimer = setTimeout(dismiss, 15000);
  }

  function initReadingResume() {
    if (window.__cjReadingResume) return;
    window.__cjReadingResume = true;
    let saveTimer = 0;
    window.addEventListener('scroll', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveReadingPosition, 500);
    }, { passive: true });
    const attach = swup => {
      if (!swup || !swup.hooks || swup.__cjResumeHook) return;
      swup.__cjResumeHook = true;
      swup.hooks.on('page:view', () => {
        hideResumePill();
        setTimeout(showResumePill, 800);
      });
    };
    if (window.swup && window.swup.hooks) attach(window.swup);
    else window.addEventListener('redefine:swup:ready', e => attach(e.detail && e.detail.swup), { once: true });
    setTimeout(showResumePill, 900);
  }

  // ============================
  // Reading progress bar
  // ============================
  function resumeLive2D() {
    if (!window.__l2dPaused) return;
    window.__l2dPaused = false;
    if (document.hidden || window.__l2dReducedMotion || window.__l2dNavPaused) return;
    const waifu = document.querySelector('#waifu');
    if (!waifu || !waifu.classList.contains('waifu-active')) return;
    try { window.__l2dApp.run(); } catch (e) {}
  }

  function pauseLive2DForNav() {
    clearTimeout(window.__l2dNavResumeTimer);
    if (!window.__l2dApp) return;
    window.__l2dNavPaused = true;
    try { window.__l2dApp.stop(); } catch (e) {}
  }

  function resumeLive2DAfterNav() {
    // 换页动画结束后再等一下,避免宠物恢复渲染和内容首帧抢主线程
    clearTimeout(window.__l2dNavResumeTimer);
    window.__l2dNavResumeTimer = setTimeout(() => {
      window.__l2dNavPaused = false;
      if (window.__l2dPaused || window.__l2dReducedMotion || document.hidden) return;
      const waifu = document.querySelector('#waifu');
      if (!waifu || !waifu.classList.contains('waifu-active')) return;
      if (window.__l2dApp && window.__l2dApp._drawFrameId == null) {
        try { window.__l2dApp.run(); } catch (e) {}
      }
    }, 700);
  }

  function announceRoute() {
    const announcer = document.getElementById('route-announcer');
    if (!announcer) return;
    const heading = document.querySelector('.article-content h1, .main-content h1');
    const text = (heading && heading.textContent.trim()) || document.title;
    announcer.textContent = '';
    setTimeout(() => { announcer.textContent = '已导航到：' + text; }, 100);
  }

  // SPA 换页后把焦点交给新页面标题,键盘/读屏用户不用重新 Tab 一遍导航
  function focusRouteTarget() {
    const target = document.querySelector('.article-content h1, .main-content h1') ||
      document.getElementById('main-content');
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  function initSwupNavPause() {
    const attach = swup => {
      if (!swup || !swup.hooks || swup.__cjNavPause) return;
      swup.__cjNavPause = true;
      swup.hooks.on('visit:start', () => {
        swup.__cjAnnounceNext = true;
        closeCodeFullscreen();
        pauseLive2DForNav();
      });
      swup.hooks.on('page:view', () => {
        window.__cjSpaVisit = true;
        resumeLive2DAfterNav();
        if (swup.__cjAnnounceNext) {
          swup.__cjAnnounceNext = false;
          announceRoute();
          focusRouteTarget();
        }
      });
    };
    if (window.swup && window.swup.hooks) {
      attach(window.swup);
    } else {
      window.addEventListener('redefine:swup:ready', e => attach(e.detail && e.detail.swup), { once: true });
    }
  }

  function getLive2DModel() {
    try {
      const app = window.__l2dApp;
      const sub = app && app.subdelegates && app.subdelegates.at ? app.subdelegates.at(0) : null;
      const manager = sub && sub.getLive2DManager ? sub.getLive2DManager() : null;
      const models = manager && manager._models;
      return models && models.at ? models.at(0) : null;
    } catch (e) { return null; }
  }

  function initLive2DDrag(waifu) {
    if (waifu.__cjDrag) return;
    waifu.__cjDrag = true;
    const canvas = document.getElementById('live2d');
    if (canvas) canvas.title = '拖动可移动,双击复位';

    // 持久化上次拖到的位置
    try {
      const saved = JSON.parse(localStorage.getItem('live2d-position') || 'null');
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
        const w = waifu.offsetWidth || 200;
        const h = waifu.offsetHeight || 200;
        waifu.style.bottom = 'auto';
        waifu.style.left = Math.min(Math.max(0, saved.left), Math.max(0, innerWidth - w)) + 'px';
        waifu.style.top = Math.min(Math.max(0, saved.top), Math.max(0, innerHeight - h)) + 'px';
      }
    } catch (e) {}

    let dragStart = null;
    waifu.addEventListener('mousedown', e => {
      if (e.target.id !== 'live2d') return;
      const rect = waifu.getBoundingClientRect();
      dragStart = { x: e.clientX, y: e.clientY };
      window.__l2dDragMoved = false;
      // 组件用 top/left 拖动,先清掉 bottom 并固定当前坐标
      waifu.style.bottom = 'auto';
      waifu.style.top = rect.top + 'px';
      waifu.style.left = rect.left + 'px';
    }, true);

    document.addEventListener('mousemove', e => {
      if (!dragStart) return;
      if (Math.abs(e.clientX - dragStart.x) + Math.abs(e.clientY - dragStart.y) > 6) {
        window.__l2dDragMoved = true;
      }
    }, true);

    document.addEventListener('mouseup', () => {
      if (!dragStart) return;
      dragStart = null;
      if (waifu.style.top) {
        try {
          localStorage.setItem('live2d-position', JSON.stringify({
            left: parseFloat(waifu.style.left) || 0,
            top: parseFloat(waifu.style.top) || 0,
          }));
        } catch (e) {}
      }
    }, true);

    window.addEventListener('resize', () => {
      if (!waifu.style.top) return;
      const w = waifu.offsetWidth || 200;
      const h = waifu.offsetHeight || 200;
      waifu.style.left = Math.min(Math.max(0, parseFloat(waifu.style.left) || 0), Math.max(0, innerWidth - w)) + 'px';
      waifu.style.top = Math.min(Math.max(0, parseFloat(waifu.style.top) || 0), Math.max(0, innerHeight - h)) + 'px';
    });

    // 双击复位到左下角
    waifu.addEventListener('dblclick', () => {
      try { localStorage.removeItem('live2d-position'); } catch (e) {}
      waifu.style.top = '';
      waifu.style.left = '';
      waifu.style.bottom = '';
    });
  }

  function attachWaifuVisibilityObserver() {
    const waifu = document.getElementById('waifu');
    if (!waifu) {
      // 组件延迟初始化,#waifu 出现后再挂观察器
      const mo = new MutationObserver(() => {
        if (document.getElementById('waifu')) {
          mo.disconnect();
          attachWaifuVisibilityObserver();
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      return;
    }
    if (waifu.__cjObserved) return;
    waifu.__cjObserved = true;
    const canvas = document.getElementById('live2d');
    if (canvas) canvas.setAttribute('aria-hidden', 'true');
    initLive2DDrag(waifu);
    new MutationObserver(() => {
      const app = window.__l2dApp;
      if (!app) return;
      const active = waifu.classList.contains('waifu-active') && !waifu.classList.contains('waifu-hidden');
      if (!active) {
        try { app.stop(); } catch (e) {}
      } else if (!window.__l2dPaused && !window.__l2dReducedMotion && !window.__l2dNavPaused && !document.hidden && app._drawFrameId == null) {
        try { app.run(); } catch (e) {}
      }
    }).observe(waifu, { attributes: true, attributeFilter: ['class'] });
  }

  // 搜索弹层关闭后把焦点还给触发按钮;MutationObserver 负责即时恢复
  function restoreSearchFocus() {
    if (document.querySelector('.search-pop-overlay.active')) return;
    const trigger = window.__cjSearchTrigger;
    if (!trigger) return;
    try { trigger.focus({ preventScroll: true }); } catch (err) {}
    window.__cjSearchTrigger = null;
  }

  // 弹层随 Swup 换页重建,每次 init 给当前 overlay 挂关闭观察
  function observeSearchClose() {
    const overlay = document.querySelector('.search-pop-overlay');
    if (!overlay) return;
    bindSearchListObserver(overlay);
    syncSearchA11y(overlay);
    if (overlay.__cjFocusObserved) return;
    overlay.__cjFocusObserved = true;
    new MutationObserver(() => {
      if (!overlay.classList.contains('active')) {
        setActiveSearchOption(overlay, -1);
        syncSearchA11y(overlay);
        restoreSearchFocus();
      }
    }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  }

  // ============================
  // Search keyboard navigation — combobox + listbox
  // 主题只负责渲染结果;这里加 ↑/↓/Enter、ARIA 状态与空态播报
  // ============================
  function getSearchParts(overlay) {
    const input = overlay.querySelector('.search-input');
    const result = overlay.querySelector('#search-result');
    const list = result && result.querySelector('ul.search-result-list');
    const options = list ? [...list.children].filter(el => el.tagName === 'LI') : [];
    if (result && !result.__cjPrefix) {
      window.__cjSearchSeq = (window.__cjSearchSeq || 0) + 1;
      result.__cjPrefix = 'cj-search-opt-' + window.__cjSearchSeq + '-';
    }
    return { input, result, list, options };
  }

  function updateSearchStatus(overlay) {
    const { input, result, list, options } = getSearchParts(overlay);
    if (!input || !result) return;
    let live = overlay.querySelector('#cj-search-status');
    if (!live) {
      live = document.createElement('div');
      live.id = 'cj-search-status';
      live.className = 'sr-only';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      (overlay.querySelector('.search-popup') || overlay).appendChild(live);
    }
    const noResult = result.querySelector('#no-result');
    const hasQuery = input.value.trim().length > 0;
    const loading = !list && hasQuery && noResult && !noResult.querySelector('.fa-box-open');
    let text = '';
    if (list && options.length) text = `找到 ${options.length} 个结果`;
    else if (!hasQuery) text = '输入关键词开始搜索';
    else if (loading) text = '正在加载搜索数据';
    else text = '没有找到相关结果';
    result.setAttribute('aria-busy', loading ? 'true' : 'false');
    if (noResult) noResult.setAttribute('data-cj-empty', text);
    if (live.textContent !== text) live.textContent = text;
  }

  function syncSearchA11y(overlay) {
    const { input, result, list, options } = getSearchParts(overlay);
    if (!input || !result) return;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', 'search-result');
    input.setAttribute('aria-expanded', String(overlay.classList.contains('active')));
    result.setAttribute('role', 'listbox');
    result.setAttribute('aria-label', '搜索结果');
    if (list) list.setAttribute('role', 'none');
    options.forEach((li, i) => {
      li.id = result.__cjPrefix + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      const title = li.querySelector('.search-result-title');
      if (title && !li.getAttribute('aria-label')) li.setAttribute('aria-label', title.textContent.trim());
      li.querySelectorAll('a').forEach(a => { a.tabIndex = -1; });
    });
    // 结果重建时保留同一位置的选中项,避免防抖重渲染把高亮清掉
    const activeIndex = Number(input.dataset.cjActive);
    if (Number.isInteger(activeIndex) && activeIndex >= 0 && options[activeIndex]) {
      options[activeIndex].setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', options[activeIndex].id);
    } else {
      input.removeAttribute('aria-activedescendant');
    }
    updateSearchStatus(overlay);
  }

  function bindSearchListObserver(overlay) {
    const result = overlay.querySelector('#search-result');
    if (!result || result.__cjListObs) return;
    result.__cjListObs = true;
    new MutationObserver(() => syncSearchA11y(overlay))
      .observe(result, { childList: true, subtree: true });
  }

  function revealSearchOption(container, option) {
    if (!container || !option) return;
    const c = container.getBoundingClientRect();
    const o = option.getBoundingClientRect();
    const pad = 6;
    if (o.top < c.top + pad) container.scrollTop -= c.top + pad - o.top;
    else if (o.bottom > c.bottom - pad) container.scrollTop += o.bottom - pad - c.bottom;
  }

  function setActiveSearchOption(overlay, index) {
    const { input, result, options } = getSearchParts(overlay);
    if (!input) return;
    options.forEach((li, i) => li.setAttribute('aria-selected', i === index ? 'true' : 'false'));
    if (index < 0 || !options[index]) {
      delete input.dataset.cjActive;
      input.removeAttribute('aria-activedescendant');
      return;
    }
    input.dataset.cjActive = String(index);
    input.setAttribute('aria-activedescendant', options[index].id);
    revealSearchOption(result, options[index]);
  }

  function initSearchNavGlobals() {
    if (window.__cjSearchNavGlobal) return;
    window.__cjSearchNavGlobal = true;

    document.addEventListener('keydown', e => {
      const overlay = document.querySelector('.search-pop-overlay.active');
      if (!overlay) return;
      const input = overlay.querySelector('.search-input');
      if (!input || document.activeElement !== input) return;
      // 输入法组合期间的 Enter/方向键属于候选词操作
      if (e.isComposing || e.keyCode === 229 || e.key === 'Process') return;
      const { options } = getSearchParts(overlay);
      if (!options.length) return;
      const current = options.findIndex(li => li.getAttribute('aria-selected') === 'true');
      const len = options.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setActiveSearchOption(overlay, current < 0 ? 0 : (current + 1) % len);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setActiveSearchOption(overlay, current < 0 ? len - 1 : (current - 1 + len) % len);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActiveSearchOption(overlay, 0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActiveSearchOption(overlay, len - 1);
      } else if (e.key === 'Enter' && current >= 0) {
        const link = options[current].querySelector('a[href]');
        if (link) {
          e.preventDefault();
          e.stopPropagation();
          link.click();
        }
      }
    }, true);

    document.addEventListener('input', e => {
      if (!e.target.matches('.search-input')) return;
      delete e.target.dataset.cjActive;
      const overlay = e.target.closest('.search-pop-overlay');
      if (overlay) setActiveSearchOption(overlay, -1);
    }, true);

    // 点击结果先收起弹层、解除滚动锁,再交给 Swup 导航
    document.addEventListener('click', e => {
      const link = e.target.closest('#search-result a[href]');
      if (!link) return;
      const overlay = link.closest('.search-pop-overlay');
      if (!overlay) return;
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }, true);
  }

  function initSearchFocus() {
    // 主题延迟 500ms 才聚焦,这里点开立即聚焦,并在 80ms 后再确认一次
    const focusInput = () => {
      const input = document.querySelector('.search-pop-overlay.active .search-input');
      if (input && document.activeElement !== input) input.focus({ preventScroll: true });
    };
    const prepareOverlay = () => {
      const overlay = document.querySelector('.search-pop-overlay.active');
      if (!overlay) return;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', '站内搜索');
      const input = overlay.querySelector('.search-input');
      if (input && !input.getAttribute('aria-label')) input.setAttribute('aria-label', '搜索文章');
      const close = overlay.querySelector('.popup-btn-close');
      if (close) {
        close.setAttribute('role', 'button');
        close.tabIndex = 0;
        close.setAttribute('aria-label', '关闭搜索');
        if (!close.__cjKey) {
          close.__cjKey = true;
          close.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              close.click();
            }
          });
        }
      }
      const clear = overlay.querySelector('.search-input-field-pre');
      if (clear) {
        clear.setAttribute('role', 'button');
        clear.tabIndex = 0;
        clear.setAttribute('aria-label', '清空搜索');
        if (!clear.__cjKey) {
          clear.__cjKey = true;
          clear.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              clear.click();
            }
          });
          clear.addEventListener('click', () => setActiveSearchOption(overlay, -1));
        }
      }
      bindSearchListObserver(overlay);
      syncSearchA11y(overlay);
    };
    document.addEventListener('click', e => {
      const trigger = e.target.closest('.search-popup-trigger');
      if (!trigger) return;
      window.__cjSearchTrigger = trigger;
      const run = () => { prepareOverlay(); focusInput(); };
      requestAnimationFrame(run);
      setTimeout(run, 80);
    }, true);
    if (!window.__cjSearchA11y) {
      window.__cjSearchA11y = true;
      document.addEventListener('keydown', e => {
        const overlay = document.querySelector('.search-pop-overlay.active');
        if (!overlay) return;
        if (e.key === 'Tab') {
          const focusables = [...overlay.querySelectorAll('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])')]
            .filter(el => el.getClientRects().length > 0 && el.tabIndex !== -1);
          if (!focusables.length) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }, true);
      // 只在“搜索按钮点开过、且还没归还焦点”时恢复;恢复后清空引用,
      // 这样之后按 Esc 关闭代码全屏 / 手电筒不会被抢焦点。
      const scheduleRestore = () => {
        if (!window.__cjSearchTrigger) return;
        setTimeout(restoreSearchFocus, 30);
        setTimeout(restoreSearchFocus, 200);
      };
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') scheduleRestore();
      }, true);
      document.addEventListener('keyup', e => {
        if (e.key === 'Escape') scheduleRestore();
      }, true);
      document.addEventListener('click', e => {
        if (!e.target.closest('.popup-btn-close') && !e.target.classList.contains('search-pop-overlay')) return;
        setTimeout(restoreSearchFocus, 80);
      }, true);
    }
  }

  function syncDrawerA11y() {
    const bar = document.querySelector('.navbar-bar');
    const drawer = document.querySelector('.navbar-drawer');
    const open = document.body.classList.contains('navbar-drawer-show');
    if (drawer) drawer.toggleAttribute('inert', !open);
    if (bar) bar.setAttribute('aria-expanded', String(open));
  }

  // 搜索按钮随 Swup 换页重建;快捷键提示要每次 init 重新挂
  function decorateSearchTriggers() {
    document.querySelectorAll('.search-popup-trigger').forEach(t => {
      t.setAttribute('aria-keyshortcuts', 'Control+K Meta+K');
      t.setAttribute('title', '搜索文章 (Ctrl K)');
    });
  }

  function initNavA11y() {
    document.querySelectorAll('.search-popup-trigger, .navbar-bar').forEach(el => {
      if (el.dataset.cjA11y) return;
      el.dataset.cjA11y = '1';
      if (!el.getAttribute('aria-label')) {
        el.setAttribute('aria-label', el.classList.contains('navbar-bar') ? '打开菜单' : '搜索');
      }
      // 原生 button 已经有 Enter/Space 行为,不要再加 role/tabindex/keydown
      if (el.tagName === 'BUTTON') return;
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });

    // Swup 换页会替换 DOM,这里每次都重新同步当前节点;
    // 全局 observer 只注册一次,避免每次换页叠加。
    document.querySelectorAll('.navbar-list a.active, .drawer-navbar-list a.active').forEach(a => {
      a.setAttribute('aria-current', 'page');
    });
    syncDrawerA11y();
    if (!window.__cjDrawerA11yObserver) {
      window.__cjDrawerA11yObserver = new MutationObserver(syncDrawerA11y);
      window.__cjDrawerA11yObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function syncAsideA11y() {
    const toc = document.querySelector('.toc-content-container');
    if (!toc) return;
    const open = document.documentElement.classList.contains('aside-open');
    toc.toggleAttribute('inert', !open);
    const toggle = document.querySelector('.page-aside-toggle button') ||
      document.querySelector('.page-aside-toggle');
    if (toggle && toggle.tagName === 'BUTTON') toggle.setAttribute('aria-expanded', String(open));
  }

  function initAsideState() {
    // 主题切换目录后同步预置类,保持与首屏布局一致
    syncAsideA11y();
    if (!window.__cjAsideClick) {
      window.__cjAsideClick = true;
      document.addEventListener('click', e => {
        if (!e.target.closest('.page-aside-toggle')) return;
        setTimeout(() => {
          const container = document.querySelector('.post-page-container');
          document.documentElement.classList.toggle('aside-open', !!container && container.classList.contains('show-toc'));
          syncAsideA11y();
        }, 0);
      });
    }
    if (!window.__cjAsideObserver) {
      window.__cjAsideObserver = new MutationObserver(syncAsideA11y);
      window.__cjAsideObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // Live2D 的工具栏由第三方脚本注入,补键盘入口与名称
  function decorateLive2DControls() {
    const toggle = document.getElementById('waifu-toggle');
    if (toggle && !toggle.__cjA11y) {
      toggle.__cjA11y = true;
      toggle.setAttribute('role', 'button');
      toggle.tabIndex = 0;
      toggle.setAttribute('aria-label', '显示或隐藏 Live2D 宠物');
      toggle.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle.click();
        }
      });
    }
    const labels = {
      hitokoto: '随机一言', asteroids: '小行星', 'switch-model': '切换模型',
      'switch-texture': '切换贴图', photo: '拍照', info: '关于 Live2D', quit: '关闭宠物',
    };
    document.querySelectorAll('#waifu-tool span').forEach(span => {
      if (span.__cjA11y) return;
      span.__cjA11y = true;
      span.setAttribute('role', 'button');
      span.tabIndex = 0;
      const key = (span.id || '').replace('waifu-tool-', '');
      span.setAttribute('aria-label', labels[key] || 'Live2D 工具');
      span.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          span.click();
        }
      });
    });
  }

  function initLive2DRuntime() {
    let waifuA11yTries = 0;
    const waifuA11yTimer = setInterval(() => {
      decorateLive2DControls();
      if (++waifuA11yTries >= 12) clearInterval(waifuA11yTimer);
    }, 500);
    // 模型没有 HitArea,点击画布时手动触发随机动作与表情
    const TAP_MOTIONS = ['Hammer', 'BubbleGum', 'SprayWater', 'OpenCase', 'Selfie', 'SelfieQuick', 'Ketchup'];
    document.addEventListener('click', e => {
      if (e.target.id !== 'live2d') return;
      if (window.__l2dDragMoved) {
        window.__l2dDragMoved = false;
        return;
      }
      const model = getLive2DModel();
      if (!model) return;
      try {
        if (typeof model.startRandomMotion === 'function') {
          model.startRandomMotion(TAP_MOTIONS[Math.floor(Math.random() * TAP_MOTIONS.length)], 3);
        }
        if (typeof model.setRandomExpression === 'function') model.setRandomExpression();
      } catch (err) {}
    });

    attachWaifuVisibilityObserver();

    // 标签页隐藏时停止渲染,回到前台且未被滚动暂停时恢复
    document.addEventListener('visibilitychange', () => {
      if (!window.__l2dApp) return;
      if (document.hidden) {
        try { window.__l2dApp.stop(); } catch (e) {}
        return;
      }
      if (window.__l2dPaused || window.__l2dReducedMotion || window.__l2dNavPaused) return;
      const waifu = document.querySelector('#waifu');
      if (!waifu || !waifu.classList.contains('waifu-active')) return;
      if (window.__l2dApp._drawFrameId == null) {
        try { window.__l2dApp.run(); } catch (e) {}
      }
    });

    // 系统“减少动态效果”切换时同步暂停/恢复
    const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const apply = () => {
      window.__l2dReducedMotion = mq.matches;
      if (mq.matches) {
        try { window.__l2dApp?.stop(); } catch (e) {}
      } else if (window.__l2dApp && !window.__l2dPaused && !window.__l2dNavPaused && !document.hidden && window.__l2dApp._drawFrameId == null) {
        try { window.__l2dApp.run(); } catch (e) {}
      }
    };
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
  }

  function initReadingProgress() {
    // 进度条由主题的 updateScrollStyle 维护,这里只处理导航与页脚状态
    const update = (fromScroll = false) => {
      const scrollTop = window.scrollY;
      // 文档高度用缓存:load / resize / 字体就绪 / 换页后都会刷新,
      // ResizeObserver 也会兜住图片撑高;不再每次滚动同步读 scrollHeight。
      // 只在接近底部(<150px)时读一次真实值,保证页脚触底判定准确。
      let maxScroll = (window.__cjScrollHeight || document.documentElement.scrollHeight) - window.innerHeight;
      if (maxScroll - scrollTop <= 150) {
        const realMax = document.documentElement.scrollHeight - window.innerHeight;
        if (realMax !== maxScroll) {
          window.__cjScrollHeight = realMax + window.innerHeight;
          maxScroll = realMax;
        }
      }

      // Dynamic Island 导航栏:进入用 100px、退出用 40px,避免阈值附近反复抖动
      const navbar = document.querySelector('.navbar-container');
      if (navbar) {
        const scrolled = navbar.classList.contains('scrolled');
        const compact = scrolled ? scrollTop > 40 : scrollTop > 100;
        navbar.classList.toggle('scrolled', compact);
      }

      // 页脚:接近底部展开;离开 80px 以上才收回,避免滚动时反复开合
      const footer = document.querySelector('footer.footer');
      if (footer) {
        const remaining = maxScroll - scrollTop;
        const atBottom = footer.classList.contains('at-bottom');
        if (!atBottom && remaining <= 8) footer.classList.add('at-bottom');
        else if (atBottom && remaining > 80) footer.classList.remove('at-bottom');
      }

      // 滚动期间暂停 Cubism 渲染,scrollend 或 700ms 空闲后恢复
    };

    let ticking = false;
    let lastScrollAt = 0;
    window.addEventListener('scroll', () => {
      lastScrollAt = performance.now();
      // 同步暂停,不等 rAF:scrollend 恢复后新的 scroll 会再次暂停
      const l2d = window.__l2dApp;
      const waifu = document.querySelector('#waifu');
      if (l2d && waifu && waifu.classList.contains('waifu-active')) {
        if (!window.__l2dPaused) {
          window.__l2dPaused = true;
          try { l2d.stop(); } catch (e) {}
        }
        clearTimeout(window.__l2dResumeTimer);
        window.__l2dResumeTimer = setTimeout(resumeLive2D, 1200);
      }
      if (!ticking) {
        requestAnimationFrame(() => {
          update(true);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
    // 连续滚动时 scrollend 可能每帧都触发(尤其程序化 scrollTo),
    // 直接 resume 会让 Live2D 在“暂停-恢复”之间反复空转。
    document.addEventListener('scrollend', () => {
      if (performance.now() - lastScrollAt > 180) resumeLive2D();
    }, { passive: true });
    update();
  }

  // ============================
  // Scroll height cache — 主题的阅读进度/侧栏工具需要文档高度,
  // 旧实现每次滚动都读 scrollHeight,会强制同步布局。这里在
  // load / resize / 换页空闲时更新一次,滚动期间直接用缓存。
  // ============================
  function updateScrollHeightCache() {
    window.__cjScrollHeight = document.documentElement.scrollHeight;
  }

  function initScrollHeightCache() {
    if (window.__cjScrollHeightInit) return;
    window.__cjScrollHeightInit = true;
    const schedule = () => {
      if (window.__cjScrollHeightRaf) return;
      window.__cjScrollHeightRaf = requestAnimationFrame(() => {
        window.__cjScrollHeightRaf = 0;
        updateScrollHeightCache();
      });
    };
    window.addEventListener('load', () => setTimeout(updateScrollHeightCache, 0), { once: true });
    window.addEventListener('resize', schedule, { passive: true });
    if ('ResizeObserver' in window) {
      try { new ResizeObserver(schedule).observe(document.body); } catch (e) {}
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    const afterNav = () => {
      if ('requestIdleCallback' in window) requestIdleCallback(updateScrollHeightCache, { timeout: 1200 });
      else setTimeout(updateScrollHeightCache, 300);
    };
    const attach = swup => {
      if (!swup || !swup.hooks || swup.__cjHeightHook) return;
      swup.__cjHeightHook = true;
      swup.hooks.on('page:view', afterNav);
    };
    if (window.swup && window.swup.hooks) attach(window.swup);
    else window.addEventListener('redefine:swup:ready', e => attach(e.detail && e.detail.swup), { once: true });
    schedule();
  }

  // ============================
  // Post sidebar — 更新作者卡上的阅读进度环。
  // 卡片本身由构建期脚本写入 HTML,这里只改 SVG 偏移和数字,
  // 不创建/移动任何节点,避免目录区域 CLS。
  // ============================
  function initPostSidebar() {
    if (window.__cjPostSidebar) return;
    window.__cjPostSidebar = true;
    const RING = 2 * Math.PI * 20;
    let raf = 0;
    const update = () => {
      raf = 0;
      const fill = document.querySelector('.post-side-ring-fill');
      const num = document.querySelector('.post-side-progress-num');
      if (fill) {
        const docH = window.__cjScrollHeight || document.documentElement.scrollHeight;
        const max = docH - window.innerHeight;
        const percent = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        fill.style.strokeDashoffset = (RING * (1 - percent)).toFixed(2);
        if (num) num.textContent = String(Math.round(percent * 100));
      }
      const count = document.querySelector('.post-toc-count');
      const bar = document.querySelector('.post-toc-progress span');
      if (count || bar) {
        const links = [...document.querySelectorAll('.post-toc a.nav-link')];
        const active = document.querySelector('.post-toc a.nav-link.active-current') ||
          document.querySelector('.post-toc .active-current');
        const total = links.length;
        const index = active ? links.indexOf(active) : -1;
        const current = total ? Math.max(1, index + 1) : 0;
        links.forEach(link => {
          if (link === active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
        if (count) count.textContent = total ? `${current}/${total}` : '';
        if (bar) bar.style.width = total ? `${(current / total * 100).toFixed(1)}%` : '0%';
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    document.addEventListener('click', e => {
      const btn = e.target.closest('.post-side-share');
      if (!btn) return;
      const url = window.location.href;
      if (navigator.share) {
        navigator.share({ title: document.title, url }).catch(() => {});
      } else if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(() => showToast('链接已复制')).catch(() => showToast('请复制地址栏链接'));
      } else {
        showToast('请复制地址栏链接');
      }
    }, true);
    const attach = swup => {
      if (!swup || !swup.hooks || swup.__cjSidebarHook) return;
      swup.__cjSidebarHook = true;
      swup.hooks.on('page:view', () => requestAnimationFrame(update));
    };
    if (window.swup && window.swup.hooks) attach(window.swup);
    else window.addEventListener('redefine:swup:ready', e => attach(e.detail && e.detail.swup), { once: true });
    schedule();
  }

  // ============================
  // Heading anchors — 标题旁复制本节链接
  // ============================
  // 移动端目录:桌面侧栏在手机上被隐藏,这里用原生 details 克隆一份
  function initMobileToc() {
    document.querySelectorAll('.post-toc').forEach(toc => {
      toc.setAttribute('role', 'navigation');
      toc.setAttribute('aria-label', '文章目录');
    });
    const content = document.querySelector('.post-page-container .article-content');
    if (!content || document.querySelector('.mobile-toc')) return;
    const nav = document.querySelector('.post-toc .nav');
    if (!nav) return;
    const details = document.createElement('details');
    details.className = 'mobile-toc';
    details.setAttribute('aria-label', '文章目录');
    const summary = document.createElement('summary');
    summary.textContent = '目录';
    details.appendChild(summary);
    const clone = nav.cloneNode(true);
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    details.appendChild(clone);
    content.parentNode.insertBefore(details, content);
    details.addEventListener('click', e => {
      if (e.target.closest('a')) details.open = false;
    });
  }

  function initHeadingAnchors() {
    document.querySelectorAll('.article-content h2[id], .article-content h3[id], .article-content h4[id]').forEach(heading => {
      if (heading.querySelector(':scope > .heading-anchor')) return;
      const anchor = document.createElement('a');
      anchor.className = 'heading-anchor';
      anchor.href = '#' + heading.id;
      const headingText = (heading.textContent || '').trim().slice(0, 80);
      const anchorLabel = headingText ? `复制「${headingText}」的链接` : '复制本节链接';
      anchor.title = anchorLabel;
      anchor.setAttribute('aria-label', anchorLabel);
      anchor.innerHTML = '<i class="fa-solid fa-link" aria-hidden="true"></i>';
      anchor.addEventListener('click', () => {
        const url = window.location.origin + window.location.pathname + '#' + encodeURIComponent(heading.id);
        const done = () => showToast('本节链接已复制');
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
        } else {
          fallbackCopy(url, done);
        }
      });
      heading.appendChild(anchor);
    });
    // Hexo 生成的空 headerlink 与我们的锚点重复,移出 Tab 顺序
    document.querySelectorAll('a.headerlink').forEach(link => {
      link.tabIndex = -1;
      link.setAttribute('aria-hidden', 'true');
    });
  }

  // ============================
  // Image viewer / code buttons a11y
  // 主题的图片查看器和复制/折叠按钮只有 click,这里补键盘入口
  // ============================
  function initImageA11y() {
    const selector = '.markdown-body img, .masonry-item img, #shuoshuo-content img';
    const decorate = () => {
      document.querySelectorAll(selector).forEach(img => {
        if (img.closest('.image-viewer-container') || img.dataset.cjA11y) return;
        img.dataset.cjA11y = '1';
        img.tabIndex = 0;
        img.setAttribute('role', 'button');
        const alt = (img.getAttribute('alt') || '图片').trim();
        img.setAttribute('aria-label', '查看大图：' + alt);
        img.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            img.click();
          }
        });
      });
    };
    decorate();
    setTimeout(decorate, 600);

    if (!window.__cjImageClickTracked) {
      window.__cjImageClickTracked = true;
      document.addEventListener('click', e => {
        const img = e.target.closest(selector);
        if (!img || img.closest('.image-viewer-container')) return;
        window.__cjLastImage = img;
        // 主题在 click 里同步打开弹层,下一帧把焦点送到关闭按钮
        const syncCaption = () => {
          const maskNow = document.querySelector('.image-viewer-container.active');
          if (!maskNow) return;
          const viewerImg = maskNow.querySelector('.image-viewer-frame img');
          const fig = img.closest('figure');
          const figcaption = fig && fig.querySelector('figcaption');
          const text = ((figcaption && figcaption.textContent) || img.alt || (viewerImg && viewerImg.alt) || '').trim();
          let cap = maskNow.querySelector('.image-viewer-caption');
          if (!cap) {
            cap = document.createElement('div');
            cap.className = 'image-viewer-caption';
            cap.id = 'image-viewer-caption';
            maskNow.appendChild(cap);
          }
          if (viewerImg) viewerImg.setAttribute('aria-describedby', 'image-viewer-caption');
          cap.textContent = text;
          cap.hidden = !text;
        };

        const focusClose = () => {
          const maskNow = document.querySelector('.image-viewer-container.active');
          if (!maskNow || maskNow.contains(document.activeElement)) return;
          const btn = maskNow.querySelector('.image-viewer-close');
          if (btn) btn.focus({ preventScroll: true });
        };
        setTimeout(() => { syncCaption(); focusClose(); }, 80);
        setTimeout(() => { syncCaption(); focusClose(); }, 320);
        setTimeout(focusClose, 700);
      }, true);
    }

    const mask = document.querySelector('.image-viewer-container');
    if (!mask || mask.__cjFocusObserver) return;
    mask.__cjFocusObserver = true;
    const close = mask.querySelector('.image-viewer-close');
    if (close) {
      close.tabIndex = 0;
      close.setAttribute('role', 'button');
      close.setAttribute('aria-label', '关闭图片查看器');
    }

    const syncViewerCaption = () => {
      const viewerImg = mask.querySelector('.image-viewer-frame img');
      if (!viewerImg) return;
      const text = (viewerImg.alt || '').trim();
      let cap = mask.querySelector('.image-viewer-caption');
      if (!cap) {
        cap = document.createElement('div');
        cap.className = 'image-viewer-caption';
        cap.id = 'image-viewer-caption';
        mask.appendChild(cap);
      }
      viewerImg.setAttribute('aria-describedby', 'image-viewer-caption');
      cap.textContent = text;
      cap.hidden = !text;
    };
    mask.addEventListener('click', e => {
      if (e.target.closest('.image-viewer-prev, .image-viewer-next')) {
        setTimeout(syncViewerCaption, 100);
      }
    });
    if (!mask.__cjSwipe) {
      mask.__cjSwipe = true;
      let startX = 0, startY = 0, tracking = false;
      mask.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) { tracking = false; return; }
        if (e.target.closest('.image-viewer-prev, .image-viewer-next, .image-viewer-close, .image-viewer-exif-panel, .image-viewer-exif-toggle')) {
          tracking = false;
          return;
        }
        tracking = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }, { passive: true });
      mask.addEventListener('touchend', e => {
        if (!tracking) return;
        tracking = false;
        const touch = e.changedTouches && e.changedTouches[0];
        if (!touch) return;
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
        const btn = mask.querySelector(dx > 0 ? '.image-viewer-prev' : '.image-viewer-next');
        if (btn) btn.click();
      }, { passive: true });
    }

    // 双指缩放:换算成主题已有的 wheel 缩放,避免另写一套 transform 状态
    if (!mask.__cjPinch) {
      mask.__cjPinch = true;
      let pinch = null;
      const distance = touches => Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      const scaleOf = img => {
        const match = (img.style.transform || '').match(/scale\(([\d.]+)\)/);
        return match ? parseFloat(match[1]) : 1;
      };
      mask.addEventListener('touchstart', e => {
        if (e.touches.length !== 2) return;
        const img = mask.querySelector('.image-viewer-frame img');
        if (!img) return;
        pinch = { startDistance: distance(e.touches), startScale: scaleOf(img), img };
      }, { passive: true, capture: true });
      mask.addEventListener('touchmove', e => {
        if (!pinch || e.touches.length !== 2) return;
        e.preventDefault();
        const target = Math.min(8, Math.max(0.3, pinch.startScale * (distance(e.touches) / pinch.startDistance)));
        const current = scaleOf(pinch.img);
        if (Math.abs(target - current) < 0.02) return;
        pinch.img.dispatchEvent(new WheelEvent('wheel', {
          deltaY: (current - target) * 1000,
          clientX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          clientY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
        }));
      }, { passive: false, capture: true });
      mask.addEventListener('touchend', e => {
        if (e.touches.length < 2) pinch = null;
      }, { passive: true, capture: true });
    }

    // 弹层打开时把 Tab 限制在对话框内,并让背景暂时 inert
    if (!mask.__cjTabTrap) {
      mask.__cjTabTrap = true;
      mask.addEventListener('keydown', e => {
        if (e.key !== 'Tab' || !mask.classList.contains('active')) return;
        const focusables = [...mask.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')]
          .filter(el => !el.disabled && el.getClientRects().length > 0);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      });
    }

    const setBackgroundInert = on => {
      if (on) {
        const nodes = [];
        let node = mask;
        while (node && node !== document.body) {
          const parent = node.parentElement;
          if (!parent) break;
          for (const sibling of parent.children) {
            if (sibling === node || sibling.contains(mask)) continue;
            if (!sibling.inert) {
              sibling.inert = true;
              nodes.push(sibling);
            }
          }
          node = parent;
        }
        window.__cjInertNodes = nodes;
      } else {
        (window.__cjInertNodes || []).forEach(node => { node.inert = false; });
        window.__cjInertNodes = [];
      }
    };

    new MutationObserver(() => {
      if (mask.classList.contains('active')) {
        setBackgroundInert(true);
        requestAnimationFrame(() => {
          const btn = mask.querySelector('.image-viewer-close');
          if (btn && mask.classList.contains('active')) btn.focus({ preventScroll: true });
        });
      } else {
        setBackgroundInert(false);
        if (window.__cjLastImage && window.__cjLastImage.isConnected) {
          window.__cjLastImage.focus({ preventScroll: true });
          window.__cjLastImage = null;
        }
      }
    }).observe(mask, { attributes: true, attributeFilter: ['class'] });
  }

  function announceAction(message) {
    let region = document.getElementById('action-status');
    if (!region) {
      region = document.createElement('div');
      region.id = 'action-status';
      region.className = 'sr-only';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      document.body.appendChild(region);
    }
    region.textContent = '';
    setTimeout(() => { region.textContent = message; }, 60);
  }

  function initCodeButtonsA11y() {
    const figures = [...document.querySelectorAll('.highlight-container')];
    figures.forEach((container, index) => {
      const labelIndex = index + 1;
      const copy = container.querySelector('.copy-button');
      const fold = container.querySelector('.fold-button');

      if (copy && copy.tagName !== 'BUTTON') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = copy.className;
        btn.innerHTML = copy.innerHTML;
        btn.setAttribute('aria-label', `复制第 ${labelIndex} 段代码`);
        btn.addEventListener('click', () => {
          const lines = [...container.querySelectorAll('.code .line')];
          const code = lines.map(line => line.innerText).join('\n');
          const done = () => {
            btn.querySelector('i').className = 'fa-regular fa-check';
            announceAction(`第 ${labelIndex} 段代码已复制`);
            setTimeout(() => {
              btn.querySelector('i').className = 'fa-regular fa-copy';
            }, 1200);
          };
          const failed = () => announceAction('复制失败，请手动选择代码');
          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(code).then(done).catch(() => fallbackCopy(code, done, failed));
          } else {
            fallbackCopy(code, done, failed);
          }
        });
        copy.replaceWith(btn);
      }

      if (fold && fold.tagName !== 'BUTTON') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = fold.className;
        btn.innerHTML = fold.innerHTML;
        btn.setAttribute('aria-label', `折叠第 ${labelIndex} 段代码`);
        btn.setAttribute('aria-expanded', 'true');
        btn.addEventListener('click', () => {
          const folded = container.classList.toggle('folded');
          btn.querySelector('i').className = folded
            ? 'fa-solid fa-chevron-up'
            : 'fa-solid fa-chevron-down';
          btn.setAttribute('aria-expanded', String(!folded));
          btn.setAttribute('aria-label', `${folded ? '展开' : '折叠'}第 ${labelIndex} 段代码`);
        });
        fold.replaceWith(btn);
      }
    });
  }

  function initCodeLangBadges() {
    const names = {
      js: 'JS', javascript: 'JS', jsx: 'JSX', ts: 'TS', typescript: 'TS', tsx: 'TSX',
      bash: 'Shell', shell: 'Shell', sh: 'Shell', zsh: 'Shell',
      yaml: 'YAML', yml: 'YAML', json: 'JSON', python: 'Python', py: 'Python',
      java: 'Java', html: 'HTML', css: 'CSS', scss: 'SCSS', sql: 'SQL',
      diff: 'Diff', text: 'Text', plaintext: 'Text',
    };
    document.querySelectorAll('.highlight-container').forEach(container => {
      if (container.querySelector('.code-lang')) return;
      const figure = container.querySelector('figure.highlight');
      if (!figure) return;
      const langClass = [...figure.classList].find(cls => names[cls.toLowerCase()]);
      if (!langClass) return;
      const badge = document.createElement('span');
      badge.className = 'code-lang';
      badge.textContent = names[langClass.toLowerCase()];
      badge.setAttribute('aria-hidden', 'true');
      container.appendChild(badge);
    });
  }

  // ============================
  // Code line links — 点行号复制 #cb1-L3，打开链接定位并高亮
  // ============================
  function initCodeLineLinks() {
    const blocks = [...document.querySelectorAll('.highlight-container')];
    blocks.forEach((container, blockIndex) => {
      const codeLines = [...container.querySelectorAll('.code .line')];
      const gutterLines = [...container.querySelectorAll('.gutter .line')];
      codeLines.forEach((line, i) => {
        if (!line.id) line.id = `cb${blockIndex + 1}-L${i + 1}`;
      });
      gutterLines.forEach((gutter, i) => {
        if (gutter.dataset.cjLineLink) return;
        gutter.dataset.cjLineLink = '1';
        gutter.title = `复制第 ${i + 1} 行链接`;
        gutter.addEventListener('click', () => {
          const hash = `#cb${blockIndex + 1}-L${i + 1}`;
          const url = location.origin + location.pathname + hash;
          try { history.replaceState(null, '', hash); } catch (e) {}
          const target = document.getElementById(hash.slice(1));
          if (target) {
            target.classList.add('code-line-target');
            setTimeout(() => target.classList.remove('code-line-target'), 1800);
          }
          const done = () => showToast(`第 ${i + 1} 行链接已复制`);
          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
          } else {
            fallbackCopy(url, done);
          }
        });
      });
    });

    const applyHash = () => {
      const match = location.hash.match(/^#cb\d+-L\d+$/);
      if (!match) return;
      const target = document.getElementById(location.hash.slice(1));
      if (!target) return;
      target.classList.add('code-line-target');
      setTimeout(() => target.classList.remove('code-line-target'), 2200);
      const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    };
    applyHash();
    if (!window.__cjCodeHashTracked) {
      window.__cjCodeHashTracked = true;
      window.addEventListener('hashchange', applyHash);
    }
  }

  // ============================
  // Code fullscreen — 代码块全屏阅读
  // ============================
  function closeCodeFullscreen() {
    document.querySelectorAll('.code-container.code-fullscreen').forEach(el => {
      el.classList.remove('code-fullscreen');
      const parent = el.__cjOriginalParent;
      if (parent && parent.isConnected) {
        const next = el.__cjOriginalNext && el.__cjOriginalNext.isConnected ? el.__cjOriginalNext : null;
        parent.insertBefore(el, next);
      } else {
        el.remove();
      }
      delete el.__cjOriginalParent;
      delete el.__cjOriginalNext;
    });
    document.body.classList.remove('code-fullscreen-open');
    const backdrop = document.querySelector('.code-fullscreen-backdrop');
    if (backdrop) backdrop.remove();
    const hint = document.querySelector('.code-fullscreen-hint');
    if (hint) hint.remove();
    document.querySelectorAll('.code-fullscreen-btn i').forEach(icon => {
      icon.className = 'fa-solid fa-expand';
    });
  }

  function initCodeFullscreen() {
    document.querySelectorAll('.highlight-container').forEach(container => {
      if (container.querySelector('.code-fullscreen-btn')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-fullscreen-btn';
      btn.setAttribute('aria-label', '全屏查看代码');
      btn.innerHTML = '<i class="fa-solid fa-expand" aria-hidden="true"></i>';
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const code = container.closest('.code-container') || container;
        if (code.classList.contains('code-fullscreen')) {
          closeCodeFullscreen();
          return;
        }
        code.classList.add('code-fullscreen');
        // 文章容器有 transform,position:fixed 会被限制在内容区;
        // 全屏时临时移到 body,关闭时原位插回。
        code.__cjOriginalParent = code.parentNode;
        code.__cjOriginalNext = code.nextSibling;
        document.body.appendChild(code);
        document.body.classList.add('code-fullscreen-open');
        const backdrop = document.createElement('div');
        backdrop.className = 'code-fullscreen-backdrop';
        backdrop.addEventListener('click', closeCodeFullscreen);
        document.body.appendChild(backdrop);
        const hint = document.createElement('div');
        hint.className = 'code-fullscreen-hint';
        hint.textContent = window.matchMedia && window.matchMedia('(hover: none)').matches
          ? '点背景或按钮退出'
          : 'Esc 退出全屏';
        document.body.appendChild(hint);
        btn.querySelector('i').className = 'fa-solid fa-compress';
      });
      container.appendChild(btn);
    });
    if (!window.__cjCodeFullscreenKeys) {
      window.__cjCodeFullscreenKeys = true;
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeCodeFullscreen();
      });
    }
  }

  // ============================
  // Tables — 宽表格放进横向滚动容器,避免移动端撑破正文
  // ============================
  function initTableScroll() {
    document.querySelectorAll('.article-content table').forEach(table => {
      if (table.closest('.table-scroll')) return;
      const wrap = document.createElement('div');
      wrap.className = 'table-scroll';
      wrap.setAttribute('role', 'region');
      wrap.setAttribute('aria-label', '表格，可横向滚动');
      wrap.tabIndex = 0;
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  // ============================
  // Copy link button (article post-tools)
  // ============================
  function showToast(msg) {
    const old = document.querySelector('.custom-toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 1800);
  }

  function initCopyLink() {
    const list = document.querySelector('.article-tools-list');
    if (!list || list.querySelector('.copy-link-btn')) return;

    const copy = () => {
      const url = window.location.href;
      const done = () => showToast('链接已复制');
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
      } else {
        fallbackCopy(url, done);
      }
    };

    const li = document.createElement('li');
    li.className = 'copy-link-item';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-link-btn cj-tool-btn';
    btn.title = '复制文章链接';
    btn.setAttribute('aria-label', '复制文章链接');
    btn.innerHTML = '<i class="fa-solid fa-link" aria-hidden="true"></i>';
    btn.addEventListener('click', copy);
    li.appendChild(btn);
    list.appendChild(li);
  }

  function fallbackCopy(text, done, failed) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    if (ok) done();
    else if (failed) failed();
  }

  // ============================
  // Copy Markdown — 侧栏按钮直接复制文章 Markdown 原文
  // ============================
  function initCopyMarkdown() {
    if (window.__cjCopyMdTracked) return;
    window.__cjCopyMdTracked = true;
    document.addEventListener('click', e => {
      const btn = e.target.closest('.post-side-copy-md');
      if (!btn) return;
      e.preventDefault();
      const url = btn.dataset.mdUrl;
      if (!url) return;
      fetch(url, { cache: 'no-store' })
        .then(res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(text => {
          const done = () => {
            showToast('Markdown 已复制');
            announceAction('Markdown 原文已复制');
            const icon = btn.querySelector('i');
            if (icon) {
              icon.className = 'fa-regular fa-check';
              setTimeout(() => { icon.className = 'fa-regular fa-copy'; }, 1200);
            }
          };
          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
          } else {
            fallbackCopy(text, done);
          }
        })
        .catch(() => showToast('复制失败，请打开 Markdown 原文'));
    });
  }

  // ============================
  // Seasonal theme — 春夏秋冬四套配色
  // 默认按月份自动换季;导航栏可手动覆盖(localStorage 'blog-season')
  // ============================
  const SEASON_ICONS = { spring: '🌸', summer: '🌻', autumn: '🍂', winter: '❄️', space: '🛰️' };
  const SEASON_NAMES = { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季', space: '太空站' };
  const SEASON_BANNERS = {
    spring: '/images/banner-spring.webp',
    summer: '/images/banner-summer.webp',
    autumn: '/images/banner-autumn.webp',
    winter: '/images/banner-winter.webp',
    space: '/images/banner-light.webp',
  };

  // 和构建期注入的 srcset 保持一致;季节切换时 srcset 也要换,
  // 否则浏览器会继续按旧的 srcset 选图,img.src 改了也不会生效。
  function bannerSrcset(url) {
    const base = url.replace(/\.webp$/, '');
    return base + '-960.webp 960w, ' + base + '-1280.webp 1280w, ' + url + ' 1920w';
  }

  function setBannerSrc(img, url) {
    img.srcset = bannerSrcset(url);
    img.src = url;
  }

  function autoSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  function effectiveSeason() {
    const saved = localStorage.getItem('blog-season');
    return SEASON_NAMES[saved] ? saved : 'auto';
  }

  function applySeason(season) {
    // 自动 = 旧版 light 明亮主题:浅色主题 + 太空城市 banner(配置默认)
    // 手动选季节 = 季节完整主题 + 对应季节图
    const isAuto = season === 'auto';
    document.documentElement.dataset.season = isAuto ? 'auto' : season;

    // 主题切换平滑过渡(旧版 theme-transitioning)
    const body = document.body;
    body.classList.add('theme-transitioning');
    clearTimeout(applySeason._t);
    applySeason._t = setTimeout(() => body.classList.remove('theme-transitioning'), 600);

    if (!isAuto) {
      // 季节 banner:直接换 src。浏览器会保持旧图显示直到新图加载完成,
      // 天然平滑无空白;已缓存(预加载)的图立即切换。
      const url = SEASON_BANNERS[season];
      if (url) {
        document.querySelectorAll('.home-banner-background img').forEach(img => {
          setBannerSrc(img, url);
          img.style.display = '';
        });
        document.querySelectorAll('.home-banner-background').forEach(div => {
          // img 子节点已经按 srcset 选好尺寸,再给容器设背景会重复下载原图
          if (!div.querySelector('img')) div.style.backgroundImage = 'url(' + url + ')';
        });
      }
    } else {
      // 自动模式:还原配置默认 banner(亮色=太空城市,暗色=赛博雨夜)
      document.querySelectorAll('.home-banner-background img').forEach(img => {
        const isDarkImg = img.classList.contains('dark:block');
        setBannerSrc(img, isDarkImg
          ? '/images/banner-dark.webp'
          : '/images/banner-light.webp');
      });
      document.querySelectorAll('.home-banner-background').forEach(div => {
        div.style.backgroundImage = '';
      });
    }

    // 同步导航栏按钮状态
    document.querySelectorAll('.nb-opt[data-season]').forEach(el => {
      el.classList.toggle('active', el.dataset.season === season);
    });
    const btn = document.querySelector('.nb-theme-btn');
    if (btn) btn.textContent = season === 'auto' ? '🍀' : SEASON_ICONS[season];
  }

  // 预加载全部季节 banner:只在首页、且用户打开季节菜单时才触发
  let seasonBannersPreloaded = false;
  function preloadSeasonBanners() {
    if (seasonBannersPreloaded) return;
    if (!document.querySelector('.home-banner-background')) return;
    seasonBannersPreloaded = true;
    // 按当前视口/DPR 预加载会被真正选中的那一档,避免手机上先拉
    // 1920 原图、切过去又拉 1280 变体的双份流量
    const need = Math.round(window.innerWidth * (window.devicePixelRatio || 1));
    const pick = url => {
      const base = url.replace(/\.webp$/, '');
      if (need <= 960) return base + '-960.webp';
      if (need <= 1280) return base + '-1280.webp';
      return url;
    };
    const loaded = {};
    Object.values(SEASON_BANNERS).forEach(url => {
      const target = pick(url);
      if (loaded[target]) return;
      loaded[target] = true;
      const img = new Image();
      img.src = target;
    });
  }

  function initSeason() {
    applySeason(effectiveSeason());
  }

  // ============================
  // Theme switcher — 导航栏季节下拉 + 手电筒 + 秒表(移植自旧版)
  // ============================
  function initThemeSwitcher() {
    // 换页后导航栏会被整体替换;旧秒表 interval 必须停掉,
    // document 级关闭逻辑只注册一次并每次查询当前控件。
    clearInterval(window.__cjTimerInterval);
    window.__cjTimerInterval = null;
    if (!window.__cjNavControlsGlobal) {
      window.__cjNavControlsGlobal = true;
      document.addEventListener('click', e => {
        // 只处理真实用户点击。APlayer 初始化时会自己 click 一次图标,
        // 那种合成事件不应该把刚打开的季节菜单关掉。
        if (!e.isTrusted) return;
        const controls = document.querySelector('.nb-controls');
        if (!controls) return;
        const dropdown = controls.querySelector('.nb-dropdown');
        const themeBtn = controls.querySelector('.nb-theme-btn');
        if (dropdown && themeBtn && !e.target.closest('.nb-theme-btn') && !e.target.closest('.nb-dropdown')) {
          dropdown.classList.remove('show');
          themeBtn.setAttribute('aria-expanded', 'false');
        }
        const panel = controls.querySelector('.nb-timer-panel');
        const timerBtn = controls.querySelector('.nb-timer-btn');
        if (panel && timerBtn && !panel.contains(e.target) && !e.target.closest('.nb-timer-btn')) {
          panel.classList.remove('show');
          timerBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }
    const navbar = document.querySelector('.navbar-content');
    if (!navbar) return;
    if (navbar.querySelector('.nb-controls')) {
      navbar.classList.add('has-nb-controls');
      return;
    }

    const current = effectiveSeason();
    const controls = document.createElement('div');
    controls.className = 'nb-controls';
    controls.innerHTML = `
      <button class="nb-theme-btn" title="切换季节主题" aria-label="切换季节主题" aria-haspopup="true" aria-expanded="false">${current === 'auto' ? '🍀' : SEASON_ICONS[current]}</button>
      <div class="nb-dropdown">
        <button class="nb-opt${current === 'auto' ? ' active' : ''}" data-season="auto"><span>🍀</span><span>自动(跟随明暗)</span></button>
        ${Object.keys(SEASON_ICONS).map(s =>
          `<button class="nb-opt${current === s ? ' active' : ''}" data-season="${s}"><span>${SEASON_ICONS[s]}</span><span>${SEASON_NAMES[s]}</span></button>`
        ).join('')}
        <div class="nb-div"></div>
        <button class="nb-opt flashlight-opt"><span>🔦</span><span>管中窥豹</span></button>
      </div>
      <button class="nb-timer-btn" title="计时器" aria-label="计时器" aria-haspopup="true" aria-expanded="false">⏱</button>
      <div class="nb-timer-panel">
        <div class="nb-timer-time" id="nbTimerTime">00:00:00</div>
        <div class="nb-timer-btns">
          <button id="nbStart">开始</button>
          <button id="nbPause" style="display:none">暂停</button>
          <button id="nbReset">重置</button>
        </div>
      </div>`;
    navbar.classList.add('has-nb-controls');
    navbar.appendChild(controls);

    // 主题下拉
    const dropdown = controls.querySelector('.nb-dropdown');
    const themeBtn = controls.querySelector('.nb-theme-btn');
    const setDropdown = open => {
      dropdown.classList.toggle('show', open);
      themeBtn.setAttribute('aria-expanded', String(open));
    };
    themeBtn.addEventListener('click', e => {
      e.stopPropagation();
      preloadSeasonBanners();
      setDropdown(!dropdown.classList.contains('show'));
    });
    themeBtn.addEventListener('pointerenter', preloadSeasonBanners);
    controls.querySelectorAll('.nb-opt').forEach(opt => {
      opt.addEventListener('click', e => {
        e.stopPropagation();
        if (opt.classList.contains('flashlight-opt')) {
          toggleFlashlight();
          setDropdown(false);
          return;
        }
        localStorage.setItem('blog-season', opt.dataset.season);
        const rect = opt.getBoundingClientRect();
        switchTheme(() => applySeason(opt.dataset.season), rect.left + rect.width / 2, rect.top + rect.height / 2);
        setDropdown(false);
      });
    });

    // 秒表
    const timerPanel = controls.querySelector('.nb-timer-panel');
    const timerTime = controls.querySelector('#nbTimerTime');
    const startBtn = controls.querySelector('#nbStart');
    const pauseBtn = controls.querySelector('#nbPause');
    const resetBtn = controls.querySelector('#nbReset');
    let seconds = 0;

    function fmt(s) {
      return String(Math.floor(s / 3600)).padStart(2, '0') + ':' +
             String(Math.floor((s % 3600) / 60)).padStart(2, '0') + ':' +
             String(s % 60).padStart(2, '0');
    }
    controls.querySelector('.nb-timer-btn').addEventListener('click', e => {
      e.stopPropagation();
      const open = timerPanel.classList.toggle('show');
      e.currentTarget.setAttribute('aria-expanded', String(open));
    });
    startBtn.addEventListener('click', () => {
      window.__cjTimerInterval = setInterval(() => { seconds++; timerTime.textContent = fmt(seconds); }, 1000);
      startBtn.style.display = 'none'; pauseBtn.style.display = '';
    });
    pauseBtn.addEventListener('click', () => {
      clearInterval(window.__cjTimerInterval);
      window.__cjTimerInterval = null;
      startBtn.style.display = ''; pauseBtn.style.display = 'none';
    });
    resetBtn.addEventListener('click', () => {
      clearInterval(window.__cjTimerInterval);
      window.__cjTimerInterval = null;
      seconds = 0;
      timerTime.textContent = '00:00:00';
      startBtn.style.display = ''; pauseBtn.style.display = 'none';
    });
  }

  // ============================
  // Flashlight — 管中窥豹
  // ============================
  function toggleFlashlight() {
    const body = document.body;
    // 脚本实例会随 swup 换页重建,handler 挂到 window 上才能跨实例清理
    if (window.__cjFlashlightHandler) {
      document.removeEventListener('mousemove', window.__cjFlashlightHandler);
      window.__cjFlashlightHandler = null;
    }
    if (body.classList.contains('flashlight-mode')) {
      body.classList.remove('flashlight-mode');
      const el = document.querySelector('.flashlight-overlay');
      if (el) el.remove();
      localStorage.setItem('blog-flashlight', 'false');
    } else {
      body.classList.add('flashlight-mode');
      const el = document.createElement('div');
      el.className = 'flashlight-overlay';
      document.body.appendChild(el);
      window.__cjFlashlightHandler = function(e) {
        el.style.setProperty('--fx', e.clientX + 'px');
        el.style.setProperty('--fy', e.clientY + 'px');
      };
      document.addEventListener('mousemove', window.__cjFlashlightHandler);
      localStorage.setItem('blog-flashlight', 'true');
      showToast('管中窥豹已开启 — 再点 🍀 按钮退出');
    }
    document.querySelectorAll('.flashlight-opt').forEach(el => {
      el.classList.toggle('active', body.classList.contains('flashlight-mode'));
    });
  }

  // ============================
  // Scroll reveal — 滚动进入视口动画
  // 文章标题/图片/代码块/引用/表格 + 相关阅读 + 项目卡片等,
  // 进入视口时淡入上移,一次性动画,不重复触发
  // ============================
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    // 只给卡片类元素做入场,正文标题/代码/表格保持始终可见:
    // 锚点跳转和复制按钮不能落在 opacity:0 的内容上。
    const targets = document.querySelectorAll(
      '.related-post-item, .project-card, .friends-link-container .group, ' +
      '.series-index-card, .archive-series-card, .post-series-card'
    );
    if (targets.length === 0) return;

    // 先一次性读完所有位置,再统一写 class。旧实现边读边写:
    // 每次 classList.add 都会让下一次 getBoundingClientRect 强制重新布局,
    // 长文章上这一轮实测 129-175ms。读写分离后只有一次布局。
    const aboveFold = new Array(targets.length);
    for (let i = 0; i < targets.length; i++) {
      const el = targets[i];
      if (el.dataset.reveal) {
        aboveFold[i] = null;
        continue;
      }
      // 首屏内已经可见的元素直接显示,不要再等 0.3s 入场——
      // 否则进文章页时标题/首段会先空白一下,观感像“慢半拍”。
      const rect = el.getBoundingClientRect();
      aboveFold[i] = rect.top < window.innerHeight && rect.bottom > 0;
    }
    for (let i = 0; i < targets.length; i++) {
      const el = targets[i];
      if (aboveFold[i] === null) continue;
      el.dataset.reveal = '1';
      el.classList.add('reveal');
      if (aboveFold[i]) el.classList.add('reveal-visible');
    }

    if (window.__cjRevealObserver) window.__cjRevealObserver.disconnect();
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('reveal-visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -36px 0px' });

    targets.forEach(el => {
      if (!el.classList.contains('reveal-visible')) obs.observe(el);
    });
    window.__cjRevealObserver = obs;
  }


  // ============================
  // Mouse follower — 发光跟随点
  // ============================
  function initMouseFollower() {
    if ('ontouchstart' in window) return;
    if (document.querySelector('.mouse-follower')) return;
    const follower = document.createElement('div');
    follower.className = 'mouse-follower';
    document.body.appendChild(follower);

    let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
    let followerX = mouseX, followerY = mouseY;
    let lastX = mouseX;
    let rafId = null;

    follower.style.transform = `translate(${followerX - 16}px, ${followerY - 16}px)`;

    function animate() {
      followerX += (mouseX - followerX) * 0.06;
      followerY += (mouseY - followerY) * 0.06;
      const scaleX = (mouseX > lastX + 2) ? -1 : 1;
      lastX = mouseX;
      follower.style.transform = 'translate(' + (followerX - 16) + 'px, ' + (followerY - 16) + 'px) scaleX(' + scaleX + ')';
      // 追到目标后停止 rAF,鼠标再次移动时重启
      const moving = Math.abs(mouseX - followerX) > 0.1 || Math.abs(mouseY - followerY) > 0.1;
      rafId = moving ? requestAnimationFrame(animate) : null;
    }

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!rafId) rafId = requestAnimationFrame(animate);
    });
  }

  // ============================
  // Article stats — 阅读数 + 点赞(本地存储)
  // ============================
  // 点赞/取消赞 — document 级事件委托(旧版 initLikeHandler 方式)
  // 一次绑定全站生效,swup 换页后无需重新绑定
  function initLikeHandler() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.like-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      const href = btn.dataset.href;
      const likeKey = 'likes_' + href;
      const likedKey = 'liked_' + href;
      let likes = parseInt(localStorage.getItem(likeKey) || '0');
      const isLiked = localStorage.getItem(likedKey) === 'true';

      if (isLiked) {
        likes = Math.max(0, likes - 1);
        localStorage.removeItem(likedKey);
        btn.classList.remove('liked');
      } else {
        likes++;
        localStorage.setItem(likedKey, 'true');
        btn.classList.add('liked');
      }
      localStorage.setItem(likeKey, String(likes));
      const iconClass = 'fa-' + (isLiked ? 'regular' : 'solid') + ' fa-heart';
      // 构建期输出的统计行有独立的数字节点,只改文本,不重建整块
      const countEl = btn.querySelector('.stat-likes');
      if (countEl) {
        const icon = btn.querySelector('i');
        if (icon) icon.className = iconClass;
        countEl.textContent = String(likes);
      } else {
        const suffix = btn.closest('.post-page-stats') ? ' 个赞' : '';
        btn.innerHTML = '<i class="' + iconClass + '"></i> ' + likes + suffix;
      }
      if (btn.closest('.post-page-stats')) btn.setAttribute('aria-pressed', String(!isLiked));
    });
  }

  // 首页卡片:渲染浏览数 + 点赞
  function initArticleStats() {
    document.querySelectorAll('.home-article-item').forEach(card => {
      const titleEl = card.querySelector('.home-article-title a');
      if (!titleEl || card.querySelector('.article-stats')) return;
      const href = titleEl.getAttribute('href');
      if (!href) return;

      const viewKey = 'views_' + href;
      const views = parseInt(localStorage.getItem(viewKey) || '0');
      const likeKey = 'likes_' + href;
      const likes = parseInt(localStorage.getItem(likeKey) || '0');
      const isLiked = localStorage.getItem('liked_' + href) === 'true';

      const statsDiv = document.createElement('div');
      statsDiv.className = 'article-stats';
      statsDiv.innerHTML =
        '<span class="stat-item"><i class="fa-regular fa-eye"></i> ' + views + '</span>' +
        '<button class="like-btn ' + (isLiked ? 'liked' : '') + '" data-href="' + href + '">' +
        '<i class="fa-' + (isLiked ? 'solid' : 'regular') + ' fa-heart"></i> ' + likes + '</button>';

      const metaContainer = card.querySelector('.home-article-meta-info-container');
      if (metaContainer) metaContainer.appendChild(statsDiv);
    });
  }

  // 文章页:渲染阅读数 + 点赞(阅读数 +1)
  // 统计行由构建期模板输出(见 scripts/theme-patch.js),首屏已有占位;
  // 这里只更新数字和点赞状态,不再插入节点,避免文章头部 CLS。
  function initPostStats() {
    const postTitle = document.querySelector('.article-title');
    if (!postTitle) return;
    const path = window.location.pathname;

    const viewKey = 'views_' + path;
    // 同一次页面停留里 init 只应计数一次;SPA 重新进入该路径仍会 +1
    const alreadyCounted = window.__cjStatsPath === path;
    let views = parseInt(localStorage.getItem(viewKey) || '0');
    if (!alreadyCounted) {
      views += 1;
      localStorage.setItem(viewKey, views);
      window.__cjStatsPath = path;
    }

    const likeKey = 'likes_' + path;
    const likes = parseInt(localStorage.getItem(likeKey) || '0');
    const isLiked = localStorage.getItem('liked_' + path) === 'true';

    let statsDiv = document.querySelector('.post-page-stats');
    if (!statsDiv) {
      // 兜底:模板没有带统计行时(旧缓存/其他模板分支)才插入一次
      statsDiv = document.createElement('div');
      statsDiv.className = 'article-stats post-page-stats';
      statsDiv.innerHTML =
        '<span class="stat-item"><i class="fa-regular fa-eye"></i> <span class="stat-views">0</span> 次阅读</span>' +
        '<button class="like-btn" type="button"><i class="fa-regular fa-heart"></i> <span class="stat-likes">0</span> 个赞</button>';
      const metaInfo = document.querySelector('.article-header .meta-info') || document.querySelector('.article-header-meta-info .meta-info');
      if (metaInfo) metaInfo.parentNode.insertBefore(statsDiv, metaInfo.nextSibling);
      else postTitle.parentNode.insertBefore(statsDiv, postTitle.nextSibling);
    }

    const viewsEl = statsDiv.querySelector('.stat-views');
    if (viewsEl) {
      viewsEl.textContent = String(views);
    } else {
      const statItem = statsDiv.querySelector('.stat-item');
      if (statItem) statItem.innerHTML = '<i class="fa-regular fa-eye"></i> ' + views + ' 次阅读';
    }

    const btn = statsDiv.querySelector('.like-btn');
    if (btn) {
      btn.dataset.href = path;
      btn.classList.toggle('liked', isLiked);
      btn.setAttribute('aria-pressed', String(isLiked));
      const countEl = btn.querySelector('.stat-likes');
      if (countEl) {
        countEl.textContent = String(likes);
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'fa-' + (isLiked ? 'solid' : 'regular') + ' fa-heart';
      } else {
        btn.innerHTML = '<i class="fa-' + (isLiked ? 'solid' : 'regular') + ' fa-heart"></i> ' + likes + ' 个赞';
      }
    }
  }

  // ============================
  // Related posts (frontend render)
  // 数据源:构建时生成的 /related-data.json
  // ============================
  const RELATED_COVERS = {
    前端开发: '/images/cover-design.jpg',
    后端开发: '/images/cover-code.jpg',
    算法与数据结构: '/images/cover-algorithm.jpg',
    开发工具: '/images/cover-git.jpg',
    项目实战: '/images/cover-code.jpg',
    技术思考: '/images/cover-tech.jpg',
    生活随笔: '/images/cover-tech.jpg',
    学习笔记: '/images/cover-tech.jpg',
  };
  const RELATED_PLACEHOLDER = '/images/cover-tech.jpg';

  function initRelatedPosts() {
    const content = document.querySelector('.article-content');
    if (!content) return;
    // swup 页面切换后可能重复执行,已渲染则跳过
    if (content.parentElement.querySelector('.related-posts')) return;

    const currentPath = window.location.pathname.replace(/\/+$/, '') + '/';

    function render(list) {
      const wrapper = document.createElement('div');
      wrapper.className = 'related-posts';
      wrapper.innerHTML = `
        <div class="related-posts-header">
          <h2 class="related-posts-title">相关阅读</h2>
          <span class="related-posts-hint">同一主题下的文章</span>
        </div>
        <div class="related-posts-list">
          ${list.map(p => {
            const cover = p.cover || RELATED_COVERS[p.categories[0]] || RELATED_PLACEHOLDER;
            return `<a class="related-post-item" href="${esc(p.path)}" title="${esc(p.title)}">
              <div class="related-post-cover" style="background-image:url('${esc(cover)}')"></div>
              <div class="related-post-info">
                <div class="related-post-title">${esc(p.title)}</div>
                <div class="related-post-meta"><span>${esc(p.categories[0] || '')}</span>${p.date ? ' · ' + p.date : ''}</div>
              </div>
            </a>`;
          }).join('')}
        </div>`;
      // 系列卡由构建期插在正文后面;相关阅读排在系列卡之后,
      // 保持“正文 → 系列 → 相关阅读 → 版权”的固定顺序。
      const seriesCard = content.parentElement.querySelector('.post-series-card');
      (seriesCard || content).after(wrapper);
    }

    function relatedFor(all, current) {
      const curTags = new Set(current.tags);
      const curCats = new Set(current.categories);
      const curDate = new Date(current.date).getTime();

      const scored = all
        .filter(p => p.path !== current.path)
        .map(p => {
          const tags = new Set(p.tags);
          const cats = new Set(p.categories);
          let score = 0;
          const union = new Set([...curTags, ...tags]);
          const inter = [...curTags].filter(t => tags.has(t));
          if (union.size > 0) score += (inter.length / union.size) * 2;
          if ([...curCats].some(c => cats.has(c))) score += 3;
          const days = Math.abs(new Date(p.date).getTime() - curDate) / 86400000;
          if (days <= 60) score += 1;
          return { post: p, score };
        })
        .sort((a, b) => b.score - a.score);

      let picks = scored.filter(x => x.score > 0).slice(0, 3);
      // 不足 3 篇时用最新文章补齐
      for (const s of scored) {
        if (picks.length >= 3) break;
        if (!picks.some(x => x.post.path === s.post.path)) picks.push(s);
      }
      return picks.slice(0, 3).map(s => s.post);
    }

    fetch('/related-data.json', { cache: 'force-cache' })
      .then(res => res.json())
      .then(all => {
        const current = all.find(p => currentPath.includes(p.path));
        if (!current) return;
        const picks = relatedFor(all, current);
        if (picks.length > 0) render(picks);
      })
      .catch(() => {});
  }

  // ============================
  // GitHub projects showcase
  // ============================
  function initGithubProjects() {
    const container = document.getElementById('github-projects');
    if (!container) return;

    const CACHE_KEY = 'gh-projects-cache-v1';
    const CACHE_TTL = 60 * 60 * 1000; // 1 hour

    function render(repos) {
      container.innerHTML = repos.map(repo => {
        const lang = repo.language ? `<span class="project-card-lang">${repo.language}</span>` : '';
        const desc = repo.description || '这个仓库没有写描述。';
        const stars = repo.stargazers_count > 0
          ? `<span class="project-card-stars"><i class="fa-solid fa-star"></i>${repo.stargazers_count}</span>` : '';
        const forks = repo.forks_count > 0
          ? `<span><i class="fa-solid fa-code-fork"></i>${repo.forks_count}</span>` : '';
        const updated = `<span><i class="fa-regular fa-clock"></i>${repo.updated_at.slice(0, 10)}</span>`;
        return `
        <a class="project-card" href="${repo.html_url}" target="_blank" rel="noopener noreferrer">
          <div class="project-card-header">
            <div class="project-card-name">
              <i class="fa-brands fa-github"></i>
              <span class="project-repo-name">${repo.name}</span>
            </div>
            ${lang}
          </div>
          <div class="project-card-desc">${esc(desc)}</div>
          <div class="project-card-meta">
            ${stars}${forks}${updated}
          </div>
        </a>`;
      }).join('');
    }

    // 优先用缓存,避免 GitHub API 限流
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (cached && Date.now() - cached.time < CACHE_TTL) {
        render(cached.repos);
        return;
      }
    } catch (e) {}

    const url = 'https://api.github.com/users/sijie-Z/repos?sort=updated&per_page=30&type=source';
    fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } })
      .then(res => {
        if (!res.ok) throw new Error('GitHub API ' + res.status);
        return res.json();
      })
      .then(repos => {
        // 过滤:非 fork、有描述或有过 star、非纯学习仓库
        const interesting = repos
          .filter(r => !r.fork && (r.stargazers_count > 0 || r.description))
          .filter(r => !/^\./.test(r.name))
          .slice(0, 10);
        render(interesting);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), repos: interesting }));
        } catch (e) {}
      })
      .catch(err => {
        container.innerHTML = `<div class="projects-error">GitHub 项目加载失败(<span>${esc(err.message)}</span>)。可前往 <a href="https://github.com/sijie-Z" target="_blank" rel="noopener noreferrer">github.com/sijie-Z</a> 查看。</div>`;
      });
  }

  // ============================
  // Initialize all features
  // ============================
  function init() {
    if (window.Odometer && window.Odometer.options) {
      window.Odometer.options.auto = false;
    }
    closeCodeFullscreen();
    // 全局监听在整个会话只注册一次(脚本每次换页都会重新执行)
    onceGlobal('smoothScroll', initSmoothScroll);
    onceGlobal('keyboard', initKeyboardShortcuts);
    initExternalLinks();
    initAplayerA11y();
    [1500, 4000, 7000].forEach(ms => setTimeout(initAplayerA11y, ms));
    onceGlobal('readingProgress', initReadingProgress);
    onceGlobal('readingResume', initReadingResume);
    onceGlobal('scrollHeightCache', initScrollHeightCache);
    onceGlobal('postSidebar', initPostSidebar);
    initGithubProjects();
    initCopyLink();
    initCopyMarkdown();
    initRelatedPosts();
    initSeason();
    initThemeSwitcher();
    initReveal();
    // 表格包裹和标题锚点不需要赶在内容替换的同一个任务里完成:
    // 延后到入场动画开始后再改 DOM,避免把 click→content:replace 拖长。
    requestAnimationFrame(() => {
      setTimeout(() => {
        initTableScroll();
        initHeadingAnchors();
        initCodeFullscreen();
        initCodeButtonsA11y();
        initCodeLangBadges();
        initCodeLineLinks();
      }, 60);
    });
    onceGlobal('themeToggle', initThemeToggle);
    onceGlobal('live2dRuntime', initLive2DRuntime);
    initAsideState();
    initMobileToc();
    initImageA11y();
    initNavA11y();
    decorateSearchTriggers();
    observeSearchClose();
    onceGlobal('searchNav', initSearchNavGlobals);
    onceGlobal('searchFocus', initSearchFocus);
    onceGlobal('swupNavPause', initSwupNavPause);
    initMouseFollower();
    initArticleStats();
    initPostStats();
    onceGlobal('like', initLikeHandler);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // data-swup-reload-script 会让本脚本在每次换页时重新执行并调用 init(),
  // 不要再注册 swup 钩子,否则 init 会随换页次数线性叠加。

  // ============================
  // View Transition 主题切换(参考 ericterminal)
  // startViewTransition 快照页面 → ready 后 clip-path 圆形扩散
  // ============================
  function rippleAnim(x, y) {
    const vw = window.innerWidth, vh = window.innerHeight;
    if (!vw || !vh) return;
    const maxR = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y)) + 60;
    const dur = 300;  // 主题切换控制在 300ms 内,避免整页快照拖慢交互
    const clip = [
      'circle(0px at ' + x + 'px ' + y + 'px)',
      'circle(' + maxR + 'px at ' + x + 'px ' + y + 'px)'
    ];
    try {
      const anim = document.documentElement.animate(
        { clipPath: clip },
        {
          duration: dur,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          pseudoElement: '::view-transition-new(root)'
        }
      );
      return anim.finished.catch(() => undefined);
    } catch (e) {
      return Promise.resolve();
    }
  }

  function switchTheme(applyFn, x, y) {
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced && typeof document.startViewTransition === 'function') {
      document.documentElement.setAttribute('data-theme-switching', 'ripple');
      let vt;
      try {
        vt = document.startViewTransition(applyFn);
      } catch (e) {
        document.documentElement.removeAttribute('data-theme-switching');
        applyFn();
        return;
      }
      const ripple = vt.ready.then(() => rippleAnim(x, y)).catch(() => undefined);
      Promise.allSettled([vt.finished, ripple]).finally(() => {
        document.documentElement.removeAttribute('data-theme-switching');
      });
    } else {
      applyFn();
    }
  }

  // 手动切明暗(与 Redefine 的 enableDarkMode/enableLightMode 等效)
  function toggleDarkManually(dark) {
    const html = document.documentElement;
    const body = document.body;
    if (dark) {
      html.classList.remove('light');
      html.classList.add('dark');
      body.classList.remove('light-mode');
      body.classList.add('dark-mode');
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
      body.classList.remove('dark-mode');
      body.classList.add('light-mode');
    }
    const icon = document.querySelector('.tool-dark-light-toggle i');
    if (icon) icon.className = dark ? 'fa-regular fa-brightness' : 'fa-regular fa-moon';
    try {
      const key = 'REDEFINE-THEME-STATUS';
      const st = JSON.parse(localStorage.getItem(key) || '{}');
      st.isDark = dark;
      localStorage.setItem(key, JSON.stringify(st));
    } catch (e) {}
    // giscus 主题跟随(主题用的是 iframe postMessage,没有 window.giscus 全局)
    const giscusFrame = document.querySelector('iframe.giscus-frame');
    if (giscusFrame && giscusFrame.contentWindow) {
      try {
        giscusFrame.contentWindow.postMessage(
          { giscus: { setConfig: { theme: dark ? 'dark' : 'light' } } },
          'https://giscus.app'
        );
      } catch (e) {}
    }
  }

  // 拦截 Redefine 的明暗切换按钮,包进 View Transition
  function initThemeToggle() {
    const html = document.documentElement;
    let lastDark = html.classList.contains('dark');
    document.addEventListener('click', e => {
      const btn = e.target.closest('.tool-dark-light-toggle');
      if (!btn) return;
      // 防抖:如果 Redefine 已处理(状态已变),只补 ripple
      const isDark = html.classList.contains('dark');
      if (isDark === lastDark) {
        // Redefine 还没来得及处理,我们自己接管
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const next = !isDark;
        lastDark = next;
        const x = e.clientX || window.innerWidth / 2;
        const y = e.clientY || window.innerHeight / 2;
        switchTheme(() => toggleDarkManually(next), x, y);
      }
    }, true);
    // 不做 MutationObserver 兜底:切换已被捕获拦截接管,
    // 若 Redefine 自行切换(拦截失败),让它瞬间完成,避免空 View Transition 假过渡
  }

})();

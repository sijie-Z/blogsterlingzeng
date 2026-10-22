/**
 * Custom JavaScript - Sterling Zeng's Blog
 * Enhances the blog with additional interactivity
 */

(function() {
  'use strict';

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
      // Ctrl/Cmd + K: Open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchBtn = document.querySelector('.search-popup-trigger');
        if (searchBtn) searchBtn.click();
      }

      // Escape: 退出管中窥豹
      if (e.key === 'Escape' && document.body.classList.contains('flashlight-mode')) {
        toggleFlashlight();
      }
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
    if (document.querySelector('.reading-resume')) return;

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'reading-resume';
    pill.setAttribute('aria-label', '继续上次阅读');
    pill.innerHTML = `<span class="reading-resume-dot" aria-hidden="true"></span>
      <span class="reading-resume-text">上次读到 <b>${Math.round(saved.percent * 100)}%</b> · 继续</span>
      <span class="reading-resume-close" role="button" aria-label="关闭">×</span>`;
    document.body.appendChild(pill);

    const dismiss = () => hideResumePill();
    pill.addEventListener('click', e => {
      if (e.target.closest('.reading-resume-close')) { dismiss(); return; }
      const reduced = window.__l2dReducedMotion || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      window.scrollTo({ top: saved.y, behavior: reduced ? 'auto' : 'smooth' });
      dismiss();
    });
    requestAnimationFrame(() => pill.classList.add('show'));
    setTimeout(dismiss, 15000);
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

  function initSwupNavPause() {
    const attach = swup => {
      if (!swup || !swup.hooks || swup.__cjNavPause) return;
      swup.__cjNavPause = true;
      swup.hooks.on('visit:start', pauseLive2DForNav);
      swup.hooks.on('page:view', resumeLive2DAfterNav);
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

  function initSearchFocus() {
    // 主题延迟 500ms 才聚焦,这里点开立即聚焦,并在 80ms 后再确认一次
    const focusInput = () => {
      const input = document.querySelector('.search-pop-overlay.active .search-input');
      if (input && document.activeElement !== input) input.focus({ preventScroll: true });
    };
    document.addEventListener('click', e => {
      if (!e.target.closest('.search-popup-trigger')) return;
      requestAnimationFrame(focusInput);
      setTimeout(focusInput, 80);
    }, true);
    const overlay = document.querySelector('.search-pop-overlay');
    if (overlay) {
      new MutationObserver(() => {
        if (!overlay.classList.contains('active')) return;
        requestAnimationFrame(focusInput);
        setTimeout(focusInput, 80);
      }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function initNavA11y() {
    document.querySelectorAll('.search-popup-trigger, .navbar-bar').forEach(el => {
      if (el.dataset.cjA11y) return;
      el.dataset.cjA11y = '1';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      if (!el.getAttribute('aria-label')) {
        el.setAttribute('aria-label', el.classList.contains('navbar-bar') ? '打开菜单' : '搜索');
      }
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });

    const bar = document.querySelector('.navbar-bar');
    const drawer = document.querySelector('.navbar-drawer');
    if (drawer && !drawer.dataset.cjA11y) {
      drawer.dataset.cjA11y = '1';
      const sync = () => {
        const open = document.body.classList.contains('navbar-drawer-show');
        drawer.toggleAttribute('inert', !open);
        if (bar) bar.setAttribute('aria-expanded', String(open));
      };
      sync();
      new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function initAsideState() {
    // 主题切换目录后同步预置类,保持与首屏布局一致
    document.addEventListener('click', e => {
      if (!e.target.closest('.page-aside-toggle')) return;
      setTimeout(() => {
        const container = document.querySelector('.post-page-container');
        document.documentElement.classList.toggle('aside-open', !!container && container.classList.contains('show-toc'));
      }, 0);
    });
  }

  function initLive2DRuntime() {
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
      // 页脚的“触底”判定需要当前真实高度:缓存可能因为滚动条/字体/图片
      // 变化差 20px,差一点就会让 at-bottom 不触发。这里读一次真实值,
      // 读取发生在滚动 rAF 里,布局已经是干净的,成本很低。
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

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
  function initHeadingAnchors() {
    document.querySelectorAll('.article-content h2[id], .article-content h3[id], .article-content h4[id]').forEach(heading => {
      if (heading.querySelector(':scope > .heading-anchor')) return;
      const anchor = document.createElement('a');
      anchor.className = 'heading-anchor';
      anchor.href = '#' + heading.id;
      anchor.title = '复制本节链接';
      anchor.setAttribute('aria-label', '复制本节链接');
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
  // Odometer — 等字体加载完成再初始化
  // odometer 在 DOMContentLoaded 自动初始化时,4 套 Google 字体
  // 尚未就绪,数字度量错误导致 ribbon 高度塌陷为 0——静止时数字
  // 被裁剪不可见,仅滚动瞬间露出。这里阻止自动初始化,等
  // document.fonts.ready 后再手动初始化,滚动效果正常且数字可见。
  // ============================
  function initOdometer() {
    if (!window.Odometer) return;
    // 阻止库的 DOMContentLoaded 自动初始化(它在 ready 时检查 options.auto)
    window.Odometer.options.auto = false;
    // 只在首屏初始化;换页后的页脚由主题 runtime 直接写文本,避免重复动画长任务
    if (window.__odometerReady) return;
    window.__odometerReady = true;

    const start = () => {
      document.querySelectorAll('.odometer').forEach(el => {
        if (el.odometer) return;
        try {
          new window.Odometer({ el, format: '( ddd).dd', duration: 200 });
        } catch (e) {}
      });
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setTimeout(start, 50));
    } else {
      setTimeout(start, 500);
    }
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
    li.className = 'copy-link-btn';
    li.title = '复制文章链接';
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-label', '复制文章链接');
    li.innerHTML = '<i class="fa-solid fa-link" aria-hidden="true"></i>';
    li.addEventListener('click', copy);
    li.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        copy();
      }
    });
    list.appendChild(li);
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    ta.remove();
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
          img.src = url;
          img.style.display = '';
        });
        document.querySelectorAll('.home-banner-background').forEach(div => {
          div.style.backgroundImage = 'url(' + url + ')';
        });
      }
    } else {
      // 自动模式:还原配置默认 banner(亮色=太空城市,暗色=赛博雨夜)
      document.querySelectorAll('.home-banner-background img').forEach(img => {
        const isDarkImg = img.classList.contains('dark:block');
        img.src = isDarkImg
          ? '/images/banner-dark.webp'
          : '/images/banner-light.webp';
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
    const loaded = {};
    Object.values(SEASON_BANNERS).forEach(url => {
      if (loaded[url]) return;
      loaded[url] = true;
      const img = new Image();
      img.src = url;
    });
  }

  function initSeason() {
    applySeason(effectiveSeason());
  }

  // ============================
  // Theme switcher — 导航栏季节下拉 + 手电筒 + 秒表(移植自旧版)
  // ============================
  function initThemeSwitcher() {
    const navbar = document.querySelector('.navbar-content');
    if (!navbar || navbar.querySelector('.nb-controls')) return;

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
    document.addEventListener('click', () => setDropdown(false));

    // 秒表
    const timerPanel = controls.querySelector('.nb-timer-panel');
    const timerTime = controls.querySelector('#nbTimerTime');
    const startBtn = controls.querySelector('#nbStart');
    const pauseBtn = controls.querySelector('#nbPause');
    const resetBtn = controls.querySelector('#nbReset');
    let seconds = 0, interval = null;

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
      interval = setInterval(() => { seconds++; timerTime.textContent = fmt(seconds); }, 1000);
      startBtn.style.display = 'none'; pauseBtn.style.display = '';
    });
    pauseBtn.addEventListener('click', () => {
      clearInterval(interval);
      startBtn.style.display = ''; pauseBtn.style.display = 'none';
    });
    resetBtn.addEventListener('click', () => {
      clearInterval(interval); seconds = 0;
      timerTime.textContent = '00:00:00';
      startBtn.style.display = ''; pauseBtn.style.display = 'none';
    });
    document.addEventListener('click', e => {
      if (!timerPanel.contains(e.target) && !e.target.closest('.nb-timer-btn')) {
        timerPanel.classList.remove('show');
        controls.querySelector('.nb-timer-btn').setAttribute('aria-expanded', 'false');
      }
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
    const targets = document.querySelectorAll(
      '.article-content h2, .article-content h3, .article-content h4, ' +
      '.article-content p img, .article-content blockquote, .article-content pre, ' +
      '.article-content table, .related-post-item, .project-card, ' +
      '.friends-link-container .group, .page-template-content h2, .page-template-content h3'
    );
    if (targets.length === 0) return;

    targets.forEach(el => {
      if (el.dataset.reveal) return;
      el.dataset.reveal = '1';
      // 首屏内已经可见的元素直接显示,不要再等 0.3s 入场——
      // 否则进文章页时标题/首段会先空白一下,观感像“慢半拍”。
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('reveal', 'reveal-visible');
      } else {
        el.classList.add('reveal');
      }
    });

    if (window.__cjRevealObserver) window.__cjRevealObserver.disconnect();
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('reveal-visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -36px 0px' });

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
      const suffix = btn.closest('.post-page-stats') ? ' 个赞' : '';
      btn.innerHTML = '<i class="' + iconClass + '"></i> ' + likes + suffix;
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
  function initPostStats() {
    const postTitle = document.querySelector('.article-title');
    if (!postTitle || document.querySelector('.post-page-stats')) return;
    const path = window.location.pathname;

    const viewKey = 'views_' + path;
    const views = parseInt(localStorage.getItem(viewKey) || '0') + 1;
    localStorage.setItem(viewKey, views);

    const likeKey = 'likes_' + path;
    const likes = parseInt(localStorage.getItem(likeKey) || '0');
    const isLiked = localStorage.getItem('liked_' + path) === 'true';

    const statsDiv = document.createElement('div');
    statsDiv.className = 'article-stats post-page-stats';
    statsDiv.innerHTML =
      '<span class="stat-item"><i class="fa-regular fa-eye"></i> ' + views + ' 次阅读</span>' +
      '<button class="like-btn ' + (isLiked ? 'liked' : '') + '" data-href="' + path + '">' +
      '<i class="fa-' + (isLiked ? 'solid' : 'regular') + ' fa-heart"></i> ' + likes + ' 个赞</button>';

    const metaInfo = document.querySelector('.article-header .meta-info') || document.querySelector('.article-header-meta-info .meta-info');
    if (metaInfo) {
      metaInfo.parentNode.insertBefore(statsDiv, metaInfo.nextSibling);
    } else {
      postTitle.parentNode.insertBefore(statsDiv, postTitle.nextSibling);
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
            return `<a class="related-post-item" href="${p.path}" title="${p.title}">
              <div class="related-post-cover" style="background-image:url('${cover}')"></div>
              <div class="related-post-info">
                <div class="related-post-title">${esc(p.title)}</div>
                <div class="related-post-meta"><span>${esc(p.categories[0] || '')}</span>${p.date ? ' · ' + p.date : ''}</div>
              </div>
            </a>`;
          }).join('')}
        </div>`;
      content.after(wrapper);
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
    // 全局监听在整个会话只注册一次(脚本每次换页都会重新执行)
    onceGlobal('smoothScroll', initSmoothScroll);
    onceGlobal('keyboard', initKeyboardShortcuts);
    initExternalLinks();
    onceGlobal('readingProgress', initReadingProgress);
    onceGlobal('readingResume', initReadingResume);
    onceGlobal('scrollHeightCache', initScrollHeightCache);
    onceGlobal('postSidebar', initPostSidebar);
    initGithubProjects();
    initCopyLink();
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
      }, 60);
    });
    onceGlobal('themeToggle', initThemeToggle);
    onceGlobal('live2dRuntime', initLive2DRuntime);
    onceGlobal('asideState', initAsideState);
    onceGlobal('navA11y', initNavA11y);
    onceGlobal('searchFocus', initSearchFocus);
    onceGlobal('swupNavPause', initSwupNavPause);
    initMouseFollower();
    initArticleStats();
    initPostStats();
    onceGlobal('like', initLikeHandler);
    initOdometer();
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
    const dur = 620;  // 与 ericterminal 一致
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
    if (typeof document.startViewTransition === 'function') {
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

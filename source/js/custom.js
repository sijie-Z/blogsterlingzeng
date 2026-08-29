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

  // swup 单页模式下 init() 会重复执行:文档级/全局监听只需注册一次
  function once(fn) {
    let done = false;
    return function() {
      if (done) return;
      done = true;
      return fn.apply(this, arguments);
    };
  }

  // ============================
  // Smooth scroll for anchor links
  // ============================
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const target = document.getElementById(targetId.slice(1));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  // ============================
  // Table of Contents active state
  // ============================
  function initTocHighlight() {
    const tocLinks = document.querySelectorAll('.post-toc .nav-link');
    if (tocLinks.length === 0) return;

    const headings = [];
    tocLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const heading = document.getElementById(href.slice(1));
        if (heading) {
          headings.push({ element: heading, link: link });
        }
      }
    });

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const item = headings.find(h => h.element === entry.target);
          if (item) {
            if (entry.isIntersecting) {
              tocLinks.forEach(l => l.classList.remove('active'));
              item.link.classList.add('active');
            }
          }
        });
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    headings.forEach(h => observer.observe(h.element));
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

      // Escape: Close modals
      if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => modal.classList.remove('active'));
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
      }
    });
  }

  // ============================
  // Reading progress bar
  // ============================
  function initReadingProgress() {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // swup 换页后进度条元素会被替换,每次取最新的
          const progressBar = document.querySelector('.scroll-progress-bar');
          if (!progressBar) {
            ticking = false;
            return;
          }
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress = (scrollTop / docHeight) * 100;
          progressBar.style.width = `${progress}%`;

          // Dynamic Island 导航栏:滚动 >60px 收缩成胶囊
          const navbar = document.querySelector('.navbar-container');
          if (navbar) {
            navbar.classList.toggle('scrolled', scrollTop > 60);
          }

          // Dynamic Island 页脚:滚到底展开全宽(猫吉祥物跟随上移)
          const footer = document.querySelector('footer.footer');
          if (footer) {
            const atBottom = (scrollTop + window.innerHeight) >= (document.documentElement.scrollHeight - 4);
            footer.classList.toggle('at-bottom', atBottom);
          }

          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ============================
  // Copy link button (article post-tools)
  // ============================
  function showToast(msg) {
    const old = document.querySelector('.custom-toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
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

    const li = document.createElement('li');
    li.className = 'copy-link-btn';
    li.title = '复制文章链接';
    li.innerHTML = '<i class="fa-solid fa-link"></i>';
    li.addEventListener('click', () => {
      const url = window.location.href;
      const done = () => showToast('链接已复制');
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
      } else {
        fallbackCopy(url, done);
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
  const SEASON_ICONS = { spring: '🌸', summer: '🌻', autumn: '🍂', winter: '❄️' };
  const SEASON_NAMES = { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' };
  const SEASON_BANNERS = {
    spring: '/images/banner-spring.jpg',
    summer: '/images/banner-summer.jpg',
    autumn: '/images/banner-autumn.jpg',
    winter: '/images/banner-winter.jpg',
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
      // 季节 banner:换 img src(保留 hidden/dark 类,亮暗各显示自己的 img,
      // 内容都是季节图;类保留以便切回自动时能正确还原)
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
        img.src = isDarkImg ? '/images/banner-dark.jpg' : '/images/banner-light.jpg';
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

  // 预加载全部季节 banner,避免手动切换时闪烁(旧版 initDynamicBanners)
  function preloadSeasonBanners() {
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
    // 页面加载后延迟预加载,不抢占首屏
    setTimeout(preloadSeasonBanners, 2000);
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
      <button class="nb-theme-btn" title="切换季节主题">${current === 'auto' ? '🍀' : SEASON_ICONS[current]}</button>
      <div class="nb-dropdown">
        <button class="nb-opt${current === 'auto' ? ' active' : ''}" data-season="auto"><span>🍀</span><span>自动(浅色)</span></button>
        ${Object.keys(SEASON_ICONS).map(s =>
          `<button class="nb-opt${current === s ? ' active' : ''}" data-season="${s}"><span>${SEASON_ICONS[s]}</span><span>${SEASON_NAMES[s]}</span></button>`
        ).join('')}
        <div class="nb-div"></div>
        <button class="nb-opt flashlight-opt"><span>🔦</span><span>管中窥豹</span></button>
      </div>
      <button class="nb-timer-btn" title="计时器">⏱</button>
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
    controls.querySelector('.nb-theme-btn').addEventListener('click', e => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });
    controls.querySelectorAll('.nb-opt').forEach(opt => {
      opt.addEventListener('click', e => {
        e.stopPropagation();
        if (opt.classList.contains('flashlight-opt')) {
          toggleFlashlight();
          dropdown.classList.remove('show');
          return;
        }
        localStorage.setItem('blog-season', opt.dataset.season);
        applySeason(opt.dataset.season);
        dropdown.classList.remove('show');
      });
    });
    document.addEventListener('click', () => dropdown.classList.remove('show'));

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
      timerPanel.classList.toggle('show');
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
      if (!timerPanel.contains(e.target) && !e.target.closest('.nb-timer-btn')) timerPanel.classList.remove('show');
    });
  }

  // ============================
  // Flashlight — 管中窥豹
  // ============================
  let flashlightHandler = null;

  function toggleFlashlight() {
    const body = document.body;
    if (body.classList.contains('flashlight-mode')) {
      body.classList.remove('flashlight-mode');
      const el = document.querySelector('.flashlight-overlay');
      if (el) el.remove();
      // 移除监听,避免 swup/反复开关后 handler 累积
      if (flashlightHandler) {
        document.removeEventListener('mousemove', flashlightHandler);
        flashlightHandler = null;
      }
      localStorage.setItem('blog-flashlight', 'false');
    } else {
      body.classList.add('flashlight-mode');
      const el = document.createElement('div');
      el.className = 'flashlight-overlay';
      document.body.appendChild(el);
      flashlightHandler = function(e) {
        el.style.setProperty('--fx', e.clientX + 'px');
        el.style.setProperty('--fy', e.clientY + 'px');
      };
      document.addEventListener('mousemove', flashlightHandler);
      localStorage.setItem('blog-flashlight', 'true');
      showToast('管中窥豹已开启 — 再点 🍀 按钮退出');
    }
    document.querySelectorAll('.flashlight-opt').forEach(el => {
      el.classList.toggle('active', body.classList.contains('flashlight-mode'));
    });
  }

  // ============================
  // Footer mascot — 猫吉祥物
  // ============================
  function initFooterMascot() {
    if (document.querySelector('.footer-mascot')) return;
    const mascot = document.createElement('div');
    mascot.className = 'footer-mascot';
    mascot.innerHTML = '🐱';
    mascot.title = '喵~';
    mascot.addEventListener('click', () => {
      const phrases = ['喵~ 🐱', 'Meow! ✨', 'にゃん~ 🌟', '喵呜~ 💫', 'Meow~ 🎵', 'にゃ〜 🌸'];
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      mascot.innerHTML = phrase;
      setTimeout(() => { mascot.innerHTML = '🐱'; }, 1500);
    });
    document.body.appendChild(mascot);

    const footer = document.querySelector('footer.footer');
    if (footer) {
      const observer = new MutationObserver(() => {
        mascot.style.bottom = footer.classList.contains('at-bottom') ? '42px' : '10px';
      });
      observer.observe(footer, { attributes: true, attributeFilter: ['class'] });
    }
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

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    (function animate() {
      followerX += (mouseX - followerX) * 0.06;
      followerY += (mouseY - followerY) * 0.06;
      const scaleX = (mouseX > lastX + 2) ? -1 : 1;
      lastX = mouseX;
      follower.style.transform = 'translate(' + (followerX - 16) + 'px, ' + (followerY - 16) + 'px) scaleX(' + scaleX + ')';
      requestAnimationFrame(animate);
    })();
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
      const suffix = btn.classList.contains('post-page-stats') ? ' 个赞' : '';
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
  // swup 页面切换会重新执行 init(),以下监听只需注册一次
  const initKeyboardShortcutsOnce = once(initKeyboardShortcuts);
  const initReadingProgressOnce = once(initReadingProgress);
  const initLikeHandlerOnce = once(initLikeHandler);

  function init() {
    initSmoothScroll();
    initTocHighlight();
    initKeyboardShortcutsOnce();
    initExternalLinks();
    initReadingProgressOnce();
    initGithubProjects();
    initCopyLink();
    initRelatedPosts();
    initSeason();
    initThemeSwitcher();
    initFooterMascot();
    initMouseFollower();
    initArticleStats();
    initPostStats();
    initLikeHandlerOnce();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-run on swup page transition (if using single page mode)
  if (typeof swup !== 'undefined') {
    swup.on('contentReplaced', init);
  }
})();

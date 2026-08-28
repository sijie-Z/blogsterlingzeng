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
    const tocLinks = document.querySelectorAll('.toc-link');
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
        const searchBtn = document.querySelector('.search-btn');
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
    const progressBar = document.querySelector('.reading-progress-bar');
    if (!progressBar) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress = (scrollTop / docHeight) * 100;
          progressBar.style.width = `${progress}%`;
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
    const content = document.querySelector('.post-content');
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
    initSmoothScroll();
    initTocHighlight();
    initKeyboardShortcuts();
    initExternalLinks();
    initReadingProgress();
    initGithubProjects();
    initCopyLink();
    initRelatedPosts();
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

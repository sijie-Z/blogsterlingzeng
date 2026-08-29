/**
 * Sterling's Blog — Custom Features
 * Timer, Animals, Mouse Follower, Article Stats, Dynamic Banners
 */

(function() {
  'use strict';

  // ========================================
  // SMOOTH SCROLL
  // ========================================
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        var targetId = this.getAttribute('href');
        if (targetId === '#') return;
        var target = document.getElementById(targetId.slice(1));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ========================================
  // TOC HIGHLIGHT
  // ========================================
  function initTocHighlight() {
    var tocLinks = document.querySelectorAll('.toc-link');
    if (tocLinks.length === 0) return;
    var headings = [];
    tocLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        var heading = document.getElementById(href.slice(1));
        if (heading) headings.push({ element: heading, link: link });
      }
    });
    if (headings.length === 0) return;
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var item = headings.find(function(h) { return h.element === entry.target; });
        if (item && entry.isIntersecting) {
          tocLinks.forEach(function(l) { l.classList.remove('active'); });
          item.link.classList.add('active');
        }
      });
    }, { rootMargin: '-80px 0px -80% 0px' });
    headings.forEach(function(h) { observer.observe(h.element); });
  }

  // ========================================
  // KEYBOARD SHORTCUTS
  // ========================================
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        var searchBtn = document.querySelector('.search-btn');
        if (searchBtn) searchBtn.click();
      }
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(function(m) { m.classList.remove('active'); });
      }
    });
  }

  // ========================================
  // EXTERNAL LINKS
  // ========================================
  function initExternalLinks() {
    document.querySelectorAll('a[href^="http"]').forEach(function(link) {
      if (link.hostname !== window.location.hostname) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  // ========================================
  // READING PROGRESS + NAVBAR + FOOTER SCROLL DETECTION
  // ========================================
  function initReadingProgress() {
    var progressBar = document.querySelector('.reading-progress-bar');
    var navbar = document.querySelector('.navbar-container');
    var footer = document.querySelector('footer.footer');
    var ticking = false;
    window.addEventListener('scroll', function() {
      if (!ticking) {
        requestAnimationFrame(function() {
          var scrollTop = window.scrollY;
          var docHeight = document.documentElement.scrollHeight - window.innerHeight;
          var progress = (scrollTop / docHeight) * 100;
          if (progressBar) progressBar.style.width = progress + '%';

          // Navbar: Dynamic Island collapse on scroll
          if (navbar) {
            if (scrollTop > 60) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
          }

          // Footer: expand to full-width when scrolled to very bottom
          if (footer) {
            var atBottom = (scrollTop + window.innerHeight) >= (document.documentElement.scrollHeight - 4);
            if (atBottom) footer.classList.add('at-bottom');
            else footer.classList.remove('at-bottom');
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ========================================
  // TIMER / STOPWATCH
  // ========================================
  function initTimer() {
    var widget = document.createElement('div');
    widget.className = 'timer-widget';
    widget.innerHTML =
      '<div class="timer-display" id="timerDisplay">' +
        '<div class="timer-time" id="timerTime">00:00:00</div>' +
        '<div class="timer-controls">' +
          '<button id="timerStart">开始</button>' +
          '<button id="timerPause" style="display:none">暂停</button>' +
          '<button id="timerReset">重置</button>' +
        '</div>' +
      '</div>' +
      '<button class="timer-btn" id="timerBtn" title="秒表计时器">⏱️</button>';
    document.body.appendChild(widget);

    var seconds = 0, interval = null, running = false;
    var display = widget.querySelector('#timerTime');
    var startBtn = widget.querySelector('#timerStart');
    var pauseBtn = widget.querySelector('#timerPause');
    var resetBtn = widget.querySelector('#timerReset');
    var timerBtn = widget.querySelector('#timerBtn');
    var timerPanel = widget.querySelector('#timerDisplay');

    function formatTime(s) {
      var h = String(Math.floor(s / 3600)).padStart(2, '0');
      var m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      var sec = String(s % 60).padStart(2, '0');
      return h + ':' + m + ':' + sec;
    }

    function updateDisplay() { display.textContent = formatTime(seconds); }

    startBtn.onclick = function() {
      if (!running) {
        running = true;
        interval = setInterval(function() { seconds++; updateDisplay(); }, 1000);
        startBtn.style.display = 'none';
        pauseBtn.style.display = '';
      }
    };
    pauseBtn.onclick = function() {
      running = false;
      clearInterval(interval);
      startBtn.style.display = '';
      pauseBtn.style.display = 'none';
    };
    resetBtn.onclick = function() {
      running = false;
      clearInterval(interval);
      seconds = 0;
      updateDisplay();
      startBtn.style.display = '';
      pauseBtn.style.display = 'none';
    };
    timerBtn.onclick = function(e) {
      e.stopPropagation();
      timerPanel.classList.toggle('show');
    };
    document.addEventListener('click', function(e) {
      if (!widget.contains(e.target)) timerPanel.classList.remove('show');
    });
  }

  // ========================================
  // FOOTER MASCOT — Cat on the status bar
  // ========================================
  function initFooterMascot() {
    var mascot = document.createElement('div');
    mascot.className = 'footer-mascot';
    mascot.innerHTML = '🐱';
    mascot.title = '喵~';
    mascot.addEventListener('click', function() {
      var phrases = ['喵~ 🐱', 'Meow! ✨', 'にゃん~ 🌟', '喵呜~ 💫', 'Meow~ 🎵', 'にゃ〜 🌸'];
      var phrase = phrases[Math.floor(Math.random() * phrases.length)];
      mascot.innerHTML = phrase;
      setTimeout(function() { mascot.innerHTML = '🐱'; }, 1500);
    });
    document.body.appendChild(mascot);

    // Move mascot with footer when it expands
    var footer = document.querySelector('footer.footer');
    if (footer) {
      var observer = new MutationObserver(function() {
        if (footer.classList.contains('at-bottom')) {
          mascot.style.bottom = '42px';
        } else {
          mascot.style.bottom = '10px';
        }
      });
      observer.observe(footer, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // ========================================
  // MOUSE FOLLOWER
  // ========================================
  function initMouseFollower() {
    if ('ontouchstart' in window) return;
    var follower = document.createElement('div');
    follower.className = 'mouse-follower';
    document.body.appendChild(follower);

    var mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
    var followerX = mouseX, followerY = mouseY;
    var lastX = mouseX;

    document.addEventListener('mousemove', function(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animate() {
      followerX += (mouseX - followerX) * 0.06;
      followerY += (mouseY - followerY) * 0.06;
      var scaleX = (mouseX > lastX + 2) ? -1 : 1;
      lastX = mouseX;
      follower.style.transform = 'translate(' + (followerX - 16) + 'px, ' + (followerY - 16) + 'px) scaleX(' + scaleX + ')';
      requestAnimationFrame(animate);
    }
    animate();
  }

  // ========================================
  // ARTICLE STATS
  // ========================================
  function initArticleStats() {
    document.querySelectorAll('.home-article-item').forEach(function(card) {
      var titleEl = card.querySelector('.home-article-title a');
      if (!titleEl) return;
      var href = titleEl.getAttribute('href');
      if (!href) return;

      var viewKey = 'views_' + href;
      var views = parseInt(localStorage.getItem(viewKey) || '0');
      var likeKey = 'likes_' + href;
      var likes = parseInt(localStorage.getItem(likeKey) || '0');
      var isLiked = localStorage.getItem('liked_' + href) === 'true';

      var statsDiv = document.createElement('div');
      statsDiv.className = 'article-stats';
      statsDiv.innerHTML =
        '<span class="stat-item"><i class="fa-regular fa-eye"></i> ' + views + '</span>' +
        '<button class="like-btn ' + (isLiked ? 'liked' : '') + '" data-href="' + href + '">' +
        '<i class="fa-' + (isLiked ? 'solid' : 'regular') + ' fa-heart"></i> ' + likes + '</button>';

      var metaContainer = card.querySelector('.home-article-meta-info-container');
      if (metaContainer) metaContainer.appendChild(statsDiv);
    });
  }

  // ========================================
  // POST PAGE STATS
  // ========================================
  function initPostStats() {
    var postTitle = document.querySelector('.article-title');
    if (!postTitle) return;
    var path = window.location.pathname;
    var viewKey = 'views_' + path;
    var views = parseInt(localStorage.getItem(viewKey) || '0');
    views++;
    localStorage.setItem(viewKey, views);

    var likeKey = 'likes_' + path;
    var likes = parseInt(localStorage.getItem(likeKey) || '0');
    var isLiked = localStorage.getItem('liked_' + path) === 'true';

    var statsDiv = document.createElement('div');
    statsDiv.className = 'article-stats post-page-stats';
    statsDiv.innerHTML =
      '<span class="stat-item"><i class="fa-regular fa-eye"></i> ' + views + ' 次阅读</span>' +
      '<button class="like-btn ' + (isLiked ? 'liked' : '') + '" data-href="' + path + '">' +
      '<i class="fa-' + (isLiked ? 'solid' : 'regular') + ' fa-heart"></i> ' + likes + ' 个赞</button>';

    var metaInfo = document.querySelector('.article-header .meta-info') || document.querySelector('.article-header-meta-info .meta-info');
    if (metaInfo) {
      metaInfo.parentNode.insertBefore(statsDiv, metaInfo.nextSibling);
    } else {
      postTitle.parentNode.insertBefore(statsDiv, postTitle.nextSibling);
    }
  }

  // ========================================
  // LIKE BUTTON HANDLER
  // ========================================
  function initLikeHandler() {
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.like-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      var href = btn.dataset.href;
      var likeKey = 'likes_' + href;
      var likedKey = 'liked_' + href;
      var likes = parseInt(localStorage.getItem(likeKey) || '0');
      var isLiked = localStorage.getItem(likedKey) === 'true';

      if (isLiked) {
        likes--;
        localStorage.removeItem(likedKey);
        btn.classList.remove('liked');
      } else {
        likes++;
        localStorage.setItem(likedKey, 'true');
        btn.classList.add('liked');
      }
      localStorage.setItem(likeKey, likes);
      var iconClass = 'fa-' + (isLiked ? 'regular' : 'solid') + ' fa-heart';
      btn.innerHTML = '<i class="' + iconClass + '"></i> ' + likes;
    });
  }

  // ========================================
  // DYNAMIC BANNER PER THEME — swap <img> src
  // ========================================
  function initDynamicBanners() {
    var banners = {
      light: '/images/futuristic-space-city-station-live-wallpaper.png',
      dark: '/images/cyberpunk-japan-cozy-rainy-night-city-live-wallpaper.png',
      spring: '/images/spring-lofi-live-wallpaper.png',
      summer: '/images/lonely-cat-chill-live-wallpaper.png',
      autumn: '/images/autumn-stone-bridge-live-wallpaper.png',
      winter: '/images/snowy-night-lofi-city-live-wallpaper.png'
    };

    function updateBanner() {
      var body = document.body;
      var theme = 'light';
      ['light', 'dark', 'spring', 'summer', 'autumn', 'winter'].forEach(function(t) {
        if (body.classList.contains('theme-' + t)) theme = t;
      });
      var url = banners[theme] || banners.light;

      // Swap all banner <img> elements to show the right image
      document.querySelectorAll('.home-banner-background img').forEach(function(img) {
        img.src = url;
        img.classList.remove('hidden', 'dark:hidden', 'dark:block');
        img.style.display = '';
      });

      // Also set as background-image on the container for CSS-based theming
      document.querySelectorAll('.home-banner-background').forEach(function(div) {
        div.style.backgroundImage = 'url(' + url + ')';
      });
    }

    var observer = new MutationObserver(function() { updateBanner(); });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    setTimeout(updateBanner, 300);

    // Preload next image in background to avoid flicker
    var preloadLink = document.createElement('link');
    preloadLink.rel = 'prefetch';
    preloadLink.as = 'image';
    document.head.appendChild(preloadLink);
    var loaded = {};
    function preload(url) {
      if (loaded[url]) return;
      loaded[url] = true;
      var img = new Image();
      img.src = url;
    }
    // Preload all banners after page load
    setTimeout(function() {
      Object.values(banners).forEach(preload);
    }, 2000);
  }

  // ========================================
  // INIT
  // ========================================
  function init() {
    initSmoothScroll();
    initTocHighlight();
    initKeyboardShortcuts();
    initExternalLinks();
    initReadingProgress();
    initTimer();
    initFooterMascot();
    initMouseFollower();
    initArticleStats();
    initPostStats();
    initLikeHandler();
    setTimeout(initDynamicBanners, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if (typeof swup !== 'undefined') {
    swup.on('contentReplaced', init);
  }
})();

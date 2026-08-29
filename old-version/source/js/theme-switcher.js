/**
 * Theme Switcher — Inside navbar, smooth transitions
 */
(function() {
  'use strict';

  var THEMES = ['light', 'dark', 'spring', 'summer', 'autumn', 'winter'];
  var THEME_ICONS = { light: '☀️', dark: '🌙', spring: '🌸', summer: '🌻', autumn: '🍂', winter: '❄️' };
  var THEME_NAMES = { light: '明亮', dark: '暗黑', spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' };

  function getSavedTheme() {
    var saved = localStorage.getItem('blog-theme');
    if (saved && THEMES.indexOf(saved) !== -1) return saved;
    return 'light';
  }

  // Inject a <style> element that overrides Redefine's compiled theme variables
  var injectedStyle = null;
  function injectThemeStyle(css) {
    if (!injectedStyle) {
      injectedStyle = document.createElement('style');
      injectedStyle.id = 'theme-override';
      document.head.appendChild(injectedStyle);
    }
    injectedStyle.textContent = css;
  }

  // Theme color palettes — each visually distinct
  var PALETTE = {
    light:  { bg:'#ffffff', text:'#0f172a', text2:'#475569', text3:'#94a3b8', primary:'#2563eb', accent:'#6366f1', border:'rgba(148,163,184,0.15)', bg2:'#f8fafc', bg3:'#f1f5f9', sh1:'rgba(0,0,0,0.02)', sh2:'rgba(0,0,0,0.04)' },
    dark:   { bg:'#090d1a', text:'#e2e8f0', text2:'#94a3b8', text3:'#64748b', primary:'#8b5cf6', accent:'#a78bfa', border:'rgba(71,85,105,0.22)', bg2:'#131a2e', bg3:'#1a2340', sh1:'rgba(0,0,0,0.12)', sh2:'rgba(0,0,0,0.20)' },
    spring: { bg:'#f2fdf5', text:'#0d3b1e', text2:'#2d6a3f', text3:'#6ba07a', primary:'#16a34a', accent:'#65a30d', border:'rgba(22,163,74,0.14)', bg2:'#e6f7eb', bg3:'#d1f0da', sh1:'rgba(0,0,0,0.02)', sh2:'rgba(0,0,0,0.04)' },
    summer: { bg:'#fff9f2', text:'#7c2d12', text2:'#b8451a', text3:'#d4957a', primary:'#ea580c', accent:'#f59e0b', border:'rgba(234,88,12,0.14)', bg2:'#fff7ed', bg3:'#ffedd5', sh1:'rgba(0,0,0,0.02)', sh2:'rgba(0,0,0,0.04)' },
    autumn: { bg:'#fff8f0', text:'#5c1a07', text2:'#9a3412', text3:'#c2785a', primary:'#c2410c', accent:'#dc2626', border:'rgba(194,65,12,0.14)', bg2:'#fef3e7', bg3:'#fde8d5', sh1:'rgba(0,0,0,0.02)', sh2:'rgba(0,0,0,0.04)' },
    winter: { bg:'#f0f4f8', text:'#1a2a3e', text2:'#445a74', text3:'#8899b4', primary:'#0ea5e9', accent:'#38bdf8', border:'rgba(14,165,233,0.14)', bg2:'#e8eef4', bg3:'#dce3ed', sh1:'rgba(0,0,0,0.03)', sh2:'rgba(0,0,0,0.06)' }
  };

  function applyTheme(theme) {
    var body = document.body;
    var html = document.documentElement;
    body.classList.add('theme-transitioning');
    THEMES.forEach(function(t) { body.classList.remove('theme-' + t); });
    body.classList.add('theme-' + theme);
    localStorage.setItem('blog-theme', theme);

    // Toggle Redefine's .dark class (on <html>) + my .dark-mode (on body)
    var isDark = theme === 'dark';
    if (isDark) { html.classList.add('dark'); body.classList.add('dark-mode'); }
    else { html.classList.remove('dark'); body.classList.remove('dark-mode'); }

    // Inject CSS overrides for Redefine's compiled theme variables
    var p = PALETTE[theme];
    var css = 'body { ' +
      '--background-color: ' + p.bg + ' !important; ' +
      '--first-text-color: ' + p.text + ' !important; ' +
      '--second-text-color: ' + p.text2 + ' !important; ' +
      '--third-text-color: ' + p.text3 + ' !important; ' +
      '--default-text-color: ' + p.text + ' !important; ' +
      '--primary-color: ' + p.primary + ' !important; ' +
      '--border-color: ' + p.border + ' !important; ' +
      '--second-background-color: ' + p.bg2 + ' !important; ' +
      '--third-background-color: ' + p.bg3 + ' !important; ' +
      '--shadow-color-1: ' + p.sh1 + ' !important; ' +
      '--shadow-color-2: ' + p.sh2 + ' !important; ' +
      '}';
    injectThemeStyle(css);

    document.querySelectorAll('.nb-theme-btn').forEach(function(btn) {
      btn.textContent = THEME_ICONS[theme] || '☀️';
    });
    document.querySelectorAll('.nb-opt').forEach(function(el) {
      el.classList.toggle('active', el.dataset.theme === theme);
    });
    setTimeout(function() { body.classList.remove('theme-transitioning'); }, 600);
  }

  function initControls() {
    var navbar = document.querySelector('.navbar-content');
    if (!navbar || navbar.querySelector('.nb-controls')) return;

    var currentTheme = getSavedTheme();

    var controls = document.createElement('div');
    controls.className = 'nb-controls';
    controls.innerHTML =
      '<button class="nb-theme-btn" title="切换主题">' + THEME_ICONS[currentTheme] + '</button>' +
      '<div class="nb-dropdown">' +
        THEMES.map(function(t) {
          return '<button class="nb-opt' + (t === currentTheme ? ' active' : '') + '" data-theme="' + t + '">' +
            '<span>' + THEME_ICONS[t] + '</span><span>' + THEME_NAMES[t] + '</span></button>';
        }).join('') +
        '<div class="nb-div"></div>' +
        '<button class="nb-opt flashlight-opt" data-theme="flashlight">' +
          '<span>🔦</span><span>管中窥豹</span></button>' +
      '</div>' +
      '<button class="nb-timer-btn" title="计时器">⏱</button>' +
      '<div class="nb-timer-panel">' +
        '<div class="nb-timer-time" id="nbTimerTime">00:00:00</div>' +
        '<div class="nb-timer-btns">' +
          '<button id="nbStart">开始</button>' +
          '<button id="nbPause" style="display:none">暂停</button>' +
          '<button id="nbReset">重置</button>' +
        '</div>' +
      '</div>';

    navbar.appendChild(controls);

    // Theme dropdown
    var themeBtn = controls.querySelector('.nb-theme-btn');
    var dropdown = controls.querySelector('.nb-dropdown');
    themeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });

    controls.querySelectorAll('.nb-opt').forEach(function(opt) {
      opt.addEventListener('click', function(e) {
        e.stopPropagation();
        if (opt.dataset.theme === 'flashlight') { toggleFlashlight(); dropdown.classList.remove('show'); return; }
        applyTheme(opt.dataset.theme);
        dropdown.classList.remove('show');
      });
    });

    document.addEventListener('click', function() { dropdown.classList.remove('show'); });

    // Timer
    var timerBtn = controls.querySelector('.nb-timer-btn');
    var timerPanel = controls.querySelector('.nb-timer-panel');
    var timerTime = controls.querySelector('#nbTimerTime');
    var startBtn = controls.querySelector('#nbStart');
    var pauseBtn = controls.querySelector('#nbPause');
    var resetBtn = controls.querySelector('#nbReset');
    var seconds = 0, interval = null, running = false;

    function fmt(s) {
      return String(Math.floor(s/3600)).padStart(2,'0') + ':' +
             String(Math.floor((s%3600)/60)).padStart(2,'0') + ':' +
             String(s%60).padStart(2,'0');
    }

    timerBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      timerPanel.classList.toggle('show');
    });

    startBtn.addEventListener('click', function() {
      running = true;
      interval = setInterval(function() { seconds++; timerTime.textContent = fmt(seconds); }, 1000);
      startBtn.style.display = 'none'; pauseBtn.style.display = '';
    });
    pauseBtn.addEventListener('click', function() {
      running = false; clearInterval(interval);
      startBtn.style.display = ''; pauseBtn.style.display = 'none';
    });
    resetBtn.addEventListener('click', function() {
      running = false; clearInterval(interval); seconds = 0;
      timerTime.textContent = '00:00:00';
      startBtn.style.display = ''; pauseBtn.style.display = 'none';
    });
    document.addEventListener('click', function(e) {
      if (!timerPanel.contains(e.target) && e.target !== timerBtn) timerPanel.classList.remove('show');
    });

    applyTheme(currentTheme);
  }

  // Flashlight
  var flashlightEl = null, flashlightHandler = null;
  function toggleFlashlight() {
    var body = document.body;
    if (body.classList.contains('flashlight-mode')) {
      body.classList.remove('flashlight-mode');
      if (flashlightEl) { flashlightEl.remove(); flashlightEl = null; }
      if (flashlightHandler) { document.removeEventListener('mousemove', flashlightHandler); flashlightHandler = null; }
      localStorage.setItem('blog-flashlight', 'false');
    } else {
      body.classList.add('flashlight-mode');
      flashlightEl = document.createElement('div');
      flashlightEl.className = 'flashlight-overlay';
      document.body.appendChild(flashlightEl);
      flashlightHandler = function(e) {
        flashlightEl.style.setProperty('--fx', e.clientX + 'px');
        flashlightEl.style.setProperty('--fy', e.clientY + 'px');
      };
      document.addEventListener('mousemove', flashlightHandler);
      localStorage.setItem('blog-flashlight', 'true');
    }
    document.querySelectorAll('.flashlight-opt').forEach(function(el) {
      el.classList.toggle('active', body.classList.contains('flashlight-mode'));
    });
  }

  function safeInit() { initControls(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInit);
  } else { safeInit(); }
  if (typeof swup !== 'undefined') { swup.on('contentReplaced', safeInit); }
})();

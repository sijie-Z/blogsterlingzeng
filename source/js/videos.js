/* ========================================
   VIDEO LIBRARY — 播放、搜索、收藏与导入导出
   ======================================== */
(function () {
  'use strict';

  var DATA_URL = '/videos.json';
  var FAVORITES_KEY = 'cj-video-favorites-v1';
  var initialized = false;

  function readFavorites() {
    try {
      var raw = localStorage.getItem(FAVORITES_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.filter(function (id) { return typeof id === 'string' && id; }));
    } catch (e) {
      return new Set();
    }
  }

  function writeFavorites(favorites) {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
    } catch (e) {
      /* 隐私模式/存储禁用时收藏只在本次页面有效 */
    }
  }

  function init() {
    var root = document.getElementById('video-library');
    if (!root || root.dataset.videoReady === '1') return;
    root.dataset.videoReady = '1';

    var grid = document.getElementById('video-grid');
    var empty = document.getElementById('video-empty');
    var emptyTitle = empty ? empty.querySelector('p') : null;
    var emptyHint = empty ? empty.querySelectorAll('p')[1] : null;
    var status = document.getElementById('video-status');
    var search = document.getElementById('video-search');
    var categoriesBox = document.getElementById('video-categories');
    var statTotal = document.getElementById('video-stat-total');
    var statTopics = document.getElementById('video-stat-topics');
    var statFavorites = document.getElementById('video-stat-favorites');
    var sectionHead = root.querySelector('.video-section-head');
    var sectionTitle = document.getElementById('video-section-title');
    var sectionCount = document.getElementById('video-section-count');
    var exportButton = document.getElementById('video-export');
    var importInput = document.getElementById('video-import');
    var dialog = document.getElementById('video-dialog');
    var player = document.getElementById('video-player');
    var dialogTitle = document.getElementById('video-dialog-title');
    var dialogDesc = document.getElementById('video-dialog-desc');
    var dialogTags = document.getElementById('video-dialog-tags');
    var dialogFav = document.getElementById('video-dialog-fav');
    var dialogClose = document.getElementById('video-dialog-close');
    if (!grid || !empty || !status) return;

    var items = [];
    var topics = [];
    var favorites = readFavorites();
    var filter = 'all';
    var category = 'all';
    var query = '';
    var lastTrigger = null;
    var activeItem = null;
    var statusTimer = 0;

    function setStatus(message) {
      status.textContent = message || '';
      window.clearTimeout(statusTimer);
      if (message) {
        statusTimer = window.setTimeout(function () {
          status.textContent = '';
        }, 4200);
      }
    }

    function itemById(id) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === id) return items[i];
      }
      return null;
    }

    function categoryOf(item) {
      return item.topic || '未分类';
    }

    function categories() {
      return topics;
    }

    function matches(item) {
      if (filter === 'favorites' && !favorites.has(item.id)) return false;
      if (category !== 'all' && categoryOf(item) !== category) return false;
      if (!query) return true;
      var haystack = [item.title, item.description, categoryOf(item)].concat(item.tags || []).join(' ').toLowerCase();
      return haystack.indexOf(query) !== -1;
    }

    function makeTag(tag) {
      var el = document.createElement('span');
      el.className = 'video-tag';
      el.textContent = tag;
      return el;
    }

    function favoriteButton(item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'video-card-fav';
      button.dataset.fav = item.id;
      button.dataset.id = item.id;
      button.setAttribute('aria-pressed', favorites.has(item.id) ? 'true' : 'false');
      button.setAttribute('aria-label', (favorites.has(item.id) ? '取消收藏：' : '收藏：') + item.title);
      button.textContent = favorites.has(item.id) ? '★' : '☆';
      return button;
    }

    function renderCard(item) {
      var card = document.createElement('article');
      card.className = 'video-card';
      card.dataset.id = item.id;

      var open = document.createElement('button');
      open.type = 'button';
      open.className = 'video-card-open';
      open.dataset.open = item.id;
      open.setAttribute('aria-label', '播放：' + item.title);

      var cover = document.createElement('span');
      cover.className = 'video-card-cover';
      if (item.cover) {
        var img = document.createElement('img');
        img.src = item.cover;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        cover.appendChild(img);
      }
      var play = document.createElement('span');
      play.className = 'video-card-play';
      play.setAttribute('aria-hidden', 'true');
      cover.appendChild(play);
      if (item.duration) {
        var duration = document.createElement('span');
        duration.className = 'video-card-duration';
        duration.textContent = item.duration;
        cover.appendChild(duration);
      }

      var body = document.createElement('span');
      body.className = 'video-card-body';
      var categoryLabel = document.createElement('span');
      categoryLabel.className = 'video-card-category';
      categoryLabel.textContent = categoryOf(item);
      body.appendChild(categoryLabel);
      var title = document.createElement('span');
      title.className = 'video-card-title';
      title.textContent = item.title;
      body.appendChild(title);
      if (item.description) {
        var desc = document.createElement('span');
        desc.className = 'video-card-desc';
        desc.textContent = item.description;
        body.appendChild(desc);
      }
      if (item.tags && item.tags.length) {
        var tags = document.createElement('span');
        tags.className = 'video-card-tags';
        item.tags.forEach(function (tag) { tags.appendChild(makeTag(tag)); });
        body.appendChild(tags);
      }

      open.appendChild(cover);
      open.appendChild(body);
      card.appendChild(open);
      card.appendChild(favoriteButton(item));
      return card;
    }

    function renderCategories() {
      if (!categoriesBox) return;
      var names = categories();
      if (!items.length || !names.length) {
        categoriesBox.hidden = true;
        categoriesBox.replaceChildren();
        return;
      }
      if (category !== 'all' && names.indexOf(category) === -1) category = 'all';
      categoriesBox.hidden = false;
      categoriesBox.replaceChildren();

      function categoryButton(value, label) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'video-category';
        button.dataset.category = value;
        button.textContent = label;
        button.setAttribute('aria-pressed', category === value ? 'true' : 'false');
        if (category === value) button.classList.add('is-active');
        return button;
      }

      categoriesBox.appendChild(categoryButton('all', '全部话题'));
      names.forEach(function (name) {
        categoriesBox.appendChild(categoryButton(name, name));
      });
    }

    function render() {
      var visible = items.filter(matches);
      renderCategories();
      grid.replaceChildren();
      visible.forEach(function (item) {
        grid.appendChild(renderCard(item));
      });

      var hasItems = items.length > 0;
      var hasVisible = visible.length > 0;
      empty.hidden = hasVisible;
      if (sectionHead) sectionHead.hidden = !hasItems;
      if (statTotal) statTotal.textContent = String(items.length);
      if (statTopics) statTopics.textContent = String(topics.length);
      if (statFavorites) statFavorites.textContent = String(favorites.size);
      if (sectionTitle) {
        sectionTitle.textContent = filter === 'favorites'
          ? '我的收藏'
          : (category === 'all' ? '全部视频' : category);
      }
      if (sectionCount) sectionCount.textContent = String(visible.length) + ' 个';
      if (emptyTitle) {
        emptyTitle.textContent = hasItems ? '没有匹配的视频。' : '还没有视频。';
      }
      if (emptyHint) {
        emptyHint.hidden = hasItems;
      }
    }

    function refreshFavoriteButton(id) {
      var pressed = favorites.has(id);
      var cards = grid.querySelectorAll('.video-card-fav');
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].dataset.id !== id) continue;
        var title = (itemById(id) || {}).title || '';
        cards[i].setAttribute('aria-pressed', pressed ? 'true' : 'false');
        cards[i].setAttribute('aria-label', (pressed ? '取消收藏：' : '收藏：') + title);
        cards[i].textContent = pressed ? '★' : '☆';
      }
      if (activeItem && activeItem.id === id) {
        dialogFav.setAttribute('aria-pressed', pressed ? 'true' : 'false');
        dialogFav.querySelector('.video-fav-icon').textContent = pressed ? '★' : '☆';
        dialogFav.querySelector('.video-fav-label').textContent = pressed ? '已收藏' : '收藏';
      }
    }

    function toggleFavorite(id) {
      if (favorites.has(id)) {
        favorites.delete(id);
      } else {
        favorites.add(id);
      }
      writeFavorites(favorites);
      refreshFavoriteButton(id);
      if (statFavorites) statFavorites.textContent = String(favorites.size);
      if (filter === 'favorites') {
        render();
      }
    }

    function openDialog(item, trigger) {
      if (!dialog || !player || !item) return;
      activeItem = item;
      lastTrigger = trigger || null;
      dialogTitle.textContent = item.title;
      dialogDesc.textContent = item.description || '';
      dialogTags.replaceChildren();
      var categoryTag = makeTag(categoryOf(item));
      categoryTag.classList.add('video-tag-category');
      dialogTags.appendChild(categoryTag);
      (item.tags || []).forEach(function (tag) { dialogTags.appendChild(makeTag(tag)); });
      dialogFav.setAttribute('aria-pressed', favorites.has(item.id) ? 'true' : 'false');
      dialogFav.querySelector('.video-fav-icon').textContent = favorites.has(item.id) ? '★' : '☆';
      dialogFav.querySelector('.video-fav-label').textContent = favorites.has(item.id) ? '已收藏' : '收藏';
      player.poster = item.cover || '';
      player.src = item.src;
      dialog.showModal();
      var playPromise = player.play();
      if (playPromise && playPromise.catch) playPromise.catch(function () {});
    }

    function closeDialog() {
      if (!dialog || !dialog.open) return;
      dialog.close();
    }

    function resetPlayer() {
      player.pause();
      player.removeAttribute('src');
      player.removeAttribute('poster');
      player.load();
      activeItem = null;
      if (lastTrigger && lastTrigger.isConnected) {
        lastTrigger.focus();
      } else if (search) {
        search.focus();
      }
    }

    grid.addEventListener('click', function (event) {
      // 页面内容在 .markdown-body 里，主题的图片查看器会接管封面图点击；
      // 视频卡片自己处理播放，阻止它继续冒泡。
      event.stopPropagation();
      var fav = event.target.closest('.video-card-fav');
      if (fav) {
        event.preventDefault();
        toggleFavorite(fav.dataset.id);
        return;
      }
      var open = event.target.closest('.video-card-open');
      if (open) {
        var item = itemById(open.dataset.open);
        if (item) openDialog(item, open);
      }
    });

    if (dialog) {
      dialogClose.addEventListener('click', closeDialog);
      dialogFav.addEventListener('click', function () {
        if (activeItem) toggleFavorite(activeItem.id);
      });
      dialog.addEventListener('click', function (event) {
        if (event.target === dialog) closeDialog();
      });
      dialog.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeDialog();
        }
      });
      dialog.addEventListener('cancel', function (event) {
        event.preventDefault();
        closeDialog();
      });
      dialog.addEventListener('close', resetPlayer);
      player.addEventListener('error', function () {
        if (activeItem) setStatus('这个视频暂时无法播放，文件可能已被移除。');
      });
    }

    search.addEventListener('input', function () {
      query = search.value.trim().toLowerCase();
      render();
    });

    if (categoriesBox) {
      categoriesBox.addEventListener('click', function (event) {
        var button = event.target.closest('.video-category');
        if (!button) return;
        category = button.dataset.category || 'all';
        render();
      });
    }

    root.querySelectorAll('.video-filter').forEach(function (button) {
      button.addEventListener('click', function () {
        filter = button.dataset.filter === 'favorites' ? 'favorites' : 'all';
        root.querySelectorAll('.video-filter').forEach(function (other) {
          var active = other === button;
          other.classList.toggle('is-active', active);
          other.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        render();
      });
    });

    exportButton.addEventListener('click', function () {
      var payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        favorites: Array.from(favorites)
      };
      var blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'video-favorites.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
      setStatus('已导出 ' + favorites.size + ' 条收藏。');
    });

    importInput.addEventListener('change', function () {
      var file = importInput.files && importInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(String(reader.result || ''));
          var incoming = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.favorites) ? parsed.favorites : null);
          if (!incoming) throw new Error('invalid');
          var added = 0;
          incoming.forEach(function (id) {
            if (typeof id === 'string' && id && !favorites.has(id)) {
              favorites.add(id);
              added++;
            }
          });
          writeFavorites(favorites);
          render();
          setStatus(added ? '导入完成，新增 ' + added + ' 条收藏。' : '没有新的收藏可导入。');
        } catch (e) {
          setStatus('导入失败：请选择视频库导出的 JSON 文件。');
        }
        importInput.value = '';
      };
      reader.onerror = function () {
        setStatus('读取文件失败。');
        importInput.value = '';
      };
      reader.readAsText(file);
    });

    fetch(DATA_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (payload) {
        items = Array.isArray(payload && payload.items) ? payload.items : [];
        topics = Array.isArray(payload && payload.topics) ? payload.topics : [];
        render();
      })
      .catch(function () {
        items = [];
        render();
        setStatus('视频数据加载失败，请刷新重试。');
      });
  }

  if (!window.__cjVideoLibraryBound) {
    window.__cjVideoLibraryBound = true;
    window.addEventListener('redefine:page:refresh', init);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

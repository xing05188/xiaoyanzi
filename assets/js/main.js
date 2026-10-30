/* ============================================================
   燕语 · 交互
   无依赖，渐进增强。所有功能在 JS 关闭时都不影响阅读。
   ============================================================ */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };

  /* ---------------- 主题 ---------------- */
  var themeBtn = $('#themeToggle');
  var mql = window.matchMedia('(prefers-color-scheme: dark)');
  var THEME_COLOR = { light: '#edf5f5', dark: '#0d1a22', dawn: '#fdf1e7', dusk: '#f4e9e6' };

  function resolveTheme(mode) {
    if (!mode || mode === 'auto') return mql.matches ? 'dark' : 'light';
    return mode;
  }

  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    root.dataset.mode = mode;
    root.dataset.resolved = resolveTheme(mode);
    var m = doc.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', THEME_COLOR[root.dataset.resolved] || '#edf5f5');
    try {
      doc.dispatchEvent(new CustomEvent('yy:theme', { detail: root.dataset.resolved }));
    } catch (e) {}
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      if (window.YY && window.YY.openThemeMenu) {
        window.YY.openThemeMenu(themeBtn);
      } else {
        var next = root.dataset.resolved === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem('yy-theme', next); } catch (e) {}
        applyTheme(next);
      }
      themeBtn.animate
        ? themeBtn.animate(
            [{ transform: 'rotate(0deg) scale(1)' }, { transform: 'rotate(18deg) scale(.9)' }, { transform: 'rotate(0deg) scale(1)' }],
            { duration: 320, easing: 'cubic-bezier(.22,.61,.36,1)' }
          )
        : null;
    });

    var onChange = function () { if ((root.dataset.mode || 'auto') === 'auto') applyTheme('auto'); };
    mql.addEventListener ? mql.addEventListener('change', onChange) : mql.addListener(onChange);
  }

  /* ---------------- 页头吸顶 ---------------- */
  var header = $('#siteHeader');
  var toTop = $('#toTop');
  var lastY = 0;

  function onScrollHeader() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-stuck', y > 12);
    if (toTop) {
      if (y > 560) { toTop.hidden = false; } else { toTop.hidden = true; }
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------------- 移动端菜单 ---------------- */
  var menuBtn = $('#menuToggle');
  var nav = $('#siteNav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------- 导航：放不下的收进「更多」 ---------------- */
  var navMain = $('#navMain');
  var navMore = $('#navMore');
  var navMoreBtn = $('#navMoreBtn');
  var navMorePanel = $('#navMorePanel');
  var navMoreGrid = $('#navMoreGrid');

  if (nav && navMain && navMore && navMoreBtn && navMoreGrid) {
    var navItems = $$('[data-nav-item]', navMain);
    var navMax = parseInt(nav.getAttribute('data-nav-max'), 10) || 9;
    var navCompact = window.matchMedia('(max-width: 760px)');
    var navTimer = 0;

    function navIsOpen() { return navMore.classList.contains('is-open'); }

    function closeMore(focusBack) {
      if (!navIsOpen()) return;
      navMore.classList.remove('is-open');
      navMoreBtn.setAttribute('aria-expanded', 'false');
      if (focusBack) navMoreBtn.focus({ preventScroll: true });
    }

    // 全部归位（保持配置顺序），再按可用宽度把溢出的搬进面板
    function layoutNav() {
      navTimer = 0;

      for (var i = 0; i < navItems.length; i++) navMain.appendChild(navItems[i]);

      if (navCompact.matches) {
        navMore.hidden = true;
        closeMore();
        return;
      }

      navMore.hidden = false;

      var gap = 4;
      var avail = nav.clientWidth;
      var moreW = navMoreBtn.offsetWidth + 6 + 2;
      var used = 0;
      var keep = 0;

      for (var j = 0; j < navItems.length; j++) {
        if (j >= navMax) break;
        var rest = navItems.length - j - 1;
        var reserve = rest > 0 ? moreW : 0;
        var w = navItems[j].offsetWidth + gap;
        if (used + w + reserve > avail) break;
        used += w;
        keep = j + 1;
      }
      if (keep < 1) keep = 1;

      if (keep >= navItems.length) {
        navMoreGrid.textContent = '';
        navMore.hidden = true;
        closeMore();
        return;
      }

      navMoreGrid.textContent = '';
      for (var k = keep; k < navItems.length; k++) {
        navMoreGrid.appendChild(navItems[k]);
      }

      // 项数少时收成单列，面板不至于空一半
      var over = navItems.length - keep;
      navMorePanel.classList.toggle('is-single', over <= 5);
      navMoreGrid.classList.toggle('is-single', over <= 5);

      navMore.classList.toggle('has-active', !!navMoreGrid.querySelector('.is-active'));
    }

    function scheduleLayout() {
      if (navTimer) return;
      navTimer = setTimeout(layoutNav, 80);
    }

    navMoreBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !navIsOpen();
      navMore.classList.toggle('is-open', open);
      navMoreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        var focusTarget = navMoreGrid.querySelector('.is-active') || navMoreGrid.querySelector('.nav-link');
        if (focusTarget) focusTarget.focus({ preventScroll: true });
      }
    });

    navMorePanel.addEventListener('click', function (e) {
      if (e.target.closest('.nav-link')) closeMore();
    });

    doc.addEventListener('click', function (e) {
      if (navIsOpen() && !navMore.contains(e.target)) closeMore();
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMore(true);
    });

    // 面板内上下键换焦点
    navMorePanel.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var links = $$('.nav-link', navMoreGrid);
      if (!links.length) return;
      e.preventDefault();
      var idx = links.indexOf(doc.activeElement);
      var next = e.key === 'ArrowDown'
        ? (idx + 1) % links.length
        : (idx <= 0 ? links.length - 1 : idx - 1);
      links[next].focus();
    });

    if (navCompact.addEventListener) navCompact.addEventListener('change', layoutNav);
    else if (navCompact.addListener) navCompact.addListener(layoutNav);

    if (window.ResizeObserver) {
      new ResizeObserver(scheduleLayout).observe(nav);
    } else {
      window.addEventListener('resize', scheduleLayout);
    }
    window.addEventListener('orientationchange', scheduleLayout);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(layoutNav, function () {});

    layoutNav();
  }

  /* ---------------- 滚动显现 ---------------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    $$('.reveal').forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i % 6, 5) * 55 + 'ms';
      io.observe(el);
    });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------- 站内搜索 ---------------- */
  var panel = $('#searchPanel');
  var input = $('#searchInput');
  var resultsBox = $('#searchResults');
  var searchData = null;
  var searchLoading = false;
  var pendingQuery = '';
  var cursor = -1;
  var current = [];

  function openSearch() {
    if (!panel) return;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    doc.body.style.overflow = 'hidden';
    if (input) { input.value = ''; input.focus(); }
    pendingQuery = '';
    renderResults([]);
    loadData();
  }

  function closeSearch() {
    if (!panel) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    doc.body.style.overflow = '';
  }

  function loadData() {
    if (searchData || searchLoading) return;
    searchLoading = true;
    if (resultsBox && !searchData) {
      resultsBox.innerHTML = '<p class="search-hint">正在翻箱倒柜…</p>';
    }
    fetch((window.YY_BASE || '') + '/search.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        searchData = data;
        searchLoading = false;
        if (pendingQuery) doSearch(pendingQuery);
        else if (resultsBox && resultsBox.querySelector('.search-hint')) {
          resultsBox.innerHTML = '<p class="search-hint">输入关键词，回车跳到第一条结果</p>';
        }
      })
      .catch(function () {
        searchLoading = false;
        if (resultsBox) resultsBox.innerHTML = '<p class="search-hint">搜索索引没加载出来，刷新一下试试。</p>';
      });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function mark(text, q) {
    if (!q) return esc(text);
    var i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  function renderResults(list, q) {
    if (!resultsBox) return;
    if (!list.length) {
      resultsBox.innerHTML = q
        ? '<p class="search-hint">没有找到「' + esc(q) + '」，换个词试试？</p>'
        : '<p class="search-hint">输入关键词，回车跳到第一条结果</p>';
      current = [];
      cursor = -1;
      return;
    }
    resultsBox.innerHTML = list
      .map(function (p, i) {
        return (
          '<a class="search-result' + (i === 0 ? ' is-cursor' : '') + '" href="' + p.url + '" data-i="' + i + '">' +
          '<b>' + mark(p.title, q) + '</b>' +
          '<span>' + (p.date || '') + ' · ' + (p.category || '') + (p.tags && p.tags.length ? ' · ' + p.tags.join(' / ') : '') + '</span>' +
          '</a>'
        );
      })
      .join('');
    current = list;
    cursor = 0;
  }

  function doSearch(q) {
    q = (q || '').trim();
    if (!searchData) { pendingQuery = q; loadData(); return; }
    if (!q) { renderResults([]); return; }
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    var scored = [];
    searchData.forEach(function (p) {
      var title = (p.title || '').toLowerCase();
      var tags = (p.tags || []).join(' ').toLowerCase();
      var desc = (p.description || '').toLowerCase();
      var body = (p.content || '').toLowerCase();
      var score = 0;
      terms.forEach(function (t) {
        if (title.indexOf(t) > -1) score += 12;
        if (tags.indexOf(t) > -1) score += 6;
        if (desc.indexOf(t) > -1) score += 4;
        if (body.indexOf(t) > -1) score += 1;
      });
      if (score > 0) scored.push({ p: p, s: score });
    });
    scored.sort(function (a, b) { return b.s - a.s || (a.p.date < b.p.date ? 1 : -1); });
    renderResults(scored.slice(0, 8).map(function (x) { return x.p; }), q);
  }

  if (input) {
    input.addEventListener('input', function () { doSearch(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!current.length) return;
        cursor = (cursor + (e.key === 'ArrowDown' ? 1 : -1) + current.length) % current.length;
        $$('.search-result', resultsBox).forEach(function (el, i) {
          el.classList.toggle('is-cursor', i === cursor);
        });
        var el = $$('.search-result', resultsBox)[cursor];
        if (el) el.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        if (current[cursor]) window.location.href = current[cursor].url;
      }
    });
  }

  var openBtn = $('#searchOpen');
  if (openBtn) openBtn.addEventListener('click', openSearch);
  if (panel) {
    panel.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close-search')) closeSearch();
    });
  }

  doc.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;

    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      panel && panel.classList.contains('is-open') ? closeSearch() : openSearch();
      return;
    }
    if (e.key === '/' && !typing && !(panel && panel.classList.contains('is-open'))) {
      e.preventDefault();
      openSearch();
      return;
    }
    if (e.key === 'Escape' && panel && panel.classList.contains('is-open')) closeSearch();
  });

  /* ---------------- 列表页标签筛选 ---------------- */
  var filterBar = $('#filterBar');
  var rows = $('#postRows');
  if (filterBar && rows) {
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      $$('.filter-btn', filterBar).forEach(function (b) { b.classList.remove('is-on'); });
      btn.classList.add('is-on');
      var tag = btn.dataset.tag;
      $$('.row', rows).forEach(function (row) {
        var tags = (row.dataset.tags || '').split('|');
        var show = tag === '*' || tags.indexOf(tag) > -1;
        row.style.display = show ? '' : 'none';
        if (show) row.classList.add('is-in');
      });
    });
  }

  /* ============================================================
     文章页
     ============================================================ */
  var body = $('#postBody');

  if (body) {
    /* --- 目录 --- */
    var heads = $$('h2, h3', body).filter(function (h) { return h.id; });
    var tocList = $('#tocList');
    if (tocList && heads.length) {
      heads.forEach(function (h) {
        var li = doc.createElement('li');
        li.className = h.tagName === 'H3' ? 'toc-h3' : 'toc-h2';
        var a = doc.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent.replace(/^#\s*/, '');
        a.dataset.target = h.id;
        li.appendChild(a);
        tocList.appendChild(li);

        // 标题锚点
        var link = doc.createElement('a');
        link.className = 'anchor';
        link.href = '#' + h.id;
        link.textContent = '#';
        link.setAttribute('aria-hidden', 'true');
        h.appendChild(link);
      });

      var tocLinks = $$('a', tocList);

      var highlightToc = function () {
        var pos = window.scrollY + 120;
        var activeId = heads[0].id;
        heads.forEach(function (h) {
          if (h.offsetTop <= pos) activeId = h.id;
        });
        tocLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.dataset.target === activeId);
        });
      };
      window.addEventListener('scroll', highlightToc, { passive: true });
      highlightToc();
    }

    /* --- 阅读进度 --- */
    var bar = $('#readProgress');
    if (bar) {
      var updateBar = function () {
        var total = body.offsetTop + body.offsetHeight - window.innerHeight + 160;
        var pct = Math.min(100, Math.max(0, ((window.scrollY || 0) / total) * 100));
        bar.style.width = pct + '%';
      };
      window.addEventListener('scroll', updateBar, { passive: true });
      window.addEventListener('resize', updateBar);
      updateBar();
    }

    /* --- 代码块复制 --- */
    $$('pre', body).forEach(function (pre) {
      var btn = doc.createElement('button');
      btn.className = 'copy-btn';
      btn.type = 'button';
      btn.textContent = '复制';
      pre.appendChild(btn);
      btn.addEventListener('click', function () {
        var code = pre.querySelector('code');
        var text = code ? code.innerText : pre.innerText;
        var done = function () {
          btn.textContent = '已复制';
          btn.classList.add('is-done');
          setTimeout(function () { btn.textContent = '复制'; btn.classList.remove('is-done'); }, 1600);
        };
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(done, function () {});
        } else {
          var ta = doc.createElement('textarea');
          ta.value = text;
          doc.body.appendChild(ta);
          ta.select();
          try { doc.execCommand('copy'); done(); } catch (e) {}
          doc.body.removeChild(ta);
        }
      });
    });

    /* --- 图片灯箱 --- */
    var lightbox = $('#lightbox');
    var lbImg = lightbox ? lightbox.querySelector('img') : null;
    if (lightbox) {
      $$('img', body).forEach(function (img) {
        img.addEventListener('click', function () {
          lbImg.src = img.currentSrc || img.src;
          lbImg.alt = img.alt || '';
          lightbox.classList.add('is-open');
          lightbox.setAttribute('aria-hidden', 'false');
          doc.body.style.overflow = 'hidden';
        });
      });
      var closeLb = function () {
        lightbox.classList.remove('is-open');
        lightbox.setAttribute('aria-hidden', 'true');
        doc.body.style.overflow = '';
      };
      lightbox.addEventListener('click', closeLb);
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); });
    }
  }

  /* --- 点赞 --- */
  var likeBtn = $('#likeBtn');
  if (likeBtn) {
    var key = 'yy-liked-' + likeBtn.dataset.key;
    var liked = false;
    try { liked = localStorage.getItem(key) === '1'; } catch (e) {}

    var paint = function () {
      likeBtn.classList.toggle('is-liked', liked);
      var t = $('#likeText');
      if (t) t.textContent = liked ? '已经喜欢' : '喜欢';
    };
    paint();

    likeBtn.addEventListener('click', function () {
      liked = !liked;
      try { liked ? localStorage.setItem(key, '1') : localStorage.removeItem(key); } catch (e) {}
      paint();
      var svg = likeBtn.querySelector('svg');
      if (svg) {
        svg.classList.remove('pop');
        void svg.offsetWidth;
        svg.classList.add('pop');
      }
    });
  }

  /* --- 分享 --- */
  $$('[data-share]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = window.location.href;
      var title = doc.title;
      var mode = btn.dataset.share;
      if (mode === 'copy') {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function () {
            var old = btn.title;
            btn.title = '已复制';
            btn.style.color = 'var(--leaf)';
            setTimeout(function () { btn.title = old; btn.style.color = ''; }, 1600);
          });
        }
      } else if (mode === 'weibo') {
        window.open(
          'https://service.weibo.com/share/share.php?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title),
          '_blank',
          'width=640,height=480'
        );
      } else if (navigator.share) {
        navigator.share({ title: title, url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
      }
    });
  });

  /* --- 搜索索引：路径已在页面中通过 window.YY_BASE 提供 --- */
})();

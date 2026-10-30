/* ============================================================
   燕语 · 扩展交互
   四时光主题 / 收藏 / 快捷键 / 碎语 / 留言板 / 今日一句
   ============================================================ */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  var YY = window.YY = window.YY || {};

  /* ---------------- 提示条 ---------------- */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = doc.createElement('div');
      toastEl.className = 'yy-toast';
      toastEl.setAttribute('role', 'status');
      doc.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }
  YY.toast = toast;

  /* ---------------- 四时光主题 ---------------- */
  var THEMES = [
    { key: 'auto', name: '跟着天色', desc: '系统怎么亮，我就怎么亮', css: 'linear-gradient(135deg,#d7e8ef 0%,#fcf7ed 50%,#0e1e28 50%,#132631 100%)' },
    { key: 'dawn', name: '清晨', desc: '檐上有露水', css: 'linear-gradient(160deg,#f4dfd2,#fdf1e7 55%,#f9e3cd)' },
    { key: 'light', name: '正午', desc: '天青云薄', css: 'linear-gradient(160deg,#d7e8ef,#edf5f5 55%,#fcf7ed)' },
    { key: 'dusk', name: '黄昏', desc: '归巢时分', css: 'linear-gradient(160deg,#6b5d68,#9a7f74 60%,#d9a279)' },
    { key: 'dark', name: '深夜', desc: '只剩灯和字', css: 'linear-gradient(160deg,#0b1620,#0e1e28 55%,#17303d)' }
  ];

  var themePop = null, themeBtn = null;

  function buildThemeMenu() {
    themePop = doc.createElement('div');
    themePop.className = 'theme-pop';
    themePop.setAttribute('role', 'menu');
    themePop.setAttribute('aria-label', '配色');
    themePop.innerHTML = '<p class="theme-pop__title">换一片天色</p>' +
      THEMES.map(function (t) {
        return '<button class="theme-opt" type="button" data-theme-key="' + t.key + '" role="menuitem">' +
          '<span class="theme-swatch" style="background:' + t.css + '"></span>' +
          '<span><b>' + t.name + '</b><em>' + t.desc + '</em></span>' +
          '<span class="tick" aria-hidden="true">✓</span></button>';
      }).join('');
    doc.body.appendChild(themePop);

    $$('.theme-opt', themePop).forEach(function (b) {
      b.addEventListener('click', function () {
        setTheme(b.dataset.themeKey);
        closeThemeMenu();
      });
    });
  }

  function setTheme(key) {
    try { localStorage.setItem('yy-theme', key); } catch (e) {}
    var mql = window.matchMedia('(prefers-color-scheme: dark)');
    var resolved = (key === 'auto') ? (mql.matches ? 'dark' : 'light') : key;
    root.setAttribute('data-theme', key);
    root.dataset.mode = key;
    root.dataset.resolved = resolved;
    var colorMap = { light: '#edf5f5', dark: '#0d1a22', dawn: '#fdf1e7', dusk: '#f4e9e6' };
    var meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', colorMap[resolved] || '#edf5f5');
    markThemeMenu(key);
    try { doc.dispatchEvent(new CustomEvent('yy:theme', { detail: resolved })); } catch (e) {}
  }

  function markThemeMenu(key) {
    if (!themePop) return;
    var cur = key || root.dataset.mode || 'auto';
    $$('.theme-opt', themePop).forEach(function (b) {
      b.classList.toggle('is-on', b.dataset.themeKey === cur);
    });
  }

  function openThemeMenu(btn) {
    if (!themePop) buildThemeMenu();
    themeBtn = btn || $('#themeToggle');
    markThemeMenu(localStorage.getItem('yy-theme') || 'auto');
    themePop.classList.add('is-open');
    var r = themeBtn.getBoundingClientRect();
    var w = 246;
    var left = Math.min(window.innerWidth - w - 12, Math.max(12, r.right - w));
    themePop.style.left = left + 'px';
    themePop.style.top = (r.bottom + 10) + 'px';
    setTimeout(function () {
      doc.addEventListener('click', onDocClickTheme, { once: true });
    }, 0);
  }

  function closeThemeMenu() {
    if (themePop) themePop.classList.remove('is-open');
  }

  function onDocClickTheme(e) {
    if (!themePop) return;
    if (themePop.contains(e.target) || (themeBtn && themeBtn.contains(e.target))) return;
    closeThemeMenu();
  }

  YY.openThemeMenu = openThemeMenu;

  /* ---------------- 快捷键面板 ---------------- */
  var kbPanel = null;

  function buildKbPanel() {
    kbPanel = doc.createElement('div');
    kbPanel.className = 'kb-panel';
    kbPanel.setAttribute('role', 'dialog');
    kbPanel.setAttribute('aria-label', '键盘快捷键');
    kbPanel.innerHTML =
      '<div class="kb-card">' +
      '<h3>手上的快捷键 <button type="button" data-kb-close>关闭 ESC</button></h3>' +
      '<div class="kb-grid">' +
      row(['/', '⌘K'], '打开搜索') +
      row(['?'], '这面板') +
      row(['R'], '随手翻一篇') +
      row(['T'], '换天色') +
      row(['S'], '我的收藏') +
      row(['G', 'H'], '回首页') +
      row(['G', 'N'], '看笔记') +
      row(['G', 'M'], '看碎语') +
      row(['G', 'B'], '看书架') +
      row(['G', 'A'], '看归档') +
      row(['G', 'F'], '看友链') +
      '</div>' +
      '<p class="kb-foot">输入类框里不拦截按键；手机上这些都可以从菜单进。</p>' +
      '</div>';
    doc.body.appendChild(kbPanel);

    kbPanel.addEventListener('click', function (e) {
      if (e.target === kbPanel || e.target.hasAttribute('data-kb-close')) closeKb();
    });
    function row(keys, label) {
      return '<div class="kb-row"><span>' + label + '</span><span class="kb-keys">' +
        keys.map(function (k) { return '<kbd>' + k + '</kbd>'; }).join('') + '</span></div>';
    }
  }

  function openKb() {
    if (!kbPanel) buildKbPanel();
    kbPanel.classList.add('is-open');
  }
  function closeKb() {
    if (kbPanel) kbPanel.classList.remove('is-open');
  }

  /* ---------------- 收藏 ---------------- */
  var SAVED_KEY = 'yy-saved';

  function getSaved() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch (e) { return []; }
  }
  function setSaved(list) {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function isSaved(url) {
    return getSaved().some(function (x) { return x.url === url; });
  }
  function toggleSaved(item) {
    var list = getSaved();
    var i = list.findIndex(function (x) { return x.url === item.url; });
    if (i >= 0) { list.splice(i, 1); setSaved(list); return false; }
    list.unshift(item);
    setSaved(list);
    return true;
  }

  /* ---------------- 文章页工具条 ---------------- */
  function initReadTools() {
    var bar = $('#readTools');
    if (!bar) return;
    var url = bar.dataset.url;
    var title = bar.dataset.title;
    var cat = bar.dataset.cat || '';
    var saveBtn = $('#rtSave');

    function paintSave() {
      var on = isSaved(url);
      saveBtn.classList.toggle('is-on', on);
      saveBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      saveBtn.querySelector('span').textContent = on ? '收着了' : '收着';
    }
    paintSave();

    saveBtn.addEventListener('click', function () {
      var on = toggleSaved({ url: url, title: title, cat: cat, at: Date.now() });
      paintSave();
      toast(on ? '收进抽屉了，在「收藏」里能找到' : '拿出来了');
    });

    $('#rtCopy').addEventListener('click', function () {
      var link = location.href;
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject())
        .then(function () { toast('链接复制好了'); }, function () { toast('复制没成功，手动选中地址栏吧'); });
    });

    $('#rtTop').addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 字号
    var FONTS = ['', 's', 'l', 'xl'];
    var LABEL = { '': '字', s: '小', l: '大', xl: '特大' };
    var fontIdx = 0;
    try {
      var savedFont = localStorage.getItem('yy-font') || '';
      fontIdx = Math.max(0, FONTS.indexOf(savedFont));
      if (savedFont) root.setAttribute('data-font', savedFont);
    } catch (e) {}
    $('#rtFontLabel').textContent = LABEL[FONTS[fontIdx]] || '字';
    $('#rtFont').addEventListener('click', function () {
      fontIdx = (fontIdx + 1) % FONTS.length;
      var f = FONTS[fontIdx];
      if (f) root.setAttribute('data-font', f); else root.removeAttribute('data-font');
      try { localStorage.setItem('yy-font', f); } catch (e) {}
      $('#rtFontLabel').textContent = LABEL[f] || '字';
      toast('字号：' + (LABEL[f] === '字' ? '默认' : LABEL[f]));
    });

    var show = function () {
      var y = window.scrollY || window.pageYOffset;
      bar.classList.toggle('is-on', y > 420);
    };
    window.addEventListener('scroll', show, { passive: true });
    show();
  }

  /* ---------------- 收藏页 ---------------- */
  function initSavedPage() {
    var wrap = $('#savedList');
    if (!wrap) return;
    var empty = $('#savedEmpty');
    var clear = $('#savedClear');

    function render() {
      var list = getSaved();
      empty.hidden = list.length > 0;
      clear.hidden = list.length === 0;
      wrap.innerHTML = list.map(function (x, i) {
        var d = new Date(x.at || Date.now());
        var ds = (d.getMonth() + 1) + '.' + d.getDate();
        return '<div class="saved-item" data-i="' + i + '">' +
          '<time>' + ds + '</time>' +
          '<a href="' + x.url + '">' + esc(x.title) + '</a>' +
          '<span class="s-cat">' + esc(x.cat || '') + '</span>' +
          '<button type="button" data-del="' + i + '">移出</button>' +
          '</div>';
      }).join('');
      $$('[data-del]', wrap).forEach(function (b) {
        b.addEventListener('click', function () {
          var list2 = getSaved();
          list2.splice(+b.dataset.del, 1);
          setSaved(list2);
          render();
          toast('移出了');
        });
      });
    }
    clear.addEventListener('click', function () {
      setSaved([]);
      render();
      toast('抽屉清空了');
    });
    render();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------- 今日一句 ---------------- */
  function initQuotes() {
    var band = $('#quoteBand');
    var dataEl = $('#quoteData');
    if (!band || !dataEl) return;
    var list = [];
    try { list = JSON.parse(dataEl.textContent); } catch (e) { return; }
    if (!list.length) return;
    var textEl = $('#quoteText');
    var fromEl = $('#quoteFrom');
    var idx = Math.floor(Math.random() * list.length);

    function paint(i) {
      textEl.textContent = list[i].t;
      fromEl.textContent = list[i].f;
    }
    paint(idx);
    $('#quoteNext').addEventListener('click', function () {
      band.style.transition = 'opacity .18s';
      band.style.opacity = '.25';
      setTimeout(function () {
        idx = (idx + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
        paint(idx);
        band.style.opacity = '1';
      }, 180);
    });
  }

  /* ---------------- 碎语 ---------------- */
  function initMurmur() {
    var stream = $('#murmurStream');
    if (!stream) return;
    var bar = $('#murmurFilter');
    var items = $$('.murmur', stream);

    if (bar) {
      bar.addEventListener('click', function (e) {
        var btn = e.target.closest('.filter-btn');
        if (!btn) return;
        $$('.filter-btn', bar).forEach(function (b) { b.classList.remove('is-on'); });
        btn.classList.add('is-on');
        var tag = btn.dataset.tag;
        items.forEach(function (it) {
          var tags = (it.dataset.tags || '').split('|');
          var ok = tag === '*' || tags.indexOf(tag) >= 0;
          it.style.display = ok ? '' : 'none';
        });
        var n = items.filter(function (it) { return it.style.display !== 'none'; }).length;
        $('.murmur-count').textContent = n + ' 条';
      });
    }

    // 点赞
    items.forEach(function (it) {
      var like = $('.murmur-like', it);
      if (!like) return;
      var key = 'yy-murmur-like:' + like.dataset.key;
      var mine = 0;
      try { mine = Number(localStorage.getItem(key) || 0); } catch (e) {}
      var base = seeded(like.dataset.key, 3, 26);
      var b = $('b', like);
      b.textContent = base + mine;
      like.classList.toggle('is-on', mine > 0);
      like.addEventListener('click', function () {
        var cur = 0;
        try { cur = Number(localStorage.getItem(key) || 0); } catch (e) {}
        var next = cur ? 0 : 1;
        try { localStorage.setItem(key, next); } catch (e) {}
        b.textContent = base + next;
        like.classList.toggle('is-on', next > 0);
        like.animate
          ? like.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 260 })
          : null;
      });
    });

    // 标签跳转 = 筛选
    $$('[data-jump]', stream).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var t = a.dataset.jump;
        if (!bar) return;
        var btn = $('.filter-btn[data-tag="' + t + '"]', bar);
        if (btn) btn.click();
        window.scrollTo({ top: stream.offsetTop - 100, behavior: 'smooth' });
      });
    });

    function seeded(str, min, max) {
      var h = 0;
      for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 9973;
      return min + (h % (max - min + 1));
    }
  }

  /* ---------------- 留言板 ---------------- */
  var GB_KEY = 'yy-guestbook';

  function initGuestbook() {
    var form = $('#gbForm');
    if (!form) return;
    var nameEl = $('#gbName');
    var textEl = $('#gbText');
    var countEl = $('#gbCount');
    var wall = $('#gbWall');
    var empty = $('#gbEmpty');
    var moods = $$('.gb-mood');
    var mood = 'sun';

    moods.forEach(function (m) {
      m.addEventListener('click', function () {
        moods.forEach(function (x) { x.classList.remove('is-on'); x.setAttribute('aria-checked', 'false'); });
        m.classList.add('is-on');
        m.setAttribute('aria-checked', 'true');
        mood = m.dataset.mood;
      });
    });

    textEl.addEventListener('input', function () {
      countEl.textContent = textEl.value.length;
    });

    function getNotes() {
      try { return JSON.parse(localStorage.getItem(GB_KEY) || '[]'); } catch (e) { return []; }
    }
    function setNotes(a) {
      try { localStorage.setItem(GB_KEY, JSON.stringify(a)); } catch (e) {}
    }

    function render() {
      var notes = getNotes();
      empty.hidden = notes.length > 0;
      wall.innerHTML = notes.map(function (n, i) {
        var d = new Date(n.at);
        var t = (d.getMonth() + 1) + '.' + d.getDate() + ' ' +
          ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
        var rot = (((i * 37) % 5) - 2) * 0.4;
        return '<div class="gb-note gb-note--' + n.mood + '" style="--rot:' + rot + 'deg">' +
          '<button class="gb-note__del" type="button" data-del="' + i + '" title="撕掉">✕</button>' +
          '<div class="gb-note__head"><b>' + esc(n.name) + '</b><time>' + t + '</time></div>' +
          '<p class="gb-note__text">' + esc(n.text) + '</p>' +
          '</div>';
      }).join('');
      $$('[data-del]', wall).forEach(function (b) {
        b.addEventListener('click', function () {
          var list = getNotes();
          list.splice(+b.dataset.del, 1);
          setNotes(list);
          render();
          toast('撕掉了');
        });
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = textEl.value.trim();
      if (text.length < 2) { toast('至少写两个字吧'); textEl.focus(); return; }
      var notes = getNotes();
      notes.unshift({
        name: (nameEl.value.trim() || '路过的某只燕子').slice(0, 16),
        mood: mood,
        text: text.slice(0, 240),
        at: Date.now()
      });
      setNotes(notes.slice(0, 60));
      textEl.value = '';
      countEl.textContent = '0';
      render();
      toast('贴上去了');
    });

    render();
  }

  /* ---------------- 随手翻一篇 ---------------- */
  var postIndex = null;
  function randomPost() {
    var go = function (list) {
      if (!list || !list.length) { toast('还没有文章'); return; }
      var p = list[Math.floor(Math.random() * list.length)];
      location.href = p.url;
    };
    if (postIndex) { go(postIndex); return; }
    fetch(((window.YY_BASE || '') + '/search.json'))
      .then(function (r) { return r.json(); })
      .then(function (d) { postIndex = d; go(d); })
      .catch(function () { toast('索引没读到'); });
  }

  /* ---------------- 快捷键 ---------------- */
  function isTyping(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  var gPending = false, gTimer = null;

  function initKeys() {
    doc.addEventListener('keydown', function (e) {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape') {
        closeKb();
        closeThemeMenu();
        return;
      }
      if (e.key === '?') { e.preventDefault(); kbPanel && kbPanel.classList.contains('is-open') ? closeKb() : openKb(); return; }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); randomPost(); return; }
      if (e.key === 't' || e.key === 'T') { e.preventDefault(); openThemeMenu($('#themeToggle')); return; }
      if (e.key === 's' || e.key === 'S') { location.href = (window.YY_BASE || '') + '/saved/'; return; }

      if (e.key === 'g' || e.key === 'G') {
        gPending = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(function () { gPending = false; }, 900);
        return;
      }
      if (gPending) {
        var map = { h: '/', n: '/notes/', m: '/murmur/', b: '/shelf/', a: '/archive/', f: '/friends/' };
        var target = map[e.key.toLowerCase()];
        gPending = false;
        if (target) { location.href = (window.YY_BASE || '') + target; }
      }
    });
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    initQuotes();
    initReadTools();
    initSavedPage();
    initMurmur();
    initGuestbook();
    initKeys();
    // 恢复字号
    try {
      var f = localStorage.getItem('yy-font');
      if (f) root.setAttribute('data-font', f);
    } catch (e) {}
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

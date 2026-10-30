/* ============================================================
   燕语 · 巢工作台
   纯前端：密码校验 + GitHub Contents API 读写
   —— Token 只存 sessionStorage，关标签页即失效
   ============================================================ */
(function () {
  'use strict';

  var cfg = window.WB || {};
  var API = 'https://api.github.com';
  var RAW = 'https://raw.githubusercontent.com/';
  var doc = document;
  var root = doc.documentElement;

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var S = {
    token: '',
    login: '',
    posts: [],        // 全量 meta（来自 studio-posts.json）
    bodies: {},       // path -> raw markdown
    current: null,    // 当前编辑的 post 对象
    dirty: false,
    filter: 'all',
    query: '',
    loaded: false,
    stats: null,
    media: []
  };

  /* ---------------- 小工具 ---------------- */
  var toastTimer;
  function toast(msg, type) {
    var el = $('#stToast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'st-toast is-on' + (type ? ' ' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'st-toast'; }, 2600);
  }

  function modal(opts) {
    var box = $('#stModal');
    $('#modalTitle').textContent = opts.title || '确认';
    var body = $('#modalBody');
    body.innerHTML = opts.html || '';
    var foot = $('#modalFoot');
    foot.innerHTML = '';
    (opts.buttons || [{ label: '好的' }]).forEach(function (b) {
      var el = doc.createElement('button');
      el.type = 'button';
      el.className = 'st-btn ' + (b.type === 'primary' ? 'primary' : b.type === 'danger' ? 'danger ghost' : 'ghost') + ' sm';
      el.textContent = b.label;
      el.addEventListener('click', function () {
        var keep = b.onClick && b.onClick(body) === false;
        if (!keep) closeModal();
      });
      foot.appendChild(el);
    });
    box.hidden = false;
    if (opts.onOpen) opts.onOpen(body);
    return body;
  }
  function closeModal() { $('#stModal').hidden = true; }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function todayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function fmtDate(s) { return String(s || '').replace(/-/g, '.'); }
  function num(n) { return (n || 0).toLocaleString('zh-CN'); }
  function wordCount(s) {
    if (!s) return 0;
    var cn = (s.match(/[\u4e00-\u9fa5]/g) || []).length;
    var en = (s.match(/[a-zA-Z]+/g) || []).length;
    return cn + en;
  }
  function relTime(iso) {
    var t = new Date(iso).getTime();
    if (!t) return '';
    var d = (Date.now() - t) / 1000;
    if (d < 60) return '刚刚';
    if (d < 3600) return Math.floor(d / 60) + ' 分钟前';
    if (d < 86400) return Math.floor(d / 3600) + ' 小时前';
    if (d < 86400 * 30) return Math.floor(d / 86400) + ' 天前';
    var dt = new Date(iso);
    return (dt.getMonth() + 1) + ' 月 ' + dt.getDate() + ' 日';
  }

  /* ---------------- SHA-256 ---------------- */
  function sha256(str) {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ('00' + b.toString(16)).slice(-2);
        }).join('');
      });
    }
    return Promise.resolve(sha256js(str));
  }
  // 兜底实现（非 https 环境下 crypto.subtle 不可用）
  function sha256js(ascii) {
    function rightRotate(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mathPow = Math.pow, maxWord = mathPow(2, 32), result = '';
    var words = [], asciiBitLength = ascii.length * 8;
    var hash = sha256js.h = sha256js.h || [];
    var k = sha256js.k = sha256js.k || [];
    var primeCounter = k.length;
    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (var i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii = unescape(encodeURIComponent(ascii));
    for (i = 0; i < ascii.length; i++) {
      var j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << ((3 - i % 4) * 8);
    }
    words[words.length] = ((asciiBitLength / 8) * 8) / maxWord | 0;
    words[words.length] = asciiBitLength;

    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16);
      var oldHash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var temp1 = hash[7] +
          (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
          ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (
            w[i - 16] +
            (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
            w[i - 7] +
            (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0);
        var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
          ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }

  /* ---------------- base64 ---------------- */
  function b64enc(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64dec(b64) {
    return decodeURIComponent(escape(atob(String(b64).replace(/\s/g, ''))));
  }

  /* ---------------- GitHub API ---------------- */
  function gh(path, opts) {
    if (!S.token) return Promise.reject(new Error('还没连 Token'));
    opts = opts || {};
    var url = /^https?:/.test(path) ? path : API + path;
    var init = {
      method: opts.method || 'GET',
      headers: {
        'Authorization': 'Bearer ' + S.token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      cache: 'no-store'
    };
    if (opts.body) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    return fetch(url, init).then(function (r) {
      if (r.status === 204) return null;
      return r.text().then(function (txt) {
        var data = null;
        try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
        if (!r.ok) {
          var msg = (data && data.message) || ('HTTP ' + r.status);
          var err = new Error(msg);
          err.status = r.status;
          throw err;
        }
        return data;
      });
    });
  }

  function getFile(path) {
    return gh('/repos/' + cfg.repo + '/contents/' + encodeURI(path) + '?ref=' + cfg.branch, { cache: 'no-store' });
  }
  function putFile(path, text, message, sha) {
    var body = { message: message, content: b64enc(text), branch: cfg.branch };
    if (sha) body.sha = sha;
    return gh('/repos/' + cfg.repo + '/contents/' + encodeURI(path), { method: 'PUT', body: body });
  }
  function delFile(path, sha, message) {
    return gh('/repos/' + cfg.repo + '/contents/' + encodeURI(path), {
      method: 'DELETE',
      body: { message: message, sha: sha, branch: cfg.branch }
    });
  }

  /* ---------------- YAML 子集 ---------------- */
  function yamlScalar(v) {
    var s = String(v).trim();
    if (!s) return '';
    if ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'")) {
      var inner = s.slice(1, -1);
      if (s[0] === '"') { try { return JSON.parse(s); } catch (e) { return inner; } }
      return inner.replace(/''/g, "'");
    }
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (s === 'null' || s === '~') return null;
    if (/^\[.*\]$/.test(s)) {
      return s.slice(1, -1).split(',').map(function (x) {
        return yamlScalar(x.trim());
      }).filter(function (x) { return x !== ''; });
    }
    if (/^-?\d+(\.\d+)?$/.test(s) && s.length < 15) return Number(s);
    return s;
  }

  function yamlTokens(text) {
    return text.split('\n').filter(function (l) {
      var t = l.trim();
      return t && t[0] !== '#';
    }).map(function (l) {
      return { indent: l.match(/^ */)[0].length, t: l.trim() };
    });
  }

  function yamlParse(text) {
    var tk = yamlTokens(text);
    function node(i, indent) {
      if (i >= tk.length || tk[i].indent < indent) return [null, i];
      var isList = tk[i].t.indexOf('- ') === 0 || tk[i].t === '-';
      if (isList) {
        var arr = [];
        while (i < tk.length && tk[i].indent === indent && (tk[i].t.indexOf('- ') === 0 || tk[i].t === '-')) {
          var body = tk[i].t === '-' ? '' : tk[i].t.slice(2);
          if (!body) {
            i++;
            if (i < tk.length && tk[i].indent > indent) {
              var sub = node(i, tk[i].indent);
              arr.push(sub[0]); i = sub[1];
            } else arr.push(null);
          } else {
            var m = body.match(/^([\w.-]+):\s*(.*)$/);
            if (m) {
              var obj = {};
              if (m[2] !== '') { obj[m[1]] = yamlScalar(m[2]); i++; }
              else {
                i++;
                if (i < tk.length && tk[i].indent > indent && !/^- /.test(tk[i].t)) {
                  var s2 = node(i, tk[i].indent); obj[m[1]] = s2[0]; i = s2[1];
                } else obj[m[1]] = '';
              }
              while (i < tk.length && tk[i].indent > indent && !/^- /.test(tk[i].t)) {
                var mm = tk[i].t.match(/^([\w.-]+):\s*(.*)$/);
                if (!mm) { i++; continue; }
                if (mm[2] !== '') { obj[mm[1]] = yamlScalar(mm[2]); i++; }
                else {
                  i++;
                  if (i < tk.length && tk[i].indent > indent) {
                    var s3 = node(i, tk[i].indent); obj[mm[1]] = s3[0]; i = s3[1];
                  } else obj[mm[1]] = '';
                }
              }
              arr.push(obj);
            } else { arr.push(yamlScalar(body)); i++; }
          }
        }
        return [arr, i];
      }
      var o = {};
      while (i < tk.length && tk[i].indent === indent && !/^- /.test(tk[i].t)) {
        var km = tk[i].t.match(/^([\w.-]+):\s*(.*)$/);
        if (!km) { i++; continue; }
        if (km[2] !== '') { o[km[1]] = yamlScalar(km[2]); i++; }
        else {
          i++;
          if (i < tk.length && tk[i].indent > indent) {
            var s4 = node(i, tk[i].indent); o[km[1]] = s4[0]; i = s4[1];
          } else o[km[1]] = '';
        }
      }
      return [o, i];
    }
    var r = node(0, tk.length ? tk[0].indent : 0);
    return r[0] || {};
  }

  function yamlOut(v) {
    if (v === null || v === undefined) return '""';
    if (typeof v === 'boolean' || typeof v === 'number') return String(v);
    var s = String(v);
    if (s === '') return '""';
    if (/[:#\[\]{}",\n]|^\s|\s$/.test(s) || /^(true|false|null|yes|no)$/i.test(s) || /^-?\d+(\.\d+)?$/.test(s)) {
      return JSON.stringify(s);
    }
    return s;
  }

  function yamlDump(obj) {
    var out = [];
    function walk(o, ind) {
      var pad = new Array(ind + 1).join(' ');
      if (Array.isArray(o)) {
        if (!o.length) { out.push(pad + '[]'); return; }
        o.forEach(function (item) {
          if (item && typeof item === 'object') {
            var keys = Object.keys(item);
            if (!keys.length) { out.push(pad + '- {}'); return; }
            keys.forEach(function (k, idx) {
              var val = item[k];
              if (val && typeof val === 'object') {
                out.push(pad + (idx === 0 ? '- ' : '  ') + k + ':');
                walk(val, ind + 4);
              } else {
                out.push(pad + (idx === 0 ? '- ' : '  ') + k + ': ' + yamlOut(val));
              }
            });
          } else {
            out.push(pad + '- ' + yamlOut(item));
          }
        });
        return;
      }
      Object.keys(o).forEach(function (k) {
        var val = o[k];
        if (val && typeof val === 'object') { out.push(pad + k + ':'); walk(val, ind + 2); }
        else out.push(pad + k + ': ' + yamlOut(val));
      });
    }
    walk(obj, 0);
    return out.join('\n') + '\n';
  }

  /* ---------------- 门 ---------------- */
  function initGate() {
    var gate = $('#stGate');
    var form = $('#gateForm');
    var pwd = $('#gatePassword');
    var err = $('#gateError');
    var app = $('#stApp');

    if (sessionStorage.getItem('yy-studio') === '1') {
      gate.classList.add('is-out');
      app.hidden = false;
      boot();
      return;
    }
    setTimeout(function () { pwd.focus(); }, 260);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = pwd.value.trim();
      if (!val) return;
      err.classList.remove('is-on');
      sha256(val).then(function (h) {
        if (h === cfg.passwordSha256) {
          sessionStorage.setItem('yy-studio', '1');
          gate.classList.add('is-out');
          app.hidden = false;
          boot();
        } else {
          err.textContent = '不对。再想想？';
          err.classList.add('is-on');
          var card = $('#gateCard');
          card.classList.add('is-shake');
          setTimeout(function () { card.classList.remove('is-shake'); }, 460);
          pwd.select();
        }
      });
    });
  }

  /* ---------------- 主题 ---------------- */
  function initTheme() {
    var saved = localStorage.getItem('yy-studio-theme') || 'light';
    root.setAttribute('data-wb-theme', saved);
    var btn = $('#stTheme');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-wb-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-wb-theme', next);
      localStorage.setItem('yy-studio-theme', next);
    });
  }

  /* ---------------- 导航 ---------------- */
  var PANE_NAME = {
    dash: ['巢', '仪表盘'],
    posts: ['篇目', '文章'],
    stats: ['看数', '统计'],
    media: ['影像', '媒体'],
    settings: ['巢务', '设置'],
    deploy: ['放飞', '发布']
  };

  function switchPane(name) {
    $$('.st-nav-btn').forEach(function (b) { b.classList.toggle('is-on', b.dataset.pane === name); });
    $$('.st-pane').forEach(function (p) { p.classList.toggle('is-on', p.id === 'pane-' + name); });
    var n = PANE_NAME[name] || ['', ''];
    $('#crumbMain').textContent = n[0];
    $('#crumbSub').textContent = n[1];
    $('#stPanes').scrollTop = 0;
    sessionStorage.setItem('yy-studio-pane', name);
    if (name === 'posts' && !S.loaded) loadPosts();
    if (name === 'stats') renderStats();
    if (name === 'media') loadMedia();
    if (name === 'settings') openSetting($('.set-nav-btn.is-on').dataset.set);
    if (name === 'deploy') loadDeploy();
    if (window.innerWidth <= 860) $('#stSide').classList.remove('is-open');
  }

  function initNav() {
    $$('.st-nav-btn').forEach(function (b) {
      b.addEventListener('click', function () { switchPane(b.dataset.pane); });
    });
    $('#stBurger').addEventListener('click', function () {
      $('#stSide').classList.toggle('is-open');
    });
    $$('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { switchPane(b.dataset.goto); });
    });
  }

  /* ---------------- Token ---------------- */
  function setConn(on, text) {
    var box = $('#stConn');
    box.classList.toggle('is-on', !!on);
    $('#connText').textContent = text || (on ? '已连接' : '未连接 GitHub');
    var card = $('#tokenCard');
    if (card) card.hidden = !!on;
    var dot = $('#navBuildDot');
    if (dot && on) dot.hidden = true;
  }

  function connectToken(tk, silent) {
    tk = (tk || '').trim();
    if (!tk) { toast('先粘一个 Token 进来', 'err'); return Promise.resolve(false); }
    setConn(false, '校验中…');
    return fetch(API + '/user', {
      headers: { 'Authorization': 'Bearer ' + tk, 'Accept': 'application/vnd.github+json' }
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status === 401 ? 'Token 无效或已过期' : 'HTTP ' + r.status);
      return r.json();
    }).then(function (u) {
      S.token = tk;
      S.login = u.login;
      sessionStorage.setItem('yy-gh-token', tk);
      setConn(true, '@' + u.login);
      if (!silent) toast('连上了，' + u.login, 'ok');
      S.loaded = false;
      loadPosts();
      loadMedia();
      loadDeploy();
      return true;
    }).catch(function (e) {
      S.token = '';
      sessionStorage.removeItem('yy-gh-token');
      setConn(false, '未连接 GitHub');
      if (!silent) toast(e.message, 'err');
      return false;
    });
  }

  function initToken() {
    $('#tokenConnect').addEventListener('click', function () {
      connectToken($('#tokenInput').value);
    });
    $('#tokenInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') connectToken($('#tokenInput').value);
    });
    $('#sideLogout').addEventListener('click', function () {
      modal({
        title: '退出工作台',
        html: '<p>会断开 Token 并回到门口。<b>没保存的改动会丢</b>。</p>',
        buttons: [
          { label: '再想想' },
          { label: '退出', type: 'danger', onClick: function () {
            sessionStorage.removeItem('yy-gh-token');
            sessionStorage.removeItem('yy-studio');
            location.reload();
          } }
        ]
      });
    });
  }

  /* ---------------- 文章数据 ---------------- */
  function loadPosts() {
    setBadge('…');
    return fetch(cfg.base + '/studio-posts.json?t=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (list) {
        S.posts = list || [];
        S.loaded = true;
        renderList();
        renderDashRecent();
        renderDash();
        renderStats();
        setBadge(S.posts.length ? String(S.posts.length) : '');
        return list;
      })
      .catch(function () {
        S.posts = [];
        renderList();
        toast('文章索引读不到，检查一下网络', 'err');
      });
  }

  function setBadge(t) {
    var b = $('#navPostCount');
    if (!b) return;
    if (!t) { b.hidden = true; return; }
    b.hidden = false;
    b.textContent = t;
  }

  function typeName(t) {
    return t === 'life' ? '生活' : t === 'read' ? '读书' : '笔记';
  }

  function visiblePosts() {
    var q = S.query.trim().toLowerCase();
    return S.posts.filter(function (p) {
      if (S.filter !== 'all' && (p.type || 'note') !== S.filter) return false;
      if (!q) return true;
      return (p.title + ' ' + (p.tags || []).join(' ') + ' ' + (p.cat || '') + ' ' + (p.desc || ''))
        .toLowerCase().indexOf(q) >= 0;
    });
  }

  function renderList() {
    var ul = $('#postList');
    if (!ul) return;
    var list = visiblePosts();
    $('#postEmpty').hidden = list.length > 0;
    ul.innerHTML = list.map(function (p) {
      var on = S.current && S.current.path === p.path ? ' is-on' : '';
      return '<li><button class="ps-item' + on + '" data-path="' + esc(p.path) + '" type="button">' +
        '<b>' + esc(p.title) + '</b>' +
        '<span><i class="ps-type">' + typeName(p.type) + '</i>' + fmtDate(p.date) + ' · ' + num(p.words) + ' 字</span>' +
        '</button></li>';
    }).join('');
    $$('.ps-item', ul).forEach(function (b) {
      b.addEventListener('click', function () { openPost(b.dataset.path); });
    });
  }

  function initPostsUI() {
    $('#postFilter').addEventListener('input', function (e) {
      S.query = e.target.value;
      renderList();
    });
    $$('.ps-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        $$('.ps-tab').forEach(function (x) { x.classList.remove('is-on'); });
        t.classList.add('is-on');
        S.filter = t.dataset.filter;
        renderList();
      });
    });
    $$('[data-new-post]').forEach(function (b) {
      b.addEventListener('click', function () { if ($('#pane-posts').classList.contains('is-on')) newPost(); else { switchPane('posts'); newPost(); } });
    });
    $('#peSave').addEventListener('click', savePost);
    $('#peDelete').addEventListener('click', deletePost);
    $('#pePreview').addEventListener('click', togglePreview);
    $('#pvClose').addEventListener('click', togglePreview);
    $('#mdInput').addEventListener('input', onEdit);
    $$('#mdBar button').forEach(function (b) {
      b.addEventListener('click', function () { mdAction(b.dataset.md); });
    });
    ['fmTitle', 'fmDate', 'fmType', 'fmCat', 'fmTags', 'fmDesc'].forEach(function (id) {
      var el = $('#' + id);
      if (el) el.addEventListener('input', function () { markDirty(); });
      if (el) el.addEventListener('change', function () { markDirty(); });
    });
  }

  function fetchRaw(path) {
    if (S.bodies[path] != null) return Promise.resolve(S.bodies[path]);

    function viaApi() {
      var url = API + '/repos/' + cfg.repo + '/contents/' + encodeURI(path) + '?ref=' + cfg.branch;
      var headers = { 'Accept': 'application/vnd.github+json' };
      if (S.token) headers['Authorization'] = 'Bearer ' + S.token;
      return fetch(url, { headers: headers, cache: 'no-store' }).then(function (r) {
        if (!r.ok) {
          throw new Error(r.status === 403 ? '匿名额度用完了，连上 Token 就能继续' : 'HTTP ' + r.status);
        }
        return r.json();
      }).then(function (d) { return b64dec(d.content || ''); });
    }

    var chain;
    if (S.token) {
      chain = viaApi();
    } else {
      // 没连 Token 时先走 raw（无每小时配额），拿不到再退回 API
      var rawUrl = RAW + cfg.repo + '/' + cfg.branch + '/' +
        path.split('/').map(encodeURIComponent).join('/');
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
      chain = fetch(rawUrl, { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
        .then(function (r) {
          clearTimeout(timer);
          if (!r.ok) throw new Error('raw ' + r.status);
          return r.text();
        })
        .catch(function () { clearTimeout(timer); return viaApi(); });
    }

    return chain.then(function (txt) {
      S.bodies[path] = txt;
      return txt;
    });
  }

  function parseFront(text) {
    var m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!m) return { fm: {}, body: text };
    var fm = {};
    m[1].split('\n').forEach(function (line) {
      var mm = line.match(/^([\w.-]+):\s*(.*)$/);
      if (mm) fm[mm[1]] = yamlScalar(mm[2]);
    });
    return { fm: fm, body: text.slice(m[0].length) };
  }

  function serialize(fm, body) {
    var order = ['layout', 'title', 'date', 'type', 'categories', 'tags', 'description'];
    var lines = ['---'];
    order.forEach(function (k) {
      if (fm[k] != null && fm[k] !== '') {
        if (Array.isArray(fm[k])) lines.push(k + ': [' + fm[k].join(', ') + ']');
        else lines.push(k + ': ' + yamlOut(fm[k]));
      }
    });
    Object.keys(fm).forEach(function (k) {
      if (order.indexOf(k) >= 0) return;
      if (fm[k] == null || fm[k] === '') return;
      if (Array.isArray(fm[k])) lines.push(k + ': [' + fm[k].join(', ') + ']');
      else lines.push(k + ': ' + yamlOut(fm[k]));
    });
    lines.push('---');
    return lines.join('\n') + '\n\n' + body.replace(/^\n+/, '');
  }

  function openPost(path) {
    var meta = S.posts.filter(function (p) { return p.path === path; })[0];
    $('#peEmpty').hidden = true;
    $('#peWrap').hidden = false;
    $('#pePath').value = path;
    setFlag('读取中…', '');
    $('#fmTitle').value = meta ? meta.title : '';
    $('#fmDate').value = meta ? meta.date : todayStr();
    $('#fmType').value = meta ? (meta.type || 'note') : 'note';
    $('#fmCat').value = meta ? (meta.cat || '') : '';
    $('#fmTags').value = meta ? (meta.tags || []).join(', ') : '';
    $('#fmDesc').value = meta ? (meta.desc || '') : '';
    $('#mdInput').value = '';

    renderList();

    fetchRaw(path).then(function (text) {
      var p = parseFront(text);
      S.current = { path: path, fm: p.fm, body: p.body, meta: meta };
      fillForm(p.fm, p.body);
      setFlag('已打开', 'is-saved');
      S.dirty = false;
    }).catch(function (e) {
      // 没有原文时退回元数据（只读预览）
      S.current = { path: path, fm: {}, body: '', meta: meta, readonly: true };
      $('#mdInput').value = '（原文没取到：' + e.message + '）\n\n连上 Token 之后一定能读到。';
      setFlag('读取失败', '');
    });
  }

  function fillForm(fm, body) {
    $('#fmTitle').value = fm.title || '';
    $('#fmDate').value = fm.date ? String(fm.date).slice(0, 10) : todayStr();
    $('#fmType').value = fm.type || 'note';
    $('#fmCat').value = Array.isArray(fm.categories) ? fm.categories[0] : (fm.categories || '');
    $('#fmTags').value = Array.isArray(fm.tags) ? fm.tags.join(', ') : (fm.tags || '');
    $('#fmDesc').value = fm.description || '';
    $('#mdInput').value = body || '';
    updateCount();
    if (!$('#pePreviewPane').hidden) renderPreview();
  }

  function newPost() {
    var d = new Date();
    var path = cfg.postsDir + '/' + todayStr(d) + '-untitled.md';
    var fm = {
      layout: 'post',
      title: '',
      date: todayStr(d),
      type: cfg.defaults.type || 'note',
      categories: cfg.defaults.categories || '笔记',
      tags: cfg.defaults.tags || '',
      description: ''
    };
    S.current = { path: path, fm: fm, body: '', isNew: true };
    $('#peEmpty').hidden = true;
    $('#peWrap').hidden = false;
    $('#pePath').value = path;
    fillForm(fm, '');
    setFlag('新文章', 'is-dirty');
    S.dirty = true;
    $('#fmTitle').focus();
    if (!$('#pePreviewPane').hidden) renderPreview();
  }

  function collect() {
    var title = $('#fmTitle').value.trim();
    var date = $('#fmDate').value || todayStr();
    var type = $('#fmType').value;
    var cat = $('#fmCat').value.trim() || cfg.defaults.categories || '笔记';
    var tags = $('#fmTags').value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
    var desc = $('#fmDesc').value.trim();
    var fm = {
      layout: 'post',
      title: title || '未命名',
      date: date,
      type: type,
      categories: cat,
      tags: tags,
      description: desc
    };
    return { fm: fm, body: $('#mdInput').value };
  }

  function slugify(s) {
    var t = String(s || '').trim().toLowerCase()
      .replace(/[\u4e00-\u9fa5]/g, function (c) { return c; })
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (/[\u4e00-\u9fa5]/.test(t)) {
      // 中文标题没有拼音数据，退回时间戳
      t = 'post-' + Date.now().toString(36);
    }
    return t || ('post-' + Date.now().toString(36));
  }

  function onEdit() {
    markDirty();
    updateCount();
    if (!$('#pePreviewPane').hidden) renderPreview();
    clearTimeout(onEdit._t);
    onEdit._t = setTimeout(saveDraft, 900);
  }

  function markDirty() {
    S.dirty = true;
    setFlag('未保存', 'is-dirty');
  }
  function setFlag(text, cls) {
    var el = $('#peFlag');
    el.textContent = text;
    el.className = 'pe-flag ' + (cls || '');
  }

  function updateCount() {
    var v = $('#mdInput').value;
    var w = wordCount(v);
    var min = Math.max(1, Math.round(w / 350));
    $('#mdCount').textContent = num(w) + ' 字 · 约 ' + min + ' 分钟读完';
  }

  function draftKey(path) { return 'yy-draft:' + path; }

  function saveDraft() {
    if (!S.current) return;
    try {
      localStorage.setItem(draftKey(S.current.path), $('#mdInput').value);
      var f = $('#mdDraft');
      f.hidden = false;
      clearTimeout(saveDraft._t);
      saveDraft._t = setTimeout(function () { f.hidden = true; }, 2000);
    } catch (e) {}
  }

  function checkDraft(path) {
    var d = null;
    try { d = localStorage.getItem(draftKey(path)); } catch (e) {}
    if (!d) return;
    if (d === $('#mdInput').value) return;
    toast('发现本地草稿，已恢复（保存后覆盖）');
    $('#mdInput').value = d;
    updateCount();
    if (!$('#pePreviewPane').hidden) renderPreview();
  }

  function renderPreview() {
    var body = $('#mdInput').value;
    var html = window.YYMD ? YYMD.render(body) : '<p>' + esc(body) + '</p>';
    var title = $('#fmTitle').value.trim();
    var desc = $('#fmDesc').value.trim();
    var head = (title ? '<h1>' + esc(title) + '</h1>' : '') +
      (desc ? '<p style="color:var(--w-mute);font-size:.86rem;border-left:2px solid var(--w-line);padding-left:10px">' + esc(desc) + '</p>' : '');
    $('#pvBody').innerHTML = head + html;
  }

  function togglePreview() {
    var pane = $('#pePreviewPane');
    pane.hidden = !pane.hidden;
    if (!pane.hidden) renderPreview();
  }

  function savePost() {
    if (!S.current) return;
    if (!S.token) { toast('先连上 Token 才能保存', 'err'); switchPane('dash'); $('#tokenInput').focus(); return; }
    var data = collect();
    var path = $('#pePath').value.trim() || S.current.path;
    if (!/\.md$/.test(path)) path += '.md';
    var title = data.fm.title;
    if (!title || title === '未命名') { toast('先给文章起个标题', 'err'); $('#fmTitle').focus(); return; }
    if (S.current.isNew || S.current.path !== path) {
      path = cfg.postsDir + '/' + data.fm.date + '-' + slugify(title) + '.md';
      $('#pePath').value = path;
    }
    var text = serialize(data.fm, data.body);
    var msg = (S.current.isNew ? 'post: 新增《' : 'post: 更新《') + title + '》';

    $('#peSave').disabled = true;
    setFlag('保存中…', '');
    getFile(path).then(function (cur) {
      return cur ? cur.sha : null;
    }, function () { return null; })
      .then(function (sha) { return putFile(path, text, msg, sha); })
      .then(function () {
        setFlag('已保存', 'is-saved');
        S.dirty = false;
        S.current.isNew = false;
        S.current.path = path;
        S.bodies[path] = text;
        try { localStorage.removeItem(draftKey(path)); } catch (e) {}
        toast('保存好了，GitHub Pages 一会儿就会更新', 'ok');
        bumpTodayWords(wordCount(data.body));
        // 本地先更新列表，不等 Pages 重新生成索引
        var slug = path.replace(/^.*\//, '').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
        S.posts = S.posts.filter(function (p) { return p.path !== path; });
        S.posts.unshift({
          path: path,
          url: '/posts/' + slug + '/',
          title: data.fm.title,
          date: data.fm.date,
          type: data.fm.type,
          cat: Array.isArray(data.fm.categories) ? data.fm.categories[0] : data.fm.categories,
          tags: data.fm.tags || [],
          desc: data.fm.description || '',
          words: wordCount(data.body)
        });
        renderList();
        renderDash();
        renderDashRecent();
        // 索引要等 Pages 重新构建，90 秒后再去对一次
        setTimeout(loadPosts, 90000);
      })
      .catch(function (e) {
        setFlag('保存失败', 'is-dirty');
        toast('保存失败：' + e.message, 'err');
      })
      .then(function () { $('#peSave').disabled = false; });
  }

  function deletePost() {
    if (!S.current) return;
    var path = S.current.path;
    var title = S.current.fm.title || path;
    modal({
      title: '删掉这篇？',
      html: '<p>《' + esc(title) + '》会从仓库里删除，再提交一次。</p><p class="dim">删错了得去 GitHub 找回历史版本。</p>',
      buttons: [
        { label: '算了' },
        { label: '删除', type: 'danger', onClick: function () {
          getFile(path).then(function (cur) {
            if (!cur) throw new Error('文件不存在');
            return delFile(path, cur.sha, 'post: 删除《' + title + '》');
          }).then(function () {
            toast('删掉了');
            S.current = null;
            $('#peWrap').hidden = true;
            $('#peEmpty').hidden = false;
            delete S.bodies[path];
            S.posts = S.posts.filter(function (p) { return p.path !== path; });
            renderList();
            renderDash();
            renderDashRecent();
            setTimeout(loadPosts, 90000);
          }).catch(function (e) { toast('删除失败：' + e.message, 'err'); });
        } }
      ]
    });
  }

  /* ---------------- 今日字数 ---------------- */
  function bumpTodayWords(n) {
    try {
      var k = 'yy-words:' + todayStr();
      var v = Number(localStorage.getItem(k) || 0) + n;
      localStorage.setItem(k, v);
    } catch (e) {}
    renderGoal();
  }
  function todayWords() {
    var v = 0;
    try { v = Number(localStorage.getItem('yy-words:' + todayStr()) || 0); } catch (e) {}
    return v;
  }

  /* ---------------- 仪表盘 ---------------- */
  function renderGoal() {
    var total = S.posts.reduce(function (a, p) { return a + (p.words || 0); }, 0);
    var cap = cfg.targetWords || 100000;
    var pct = Math.min(1, total / cap);
    var ring = $('#goalRing');
    if (ring) {
      var len = 2 * Math.PI * 52;
      ring.style.strokeDasharray = len;
      ring.style.strokeDashoffset = len * (1 - pct);
    }
    var numEl = $('.goal-num');
    if (numEl) {
      numEl.innerHTML = '<b>' + (total >= 10000 ? (total / 10000).toFixed(1) + '万' : num(total)) +
        '</b><span>字 / ' + (cap >= 10000 ? (cap / 10000) + ' 万' : num(cap)) + '</span>';
    }
    var h3 = $('.goal-text h3');
    if (h3) h3.textContent = '巢的厚度';
    var say = $('#goalSay');
    if (say) {
      var tw = todayWords();
      say.innerHTML = tw
        ? '今天已经衔了 <b>' + num(tw) + '</b> 字。'
        : '今天还没开工。写 200 字就算起了个头。';
    }
  }

  function renderDash() {
    renderGoal();
    var posts = S.posts.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var words = posts.reduce(function (a, p) { return a + (p.words || 0); }, 0);
    var days = 0;
    try {
      var since = new Date('2026-03-20');
      days = Math.max(0, Math.round((Date.now() - since) / 86400000));
    } catch (e) {}
    var tags = {};
    posts.forEach(function (p) { (p.tags || []).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; }); });

    $('#dashStats').innerHTML = [
      cell(posts.length, '篇文章', '篇目'),
      cell(words >= 10000 ? (words / 10000).toFixed(1) + '万' : num(words), '总字数', '约 ' + Math.round(words / 350) + ' 分钟读完'),
      cell(Object.keys(tags).length, '个标签', '最常用：' + (Object.keys(tags).sort(function (a, b) { return tags[b] - tags[a]; })[0] || '—')),
      cell(days, '天在檐下', '从 2026.03.20 起')
    ].join('');
  }

  function cell(n, label, sub) {
    return '<div class="stat-cell"><b>' + n + '</b><span>' + label + '</span>' + (sub ? '<em>' + esc(sub) + '</em>' : '') + '</div>';
  }

  function renderDashRecent() {
    var ul = $('#dashRecent');
    if (!ul) return;
    var list = S.posts.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 5);
    ul.innerHTML = list.map(function (p) {
      return '<li><i class="r-dot"></i><a href="' + cfg.base + p.url + '" target="_blank" rel="noopener">' +
        esc(p.title) + '</a><time>' + fmtDate(p.date).slice(5) + '</time></li>';
    }).join('') || '<li class="dim">还没有文章</li>';
  }

  function initDash() {
    $$('[data-quick]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.quick;
        if (k === 'new') { switchPane('posts'); newPost(); }
        else if (k === 'murmur') { switchPane('settings'); $$('.set-nav-btn').forEach(function (x) { x.classList.toggle('is-on', x.dataset.set === 'murmur'); }); openSetting('murmur'); }
        else if (k === 'upload') { switchPane('media'); }
        else if (k === 'build') { switchPane('deploy'); }
        else if (k === 'random') {
          var p = S.posts[Math.floor(Math.random() * S.posts.length)];
          if (p) window.open(cfg.base + p.url, '_blank', 'noopener');
        } else if (k === 'site') {
          window.open(cfg.base + '/', '_blank', 'noopener');
        }
      });
    });
  }

  /* ---------------- 统计 ---------------- */
  function renderStats() {
    if (!S.posts.length) return;
    var posts = S.posts.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var words = posts.reduce(function (a, p) { return a + (p.words || 0); }, 0);
    var longest = posts.slice().sort(function (a, b) { return (b.words || 0) - (a.words || 0); })[0] || { title: '—', words: 0 };
    var months = {};
    posts.forEach(function (p) {
      var m = p.date.slice(0, 7);
      months[m] = (months[m] || 0) + 1;
    });
    var mKeys = Object.keys(months).sort();
    var recent = mKeys.length ? months[mKeys[mKeys.length - 1]] : 0;

    $('#statsCards').innerHTML = [
      cell(posts.length, '篇文章', '平均 ' + Math.round(words / (posts.length || 1)) + ' 字'),
      cell(words >= 10000 ? (words / 10000).toFixed(1) + '万' : num(words), '总字数', '每天约 ' + Math.round(words / 240) + ' 字'),
      cell(recent, '本月更新', mKeys.length ? mKeys[mKeys.length - 1].replace('-', ' 年 ') + ' 月' : '—'),
      cell(longest.words ? num(longest.words) : 0, '最长一篇', longest.title)
    ].join('');

    renderHeat(posts);
    renderBars(posts);

    var tb = $('#statsTable tbody');
    tb.innerHTML = posts.slice(0, 8).map(function (p, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(p.title) + '</td><td>' + fmtDate(p.date) +
        '</td><td class="ta-r">' + num(p.words) + '</td></tr>';
    }).join('');

    runHealth(false);
  }

  function renderHeat(posts) {
    var byDate = {};
    posts.forEach(function (p) { byDate[p.date] = (byDate[p.date] || 0) + (p.words || 0); });
    var weeks = 26;
    var CELL = 16; // 13px 格 + 3px 间距
    var end = new Date();
    var endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    var start = new Date(endDay.getTime() - (weeks * 7 - 1) * 86400000);
    var dow = (start.getDay() + 6) % 7;
    start = new Date(start.getTime() - dow * 86400000);

    var cells = [];
    var marks = [];  // 每个月份从第几列开始
    var lastMonth = -1;
    for (var i = 0; i < weeks * 7 + dow; i++) {
      var d = new Date(start.getTime() + i * 86400000);
      var key = todayStr(d);
      var w = byDate[key] || 0;
      var lv = w === 0 ? 0 : w < 400 ? 1 : w < 900 ? 2 : w < 1600 ? 3 : 4;
      cells.push('<i class="heat-cell" data-lv="' + lv + '" title="' + key + (w ? ' · ' + num(w) + ' 字' : ' · 没写') + '"></i>');
      if (i % 7 === 0 && d.getMonth() !== lastMonth) {
        marks.push({ col: Math.floor(i / 7), label: (d.getMonth() + 1) + '月' });
        lastMonth = d.getMonth();
      }
    }
    $('#heatGrid').innerHTML = cells.join('');

    var totalWeeks = Math.ceil((weeks * 7 + dow) / 7);
    var marks2 = marks.filter(function (m, i) {
      var next = i + 1 < marks.length ? marks[i + 1].col : totalWeeks;
      return next - m.col >= 3;   // 首尾不满三周的月份不标，免得挤在一起
    });
    var out = '', cursor = 0;
    marks2.forEach(function (m, i) {
      var next = i + 1 < marks2.length ? marks2[i + 1].col : totalWeeks;
      if (m.col > cursor) out += '<span style="width:' + ((m.col - cursor) * CELL) + 'px"></span>';
      out += '<span style="width:' + ((next - m.col) * CELL) + 'px">' + m.label + '</span>';
      cursor = next;
    });
    $('#heatMonth').innerHTML = out;
  }

  function renderBars(posts) {
    var cat = {}, tag = {};
    posts.forEach(function (p) {
      cat[p.cat || '未分类'] = (cat[p.cat || '未分类'] || 0) + 1;
      (p.tags || []).forEach(function (t) { tag[t] = (tag[t] || 0) + 1; });
    });
    var rows = [];
    Object.keys(cat).sort(function (a, b) { return cat[b] - cat[a]; }).forEach(function (k) {
      rows.push(bar(k, cat[k], posts.length, '栏目'));
    });
    Object.keys(tag).sort(function (a, b) { return tag[b] - tag[a]; }).slice(0, 6).forEach(function (k) {
      rows.push(bar('#' + k, tag[k], posts.length, '标签'));
    });
    $('#statsBars').innerHTML = rows.join('');
  }
  function bar(name, n, total, kind) {
    var pct = Math.round(n / (total || 1) * 100);
    return '<div class="bar-row" title="' + kind + '：' + esc(name) + '"><span>' + esc(name) + '</span>' +
      '<span class="bar-track"><i class="bar-fill" style="width:' + pct + '%"></i></span>' +
      '<em>' + n + '</em></div>';
  }

  function runHealth(animate) {
    if (!S.posts.length) return;
    var issues = [];
    var noDesc = S.posts.filter(function (p) { return !p.desc; });
    var noTag = S.posts.filter(function (p) { return !(p.tags || []).length; });
    var shortTitle = S.posts.filter(function (p) { return String(p.title).length < 6; });
    var longTitle = S.posts.filter(function (p) { return String(p.title).length > 34; });
    var thin = S.posts.filter(function (p) { return (p.words || 0) < 300; });
    var old = S.posts.filter(function (p) {
      return (Date.now() - new Date(p.date).getTime()) > 86400000 * 120;
    });

    function item(state, label, n) {
      return '<div class="health-item ' + state + '"><i></i><b>' + label + '</b><span>' + n + '</span></div>';
    }
    issues.push(noDesc.length ? item('warn', '缺摘要', noDesc.length + ' 篇') : item('ok', '摘要齐全', '全部'));
    issues.push(noTag.length ? item('warn', '没有标签', noTag.length + ' 篇') : item('ok', '标签齐全', '全部'));
    issues.push(thin.length ? item('warn', '少于 300 字', thin.length + ' 篇') : item('ok', '篇幅都不短', '全部'));
    issues.push(longTitle.length ? item('warn', '标题偏长', longTitle.length + ' 篇') : item('ok', '标题长度合适', '全部'));
    issues.push(shortTitle.length ? item('warn', '标题偏短', shortTitle.length + ' 篇') : item('ok', '标题都有辨识度', '全部'));
    issues.push(old.length ? item('bad', '超过 120 天没更新', old.length + ' 篇') : item('ok', '最近有更新', '✓'));
    issues.push(S.posts.length ? item('ok', '文章索引可读', S.posts.length + ' 篇') : item('bad', '没有文章', '0'));

    $('#healthList').innerHTML = issues.join('');
    if (animate) toast('扫完了');
  }

  /* ---------------- 媒体 ---------------- */
  function loadMedia() {
    if (!S.token) { $('#mediaEmpty').hidden = false; return; }
    gh('/repos/' + cfg.repo + '/contents/' + cfg.mediaDir + '?ref=' + cfg.branch)
      .then(function (list) {
        S.media = (list || []).filter(function (f) { return f.type === 'file' && /\.(png|jpe?g|webp|svg|gif)$/i.test(f.name); });
        renderMedia();
      })
      .catch(function () { S.media = []; renderMedia(); });
  }

  function renderMedia() {
    var g = $('#mediaGrid');
    $('#mediaEmpty').hidden = S.media.length > 0;
    g.innerHTML = S.media.map(function (f, i) {
      var raw = RAW + cfg.repo + '/' + cfg.branch + '/' + f.path;
      return '<div class="media-item" data-i="' + i + '">' +
        '<img src="' + raw + '" alt="' + esc(f.name) + '" loading="lazy">' +
        '<div class="media-meta"><b>' + esc(f.name) + '</b>' + Math.round((f.size || 0) / 1024) + ' KB</div>' +
        '<div class="media-acts"><button type="button" data-act="copy">插入</button><button type="button" data-act="del">删</button></div>' +
        '</div>';
    }).join('');
    $$('.media-item', g).forEach(function (el) {
      var f = S.media[+el.dataset.i];
      el.querySelector('[data-act="copy"]').addEventListener('click', function () {
        var md = '![' + f.name.replace(/\.[^.]+$/, '') + '](/' + f.path + ')';
        navigator.clipboard.writeText(md).then(function () { toast('已复制 Markdown，粘到正文即可', 'ok'); });
      });
      el.querySelector('[data-act="del"]').addEventListener('click', function () {
        modal({
          title: '删掉这张图？',
          html: '<p>' + esc(f.name) + '</p><p class="dim">文章里引用它的地方会变成空白。</p>',
          buttons: [
            { label: '算了' },
            { label: '删除', type: 'danger', onClick: function () {
              delFile(f.path, f.sha, 'media: 删除 ' + f.name).then(function () {
                toast('删了'); loadMedia();
              }).catch(function (e) { toast(e.message, 'err'); });
            } }
          ]
        });
      });
    });
  }

  function initMedia() {
    var zone = $('#uploadZone');
    var input = $('#uploadInput');
    zone.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { uploadFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('is-over'); });
    });
    zone.addEventListener('drop', function (e) {
      if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
    });
  }

  function compress(file, maxKB) {
    if (file.size <= maxKB * 1024 || /svg/i.test(file.type)) return Promise.resolve(file);
    return new Promise(function (resolve) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var scale = Math.min(1, 1600 / Math.max(img.width, img.height));
        var c = doc.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { resolve(b && b.size < file.size ? b : file); }, 'image/jpeg', .82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function fileToB64(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1]); };
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  function uploadFiles(files) {
    if (!S.token) { toast('先连上 Token 才能传图', 'err'); return; }
    var arr = Array.prototype.slice.call(files).filter(function (f) { return /^image\//.test(f.type); });
    if (!arr.length) { toast('只收图片', 'err'); return; }
    var prog = $('#uploadProgress');
    prog.hidden = false;
    var done = 0;

    function step() {
      if (!arr.length) {
        prog.hidden = true;
        $('#upBar').style.width = '0';
        toast('传完了', 'ok');
        loadMedia();
        return;
      }
      var f = arr.shift();
      var name = f.name.replace(/[^\w.\-\u4e00-\u9fa5]/g, '-');
      var path = cfg.mediaDir + '/' + name;
      compress(f, 600).then(fileToB64).then(function (b64) {
        var body = { message: 'media: 上传 ' + name, content: b64, branch: cfg.branch };
        return getFile(path).then(function (cur) {
          if (cur) body.sha = cur.sha;
          return gh('/repos/' + cfg.repo + '/contents/' + encodeURI(path), { method: 'PUT', body: body });
        });
      }).then(function () {
        done++;
        $('#upBar').style.width = Math.round(done / (done + arr.length) * 100) + '%';
        $('#upText').textContent = '已传 ' + done + ' 张…';
        step();
      }).catch(function (e) {
        toast('上传失败：' + e.message, 'err');
        step();
      });
    }
    step();
  }

  /* ---------------- 设置 ---------------- */
  var SET_FILES = {
    announce: { file: '_data/settings.yml', title: '公告栏' },
    now: { file: '_data/settings.yml', title: '此刻' },
    social: { file: '_data/settings.yml', title: '社交' },
    friends: { file: '_data/friends.yml', title: '友链' },
    murmur: { file: '_data/murmurs.yml', title: '碎语' },
    quotes: { file: '_data/quotes.yml', title: '今日一句' },
    password: { file: '_data/workbench.yml', title: '访问密码' }
  };
  var ymlCache = {};

  function loadYml(file) {
    if (ymlCache[file]) return Promise.resolve(ymlCache[file]);
    return getFile(file).then(function (f) {
      var text = b64dec(f.content);
      var obj = yamlParse(text);
      ymlCache[file] = { obj: obj, sha: f.sha, text: text };
      return ymlCache[file];
    });
  }

  function saveYml(file, obj, msg) {
    var text = yamlDump(obj);
    return getFile(file).then(function (f) {
      return putFile(file, text, msg, f.sha);
    }).then(function () {
      delete ymlCache[file];
      toast('保存了，等构建完成就生效', 'ok');
    }).catch(function (e) {
      toast('保存失败：' + e.message, 'err');
    });
  }

  function field(label, id, val, type) {
    return '<div class="set-row"><label>' + label + '</label><input type="' + (type || 'text') + '" id="' + id + '" value="' + esc(val == null ? '' : val) + '"></div>';
  }
  function area(label, id, val, rows) {
    return '<div class="set-row"><label>' + label + '</label><textarea id="' + id + '" rows="' + (rows || 3) + '">' + esc(val == null ? '' : val) + '</textarea></div>';
  }

  function openSetting(key) {
    $$('.set-nav-btn').forEach(function (b) { b.classList.toggle('is-on', b.dataset.set === key); });
    var body = $('#setBody');
    if (!S.token) {
      body.innerHTML = '<p class="set-loading">先连上 Token，才能读写 <code>_data/</code> 里的文件。</p>';
      return;
    }
    var spec = SET_FILES[key];
    body.innerHTML = '<p class="set-loading">读 ' + spec.file + ' …</p>';
    loadYml(spec.file).then(function (data) {
      body.innerHTML = renderSetting(key, data.obj, spec);
      bindSetting(key, spec, data);
    }).catch(function (e) {
      body.innerHTML = '<p class="set-loading">读不到：' + esc(e.message) + '</p>';
    });
  }

  function renderSetting(key, obj, spec) {
    var notice = '<p class="set-note">保存会重写整个 <code>' + spec.file + '</code> 文件，原有注释会丢。介意就直接去 GitHub 改。</p>';
    if (key === 'announce') {
      var a = obj.announcement || {};
      return notice +
        '<div class="set-row"><label>开关</label><select id="sfOn"><option value="true"' + (a.show ? ' selected' : '') + '>显示</option><option value="false"' + (!a.show ? ' selected' : '') + '>隐藏</option></select></div>' +
        area('公告内容', 'sfText', a.text, 3) +
        field('链接（可空）', 'sfLink', a.link) +
        field('链接文字', 'sfLinkText', a.link_text) +
        '<div class="set-acts"><button class="st-btn primary sm" type="button" id="sfSave">保存</button></div>';
    }
    if (key === 'now') {
      var n = obj.now || {};
      return notice +
        field('在做', 'sfDoing', n.doing) +
        field('在读', 'sfReading', n.reading) +
        field('在听', 'sfList', n.listening) +
        field('更新时间', 'sfUpd', n.updated, 'date') +
        '<div class="set-acts"><button class="st-btn primary sm" type="button" id="sfSave">保存</button></div>';
    }
    if (key === 'social') {
      var s = obj.social || {};
      return notice +
        field('GitHub', 'sfGh', s.github, 'url') +
        field('邮箱', 'sfMail', s.email) +
        field('RSS', 'sfRss', s.rss) +
        field('微博', 'sfWeibo', s.weibo, 'url') +
        field('小红书', 'sfXhs', s.xiaohongshu, 'url') +
        field('哔哩哔哩', 'sfBili', s.bilibili, 'url') +
        '<div class="set-acts"><button class="st-btn primary sm" type="button" id="sfSave">保存</button></div>';
    }
    if (key === 'friends') {
      return notice + '<div class="set-repeater" id="sfRep">' + (obj || []).map(repFriend).join('') + '</div>' +
        '<div class="set-acts"><button class="st-btn ghost sm" type="button" id="sfAdd">加一条</button>' +
        '<button class="st-btn primary sm" type="button" id="sfSave">保存</button></div>';
    }
    if (key === 'murmur') {
      return notice + '<div class="set-repeater" id="sfRep">' + (obj || []).map(repMurmur).join('') + '</div>' +
        '<div class="set-acts"><button class="st-btn ghost sm" type="button" id="sfAdd">加一条</button>' +
        '<button class="st-btn primary sm" type="button" id="sfSave">保存</button></div>';
    }
    if (key === 'quotes') {
      return notice + '<div class="set-repeater" id="sfRep">' + (obj || []).map(repQuote).join('') + '</div>' +
        '<div class="set-acts"><button class="st-btn ghost sm" type="button" id="sfAdd">加一条</button>' +
        '<button class="st-btn primary sm" type="button" id="sfSave">保存</button></div>';
    }
    if (key === 'password') {
      return notice +
        '<div class="set-row"><label>新密码</label><input type="password" id="sfPwd" placeholder="至少 6 位"></div>' +
        '<div class="set-row"><label>再输一次</label><input type="password" id="sfPwd2" placeholder="再输一次"></div>' +
        '<p class="set-note">改完这里，下次进工作台就用新密码。</p>' +
        '<div class="set-acts"><button class="st-btn primary sm" type="button" id="sfSave">保存</button></div>';
    }
    return '';
  }

  function repFriend(f) {
    var tints = [['blue', '蓝'], ['green', '绿'], ['warm', '暖'], ['plum', '绛']];
    return '<div class="set-rep-item" data-rep="friend">' +
      '<button class="set-rep-del" type="button" title="删掉">✕</button>' +
      '<input type="text" data-k="name" placeholder="站点名" value="' + esc(f.name) + '">' +
      '<input type="text" data-k="url" placeholder="https://" value="' + esc(f.url) + '">' +
      '<input type="text" data-k="desc" placeholder="一句话介绍" value="' + esc(f.desc) + '">' +
      '<select data-k="tint">' + tints.map(function (t) {
        return '<option value="' + t[0] + '"' + (f.tint === t[0] ? ' selected' : '') + '>' + t[1] + '色</option>';
      }).join('') + '</select>' +
      '</div>';
  }
  function repMurmur(m) {
    var moods = [['calm', '平静'], ['joy', '开心'], ['think', '在想'], ['tired', '累']];
    return '<div class="set-rep-item" data-rep="murmur">' +
      '<button class="set-rep-del" type="button" title="删掉">✕</button>' +
      '<input type="text" data-k="date" placeholder="2026-11-02 21:40" value="' + esc(m.date) + '">' +
      '<select data-k="mood">' + moods.map(function (x) {
        return '<option value="' + x[0] + '"' + (m.mood === x[0] ? ' selected' : '') + '>' + x[1] + '</option>';
      }).join('') + '</select>' +
      '<textarea data-k="text" rows="3" placeholder="写点什么">' + esc(m.text) + '</textarea>' +
      '<input type="text" data-k="tags" placeholder="标签，用逗号隔开" value="' + esc((m.tags || []).join(', ')) + '">' +
      '</div>';
  }
  function repQuote(q) {
    return '<div class="set-rep-item" data-rep="quote">' +
      '<button class="set-rep-del" type="button" title="删掉">✕</button>' +
      '<textarea data-k="text" rows="2" placeholder="句子">' + esc(q.text) + '</textarea>' +
      '<input type="text" data-k="from" placeholder="出处" value="' + esc(q.from) + '">' +
      '</div>';
  }

  function bindSetting(key, spec, data) {
    var body = $('#setBody');
    $$('.set-rep-del', body).forEach(function (b) {
      b.addEventListener('click', function () { b.parentNode.remove(); });
    });
    var add = $('#sfAdd', body);
    if (add) {
      add.addEventListener('click', function () {
        var rep = $('#sfRep', body);
        var tpl = key === 'friends' ? repFriend({ name: '', url: '', desc: '', tint: 'blue' })
          : key === 'murmur' ? repMurmur({ date: todayStr() + ' 20:00', mood: 'calm', text: '', tags: [] })
            : repQuote({ text: '', from: '' });
        rep.insertAdjacentHTML('beforeend', tpl);
        $$('.set-rep-del', rep).forEach(function (b) {
          b.onclick = function () { b.parentNode.remove(); };
        });
      });
    }
    var save = $('#sfSave', body);
    if (!save) return;
    save.addEventListener('click', function () {
      save.disabled = true;
      var obj = data.obj;
      var msg = 'chore: 更新 ' + spec.title;

      if (key === 'announce') {
        obj.announcement = obj.announcement || {};
        obj.announcement.show = $('#sfOn').value === 'true';
        obj.announcement.text = $('#sfText').value.trim();
        obj.announcement.link = $('#sfLink').value.trim();
        obj.announcement.link_text = $('#sfLinkText').value.trim();
      } else if (key === 'now') {
        obj.now = {
          doing: $('#sfDoing').value.trim(),
          reading: $('#sfReading').value.trim(),
          listening: $('#sfList').value.trim(),
          updated: $('#sfUpd').value || todayStr()
        };
      } else if (key === 'social') {
        obj.social = {
          github: $('#sfGh').value.trim(),
          email: $('#sfMail').value.trim(),
          rss: $('#sfRss').value.trim(),
          weibo: $('#sfWeibo').value.trim(),
          xiaohongshu: $('#sfXhs').value.trim(),
          bilibili: $('#sfBili').value.trim()
        };
      } else if (key === 'friends') {
        obj = $$('#sfRep [data-rep="friend"]', body).map(function (el) {
          return {
            name: el.querySelector('[data-k="name"]').value.trim(),
            url: el.querySelector('[data-k="url"]').value.trim(),
            desc: el.querySelector('[data-k="desc"]').value.trim(),
            tint: el.querySelector('[data-k="tint"]').value
          };
        }).filter(function (x) { return x.name && x.url; });
      } else if (key === 'murmur') {
        obj = $$('#sfRep [data-rep="murmur"]', body).map(function (el) {
          return {
            date: el.querySelector('[data-k="date"]').value.trim(),
            mood: el.querySelector('[data-k="mood"]').value,
            text: el.querySelector('[data-k="text"]').value.trim(),
            tags: el.querySelector('[data-k="tags"]').value.split(/[,，]/).map(function (x) {
              return x.trim();
            }).filter(Boolean)
          };
        }).filter(function (x) { return x.text; });
      } else if (key === 'quotes') {
        obj = $$('#sfRep [data-rep="quote"]', body).map(function (el) {
          return {
            text: el.querySelector('[data-k="text"]').value.trim(),
            from: el.querySelector('[data-k="from"]').value.trim()
          };
        }).filter(function (x) { return x.text; });
      } else if (key === 'password') {
        var a = $('#sfPwd').value, b = $('#sfPwd2').value;
        if (a.length < 6) { toast('密码至少 6 位', 'err'); save.disabled = false; return; }
        if (a !== b) { toast('两次输入不一样', 'err'); save.disabled = false; return; }
        sha256(a).then(function (h) {
          obj.password_sha256 = h;
          saveYml(spec.file, obj, msg).then(function () { save.disabled = false; });
        });
        return;
      }
      saveYml(spec.file, obj, msg).then(function () { save.disabled = false; });
    });
  }

  function initSettings() {
    $$('.set-nav-btn').forEach(function (b) {
      b.addEventListener('click', function () { openSetting(b.dataset.set); });
    });
  }

  /* ---------------- 发布 ---------------- */
  function loadDeploy() {
    if (!S.token) { $('#buildInfo').innerHTML = '<p class="dim">连接 Token 后显示。</p>'; return; }
    gh('/repos/' + cfg.repo + '/pages/builds/latest').then(function (b) {
      var cls = b.status === 'built' ? 'ok' : b.status === 'errored' ? 'bad' : 'run';
      var label = { built: '已构建', building: '构建中', errored: '构建失败', null: '未构建' }[b.status] || b.status;
      $('#buildInfo').innerHTML =
        '<div class="build-line"><span class="build-badge ' + cls + '">' + label + '</span>' +
        '<time>' + (b.updated_at ? relTime(b.updated_at) : '') + '</time></div>' +
        '<p class="dim">提交：' + esc((b.commit_message || '').slice(0, 80)) + '</p>' +
        '<p class="dim">提交人：' + esc(b.pusher ? (b.pusher.login || b.pusher.name || '') : '') +
        (b.duration ? ' · 用时 ' + b.duration + ' ms' : '') + '</p>';
      if (b.error && b.error.message) {
        $('#buildInfo').innerHTML += '<p class="dim" style="color:var(--w-danger)">' + esc(b.error.message) + '</p>';
      }
      if (b.status === 'building') $('#navBuildDot').hidden = false;
    }).catch(function (e) {
      $('#buildInfo').innerHTML = '<p class="dim">读不到构建状态：' + esc(e.message) + '</p>';
    });

    gh('/repos/' + cfg.repo + '/commits?per_page=8&sha=' + cfg.branch).then(function (list) {
      $('#commitList').innerHTML = (list || []).map(function (c) {
        return '<li><span class="c-sha">' + c.sha.slice(0, 7) + '</span>' +
          '<span class="c-msg" title="' + esc(c.commit.message) + '">' + esc(c.commit.message.split('\n')[0]) + '</span>' +
          '<time>' + relTime(c.commit.author.date) + '</time></li>';
      }).join('');
    }).catch(function () {});
  }

  function initDeploy() {
    $('#buildRefresh').addEventListener('click', function () { loadDeploy(); toast('刷新了'); });
    $('#buildTrigger').addEventListener('click', function () {
      if (!S.token) { toast('先连 Token', 'err'); return; }
      var btn = $('#buildTrigger');
      btn.disabled = true;
      gh('/repos/' + cfg.repo + '/pages/builds', { method: 'POST' }).then(function () {
        toast('已经请求重新构建，等两三分钟', 'ok');
        setTimeout(loadDeploy, 3000);
      }).catch(function (e) {
        toast('触发失败：' + e.message, 'err');
      }).then(function () { btn.disabled = false; });
    });
    $('#statsRefresh').addEventListener('click', function () { loadPosts().then(renderStats); });
    $('#healthRun').addEventListener('click', function () { runHealth(true); });
  }

  /* ---------------- 命令面板 ---------------- */
  function initCmd() {
    var box = $('#stCmd');
    var input = $('#cmdInput');
    var list = $('#cmdList');
    var actions = [
      { t: '写新文章', k: 'new', run: function () { switchPane('posts'); newPost(); } },
      { t: '看文章列表', k: 'posts', run: function () { switchPane('posts'); } },
      { t: '看统计', k: 'stats', run: function () { switchPane('stats'); } },
      { t: '传图片', k: 'media', run: function () { switchPane('media'); } },
      { t: '改设置', k: 'settings', run: function () { switchPane('settings'); } },
      { t: '发布状态', k: 'deploy', run: function () { switchPane('deploy'); } },
      { t: '回仪表盘', k: 'dash', run: function () { switchPane('dash'); } },
      { t: '打开线上站点', k: 'site', run: function () { window.open(cfg.base + '/', '_blank'); } },
      { t: '随机看一篇', k: 'random', run: function () {
        var p = S.posts[Math.floor(Math.random() * S.posts.length)];
        if (p) window.open(cfg.base + p.url, '_blank');
      } },
      { t: '刷新构建状态', k: 'build', run: function () { loadDeploy(); switchPane('deploy'); } },
      { t: '断开 Token', k: 'logout', run: function () { sessionStorage.removeItem('yy-gh-token'); location.reload(); } }
    ];
    var cur = 0, shown = actions;

    function render(q) {
      q = (q || '').trim().toLowerCase();
      shown = actions.filter(function (a) { return !q || a.t.toLowerCase().indexOf(q) >= 0 || a.k.indexOf(q) >= 0; });
      cur = 0;
      list.innerHTML = shown.length ? shown.map(function (a, i) {
        return '<li class="cmd-item' + (i === 0 ? ' is-on' : '') + '" data-i="' + i + '">' + esc(a.t) + '<em>' + a.k + '</em></li>';
      }).join('') : '<li class="cmd-empty">没有匹配</li>';
      $$('.cmd-item', list).forEach(function (el) {
        el.addEventListener('click', function () { run(+el.dataset.i); });
      });
    }
    function run(i) {
      var a = shown[i];
      close();
      if (a) a.run();
    }
    function open() {
      box.hidden = false;
      input.value = '';
      render('');
      setTimeout(function () { input.focus(); }, 30);
    }
    function close() { box.hidden = true; }

    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!shown.length) return;
        cur = (cur + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length;
        $$('.cmd-item', list).forEach(function (el, i) { el.classList.toggle('is-on', i === cur); });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        run(cur);
      }
    });
    $('#stCmdBtn').addEventListener('click', open);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });

    doc.addEventListener('keydown', function (e) {
      var meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); box.hidden ? open() : close(); }
      if (e.key === 'Escape') { if (!box.hidden) close(); if (!$('#stModal').hidden) closeModal(); }
      if (meta && e.key.toLowerCase() === 's') {
        if ($('#pane-posts').classList.contains('is-on') && !$('#peWrap').hidden) {
          e.preventDefault();
          savePost();
        }
      }
    });
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    initTheme();
    initNav();
    initToken();
    initPostsUI();
    initDash();
    initMedia();
    initSettings();
    initDeploy();
    initCmd();

    $('#modalClose').addEventListener('click', closeModal);
    $('#stModal').addEventListener('click', function (e) {
      if (e.target.id === 'stModal') closeModal();
    });

    var saved = sessionStorage.getItem('yy-gh-token');
    if (saved) connectToken(saved, true);
    else setConn(false, '未连接 GitHub');

    loadPosts();

    var pane = sessionStorage.getItem('yy-studio-pane') || 'dash';
    switchPane(PANE_NAME[pane] ? pane : 'dash');

    // 未保存提醒
    window.addEventListener('beforeunload', function (e) {
      if (S.dirty) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  /* ---------------- 入口 ---------------- */
  initGate();
})();

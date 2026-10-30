/* ============================================================
   燕语 · 轻量 Markdown 渲染（只给工作台预览用）
   支持：标题 / 粗斜删 / 行内代码 / 链接 / 图片 / 列表 / 引用
        代码块 / 表格 / 分割线 / 段落 / 自动链接
   不追求完整规范，够看清排版就行。
   ============================================================ */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function inline(s) {
    s = esc(s);
    // 行内代码先占位，避免内部被继续解析
    var codes = [];
    s = s.replace(/`([^`]+)`/g, function (m, c) {
      codes.push(c);
      return '\u0000' + (codes.length - 1) + '\u0000';
    });
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
      '<img src="$2" alt="$1" loading="lazy">');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    s = s.replace(/==([^=]+)==/g, '<mark>$1</mark>');
    s = s.replace(/\u0000(\d+)\u0000/g, function (m, i) {
      return '<code>' + codes[+i] + '</code>';
    });
    return s;
  }

  function tableBlock(lines) {
    var head = lines[0];
    var rows = lines.slice(2);
    var split = function (l) {
      return l.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
    };
    var out = '<table><thead><tr>';
    split(head).forEach(function (c) { out += '<th>' + inline(c) + '</th>'; });
    out += '</tr></thead><tbody>';
    rows.forEach(function (r) {
      out += '<tr>';
      split(r).forEach(function (c) { out += '<td>' + inline(c) + '</td>'; });
      out += '</tr>';
    });
    return out + '</tbody></table>';
  }

  function render(src) {
    if (!src) return '';
    var lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      // 代码块
      if (/^```/.test(line)) {
        var lang = line.replace(/^```/, '').trim();
        var buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push('<pre class="md-pre"' + (lang ? ' data-lang="' + esc(lang) + '"' : '') + '><code>' +
          esc(buf.join('\n')) + '</code></pre>');
        continue;
      }

      // 空行
      if (!line.trim()) { i++; continue; }

      // 分割线
      if (/^(\s*)(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

      // 标题
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        var lv = h[1].length;
        var id = h[2].replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
        out.push('<h' + lv + ' id="' + esc(id) + '">' + inline(h[2]) + '</h' + lv + '>');
        i++;
        continue;
      }

      // 表格
      if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:-]+\|[\s:|-]*$/.test(lines[i + 1])) {
        var tbl = [line, lines[i + 1]];
        i += 2;
        while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) { tbl.push(lines[i]); i++; }
        out.push(tableBlock(tbl));
        continue;
      }

      // 引用
      if (/^>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          q.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        out.push('<blockquote>' + render(q.join('\n')) + '</blockquote>');
        continue;
      }

      // 列表
      if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
        var ordered = /^\s*\d+\./.test(line);
        var items = [];
        var cur = null;
        while (i < lines.length && (/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
          var m = lines[i].match(/^\s*([-*+]|\d+\.)\s+(.*)$/);
          if (m) {
            if (cur) items.push(cur);
            cur = { text: m[2], checked: null };
            var cb = m[2].match(/^\[([ xX])\]\s*(.*)$/);
            if (cb) { cur.checked = cb[1].toLowerCase() === 'x'; cur.text = cb[2]; }
          } else if (cur) {
            cur.text += ' ' + lines[i].trim();
          }
          i++;
        }
        if (cur) items.push(cur);
        var tag = ordered ? 'ol' : 'ul';
        var cls = items.some(function (x) { return x.checked !== null; }) ? ' class="md-task"' : '';
        out.push('<' + tag + cls + '>' + items.map(function (x) {
          if (x.checked !== null) {
            return '<li class="md-task-item"><input type="checkbox" disabled' +
              (x.checked ? ' checked' : '') + '> ' + inline(x.text) + '</li>';
          }
          return '<li>' + inline(x.text) + '</li>';
        }).join('') + '</' + tag + '>');
        continue;
      }

      // 段落
      var para = [];
      while (i < lines.length && lines[i].trim() &&
        !/^(#{1,6}\s|```|>|\s*([-*+]|\d+\.)\s)/.test(lines[i]) &&
        !/^(\s*)(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      if (para.length) out.push('<p>' + inline(para.join('\n')).replace(/\n/g, '<br>') + '</p>');
      else i++;
    }
    return out.join('\n');
  }

  global.YYMD = { render: render, esc: esc };
})(window);

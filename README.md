# 燕语 · 小燕子的檐下笔记

> 衔一段春泥，筑一间小屋。

这是一个用 [Jekyll](https://jekyllrb.com/) 手写的静态博客，部署在 GitHub Pages 上，域名 **www.xiaoyanzi0927.cc.cd**。

没有套任何主题：配色、图标（全是手绘 SVG 燕子）、动效、搜索、目录，都是这个仓库里一行行写的。

---

## 一、这个站长什么样

| 部分 | 说明 |
| --- | --- |
| **主题意象** | 天幕 / 屋檐 / 燕剪 —— 全站背景是黎明天色，导航与页脚是一条电线，站标是一只燕子 |
| **配色** | 燕羽蓝 `#2f5871` + 柳芽绿 `#7c9c52` + 檐下暖光 `#d98a49` |
| **日夜** | 右上角按钮切换亮/暗，默认跟随系统，选择记在 localStorage |
| **首页** | 首屏（天色 + 屋檐剪影 + 飞燕）、最新文章、三条岔路、屋檐下、引文 |
| **列表** | `/notes/` 学习笔记、`/life/` 生活日常，带标签筛选 |
| **其它页** | `/archive/` 归档、`/tags/` 标签、`/search/` 搜索、`/about/` 关于、404 |
| **文章页** | 阅读进度、右侧目录（滚动高亮）、代码一键复制、图片灯箱、点赞、分享、上下篇、相关文章 |
| **搜索** | 构建时导出 `search.json`，前端按「标题 > 标签 > 摘要 > 正文」加权匹配，`/` 或 `⌘K` 唤起 |
| **其他** | RSS 全文输出、sitemap、robots、Open Graph 分享卡、PWA manifest、响应式、减少动效适配 |

---

## 二、本地跑起来

需要 Ruby ≥ 2.7。

```bash
gem install jekyll          # 只需一次
jekyll serve                # 打开 http://127.0.0.1:4000
```

不想装 Ruby 也行：直接把仓库推到 GitHub，Pages 会自动构建。

---

## 三、写一篇新文章

在 `_posts/` 下新建文件，文件名必须是 `年-月-日-英文短标题.md`：

```text
_posts/2026-11-08-my-first-note.md
```

开头这段 `---` 之间是「档案卡」：

```yaml
---
layout: post
title: "文章标题"
date: 2026-11-08 20:30:00 +0800
categories: [笔记]        # 笔记 / 生活 / 读书 —— 决定卡片上的彩色小标签
type: note                # note / life / read —— 决定它出现在哪个列表页
tags: [Python, 学习方法]
description: "一两句话的摘要，会显示在卡片和搜索结果里。"
---
```

`type` 三选一：

| type | 文章会出现在 |
| --- | --- |
| `note` | `/notes/` 学习笔记 |
| `life` | `/life/` 生活日常 |
| `read` | 只在归档、标签、首页出现（读书类） |

正文就是普通 Markdown，支持表格、代码块（带语法高亮和一键复制）、引用、图片（点击看大图）。

> 注意：正文里如果要写 Liquid 语法（`{{ }}` 或 `{% %}`），需要用 Jekyll 的 raw 标签包起来：`{% raw %} 内容 {% endraw %}`，否则会被执行成实际值。第一篇文章里有可以直接抄的例子。

---

## 四、改个人信息

大部分内容在 **`_config.yml`**：

```yaml
title: 燕语                # 站名
subtitle: 小燕子的檐下笔记
tagline: 衔一段春泥，筑一间小屋
description: ……             # 搜索与分享卡里的站点描述

owner:
  name: 小燕子
  school: 江西科技师范大学
  city: 南昌
  handle: 小燕子
  github: xing05188
  avatar: /assets/img/avatar.svg
  since: 2026-03-20        # 建站日，首页「在檐下住了多少天」用它算
```

导航在同一个文件的 `nav:` 里增删。

个人介绍改 **`about.md`**；首页文案改 **`_layouts/home.html`**。

---

## 五、目录结构

```text
.
├── _config.yml            # 站点配置（改这里最多）
├── _posts/                # 文章，一篇一个 .md
├── _layouts/              # 页面骨架
│   ├── default.html       # 外层：天幕 + 页头 + 页脚
│   ├── home.html          # 首页
│   ├── post.html          # 文章页
│   ├── page.html          # 普通页（关于 / 归档 / 标签 / 搜索 / 404）
│   └── list.html          # 列表页（笔记 / 生活）
├── _includes/
│   ├── head.html          # <head>：SEO、分享卡、样式、主题预设
│   ├── header.html        # 页头 + 导航（电线上的燕子）+ 搜索面板
│   ├── footer.html        # 页脚（电线上的三只燕子）
│   └── post-card.html     # 文章卡片组件
├── assets/
│   ├── css/style.css      # 主样式（变量、布局、组件、响应式）
│   ├── css/post.css       # 文章页排版、代码、目录、归档、标签
│   ├── js/main.js         # 主题、搜索、目录、进度、复制、灯箱、点赞、筛选
│   └── img/               # avatar.svg / favicon.svg / og.png
├── index.html             # ← 用 home 布局
├── notes.html  life.html  # ← 用 list 布局
├── archive.html  tags.html  search.html  about.md  404.html
├── feed.xml  sitemap.xml  search.json  robots.txt  manifest.webmanifest
└── CNAME                  # 自定义域名
```

站点标题旁的小数字（文章数、标签数、总字数、在檐下天数）都是 Template 里实时算的，不用手动维护。

---

## 六、部署

仓库 → Settings → Pages：

- Source：`Deploy from a branch`
- Branch：`main`，目录 `/ (root)`

推送到 `main` 后几十秒自动构建。自定义域名由仓库根目录的 `CNAME` 决定（`www.xiaoyanzi0927.cc.cd`），
DNS 那边把 `www` CNAME 指到 `xing05188.github.io` 即可，`Enforce HTTPS` 建议打开。

---

## 七、一些小约定

- **文章 URL** 是 `/posts/英文短标题/`，所以文件名里的英文部分尽量短、有意义，发布后别改（会断链）。
- **图片** 放在 `assets/img/`，Markdown 里用 `/assets/img/xxx.png` 引用。
- **不要提交 `_site/`**，它已经在 `.gitignore` 里，是构建产物。
- 每篇的 `description` 会同时用于：卡片摘要、搜索结果、分享卡、RSS 摘要 —— 值得认真写一句。

---

© 小燕子 · 文字采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh)

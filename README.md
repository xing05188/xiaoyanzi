# 燕语 · 小燕子的檐下笔记

> 衔一段春泥，筑一间小屋。

这是一个用 [Jekyll](https://jekyllrb.com/) 手写的静态博客，部署在 GitHub Pages 上，域名 **www.xiaoyanzi0927.cc.cd**。

没有套任何主题：配色、图标（全是手绘 SVG 燕子）、动效、搜索、目录、后台工作台，都是这个仓库里一行行写的。

---

## 一、这个站长什么样

| 部分 | 说明 |
| --- | --- |
| **主题意象** | 天幕 / 屋檐 / 燕剪 —— 全站背景是黎明天色，导航与页脚是一条电线，站标是一只燕子 |
| **配色** | 燕羽蓝 `#2f5871` + 柳芽绿 `#7c9c52` + 檐下暖光 `#d98a49` |
| **四时光** | 右上角太阳按钮展开「清晨 / 正午 / 黄昏 / 深夜」，也可跟随系统，选择记在 localStorage |
| **首页** | 首屏（天色 + 屋檐剪影 + 飞燕）、此刻状态、最新文章、三条岔路、屋檐下、可换一句的引文 |
| **文章列表** | `/notes/` 学习笔记、`/life/` 生活日常，带标签筛选 |
| **碎语** | `/murmur/` 短句时间流，线上串着燕子，可筛标签、可点赞（本机记录） |
| **书架** | `/shelf/` 在读进度条 / 读完评分 / 想读清单，数据在 `_data/shelf.yml` |
| **友链** | `/friends/` 卡片墙 + 换链规则，数据在 `_data/friends.yml` |
| **留言板** | `/guestbook/` 便签墙（默认存本机）；填好 `_config.yml` 的 giscus 段就换成真留言区 |
| **收藏** | `/saved/` 文章页点「收着」就近来，存在浏览器里 |
| **其它页** | `/archive/` 归档、`/tags/` 标签、`/search/` 搜索、`/about/` 关于、404 |
| **文章页** | 阅读进度、右侧目录（滚动高亮）、代码一键复制、图片灯箱、点赞、分享、上下篇、相关文章、底部悬浮工具条（收藏 / 字号 / 复制链接） |
| **工作台** | `/studio/` 一个自己的后台：仪表盘、写文章（Markdown + 实时预览 + 草稿）、统计热力图、媒体库、改站点数据、发布状态 |
| **搜索** | 构建时导出 `search.json`，前端按「标题 > 标签 > 摘要 > 正文」加权匹配，`/` 或 `⌘K` 唤起 |
| **快捷键** | `?` 看全部；`R` 随手翻一篇；`T` 换天色；`S` 收藏；`G`+`H/N/M/B/A/F` 跳页 |
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

### 方法一：用工作台（推荐）

打开 `/studio/`，输密码进屋 → 连上 GitHub Token → 「文章」→「新建」。
写标题、选栏目、正文用 Markdown，右侧实时预览，`⌘S` 保存，自动提交到仓库。

### 方法二：本地新建文件

在 `_posts/` 下新建 `年-月-日-英文短标题.md`，开头这段 `---` 之间是「档案卡」：

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

## 四、工作台（`/studio/`）

一个不用装任何东西的轻后台，纯前端 + GitHub API。

1. 打开 `/studio/`，输入访问密码。**初始密码：`yanzi2026`**
   （密码只在前端做 SHA-256 比对，作用是"别让人随手点进来"；真正的写权限在 Token 上。）
2. 粘一个 GitHub Token 连上，就能读仓库、提交修改。Token 只存在当前标签页的 `sessionStorage`，**关掉页面就失效**。
   - 建 Token：<https://github.com/settings/tokens?type=beta>
   - 只授权 `xing05188/xiaoyanzi`，权限勾 **Contents: Read and write**、**Pages: Read**
3. 能做的事：

| 面板 | 作用 |
| --- | --- |
| 巢 · 仪表盘 | 总字数进度环、文章数 / 标签数 / 在檐下天数、最近在写、快捷入口 |
| 篇目 · 文章 | 列表 + 搜索 + 栏目筛选；编辑器有 front matter 表单、Markdown 工具条、实时预览、字数与阅读时长、本地自动草稿 |
| 看数 · 统计 | 文章字数排行、栏目与标签占比、近 26 周写作日历、文章健康检查（缺摘要 / 缺标签 / 太短 …） |
| 影像 · 媒体 | 拖拽上传图片到 `assets/img/uploads/`，超过 600KB 自动压缩，一键复制 Markdown 引用 |
| 巢务 · 设置 | 可视化改公告、此刻、社交、友链、碎语、今日一句、访问密码 |
| 放飞 · 发布 | 最新构建状态、最近提交、请求重新构建 |

改密码：在「巢务 → 访问密码」里改（需要先连 Token），或本地 `printf '新密码' | sha256sum` 后替换 `_data/workbench.yml` 里的 `password_sha256`。

> 设置面板保存时会**整份重写**对应的 `_data/*.yml`，文件里的注释会丢。介意就直接去 GitHub 改。

---

## 五、改内容（不用碰代码）

页面上的动态内容都在 `_data/` 里，改完推送即可，也可以在工作台里改：

| 文件 | 管什么 |
| --- | --- |
| `_data/settings.yml` | 公告栏、此刻状态、社交账号、页脚小字 |
| `_data/murmurs.yml` | 碎语（`date` 写成 `2026-11-02 21:40`，`mood` 可选 calm/joy/think/tired） |
| `_data/shelf.yml` | 书架（`reading` / `done` / `want` 三组） |
| `_data/friends.yml` | 友链 |
| `_data/quotes.yml` | 今日一句（首页「换一句」的语料） |
| `_data/workbench.yml` | 工作台密码、仓库、写作目标、Token 提示文案 |

站点基本信息还在 **`_config.yml`**：

```yaml
title: 燕语
subtitle: 小燕子的檐下笔记
tagline: 衔一段春泥，筑一间小屋

owner:
  name: 小燕子
  school: 江西科技师范大学
  city: 南昌
  github: xing05188
  avatar: /assets/img/avatar.svg
  since: 2026-03-20        # 建站日，首页「在檐下住了多少天」用它算
```

导航在同一个文件的 `nav:` 里增删。个人介绍改 `about.md`；首页文案改 `_layouts/home.html`。

---

## 六、目录结构

```text
.
├── _config.yml            # 站点配置（改这里最多）
├── _data/                 # 碎语、书架、友链、今日一句、站点设置、工作台配置
├── _posts/                # 文章，一篇一个 .md
├── _layouts/
│   ├── default.html       # 外层：天幕 + 页头 + 页脚
│   ├── home.html          # 首页
│   ├── post.html          # 文章页
│   ├── page.html          # 普通页（关于 / 归档 / 标签 / 搜索 / 碎语 / 书架 …）
│   └── list.html          # 列表页（笔记 / 生活）
├── _includes/
│   ├── head.html          # <head>：SEO、分享卡、样式、主题预设
│   ├── header.html        # 页头 + 导航（电线上的燕子）+ 搜索面板
│   ├── footer.html        # 页脚（电线上的三只燕子）
│   └── post-card.html     # 文章卡片组件
├── assets/
│   ├── css/style.css      # 主样式（变量、布局、组件、响应式）
│   ├── css/post.css       # 文章页排版、代码、目录、归档、标签
│   ├── css/extra.css      # 碎语 / 书架 / 友链 / 留言板 / 收藏 / 四时光 / 快捷键
│   ├── css/workbench.css  # 工作台独立样式
│   ├── js/main.js         # 主题、搜索、目录、进度、复制、灯箱、点赞、筛选
│   ├── js/extra.js        # 四时光、收藏、快捷键、碎语、留言板、今日一句
│   ├── js/md.js           # 工作台用的轻量 Markdown 渲染
│   ├── js/workbench.js    # 工作台全部逻辑（密码、GitHub API、编辑器、统计）
│   └── img/               # avatar.svg / favicon.svg / og.png / uploads/
├── index.html             # ← 用 home 布局
├── notes.html  life.html  # ← 用 list 布局
├── murmur.html  shelf.html  friends.html  guestbook.html  saved.html
├── studio.html            # ← 工作台，permalink /studio/
├── studio-posts.json      # 构建时导出的文章索引（工作台读它）
├── archive.html  tags.html  search.html  about.md  404.html
├── feed.xml  sitemap.xml  search.json  robots.txt  manifest.webmanifest
└── CNAME                  # 自定义域名
```

站点标题旁的小数字（文章数、标签数、总字数、在檐下天数）都是 Template 里实时算的，不用手动维护。

---

## 七、部署

仓库 → Settings → Pages：

- Source：`Deploy from a branch`
- Branch：`main`，目录 `/ (root)`

推送到 `main` 后几十秒自动构建。自定义域名由仓库根目录的 `CNAME` 决定（`www.xiaoyanzi0927.cc.cd`），
DNS 那边把 `www` CNAME 指到 `xing05188.github.io` 即可，`Enforce HTTPS` 建议打开。

---

## 八、一些小约定

- **文章 URL** 是 `/posts/英文短标题/`，所以文件名里的英文部分尽量短、有意义，发布后别改（会断链）。
- **图片** 放在 `assets/img/`（工作台上传的进 `assets/img/uploads/`），Markdown 里用 `/assets/img/xxx.png` 引用。
- **不要提交 `_site/`**，它已经在 `.gitignore` 里，是构建产物。
- 每篇的 `description` 会同时用于：卡片摘要、搜索结果、分享卡、RSS 摘要 —— 值得认真写一句。
- 工作台是 `noindex` 的，别把它当成真正的权限系统：**它是"防手滑"，不是"防攻击"**。真要严格，请把仓库设为私有或改用带服务端的方案。

---

© 小燕子 · 文字采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh)

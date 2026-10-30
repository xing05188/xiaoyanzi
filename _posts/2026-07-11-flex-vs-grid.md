---
layout: post
title: "Flex 和 Grid 到底该用哪个：一张判断表"
date: 2026-07-11 16:30:00 +0800
categories: [笔记]
type: note
tags: [CSS, 前端, 布局]
description: "初学 CSS 布局最容易卡住的地方不是语法，是选择。这里有一张能直接照着用的判断表，和几个我踩过的坑。"
---

学 CSS 布局的时候，最让我困惑的不是属性怎么写，而是：**这个布局到底该用 Flex 还是 Grid？**

网上的回答大多是「一维用 Flex，二维用 Grid」。这句话没错，但你真到写代码的时候，会发现很多布局既像一维又像二维。

我把它整理成了一张能直接照着判断的表。

## 先看一句话版本

> **内容决定尺寸 → Flex；容器决定尺寸 → Grid。**

这是最实用的一条。想象你在摆书架：

- 如果书的宽度不一样，书架要顺着书来排（内容决定布局）→ Flex；
- 如果你先画好格子，再把书放进格子（布局决定内容）→ Grid。

## 判断表

| 你遇到的情况 | 用哪个 | 关键属性 |
| --- | --- | --- |
| 一排按钮，间距均匀 | Flex | `gap` + `align-items: center` |
| 导航栏：左边 logo，右边菜单 | Flex | `justify-content: space-between` |
| 卡片内部：图标 + 文字垂直居中 | Flex | `align-items: center` |
| 卡片列表，一行三个，宽度自适应 | Grid | `repeat(auto-fill, minmax(280px, 1fr))` |
| 后台布局：侧边栏 + 主内容 + 顶栏 | Grid | `grid-template-areas` |
| 文章页：正文 + 右侧目录 | Grid | `grid-template-columns: 1fr 220px` |
| 表单：标签右对齐、输入框对齐 | Grid | `grid-template-columns: auto 1fr` |
| 一堆标签，自动换行 | Flex | `flex-wrap: wrap` |

## 三个真实例子

### 例子一：卡片一行三个，窄屏自动变两个

这是 Grid 最漂亮的用法，一行就够：

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}
```

`auto-fill` 的意思：能塞几个塞几个；`minmax(280px, 1fr)` 的意思：每个至少 280px，剩下的空间平分。

用 Flex 也能做，但得配 `flex-basis` 和 `calc`，还要处理最后一行的对齐问题：

```css
/* Flex 版本，明显更啰嗦 */
.cards { display: flex; flex-wrap: wrap; gap: 18px; }
.cards > * { flex: 1 1 280px; }
```

注意 `flex: 1 1 280px` 在最后一行不满的时候会把剩下的卡片拉宽，视觉上很怪。要修就得加一层，或者用 Grid。

### 例子二：正文 + 目录

```css
.post-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 214px;
  gap: 58px;
}
```

这里有个坑我踩了很久：**`1fr` 的默认最小值是 `auto`**，如果正文里有一行超长的代码或者不换行的表格，它会把整个网格撑爆，右侧目录被挤出去。

修法是显式写成 `minmax(0, 1fr)`。这个 `0` 是必须的。

### 例子三：表单对齐

```css
.field {
  display: grid;
  grid-template-columns: 80px 1fr;
  align-items: center;
  gap: 12px;
}
```

`80px 1fr` 让所有标签列宽度一致，输入框自动对齐。用 Flex 的话，每个标签宽度不同，输入框就参差不齐。

## Flex 里我最常忘的三件事

### 一、`justify-content` 和 `align-items` 永远搞反

记法：**`justify` 管主轴，`align` 管交叉轴。** 主轴默认是横的（`flex-direction: row`），所以横向排列用 `justify-content`，垂直居中用 `align-items: center`。

一旦改成 `column`，两者就互换了。这是我最常犯的错。

### 二、`flex: 1` 不等于 `width: 100%`

`flex: 1` 是 `flex: 1 1 0%` 的简写，意思是「可以放大、可以缩小、基础尺寸当 0」。所以多个 `flex: 1` 的元素会**平分**剩余空间，而 `width: 100%` 会各自想占满，导致溢出。

### 三、`gap` 现在真的能用了

早期 Flex 不支持 `gap`，要靠 `margin` 加一堆 `:last-child` 清除。现在（2021 年之后的主流浏览器）Flex 和 Grid 都支持 `gap`，放心用。

## 两者能不能混用

能，而且经常需要。

最常见的组合：**Grid 管大结构，Flex 管小零件**。

```css
/* 页面骨架用 Grid */
.layout { display: grid; grid-template-columns: 240px 1fr; }

/* 卡片内部的图标和文字用 Flex */
.card-head { display: flex; align-items: center; gap: 10px; }
```

不用纠结"应该统一用哪个"，它们是工具，不是立场。

## 最后一句

如果实在判断不出来：**先用 Flex 试试**。它更宽容，写错了顶多对不齐；Grid 一旦行列划分错了，整个布局会塌。等你发现"我需要同时控制行和列"的时候，自然会想到 Grid。

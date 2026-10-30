---
layout: post
title: "Git 我只用这 8 条命令，够用了"
date: 2026-10-05 15:20:00 +0800
categories: [笔记]
type: note
tags: [Git, 工具, 版本控制]
description: "Git 有上百条命令，但日常真正用得上的不到十条。这份清单按「我想干什么」组织，不是按字母顺序。"
---

Git 的文档能吓退人：上百条命令，每条一堆参数。但我用了两年，发现日常真正调用的就那么几个。

下面按「我想干什么」来组织，不是按字母序——毕竟你查手册的时候，脑子里想的是任务，不是命令名。

## 一、开始

### 1. `git clone`

```bash
git clone https://github.com/user/repo.git
git clone git@github.com:user/repo.git          # SSH，推代码不用输密码
git clone --depth 1 <url>                        # 只要最新一次提交，快很多
```

`--depth 1` 在只想看代码、不打算提 PR 的时候特别好用。仓库历史几个 G 的时候，能省掉一顿饭的时间。

### 2. `git init` + 第一次提交

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin <url>
git push -u origin main
```

这五步是新建仓库的标准流程，抄下来就行。`-M` 是把默认分支名改成 `main`（老版本 Git 默认是 `master`）。

## 二、日常循环

日常 90% 的时间就在这三条之间循环：

```bash
git status          # 我现在改了啥
git add <file>      # 把改动放进暂存区
git commit -m "..." # 存一个快照
```

### 3. `git status`

最被低估的命令。**每次提交前先看一眼**，能避免 80% 的「我怎么会把这些文件提交上去」的惨剧。

我习惯用短格式：

```bash
git status -s
```

输出两列，左列是暂存区状态，右列是工作区状态。`M` 是修改，`A` 是新增，`??` 是未跟踪。

### 4. `git add -p`

这个比 `git add .` 好用太多。

它会把你的改动**一块一块**问你：这块要不要加？按 `y` 要，`n` 不要，`s` 拆分更小的块。

好处是能做出「干净」的提交：一次提交只做一件事，而不是把修 bug 和改格式混在一起。

### 5. `git commit`

```bash
git commit -m "fix: 修复搜索框在移动端被遮挡"
git commit --amend                # 改刚才那条提交（还没推的话）
git commit --amend --no-edit      # 只补充内容，不改消息
```

关于提交信息，我的规矩很简单：**写「做了什么」，不写「改了文件」**。

- 差：`update main.js`
- 好：`fix: 移动端搜索框被导航栏遮挡`

## 三、看历史

### 6. `git log`

```bash
git log --oneline --graph --all
```

加这三个参数，输出会从一屏文字变成一张图。看分支合并关系特别直观。

想找某次改动，用：

```bash
git log -S "某个字符串"      # 搜哪些提交增删了这个字符串
git log --oneline -- path/to/file   # 只看某个文件的历史
```

`-S` 这个我用了很久才发现，找「这行代码是什么时候没的」非常快。

### 7. `git diff`

```bash
git diff                    # 工作区 vs 暂存区
git diff --staged           # 暂存区 vs 上次提交
git diff HEAD~1             # 和上一次提交比
git diff branch1..branch2   # 两个分支比
```

记不住哪个对哪个？记这句：**`git diff` 默认比的是「还没 add 的」和「已经 add 的」。**

## 四、救命

### 8. `git restore` / `git reset`

这两个是「我搞砸了」时用的。

```bash
git restore file.txt           # 丢弃工作区的修改（危险，改了就没了）
git restore --staged file.txt  # 从暂存区拿出来，但保留修改
git reset --soft HEAD~1        # 撤销上一次提交，改动还在暂存区
git reset --hard HEAD~1        # 撤销上一次提交，改动全没（非常危险）
```

**建议**：`--hard` 之前先 `git stash` 一下，或者先 `git log` 记住当前 commit hash，出事了还能 `git reset --hard <hash>` 回来。

## 五、分支（够用版）

```bash
git switch -c feature/login    # 新建并切过去（比 checkout -b 新）
git switch main                # 切回主分支
git merge feature/login        # 合并
git branch -d feature/login    # 删掉已合并的分支
```

合并冲突不要怕。打开冲突的文件，会看到：

```text
<<<<<<< HEAD
你的版本
=======
对方的版本
>>>>>>> feature/login
```

把这三行标记删掉，留下你要的内容，然后 `git add` + `git commit` 就完事了。

## 我不用但你可能需要的

| 场景 | 命令 |
| --- | --- |
| 临时存一下手头的改动 | `git stash` / `git stash pop` |
| 只把某个提交搬到当前分支 | `git cherry-pick <hash>` |
| 找出哪次提交引入了 bug | `git bisect` |
| 撤销一个已推送的提交 | `git revert <hash>` |

## 最后

Git 最反直觉的地方是：**它几乎不会真的丢东西**。只要提交过，就算分支删了、reset 了，通常还能从 `git reflog` 里找回来（默认保留 90 天）。

所以真正危险的操作只有两种：`--hard` 丢掉未提交的改动，和 `push --force` 覆盖别人的提交。

除此之外，大胆试。

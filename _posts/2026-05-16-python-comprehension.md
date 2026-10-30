---
layout: post
title: "列表推导式很好用，但这三处我劝你别用"
date: 2026-05-16 22:05:00 +0800
categories: [笔记]
type: note
tags: [Python, 编程]
description: "列表推导式能一行写完循环，但它也是 Python 里最容易被滥用的语法糖。三个我踩过的坑，附带改写方案。"
---

列表推导式（list comprehension）大概是学 Python 时最爽的一刻：

```python
squares = [x * x for x in range(10)]
```

一行，干净，比 `for` 循环省三行。于是有段时间我看什么都想推导一下，直到代码被自己写崩了几次。

下面三处，是我现在坚决不用它的地方。

## 一、带副作用的操作

列表推导式的本意是**生成一个列表**。如果你只是为了执行操作，顺便生成了一个没人用的列表，那就是误用：

```python
# 反面例子：这个列表生成完就被扔了
[print(f"处理 {name}") for name in names]
```

问题不只是"看起来怪"：它会真的建一个长度为 `len(names)` 的列表对象，数据量大时白占内存。Python 3 里有推导式内部的独立作用域，`name` 也不会泄漏出去——所以连"顺便拿变量"这个理由都没有。

改成普通循环：

```python
for name in names:
    print(f"处理 {name}")
```

判断标准：**如果不需要那个列表，就别用推导式。**

## 二、嵌套超过两层

三层推导式能写出来，但没人能一眼读明白：

```python
# 别这么写
flat = [cell for row in matrix for cell in row if cell is not None and cell > 0]
```

这还算客气的。真实项目里更常见的是带条件分支的嵌套：

```python
result = [
    item["id"]
    for group in groups
    for item in group["items"]
    if item.get("ok") and not item.get("deleted")
]
```

这行代码"能看懂"，但需要你在脑子里跑一遍嵌套。改成生成器 + 普通循环，长度多两行，可读性翻倍：

```python
result = []
for group in groups:
    for item in group["items"]:
        if item.get("ok") and not item.get("deleted"):
            result.append(item["id"])
```

我记得有次改一个三层推导式，为了加一个 `continue` 条件，盯着看了十分钟。`continue` 在推导式里根本没有对应写法，只能靠 `if` 反向表达。

## 三、和 `lambda`、三元表达式叠在一起

```python
# 复杂到需要注释的推导式，本身就该被拆开
names = [f"{u['name']}({u['age']})" if u.get("age") else u["name"] for u in users if u.get("active")]
```

这行能跑，但下次来改的人（通常是我自己）要花三十秒解码。三十秒不算多，可如果一段代码里全是这种东西，读起来就非常累。

## 那什么时候该用

我的经验是三个条件同时满足：

1. 结果列表确实要用；
2. 只有一层 `for`，最多跟一个 `if`；
3. 表达式本身很短，不嵌套函数调用。

满足就用，写起来确实舒服：

```python
# 过滤出及格的同学
passed = [s for s in scores if s >= 60]

# 统一转小写
tags = [t.strip().lower() for t in raw_tags]
```

补一句容易忘的：**推导式比 `for` + `append` 快**，因为省掉了每轮的方法查找。但那点差距在 99% 的场景里根本测不出来，别为了性能牺牲可读性。

## 顺带一提：生成器的场景

如果你只是要遍历一次，用圆括号的生成器表达式更省内存：

```python
total = sum(len(line) for line in lines)   # 不会建中间列表
```

这个用得很顺手，也几乎没有可读性问题。区别只在于：**要列表就用方括号，只遍历一次就用圆括号。**

## 小结

| 场景 | 建议 |
| --- | --- |
| 过滤、映射，一层循环 | 用，很香 |
| 为了执行副作用 | 不用，写普通循环 |
| 嵌套两层以上 | 不用，拆成循环 |
| 要遍历一次不保存 | 用生成器表达式 |

语法糖的价值在于让常见的事更短，不是让所有事都变短。

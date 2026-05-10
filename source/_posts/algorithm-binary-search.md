---
title: 二分查找：一个简单算法教会我的思维方式
date: 2026-04-25 09:30:00
categories:
  - 算法与数据结构
tags:
  - 算法
  - 编程思维
  - 二分查找
description: 二分查找不只是一个算法，它教会了我"分治"的思维方式。这篇文章记录了我对二分查找从"背模板"到"理解本质"的过程。
cover: /images/cover-algorithm.jpg
---

## 二分查找的"简单"幻觉

第一次学二分查找，我觉得这有什么难的？不就是每次把范围缩小一半嘛。

然后我写了第一版代码，死循环了。

```python
def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid      # bug：应该是 mid + 1
        else:
            right = mid     # bug：应该是 mid - 1
    return -1
```

`left = mid` 而不是 `left = mid + 1`，当 `left` 和 `right` 相邻的时候，`mid` 永远等于 `left`，循环永远不会结束。

这个 bug 教会我一件事：**简单的算法不等于容易写对的算法。**

<!-- more -->

## 为什么二分查找这么容易出错

二分查找的逻辑很简单：在有序数组中，每次比较中间元素，排除一半的可能性。

但实现起来，有三个容易出错的地方：

**1. 边界条件：`left <= right` 还是 `left < right`？**

这取决于你的搜索区间是"左闭右闭"还是"左闭右开"。

```python
# 左闭右闭 [left, right]
while left <= right:
    # right = mid - 1

# 左闭右开 [left, right)
while left < right:
    # right = mid
```

两种写法都对，但你必须保持一致。混用就会出 bug。

**2. 中点计算：`(left + right) // 2` 还是 `left + (right - left) // 2`？**

前者在 `left` 和 `right` 都很大的时候会整数溢出。后者不会。

```python
# 可能溢出
mid = (left + right) // 2

# 安全
mid = left + (right - left) // 2
```

在 Python 里这不是问题（Python 的整数无限大），但在 C++、Java 里这是真实的 bug。

**3. 边界更新：`mid + 1` 还是 `mid`？**

如果 `mid` 已经比较过了，更新边界时要跳过它：

```python
left = mid + 1   # 跳过 mid
right = mid - 1  # 跳过 mid
```

如果 `mid` 可能是答案，更新边界时要保留它：

```python
right = mid      # 保留 mid
```

这三个问题看似简单，但在不同的变体中组合起来，就容易出错。

## 二分查找的本质

背模板不如理解本质。二分查找的本质是什么？

**每次排除一半的可能性。**

在 100 万个元素中查找目标，线性查找最坏要比较 100 万次，二分查找只需要比较 20 次（log₂(1000000) ≈ 20）。

这个效率差异来自一个简单的前提：**数据是有序的。** 有序意味着你可以通过一次比较，排除一半的元素。

**二分查找教会我的思维方式：**

1. **分治** — 大问题拆成小问题，每次缩小一半
2. **边界意识** — 搜索区间的边界必须明确定义
3. **不变量** — 循环过程中，某个条件必须始终为真

## 二分查找的变体

理解了本质，变体就不难了。变体的本质都是"定义不同的搜索区间"和"不同的判断条件"。

### 查找左边界

找到目标值第一次出现的位置：

```python
def find_left(nums, target):
    left, right = 0, len(nums) - 1
    result = -1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            result = mid      # 记录答案
            right = mid - 1   # 继续向左找
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return result
```

和标准二分查找的区别只有一个：找到目标后不返回，而是记录答案，继续向左搜索。

### 旋转数组

在旋转排序数组中查找（比如 `[4,5,6,7,0,1,2]`）：

```python
def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        # 判断哪半部分是有序的
        if nums[left] <= nums[mid]:
            # 左半部分有序
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:
            # 右半部分有序
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1
    return -1
```

看起来复杂，但本质还是"排除一半"。只不过判断条件从简单的大小比较变成了"哪半部分有序"。

### 二分答案

这是我学到的最有价值的变体。不是在数组中查找，而是在**答案空间**中二分。

```python
# 问题：把 n 个物品分成 k 组，使最大组的和最小
def minimize_max(nums, k):
    def can_divide(max_val):
        # 判断是否能用 max_val 作为上限分成 k 组
        count = 0
        for num in nums:
            count += (num - 1) // max_val + 1
        return count <= k

    left, right = 1, max(nums)
    while left < right:
        mid = left + (right - left) // 2
        if can_divide(mid):
            right = mid      # 能分，尝试更小的值
        else:
            left = mid + 1   # 不能分，需要更大的值
    return left
```

答案的范围是 `[1, max(nums)]`，在这个范围内二分。每次猜测一个答案，判断它是否可行。如果可行，尝试更小的；如果不可行，尝试更大的。

**这种思维方式超越了"在数组中查找"，变成了"在可能的解空间中搜索"。**

## 二分查找的应用

二分查找不只用在数组上。任何"有序的、可以判断方向的"问题，都可以用二分：

- **搜索框自动补全** — 在排序的候选词中找前缀匹配
- **版本回退** — 找到第一个引入 bug 的版本（`git bisect`）
- **资源分配** — 在可能的分配方案中找最优解
- **数值计算** — 求平方根、求方程的解

## 总结

二分查找教会我的，不只是一个算法，而是一种思维方式：

1. **有序是前提** — 没有有序性，二分查找不成立
2. **边界是关键** — 明确定义搜索区间，保持一致性
3. **排除一半** — 每次比较都能排除一半的可能性
4. **变体是扩展** — 理解本质后，变体只是"不同的判断条件"

算法学习的终极目标不是背模板，而是理解思维方式。二分查找是最好的起点——它简单到可以完全理解，又深刻到可以举一反三。

---

*写完这篇文章，我又重新做了一遍二分查找的经典题目。每次做都有新的体会。这就是算法的魅力——它不是死的知识，而是活的思维。*

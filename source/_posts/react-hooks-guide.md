---
title: React Hooks：从"能用"到"用对"的思维转变
date: 2026-05-02 15:00:00
categories:
  - 前端开发
tags:
  - React
  - Hooks
  - 设计模式
  - 前端架构
description: Hooks 改变的不只是写法，而是思考组件的方式。这篇文章记录了我对 Hooks 从"语法糖"到"编程范式"的认知升级。
cover: /images/cover-design.jpg
---

## 我对 Hooks 的三次认知

### 第一次：语法糖

刚接触 Hooks 的时候，我觉得它就是 class component 的语法糖。`useState` 就是 `this.state`，`useEffect` 就是生命周期钩子。写法变了，本质没变。

这个认知让我踩了很多坑。

### 第二次：规则怪

后来我开始被 Hooks 的各种"规则"折磨：

- 不能在条件语句里用 Hooks
- 不能在循环里用 Hooks
- useEffect 的依赖项必须完整
- useCallback 的依赖项也必须完整

我开始觉得 Hooks 是一种"有缺陷的抽象"——它用简单的方式暴露了复杂的问题，但把解决问题的责任推给了开发者。

<!-- more -->

### 第三次：思维范式

直到有一天，我在重构一个复杂组件的时候，突然理解了 Hooks 的设计哲学。

**Hooks 不是"替代 class component 的工具"，而是"让函数组件拥有记忆的机制"。**

Class component 的思维方式是"对象"——组件是一个有状态的对象，有生命周期，有方法。

Hooks 的思维方式是"函数"——组件是一个纯函数，给定输入（props），产生输出（UI）。状态和副作用是"逃逸"到函数外部的东西，通过 Hooks 这个"管道"来管理。

这两种思维方式的区别，决定了你写出来的代码质量。

## useState：不只是存状态

### 最常见的误用

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1); // 这样写有 bug
  };

  return <button onClick={increment}>{count}</button>;
}
```

看起来没问题对吧？但如果 `increment` 被快速连续调用两次，`count` 只会增加 1，而不是 2。

为什么？因为 `increment` 里的 `count` 是闭包捕获的值，不是"当前值"。两次调用用的是同一个 `count`（比如 0），所以两次都执行 `setCount(0 + 1)`。

### 正确的思维方式

```jsx
const increment = () => {
  setCount(prev => prev + 1); // 用函数式更新
};
```

函数式更新拿到的是**最新的状态值**，而不是闭包捕获的值。这不是"语法技巧"，而是"状态更新应该基于状态的前一个值"这个原则的体现。

**我的规则：如果新状态依赖旧状态，永远用函数式更新。**

## useEffect：它不是生命周期

这是我踩坑最多的地方。

### 错误的心智模型

很多人（包括曾经的我）把 useEffect 当成生命周期钩子用：

```jsx
useEffect(() => {
  // componentDidMount
  fetchData();

  return () => {
    // componentWillUnmount
    cleanup();
  };
}, []);
```

这个类比在简单场景下能用，但在复杂场景下会让你写出 bug。

### 正确的心智模型

useEffect 的本质是**同步副作用**：当某些值变化时，执行对应的副作用。

```jsx
useEffect(() => {
  // 当 userId 变化时，获取用户数据
  fetchUser(userId);
}, [userId]);
```

不是"组件挂载后执行"，而是"userId 变化时执行"。这个区别很重要。

### 我踩过的坑

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data));
  }, [userId]);

  return <div>{user?.name}</div>;
}
```

这段代码有一个隐藏的 bug：如果 `userId` 快速变化（比如用户快速切换页面），可能会出现"竞态条件"——后发的请求先返回，导致显示了错误的数据。

正确的做法：

```jsx
useEffect(() => {
  let cancelled = false;

  fetch(`/api/users/${userId}`)
    .then(res => res.json())
    .then(data => {
      if (!cancelled) setUser(data);
    });

  return () => {
    cancelled = true; // 取消之前的请求
  };
}, [userId]);
```

这个 cleanup 函数不是"组件卸载时执行"，而是"下一次 effect 执行前执行"。理解了这个，很多 useEffect 的困惑就解开了。

## useCallback 和 useMemo：不要过度优化

### 常见的过度优化

```jsx
// 每次渲染都创建新函数，但其实无所谓
const handleClick = useCallback(() => {
  console.log('clicked');
}, []);

// 简单计算不需要缓存
const fullName = useMemo(() => {
  return `${firstName} ${lastName}`;
}, [firstName, lastName]);
```

React 官方文档说过：**useCallback 和 useMemo 是性能优化工具，不是代码组织工具。**

如果你不确定需不需要用，那就不要用。过早优化是万恶之源。

### 什么时候该用

1. **传递给子组件的回调函数** — 如果子组件用了 `React.memo`，不缓存会导致子组件重渲染
2. **作为其他 Hook 的依赖项** — 如果一个函数是 useEffect 的依赖项，不缓存会导致 effect 频繁执行
3. **昂贵的计算** — 如果计算成本很高，缓存有意义

```jsx
// ✅ 值得缓存：传递给 memo 子组件
const handleSubmit = useCallback((data) => {
  onSubmit(data);
}, [onSubmit]);

// ✅ 值得缓存：作为 useEffect 的依赖
const fetchData = useCallback(() => {
  return fetch(`/api/data?query=${query}`);
}, [query]);

// ❌ 不值得缓存：组件内部使用
const formatName = (name) => name.toUpperCase();
```

## 自定义 Hook：真正的复用

Hooks 最大的价值不是让函数组件能用状态，而是让**状态逻辑可以复用**。

### 我常用的自定义 Hook

```jsx
// useLocalStorage — 持久化状态
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

// useDebounce — 防抖值
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

这些 Hook 封装了通用的状态逻辑，可以在任何组件中使用。这才是 Hooks 的真正价值——不是语法糖，而是**逻辑复用的基础设施**。

## 总结

Hooks 给我的三个认知升级：

1. **组件是函数，不是对象** — 用函数式思维思考组件
2. **useEffect 是同步机制，不是生命周期** — "值变化时执行"而不是"挂载后执行"
3. **Hooks 的价值是逻辑复用** — 不是让函数组件能用状态，而是让状态逻辑可以提取和共享

写 React 代码的时候，问自己一个问题：**如果这个组件是一个纯函数，它的输入和输出是什么？状态和副作用是"逃逸"到外部的，应该怎么管理？**

想清楚这个问题，Hooks 的用法就自然清晰了。

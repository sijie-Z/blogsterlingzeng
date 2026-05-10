---
title: 我终于理解了闭包——从困惑到顿悟的全过程
date: 2026-05-04 09:00:00
categories:
  - 前端开发
tags:
  - JavaScript
  - 闭包
  - 编程思维
description: 闭包不是语法特性，而是一种思维方式。这篇文章记录了我从"闭包是什么"到"闭包为什么重要"的完整认知过程。
cover: /images/cover-code.jpg
---

## 我被闭包坑过

第一次被闭包坑，是在写一个计时器。

```javascript
for (var i = 0; i < 5; i++) {
  setTimeout(function() {
    console.log(i);
  }, 1000);
}
```

我期望输出 `0, 1, 2, 3, 4`，结果输出了五个 `5`。

当时我的反应是：这什么鬼？JavaScript 有 bug 吗？

后来查了资料，知道了用 `let` 就能解决。但"能解决"和"理解为什么"是两回事。我只是换了个写法，对底层发生了什么依然一无所知。

<!-- more -->

## 闭包到底是什么

教科书说：闭包是函数和其词法环境的组合。

这句话每个字我都认识，但连在一起我就是不懂。直到有一天我看到一个类比：

**闭包就像一个人带着自己的行李箱去旅行。**

函数是那个人，词法环境是行李箱。无论这个函数走到哪里（被赋值给变量、作为参数传递、从另一个函数返回），它都随身带着自己的行李箱——也就是它被创建时能访问的那些变量。

```javascript
function createPerson(name) {
  // name 被放进了行李箱
  return function sayHello() {
    console.log(`Hello, I'm ${name}`);
  };
}

const sterling = createPerson('Sterling');
const alice = createPerson('Alice');

sterling(); // "Hello, I'm Sterling"
alice();    // "Hello, I'm Alice"
```

`sterling` 和 `alice` 是两个不同的人，带着两个不同的行李箱。虽然它们都是从同一个 `createPerson` 函数里出来的，但各自"记住"了不同的 `name`。

## 为什么闭包有用

理解了闭包"是什么"之后，下一个问题是"有什么用"。

### 场景一：数据私有化

JavaScript 没有 `private` 关键字（ES2022 之前）。闭包是实现私有变量的经典方式：

```javascript
function createBankAccount(initialBalance) {
  let balance = initialBalance; // 外部无法直接访问

  return {
    deposit(amount) { balance += amount; },
    withdraw(amount) {
      if (amount > balance) {
        console.log('余额不足');
        return;
      }
      balance -= amount;
    },
    getBalance() { return balance; }
  };
}

const account = createBankAccount(1000);
account.deposit(500);
console.log(account.getBalance()); // 1500
console.log(account.balance);      // undefined — 访问不到
```

`balance` 只能通过 `deposit`、`withdraw`、`getBalance` 来操作。这不是语法限制，而是闭包的自然结果——`balance` 在外部函数执行完毕后，只有返回的那几个函数还能访问它。

### 场景二：记住状态

回到最开始的计时器问题。问题的根源是：`var` 声明的变量没有块级作用域，所有 `setTimeout` 的回调函数共享同一个 `i`。

这其实揭示了闭包的一个关键特性：**闭包记住的是变量的引用，不是变量的值。**

```javascript
// 修复方案 1：用 let 创建块级作用域
for (let i = 0; i < 5; i++) {
  setTimeout(function() {
    console.log(i); // 每个 i 都是独立的
  }, 1000);
}

// 修复方案 2：用 IIFE 创建新的作用域
for (var i = 0; i < 5; i++) {
  (function(j) {
    setTimeout(function() {
      console.log(j); // j 是 i 的副本
    }, 1000);
  })(i);
}
```

两种方案的本质是一样的：让每个回调函数都有自己独立的变量，而不是共享同一个。

### 场景三：函数工厂

闭包最优雅的用法是创建"预配置"的函数：

```javascript
function createMultiplier(factor) {
  return function(number) {
    return number * factor;
  };
}

const double = createMultiplier(2);
const triple = createMultiplier(3);

console.log(double(5));  // 10
console.log(triple(5));  // 15
```

`double` 和 `triple` 都是"乘法器"，但它们"记住"了不同的 `factor`。这就是闭包的力量：**用函数生成函数。**

## 闭包的陷阱

理解闭包的好处之后，也得知道它的坑。

### 内存泄漏

闭包会阻止外部变量被垃圾回收。如果你创建了一个闭包，但它引用了一个很大的对象，那个对象就一直占着内存：

```javascript
function processData() {
  const hugeArray = new Array(1000000).fill('data');

  return function() {
    // 即使只用了 hugeArray.length
    // 整个 hugeArray 都不会被回收
    return hugeArray.length;
  };
}
```

解决办法：如果不再需要大对象，在闭包外部把它设为 `null`。

### 意外的共享

```javascript
function createCounters() {
  let count = 0;

  return {
    increment() { count++; },
    getCount() { return count; }
  };
}

const counter = createCounters();
counter.increment();
counter.increment();
console.log(counter.getCount()); // 2
```

如果 `createCounters` 被调用多次，每次返回的都是独立的闭包。但如果你在循环里创建闭包，它们可能会共享同一个变量——这就是最开始那个计时器 bug 的本质。

## 我的顿悟时刻

真正让我"理解"闭包的，不是看了多少篇文章，而是有一天我突然意识到：

**闭包不是 JavaScript 的"特性"，而是函数式编程的自然结果。**

在函数式编程的世界里，函数是一等公民——可以赋值给变量、作为参数传递、作为返回值返回。当函数可以被传来传去的时候，它必须能"记住"自己被创建时的环境，否则传到别的地方就没法用了。

闭包就是这个"记住"的机制。它不是被发明出来的，而是从"函数是一等公民"这个前提自然推导出来的。

## 总结

闭包的核心要点：

1. **闭包 = 函数 + 它的行李箱（词法环境）**
2. **记住的是引用，不是值**
3. **用途：数据私有化、记住状态、函数工厂**
4. **陷阱：内存泄漏、意外共享**

如果你现在还不太理解闭包，没关系。我花了很长时间才想明白。编程就是这样——有些概念不是"学"会的，而是"悟"会的。多写代码，多踩坑，多思考，总有一天会突然开窍。

---

*写完这篇文章，我又重新理解了一遍闭包。这就是写博客的意义吧。*

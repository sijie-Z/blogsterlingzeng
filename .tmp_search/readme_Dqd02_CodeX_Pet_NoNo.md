# CodeNoNo 中文说明

CodeNoNo 是一只为 Codex Desktop 制作的自定义电子宠物。它是一个漂浮在编辑器旁边的小型 AI 编程伙伴：白色圆润机身、黑色屏幕脸、青蓝色发光眼睛、兔耳式能量天线，以及轻量、安静、带一点保护感的陪伴气质。

它的目标不是做一个吵闹的吉祥物，而是在写代码、等待 Codex、检查结果、遇到失败时，用小幅度动画给出清晰的状态反馈。

## 预览

### 动作总览

![CodeNoNo contact sheet](run-codenono/qa/contact-sheet.png)

### 代表动作

| 空闲 | 处理中 | 等待输入 |
| --- | --- | --- |
| ![idle](run-codenono/qa/previews/idle.gif) | ![running](run-codenono/qa/previews/running.gif) | ![waiting](run-codenono/qa/previews/waiting.gif) |

| 招手 | 跳跃 | 失败 |
| --- | --- | --- |
| ![waving](run-codenono/qa/previews/waving.gif) | ![jumping](run-codenono/qa/previews/jumping.gif) | ![failed](run-codenono/qa/previews/failed.gif) |

如果想一次性查看所有动作，可以直接打开：

```text
run-codenono/qa/action-gallery.html
```

## 角色设定

CodeNoNo 是一只 Codex 本机电子宠物，定位是“会陪你写代码的小型智能助手”。

- 形象：圆润白色机器人，黑色屏幕脸，青蓝色眼睛
- 气质：聪明、安静、可靠、轻微调皮
- 场景：写代码、调试、等待 Codex、测试通过或失败、提交前检查
- 风格：简洁、未来感、桌面悬浮宠物，不遮挡工作区

## 动作状态

| 行 | 状态 | 含义 |
| --- | --- | --- |
| 0 | `idle` | 默认待机，轻微漂浮 |
| 1 | `running-right` | 向右移动或被拖动 |
| 2 | `running-left` | 向左移动或被拖动 |
| 3 | `waving` | 打招呼 |
| 4 | `jumping` | 轻微跳跃 |
| 5 | `failed` | 失败、报错或不顺利 |
| 6 | `waiting` | 等待用户输入 |
| 7 | `running` | Codex 正在处理任务 |
| 8 | `review` | 检查、审阅、提交前确认 |

最终精灵图尺寸为 `1536 x 1872`，每格为 `192 x 208`。

## 安装

当前 Codex Desktop 版本通常读取 `avatars` 目录：

```text
%USERPROFILE%\.codex\avatars\codenono\
  avatar.json
  spritesheet.webp
```

旧版或兼容场景可能读取 `pets` 目录：

```text
%USERPROFILE%\.codex\pets\codenono\
  pet.json
  spritesheet.webp
```

清单文件示例：

```json
{
  "id": "codenono",
  "displayName": "CodeNoNo",
  "description": "A compact floating AI coding companion robot with a white rounded body, black glossy screen face, cyan glowing eyes, rabbit-ear energy antennae, small blue light wings, and calm protective coding-pet behavior.",
  "spritesheetPath": "spritesheet.webp"
}
```

复制完成后，重启 Codex Desktop，或在设置页刷新宠物/头像列表。

## Windows / WSL 说明

如果你在 Windows 上使用 Codex Desktop，并且 app-server 运行在 WSL 相关模式下，自定义宠物可能因为路径混用而无法被发现。典型情况是文件已经放进 `.codex/avatars` 或 `.codex/pets`，但设置页依旧不显示。

本项目保留了补丁排查目录 `patch-inspect/`，用于处理这类 Windows/WSL 路径问题。不要直接修改 WindowsApps 里的原始 Codex 安装包；更稳妥的做法是复制出一个本地 patched Codex，再从 patched 快捷方式启动。

## 文件结构

```text
.
+-- README.md
+-- run-codenono/
|   +-- final/
|   |   +-- spritesheet.webp
|   |   +-- spritesheet.png
|   |   +-- validation.json
|   +-- qa/
|       +-- action-gallery.html
|       +-- contact-sheet.png
|       +-- previews/
|       |   +-- idle.gif
|       |   +-- running-right.gif
|       |   +-- running-left.gif
|       |   +-- waving.gif
|       |   +-- jumping.gif
|       |   +-- failed.gif
|       |   +-- waiting.gif
|       |   +-- running.gif
|       |   +-- review.gif
|       +-- run-summary.json
+-- patch-inspect/
```

## 验证

- 已生成最终 WebP 精灵图
- 精灵图尺寸为 `1536 x 1872`
- 使用 `192 x 208` 单元格布局
- 未使用格子保持透明
- 9 个动作状态均生成了 GIF 预览

---

# CodeNoNo

CodeNoNo is a custom animated pet for Codex Desktop: a compact floating AI coding companion with a rounded white body, glossy screen face, cyan eyes, rabbit-ear energy antennae, and a calm sci-fi assistant personality.

It is designed as a lightweight desktop coding companion that reacts to Codex workflow states such as idle, running, waiting, review, and failure.

## Preview

The generated pet atlas and QA previews are included under `run-codenono/`.

- Contact sheet: `run-codenono/qa/contact-sheet.png`
- Action gallery: `run-codenono/qa/action-gallery.html`
- Final spritesheet: `run-codenono/final/spritesheet.webp`

Open `run-codenono/qa/action-gallery.html` in a browser to preview all animations at once.

## Character

CodeNoNo is a small floating assistant robot built for a developer workflow:

- white rounded capsule body
- black glossy screen face
- cyan glowing symbolic eyes
- blue-and-white rabbit-ear energy antennae
- small side light-wings
- subtle futuristic body lines
- soft, protective, slightly playful coding-pet behavior

The design is original, while keeping the broad feeling of a friendly sci-fi helper pet.

## Animation States

The spritesheet follows the Codex pet atlas layout with 9 animation rows:

| Row | State | Meaning |
| --- | --- | --- |
| 0 | `idle` | Calm floating default state |
| 1 | `running-right` | Moving or being dragged to the right |
| 2 | `running-left` | Moving or being dragged to the left |
| 3 | `waving` | Friendly greeting |
| 4 | `jumping` | Small happy jump |
| 5 | `failed` | Failure or error feedback |
| 6 | `waiting` | Waiting for user input |
| 7 | `running` | Codex is working or thinking |
| 8 | `review` | Reviewing, checking, or inspecting |

The final atlas is `1536 x 1872`, using `192 x 208` cells.

## Installation

Copy the final pet files into your Codex custom pet/avatar directory.

For current Codex Desktop builds that read custom avatars:

```text
%USERPROFILE%\.codex\avatars\codenono\
  avatar.json
  spritesheet.webp
```

For older pet-based builds:

```text
%USERPROFILE%\.codex\pets\codenono\
  pet.json
  spritesheet.webp
```

Example manifest:

```json
{
  "id": "codenono",
  "displayName": "CodeNoNo",
  "description": "A compact floating AI coding companion robot with a white rounded body, black glossy screen face, cyan glowing eyes, rabbit-ear energy antennae, small blue light wings, and calm protective coding-pet behavior.",
  "spritesheetPath": "spritesheet.webp"
}
```

After copying the files, restart Codex Desktop or refresh the pet/avatar list in Settings.

## WSL Note

Some Codex Desktop builds on Windows with WSL app-server mode may not discover custom pets because the app constructs a mixed Windows/POSIX path.

If the custom pet does not appear even though the files are in the correct directory, a local patched Codex copy may be required. This repository keeps the downloaded patch inspection files under `patch-inspect/`, but the original Codex installation should not be modified directly.

## Repository Layout

```text
.
+-- README.md
+-- run-codenono/
|   +-- final/
|   |   +-- spritesheet.webp
|   |   +-- spritesheet.png
|   |   +-- validation.json
|   +-- qa/
|       +-- action-gallery.html
|       +-- contact-sheet.png
|       +-- previews/
|       |   +-- idle.gif
|       |   +-- running-right.gif
|       |   +-- running-left.gif
|       |   +-- waving.gif
|       |   +-- jumping.gif
|       |   +-- failed.gif
|       |   +-- waiting.gif
|       |   +-- running.gif
|       |   +-- review.gif
|       +-- run-summary.json
+-- patch-inspect/
```

## Validation

The generated atlas has been validated by the hatch-pet pipeline:

- final WebP atlas exists
- atlas size is `1536 x 1872`
- frame cells follow the `192 x 208` layout
- unused cells are transparent
- preview GIFs are generated for all 9 rows

## License

Add your preferred license before publishing. If you do not have a specific requirement, MIT is a simple default for sharing the pet files and documentation.

# 鸡煲 · Codex 动画宠物

[English](README.en.md) · [安装](#安装) · [网页端上传](#chatgpt-网页端) · [动作说明](#动作与触发条件)

鸡煲是一只憨憨、友好的像素风独眼小伙伴。这个仓库同时提供适用于 ChatGPT 桌面应用与兼容终端的本地 v2 宠物包，以及适用于 ChatGPT 网页端上传的 1536×1872 兼容图集。

![鸡煲完整动作与触发表](assets/jibao-action-trigger-sheet.png)

## 包含内容

- `pet/desktop/`：桌面应用与兼容 Codex CLI 使用的 v2 宠物，包含 9 组标准动画和 16 个观察方向。
- `pet/web/jibao-web.png`：网页端上传版，透明 PNG，1536×1872，不超过 20 MiB。
- `scripts/`：Windows、macOS 和 Linux 的安全安装/卸载脚本。
- `assets/`：动作表、QA 联系表、方向图和逐行动画预览。
- `tools/validate_release.py`：发布前结构、尺寸、透明度和帧占用验证。
- `.github/workflows/`：推送校验及标签发布工作流。

## 安装

先下载 GitHub Release 中的 `jibao-desktop-v1.0.0.zip` 并解压，或克隆本仓库。

### Windows

在仓库根目录运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

如果你设置了自定义 `CODEX_HOME`，脚本会自动使用它；也可显式指定：

```powershell
.\scripts\install.ps1 -CodexHome "D:\MyCodexHome"
```

### macOS / Linux

```bash
chmod +x ./scripts/install.sh
./scripts/install.sh
```

安装脚本只会写入 `<CODEX_HOME>/pets/jibao/`。如果已有同名宠物，旧目录会被移动到带时间戳的备份目录，不会直接删除。

### 启用宠物

1. 打开 ChatGPT 桌面应用的 `Settings > Pets`。
2. 选择 `Refresh`，然后选择“鸡煲”。
3. 输入 `/pet`，或从命令菜单选择 `Wake Pet`。

在兼容的 Codex CLI 终端中，可以输入：

```text
/pets jibao
```

终端宠物需要 iTerm2 3.6+，或支持 Kitty graphics / Sixel 的终端；tmux 与 Zellij 内不可用。

## ChatGPT 网页端

网页端不会自动同步本机宠物。请打开 `Settings > Personalization > Pet > Select pet`，选择 `Upload pet`，然后上传：

```text
pet/web/jibao-web.png
```

网页端宠物显示在支持的 ChatGPT Work 对话中，不提供桌面悬浮层、活动托盘或 `/pet` 命令。

## 手动安装

如果不想运行脚本，将整个 `pet/desktop/` 目录复制为：

```text
<CODEX_HOME>/pets/jibao/
```

默认位置通常是：

- Windows：`%USERPROFILE%\.codex\pets\jibao\`
- macOS / Linux：`~/.codex/pets/jibao/`

目标目录中必须同时存在 `pet.json` 和 `spritesheet.webp`。

## 卸载

卸载脚本采用可恢复方式：它会把宠物目录移动到带时间戳的 `.removed-*` 目录，而不是永久删除。

Windows：

```powershell
.\scripts\uninstall.ps1
```

macOS / Linux：

```bash
./scripts/uninstall.sh
```

## 动作与触发条件

| 动作 | 触发条件 |
|---|---|
| `idle` | 没有活动任务时自动循环 |
| `running-right` | 向右拖动悬浮宠物 |
| `running-left` | 向左拖动悬浮宠物 |
| `waving` | 首次唤醒或唤醒后的首次活动提醒 |
| `jumping` | 鼠标悬停在宠物上 |
| `failed` | 任务失败或被阻塞（Blocked） |
| `waiting` | 任务需要输入或批准（Needs input） |
| `running` | Codex 正在执行任务（Running） |
| `review` | 任务完成且结果未读（Ready） |
| 16 个观察方向 | 在 `idle`、`running` 或 `waving` 时，鼠标位于宠物周围相应方向 |

详细帧序列见 [完整动作与触发表](assets/jibao-action-trigger-sheet.png)。

## 发布前验证

```bash
python -m pip install -r requirements-dev.txt
python tools/validate_release.py
```

验证器会检查：

- `pet.json` 的 ID、v2 版本号和图集路径；
- 桌面图集为透明 1536×2288、8×11、单元格 192×208；
- 网页图集为透明 1536×1872 且小于 20 MiB；
- 所有必需帧非空，未使用帧完全透明；
- 发布所需文档和安装脚本存在。

## 兼容性说明

- 自定义宠物保存在本机，不会自动同步到 ChatGPT 网页端。
- 操作系统开启“减少动态效果”时，宠物会显示静态帧。
- Codex IDE 扩展目前不提供宠物选择器或悬浮宠物。
- 公开产品行为与网页上传要求以 [OpenAI Pets 官方文档](https://learn.chatgpt.com/docs/pets)为准。

## 许可证

安装与验证脚本采用 MIT License；鸡煲角色、美术资源和文档默认采用 CC BY-NC-SA 4.0。详情见 [LICENSE.md](LICENSE.md)。公开发布前，请确认你拥有原始角色和参考图的再分发权。


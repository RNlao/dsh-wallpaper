# dsh-wallpaper · DSH 壁纸插件

**中文** | [English](./README.en.md)

让用户在 DSH Web 界面更换背景图片的插件，支持：无壁纸、预设渐变、上传图片、**导入文件夹**、**裁剪图片**、**模糊**、遮罩、面板半透明、文字颜色/阴影、填充与位置调整。

图片以**原始字节存浏览器 IndexedDB**（不压缩、不 base64、不受 localStorage 5MB 限制），通过 object URL 显示；「当前选择 + 效果参数」存 `localStorage`。

## 安装

**一键安装（推荐，跨平台）：**

```bash
git clone https://github.com/RNlao/dsh-wallpaper.git
cd dsh-wallpaper
node install.mjs
```

脚本会自动检测 DSH 数据目录（`$DSH_HOME` 或 `~/.dsh`）、创建软链接、并把本包写进 `dependencies` 与 `dsh.profile.bundles`。卸载：`node install.mjs --uninstall`。

**手动安装（备选）：**

```bash
dsh plugin --profile web add link:/path/to/dsh-wallpaper
```

安装后：重启 `dsh web`，浏览器强刷，打开 **设置 → 壁纸 / Wallpaper**。

## 平台兼容性

插件本身**跨平台**（纯浏览器实现，host 半为空插件，无操作系统特定代码），Windows / macOS / Linux 功能一致，差异仅在路径与快捷键：

- **数据目录**：macOS / Linux 默认 `~/.dsh`；Windows 默认 `%USERPROFILE%\.dsh`。
- **手动安装路径**：Windows 用 `link:C:\path\to\dsh-wallpaper`；路径含空格时，改用 `cd` 进 profile 目录后 `pnpm add "link:…"`（加引号）。
- **浏览器强刷**：macOS `Cmd+Shift+R`；Windows / Linux `Ctrl+Shift+R`。
- **导入文件夹**依赖 `webkitdirectory`，是浏览器特性（Chrome / Edge / Safari 支持，Firefox 不支持），与操作系统无关。

用 `node install.mjs` 一键安装可自动处理上述路径差异。

## 功能

- **无壁纸**：恢复 DSH 原生外观（插件默认即此状态，不主动改变界面）。
- **预设**：8 个内置渐变。
- **图片库**：上传 / 导入文件夹 / 裁剪的图片进入图片库（缩略图网格、可删、点选设背景）。
- **裁剪**：拖拽框选保留区域 → 输出新图。
- **模糊** 0–50px、**遮罩** 0–0.9、**面板不透明度** 0.3–1.0。
- **文字可读性**：文字颜色（自动/浅色/深色）+ 文字阴影。
- **填充与位置**：裁切填充 / 完整显示 / 拉伸；水平、垂直位置。

## 存储说明

- 图片原始字节 → 浏览器 **IndexedDB**（库 `dsh-wallpaper` / store `images`）。不压缩、不 base64、容量不受 5MB 限制。
- 当前选择 + 效果参数 → `localStorage`（仅元数据，很小）。

## 工作原理

- **背景层**：`body::before`（固定、`z-index:-1`）承载图片/渐变，`body::after` 承载遮罩；`body{isolation:isolate}` 保证负 z-index 层位于应用内容之下。
- **面板透出（收敛版）**：`ctx.theme.overrideTokens` **只**把 3 个大面积 token 覆盖成半透明——`--dsw-alias-bg-base`（主画布）、`--dsw-specific-sidebar-fill`（侧边栏）、`--dsw-specific-input-major`（输入框）。内部卡片（`bg-layer-*`、菜单、气泡）保持实底，保证文字可读、且不会让设置页/主页面「太透明」。
- **图片存取**：图片以 Blob 存 IndexedDB，`URL.createObjectURL(blob)` 生成临时 URL 供 `<img>`/CSS 使用，用完 `revokeObjectURL` 释放；缩略图按需读取（`GalleryThumb` 组件 mount 时读取、unmount 时释放）。
- **文字颜色**：覆盖 `--dsw-alias-label-*` token；文字阴影用 `text-shadow`。
- **设置页**：`slots.inject('settings.section', …)` 注册「壁纸 / Wallpaper」页。
- **生命周期**：样式、token 覆盖、slot 注册、object URL 均挂在插件 fiber 上，禁用/卸载即清理。

## 已知限制

- 导入文件夹依赖 `webkitdirectory`（Chrome / Edge / Safari 支持，Firefox 不支持）。单张上传不依赖它，全浏览器可用。
- 图片存 IndexedDB：浏览器清除站点数据（清缓存/隐私模式）会一并清掉；换浏览器不共享。
- 半透明面板底色通道取自当前 DSH 的 `design-platform.css`；若未来 token 色值调整，透明度观感可能略变（不影响功能）。

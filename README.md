# dsh-wallpaper · DSH 壁纸插件

让用户在 DSH Web 界面更换背景图片的插件，支持：无壁纸、预设渐变、上传图片、**导入文件夹**、**裁剪图片**、**模糊**、遮罩、面板半透明、文字颜色/阴影、填充与位置调整。

图片以**原始字节存浏览器 IndexedDB**（不压缩、不 base64、不受 localStorage 5MB 限制），通过 object URL 显示；「当前选择 + 效果参数」存 `localStorage`。

## 仓库结构

符合 DSH 插件格式的 npm 包（`dsh.bundle` + `dsh.client`，纯客户端实现）：

```
dsh-wallpaper/
├── package.json          # dsh.bundle（自动装载）+ dsh.client（浏览器半）+ exports
├── cordis.patch.yml      # bundle patch：insert 自己的 host 半
├── lib/
│   ├── index.js          # host 半（空插件，仅作为 loader 配置项让 client 被扫描）
│   └── client.js         # client 半：window.__ModuleLoader__.load 格式，全部 UI/逻辑
├── dynamic/              # 动态插件版本（cordis preset 临时运行用）
│   ├── client.js
│   └── host.js
└── README.md
```

## 安装（持久化）

```bash
cd ~/.dsh/profiles/web
pnpm add 'dsh-wallpaper@link:/path/to/dsh-wallpaper'

# 确认 dsh.profile.bundles 含 "dsh-wallpaper"（dsh plugin add 会自动加入）

# 重启 dsh web，浏览器强刷（Cmd+Shift+R）
```

> 也可用 `dsh plugin --profile web add github:RNlao/dsh-wallpaper`（内部即 pnpm add，自动写入 `dependencies` 并 reconcile 进 `dsh.profile.bundles`）。

> 关键点：`dsh-wallpaper` 必须同时出现在 `dependencies` 和 `dsh.profile.bundles` 里，且 `node_modules/dsh-wallpaper` 存在——否则 DSH 从 profile 目录 import host 半时抛 `ERR_MODULE_NOT_FOUND`。全局 `npm install -g` 无效。

## 功能

- **无壁纸**：恢复 DSH 原生外观（插件默认即此状态，不主动改变界面）。
- **预设**：8 个内置渐变。
- **图片库**：上传 / 导入文件夹 / 裁剪的图片进入图片库（缩略图网格、可删、点选设背景）。
- **裁剪**：拖拽框选保留区域 → 输出新图。
- **模糊** 0–50px、**遮罩** 0–0.9、**面板不透明度** 0.3–1.0。
- **文字可读性**：文字颜色（自动/浅色/深色）+ 文字阴影。
- **填充与位置**：裁切填充 / 完整显示 / 拉伸；水平、垂直位置。

## 存储说明

- 图片原始字节 → 浏览器 **IndexedDB**（`dsh-wallpaper` 库 / `images` store）。不压缩、不 base64、容量不受 5MB 限制。
- 当前选择 + 效果参数 → `localStorage`（仅元数据）。

## 工作原理

- **背景层**：`body::before`（固定、`z-index:-1`）承载图片/渐变，`body::after` 承载遮罩；`body{isolation:isolate}` 保证负 z-index 层位于应用内容之下。
- **面板透出（收敛版）**：`ctx.theme.overrideTokens` **只**把 3 个大面积 token——`--dsw-alias-bg-base`（主画布）、`--dsw-specific-sidebar-fill`（侧边栏）、`--dsw-specific-input-major`（输入框）——覆盖成半透明 `rgba`；内部卡片（`bg-layer-*`、菜单、气泡）保持实底，保证文字可读、且不会让设置页/主页面「太透明」。
- **图片存取**：图片以 Blob 存 IndexedDB，`URL.createObjectURL(blob)` 生成临时 URL 供 `<img>`/CSS 使用，用完 `revokeObjectURL` 释放；缩略图按需读取（`GalleryThumb` 组件 mount 时读取、unmount 时释放）。
- **文字颜色**：覆盖 `--dsw-alias-label-*` token；文字阴影用 `text-shadow`。
- **设置页**：`slots.inject('settings.section', …)` 注册「壁纸 / Wallpaper」页。
- **生命周期**：样式、token 覆盖、slot 注册、object URL 均挂在插件 fiber 上，禁用/卸载即清理。

## 已知限制

- 导入文件夹依赖 `webkitdirectory`（Chrome / Edge / Safari 支持，Firefox 不支持）。单张上传不依赖它，全浏览器可用。
- 图片存 IndexedDB，浏览器数据清除（清缓存/隐私模式）会一并清掉；换浏览器不共享。
- 半透明面板底色通道取自当前 DSH 的 `design-platform.css`；若未来 token 色值调整，透明度观感可能略变（不影响功能）。

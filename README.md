# dsh-wallpaper · DSH 壁纸插件

让用户在 DSH Web 界面更换背景图片的插件，支持：无壁纸、预设渐变、上传图片、**导入文件夹**、**裁剪图片**、**模糊**、遮罩、面板半透明、文字颜色/阴影、填充与位置调整。

图片作为**真实文件**保存到 DSH 配置文件夹 `~/.dsh/wallpaper/`（原图、不压缩），不受浏览器存储 5MB 限制；选择与效果参数存 `localStorage`。

## 仓库结构

符合 DSH 插件格式的 npm 包（`dsh.bundle` + `dsh.client` 双面插件）：

```
dsh-wallpaper/
├── package.json          # dsh.bundle（自动装载）+ dsh.client（浏览器半）+ exports
├── cordis.patch.yml      # bundle patch：insert 自己的 host 半
├── lib/
│   ├── index.js          # host 半：Node fs 读写 ~/.dsh/wallpaper/ + webServer 路由
│   └── client.js         # client 半：window.__ModuleLoader__.load 格式，实际 UI/逻辑
├── dynamic/              # 动态插件版本（cordis preset 临时运行用）
│   ├── client.js
│   └── host.js
└── README.md
```

## 安装（持久化，免手写配置）

```bash
# 从 GitHub 安装（或本地路径 /path/to/dsh-wallpaper）
dsh plugin --profile web add github:RNlao/dsh-wallpaper

# 重启 dsh web 即生效
```

重启后打开 **设置（左下角）→ 壁纸 / Wallpaper**。

> 原理：`dsh plugin` 装包后 detect 到本包声明了 `dsh.bundle.patch`，自动加入 `dsh.profile.bundles`，作为 profile layer 应用 `cordis.patch.yml`（insert host 半）；`dsh-client-modules` 扫描 `dsh.client` 声明，通过 `/plugins/dsh-wallpaper/client.js` 提供浏览器半。host 半则通过 `webServer` 暴露 `/dsh-wallpaper/*` 路由给浏览器读写磁盘图片。全程无需手写配置、无需重新构建前端。

## 功能

- **无壁纸**：恢复 DSH 原生外观（插件默认即此状态，不主动改变界面）。
- **预设**：8 个内置渐变。
- **图片库**：上传 / 导入文件夹 / 裁剪的图片进入图片库（缩略图网格、可删、点选设背景）。
- **裁剪**：拖拽框选保留区域 → 输出新图。
- **模糊** 0–50px、**遮罩** 0–0.9、**面板不透明度** 0.3–1.0。
- **文字可读性**：文字颜色（自动/浅色/深色）+ 文字阴影。
- **填充与位置**：裁切填充 / 完整显示 / 拉伸；水平、垂直位置。

## 存储说明

- 图片文件 → `~/.dsh/wallpaper/`（`$DSH_HOME/wallpaper`，`$DSH_HOME` 默认 `~/.dsh`）。原图保存、不压缩。
- 当前选择 + 效果参数 → 浏览器 `localStorage`（体积很小，仅元数据）。

## 工作原理

- **背景层**：`body::before`（固定、`z-index:-1`）承载图片/渐变，`body::after` 承载遮罩；`body{isolation:isolate}` 保证负 z-index 层位于应用内容之下。
- **面板透出**：`ctx.theme.overrideTokens` 把 18 个 `--dsw-alias-bg-*` / `--dsw-specific-*` 表面 token 覆盖成半透明 `rgba`（light/dark 各一份）。
- **图片存取**：host 半用 Node 原生 `fs` 读写 `~/.dsh/wallpaper/`，经 `webServer` 路由 `/dsh-wallpaper/{list,save,delete,file/*}` 与浏览器通信；浏览器 `<img>` / CSS 直接以 `/dsh-wallpaper/file/<id>` 加载。
- **文字颜色**：覆盖 `--dsw-alias-label-*` token；文字阴影用 `text-shadow`。
- **设置页**：`slots.inject('settings.section', …)` 注册「壁纸 / Wallpaper」页。
- **生命周期**：样式、token 覆盖、slot 注册、HTTP 路由均挂在插件 fiber 上，禁用/卸载即清理。

## 已知限制

- 导入文件夹依赖 `webkitdirectory`（Chrome / Edge / Safari 支持，Firefox 不支持）。单张上传不依赖它，全浏览器可用。
- 半透明面板底色通道取自当前 DSH 的 `design-platform.css`；若未来 token 色值调整，透明度观感可能略变（不影响功能）。

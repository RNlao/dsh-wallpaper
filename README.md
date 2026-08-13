# dsh-wallpaper · DSH 壁纸插件

让用户在 DSH Web 界面更换背景图片的插件，支持：预设渐变、上传图片、**浏览本地文件夹（缩略图预览）**、**裁剪图片**、**模糊**、遮罩、面板半透明、填充方式与位置调整。配置持久化到 `localStorage`，刷新后自动恢复。

## 仓库结构

这是一个符合 DSH 插件格式的 npm 包（**纯客户端实现，host 半为空**）：

```
dsh-wallpaper/
├── package.json          # dsh.client 元数据 + exports["./client"]
├── lib/
│   ├── index.js          # host 半（空插件，仅作为 loader 配置项，让 client 被扫描）
│   └── client.js         # client 半（window.__ModuleLoader__.load 格式，实际功能都在这里）
├── dynamic/              # 动态插件版本（cordis preset 临时运行用，见文末）
│   ├── client.js
│   └── host.js
├── cordis.patch.example.yml
└── README.md
```

## 安装（持久化）

> 原理：DSH 的 Node 侧会扫描 cordis 配置里启用的包，发现 `dsh.client` 声明后，通过 `/plugins/dsh-wallpaper/client.js` 把浏览器半提供给前端——**不需要重新构建前端**，重启 `dsh web` 即生效。

```bash
# 1. 安装插件到 web profile 的 node_modules（本地路径或 GitHub 均可）
dsh plugin --profile web add /path/to/dsh-wallpaper
# 或从 GitHub：
dsh plugin --profile web add github:<你的账号>/dsh-wallpaper

# 2. 编辑 $DSH_HOME/profiles/web/cordis.patch.yml，加入（见 cordis.patch.example.yml）：
#    - insert:
#        - id: dsh-wallpaper
#          name: dsh-wallpaper

# 3. 重启
#    Ctrl-C 停掉当前 dsh web，再 dsh web 启动
```

重启后打开 **设置（左下角）→ 壁纸 / Wallpaper** 即可使用。

> `$DSH_HOME` 默认是 `~/.dsh`。若 `cordis.patch.yml` 目前是 `[]`，直接用 example 里的 `insert` 段替换 `[]`。

## 安装（动态插件，临时，备选）

`dynamic/` 目录里是动态 Cordis 插件版本（`code.host` + `code.client`），适合在 **`cordis` preset 的会话**里临时运行，进程重启后需重新 define/run（壁纸配置仍在）。用法见 `dynamic/` 内逻辑与文末说明：让 agent `cordis_define`（`code.host`=`dynamic/host.js`、`code.client`=`dynamic/client.js`）再 `cordis_run`。

> 区别：动态版用 host 半读任意绝对路径目录；持久化版改用浏览器原生的「选择目录」（`webkitdirectory`），因此是纯客户端、无需 host 半做事，但目录选择器在 Firefox 上不受支持（Chrome / Edge / Safari 可用）。

## 功能

- **选择背景**：8 个内置渐变预设；上传图片；浏览本地文件夹（缩略图预览，点击即设为背景）。
- **裁剪图片**：拖拽框选保留区域 → 实时预览 → 输出裁剪后的新背景。
- **模糊** 0–50px、**遮罩** 0–0.9、**面板不透明度** 0.3–1.0。
- **填充方式**：裁切填充 / 完整显示 / 拉伸；水平、垂直位置。
- **持久化**：配置（含图片 data URL）存 `localStorage`。

## 使用方法

1. 打开 **设置 → 壁纸 / Wallpaper**。
2. 选图：预设 / 上传图片 / 「选择目录」浏览本地文件夹。
3. 调裁剪、模糊、遮罩、面板不透明度、填充位置。即时生效、自动保存。

## 工作原理

- **背景层**：注入 `body::before`（固定、`z-index:-1`）承载图片/渐变，`body::after` 承载遮罩；`body{isolation:isolate}` 让负 z-index 伪元素落在应用内容之下、body 背景之上。
- **面板透出**：`ctx.theme.overrideTokens` 把 `--dsw-alias-bg-*`、`--dsw-specific-sidebar-fill` 覆盖成半透明 `rgba`（light/dark 各一份）。
- **设置页**：`slots.inject('settings.section', () => slots.register({ name:'settings.section', id:'wallpaper', … }, WallpaperSection))`。
- **本地文件夹**：`<input type="file" webkitdirectory>` 选目录 → 遍历 FileList 筛选图片 → `FileReader` 读取 + canvas 压缩成 160px 缩略图（并发 4 张）。
- **裁剪**：图片按比例画到 `<canvas>`，pointer 事件拖拽框选，`drawImage` 导出 `image/jpeg`。
- **生命周期**：样式表、token 覆盖、slot 注册都挂在插件 fiber 上，禁用/卸载即清理恢复。

## 已知限制

- 本地文件夹目录选择器依赖 `webkitdirectory`（Chrome / Edge / Safari 支持，Firefox 不支持）。
- 缩略图是「逐张读图 → canvas 压缩」生成，目录文件多时会分批渐次出现。
- `localStorage` 约 5MB 配额；上传时自动压缩到 1920px。
- 半透明面板底色通道取自当前 DSH 的 `design-platform.css`；若未来 token 色值调整，透明度观感可能略变（不影响功能）。

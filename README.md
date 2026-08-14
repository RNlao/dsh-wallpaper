# dsh-wallpaper · DSH 壁纸插件

**中文** | [English](./README.en.md)

<p align="center"><img src="https://repository-images.githubusercontent.com/1333486205/208d5ee9-1233-4bdb-a99c-f985e7ccd975" alt="dsh-wallpaper" width="800" /></p>

让用户在 DSH Web 界面更换背景图片的插件，支持：主界面 / 轨迹页独立壁纸、边栏自动跟随当前页面壁纸、无壁纸、预设渐变、上传图片、**导入文件夹**、**裁剪图片**、**模糊**、面板半透明、全界面自定义文字颜色 / 阴影、填充与位置调整，界面可切换中文 / English。

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

- **总开关**：关闭「启用壁纸效果」会撤销背景、透明度和字体样式，完整恢复 DSH 原始外观；再次打开会恢复已保存配置。
- **无壁纸**：当前页面不使用壁纸，保留其他已启用的插件设置。
- **预设**：8 个内置渐变。
- **图片库**：上传 / 导入文件夹 / 裁剪的图片进入图片库（缩略图网格、可删、点选设背景）。
- **裁剪**：拖拽框选保留区域 → 输出新图。
- **主界面 / 轨迹页**：两套壁纸可独立配置；轨迹页默认跟随主界面，也可选择自己的图片、渐变或无壁纸。
- **模糊与表面不透明度**：主界面和独立轨迹壁纸分别保存模糊 0–50px、表面不透明度 0–1.0；工作区和侧栏可降到完全透明，输入区域在最低值保留极轻表面；轨迹跟随主界面壁纸时同步继承主页效果。
- **界面语言**：设置页顶部可切换 中文 / English。
- **文字可读性**：主界面文字颜色支持自动 / 浅色 / 深色 / 自定义取色，应用于标题栏、输入栏权限与模型、思考和工具调用；实心主操作按钮保留反色文字，避免低对比度。侧栏独立跟随 DSH 外观：浅色外观统一使用深色文字和图标，深色外观统一使用浅色文字和图标。插件文字规则不进入 DSH 设置区域。
- **轨迹配色方案**：轨迹页提供 DSH 原生 / 清澈 / 青玉三套方案，每套都包含浅色和深色外观 palette，并随 DSH 外观自动切换；清澈与青玉的普通文字统一使用高对比深色 / 浅色且不附加强制阴影，方案差异集中在品牌色、状态色、边框与小型浮层。Main 与轨迹页共用同一套标题栏文字规则，切换页面不会改变标题栏明暗。
- **填充与位置**：裁切填充 / 完整显示 / 拉伸；水平、垂直位置，主界面与轨迹页分别保存。

## 存储说明

- 图片原始字节 → 浏览器 **IndexedDB**（库 `dsh-wallpaper` / store `images`）。不压缩、不 base64、容量不受 5MB 限制。
- 当前选择 + 效果参数 → `localStorage`（仅元数据，很小）。

## 工作原理

- **背景层**：`body::before`（固定、`z-index:-1`）承载主界面或轨迹页的图片/渐变；通过 `:has([data-trajectory-scroll])` 判断当前是否为轨迹视图，标题栏、边栏与当前视图共用当前页面的同一张壁纸。
- **面板透出**：主界面与轨迹工作区都通过 DSH 主题 token 使用可调半透明表面，轨迹内部工具栏、时间线、表格和表头继续透出同一张壁纸；边栏根面板使用当前页面壁纸下的轻微半透明底色。小型控件、菜单、悬停和选择状态仍保留必要表面。总开关关闭时撤销全部覆盖。
- **图片存取**：图片以 Blob 存 IndexedDB，`URL.createObjectURL(blob)` 生成临时 URL 供 `<img>`/CSS 使用，用完 `revokeObjectURL` 释放；缩略图按需读取（`GalleryThumb` 组件 mount 时读取、unmount 时释放）。
- **文字颜色与轨迹配色**：主界面颜色设置作用于标题栏、对话文字语义 token、思考、工具区域和输入提示，但通过正向区域白名单排除 DSH 设置界面。轨迹顶部工具栏、时间线、搜索、表格文字与图标由所选方案统一控制，每套方案根据 DSH 浅色/深色外观选择对应 palette；业务状态色保留区分，审批卡片的实心允许按钮强制保留白色文字。
- **设置页**：`slots.inject('settings.section', …)` 注册「壁纸 / Wallpaper」页；设置页顶部切换主界面与轨迹页，轨迹页默认继承主界面。插件设置控件使用 DSH 原生主题 token。
- **生命周期**：样式、slot 注册、object URL 均挂在插件 fiber 上，禁用/卸载即清理。

## 已知限制

- 导入文件夹依赖 `webkitdirectory`（Chrome / Edge / Safari 支持，Firefox 不支持）。单张上传不依赖它，全浏览器可用。
- 图片存 IndexedDB：浏览器清除站点数据（清缓存/隐私模式）会一并清掉；换浏览器不共享。
- 半透明面板底色通道取自当前 DSH 的 `design-platform.css`；若未来 token 色值调整，透明度观感可能略变（不影响功能）。

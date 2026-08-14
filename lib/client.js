// ============================================================================
// dsh-wallpaper · 客户端半 (browser half) —— 静态插件格式 v4
// ----------------------------------------------------------------------------
// 纯客户端实现：图片以原始字节存浏览器 IndexedDB（不 base64、无 5MB 限制），
// 通过 object URL 显示；localStorage 只存「当前选择 + 效果参数」。
// 背景透出只覆盖主画布 / 侧边栏 / 输入框三个大面积 token，内部卡片保持实底
// 以保证文字可读。
// ============================================================================
window.__ModuleLoader__.load({
  id: "dsh-wallpaper",
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");

    var STORAGE_KEY = "dsh-wallpaper:v4";
    var DB_NAME = "dsh-wallpaper";
    var DB_STORE = "images";

    var GRADIENTS = [
      { id: "aurora", zh: "极光", en: "Aurora", css: "linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)" },
      { id: "sunset", zh: "日落", en: "Sunset", css: "linear-gradient(135deg,#f6d365 0%,#fda085 100%)" },
      { id: "ocean", zh: "海洋", en: "Ocean", css: "linear-gradient(135deg,#2193b0 0%,#6dd5ed 100%)" },
      { id: "forest", zh: "森林", en: "Forest", css: "linear-gradient(135deg,#134e5e 0%,#71b280 100%)" },
      { id: "night", zh: "暗夜", en: "Night", css: "linear-gradient(135deg,#141e30 0%,#243b55 100%)" },
      { id: "rose", zh: "玫瑰", en: "Rose", css: "linear-gradient(135deg,#ee9ca7 0%,#ffdde1 100%)" },
      { id: "violet", zh: "暮紫", en: "Violet", css: "linear-gradient(135deg,#4568dc 0%,#b06ab3 100%)" },
      { id: "ember", zh: "余烬", en: "Ember", css: "linear-gradient(135deg,#3a1c71 0%,#d76d77 50%,#ffaf7b 100%)" }
    ];

    // The frame is the single translucent workbench layer. Sidebar wrappers
    // are cleared in scoped CSS so their alpha is not composited twice.
    var SURFACE_TOKENS = {
      "--dsw-alias-bg-base": { light: "255,255,255", dark: "21,21,23", kind: "base" },
      "--dsw-specific-sidebar-fill": { light: "249,250,251", dark: "27,27,28", kind: "layer" },
      "--dsw-specific-input-major": { light: "255,255,255", dark: "44,44,46", kind: "input" }
    };

    // Text colors are applied to the active DSH workspace, including the
    // conversation header, composer controls, chat blocks and trajectory rows.
    var TEXT_COLORS = {
      light: "#f9fafb",
      dark: "#0f1115"
    };

    var TRAJECTORY_PALETTES = {
      clearLight: {
        "--dsw-alias-bg-base": "rgba(255,255,255,.72)", "--dsw-alias-bg-layer-1": "rgba(255,255,255,.84)", "--dsw-alias-bg-layer-2": "rgba(247,250,253,.9)", "--dsw-alias-bg-layer-3": "rgba(255,255,255,.96)",
        "--dsw-alias-bg-module-platform": "rgba(235,242,250,.88)", "--dsw-alias-bg-multi-select": "rgba(235,242,250,.88)", "--dsw-alias-bg-overlay": "rgba(226,235,247,.92)",
        "--dsw-alias-border-l1": "rgba(15,23,42,.08)", "--dsw-alias-border-l2": "rgba(15,23,42,.13)", "--dsw-alias-border-l2-darkmode-thin": "rgba(15,23,42,.1)", "--dsw-alias-border-l3": "rgba(15,23,42,.18)",
        "--dsw-alias-label-primary": "#080b10", "--dsw-alias-label-primary-dimmed": "#111827", "--dsw-alias-label-primary-bluish": "#174ea6", "--dsw-alias-label-primary-foreground": "#ffffff", "--dsw-alias-label-primary-inverted": "#ffffff", "--dsw-alias-label-secondary": "#1f2937", "--dsw-alias-label-tertiary": "#374151", "--dsw-alias-label-caption": "#4b5563", "--dsw-alias-label-dimmed": "#6b7280",
        "--dsw-alias-brand-primary": "#1d4ed8", "--dsw-alias-brand-text": "#1d4ed8", "--dsw-alias-brand-primary-new-colorprimary-new-color": "#2563eb", "--dsw-static-blue-500": "#2563eb", "--dsw-alias-button-primary-fill": "#1d4ed8", "--dsw-alias-button-primary-hover": "#1e40af", "--dsw-alias-button-ghost-active-fill": "rgba(37,99,235,.12)",
        "--dsw-alias-interactive-bg-active": "rgba(37,99,235,.12)", "--dsw-alias-interactive-bg-hover": "rgba(37,99,235,.08)", "--dsw-alias-interactive-bg-hover-solid": "rgba(226,235,247,.92)",
        "--dsw-alias-state-business-primary": "#2563eb", "--dsw-alias-state-business-tertiary": "#dbeafe", "--dsw-alias-state-error-primary": "#dc2626", "--dsw-alias-state-error-secondary": "#ef4444", "--dsw-alias-state-success-primary": "#16a34a", "--dsw-alias-state-success-secondary": "#22c55e", "--dsw-alias-state-success-tertiary": "#dcfce7", "--dsw-alias-state-warn-label": "#b45309", "--dsw-alias-state-warn-primary": "#d97706", "--dsw-alias-state-warn-secondary": "#f59e0b", "--dsw-alias-state-warn-tertiary": "#fef3c7",
        "--dsw-alias-markdown-citation": "#174ea6", "--dsw-alias-markdown-code-block": "rgba(236,242,248,.94)", "--dsw-alias-markdown-inline-code": "rgba(226,235,247,.95)", "--dsw-alias-scrollbar-bg-l2": "rgba(71,85,105,.35)", "--dsw-alias-scrollbar-hover-l2": "rgba(71,85,105,.52)", "--dsw-specific-input-major": "rgba(255,255,255,.92)", "--dsw-specific-menu": "rgba(255,255,255,.97)", "--dsw-specific-sidebar-fill": "rgba(235,242,250,.9)", "--dsw-specific-tip": "rgba(245,249,253,.94)"
      },
      clearDark: {
        "--dsw-alias-bg-base": "rgba(15,20,29,.72)", "--dsw-alias-bg-layer-1": "rgba(15,20,29,.84)", "--dsw-alias-bg-layer-2": "rgba(20,27,39,.9)", "--dsw-alias-bg-layer-3": "rgba(25,33,47,.96)",
        "--dsw-alias-bg-module-platform": "rgba(34,45,62,.88)", "--dsw-alias-bg-multi-select": "rgba(34,45,62,.88)", "--dsw-alias-bg-overlay": "rgba(45,59,80,.92)",
        "--dsw-alias-border-l1": "rgba(226,232,240,.1)", "--dsw-alias-border-l2": "rgba(226,232,240,.16)", "--dsw-alias-border-l2-darkmode-thin": "rgba(226,232,240,.1)", "--dsw-alias-border-l3": "rgba(226,232,240,.22)",
        "--dsw-alias-label-primary": "#ffffff", "--dsw-alias-label-primary-dimmed": "#f8fafc", "--dsw-alias-label-primary-bluish": "#dbeafe", "--dsw-alias-label-primary-foreground": "#0f141d", "--dsw-alias-label-primary-inverted": "#182130", "--dsw-alias-label-secondary": "#f1f5f9", "--dsw-alias-label-tertiary": "#e2e8f0", "--dsw-alias-label-caption": "#cbd5e1", "--dsw-alias-label-dimmed": "#94a3b8",
        "--dsw-alias-brand-primary": "#dceeff", "--dsw-alias-brand-text": "#c7e6ff", "--dsw-alias-brand-primary-new-colorprimary-new-color": "#8bd5ff", "--dsw-static-blue-500": "#8bd5ff", "--dsw-alias-button-primary-fill": "#dceeff", "--dsw-alias-button-primary-hover": "#c7e6ff", "--dsw-alias-button-ghost-active-fill": "rgba(147,197,253,.18)",
        "--dsw-alias-interactive-bg-active": "rgba(147,197,253,.18)", "--dsw-alias-interactive-bg-hover": "rgba(226,232,240,.1)", "--dsw-alias-interactive-bg-hover-solid": "rgba(45,59,80,.94)",
        "--dsw-alias-state-business-primary": "#8bd5ff", "--dsw-alias-state-business-tertiary": "#173b5a", "--dsw-alias-state-error-primary": "#ff8e8e", "--dsw-alias-state-error-secondary": "#ffadad", "--dsw-alias-state-success-primary": "#65d68c", "--dsw-alias-state-success-secondary": "#8be6a9", "--dsw-alias-state-success-tertiary": "#214b35", "--dsw-alias-state-warn-label": "#ffd166", "--dsw-alias-state-warn-primary": "#f4b942", "--dsw-alias-state-warn-secondary": "#ffcf70", "--dsw-alias-state-warn-tertiary": "#5b4217",
        "--dsw-alias-markdown-citation": "#c7e6ff", "--dsw-alias-markdown-code-block": "rgba(10,14,21,.94)", "--dsw-alias-markdown-inline-code": "rgba(34,45,62,.96)", "--dsw-alias-scrollbar-bg-l2": "rgba(203,213,225,.35)", "--dsw-alias-scrollbar-hover-l2": "rgba(203,213,225,.52)", "--dsw-specific-input-major": "rgba(20,27,39,.92)", "--dsw-specific-menu": "rgba(25,33,47,.98)", "--dsw-specific-sidebar-fill": "rgba(34,45,62,.92)", "--dsw-specific-tip": "rgba(34,45,62,.94)"
      },
      jadeLight: {
        "--dsw-alias-border-l1": "rgba(16,33,28,.08)", "--dsw-alias-border-l2": "rgba(16,33,28,.14)", "--dsw-alias-border-l2-darkmode-thin": "rgba(16,33,28,.1)", "--dsw-alias-border-l3": "rgba(16,33,28,.2)",
        "--dsw-alias-label-primary": "#080b10", "--dsw-alias-label-primary-dimmed": "#111827", "--dsw-alias-label-primary-bluish": "#0f766e", "--dsw-alias-label-primary-foreground": "#ffffff", "--dsw-alias-label-primary-inverted": "#ffffff", "--dsw-alias-label-secondary": "#1f2937", "--dsw-alias-label-tertiary": "#374151", "--dsw-alias-label-caption": "#4b5563", "--dsw-alias-label-dimmed": "#6b7280", "--dsw-alias-label-quaternary": "#6b7280",
        "--dsw-alias-brand-primary": "#0f766e", "--dsw-alias-brand-text": "#0f766e", "--dsw-alias-brand-primary-new-colorprimary-new-color": "#14866d", "--dsw-static-blue-500": "#14866d", "--dsw-alias-button-primary-fill": "#0f766e", "--dsw-alias-button-primary-hover": "#0d655f", "--dsw-alias-button-ghost-active-fill": "rgba(20,134,109,.13)",
        "--dsw-alias-interactive-bg-active": "rgba(20,134,109,.14)", "--dsw-alias-interactive-bg-hover": "rgba(20,134,109,.09)", "--dsw-alias-interactive-bg-hover-solid": "rgba(220,241,233,.94)",
        "--dsw-alias-state-business-primary": "#14866d", "--dsw-alias-state-business-tertiary": "#d7f3e9", "--dsw-alias-state-error-primary": "#c24141", "--dsw-alias-state-error-secondary": "#e05252", "--dsw-alias-state-success-primary": "#15803d", "--dsw-alias-state-success-secondary": "#22a052", "--dsw-alias-state-success-tertiary": "#dcfce7", "--dsw-alias-state-warn-label": "#a16207", "--dsw-alias-state-warn-primary": "#c47a0a", "--dsw-alias-state-warn-secondary": "#e59a18", "--dsw-alias-state-warn-tertiary": "#fef3c7",
        "--dsw-alias-markdown-citation": "#0f766e", "--dsw-alias-markdown-code-block": "rgba(229,243,238,.95)", "--dsw-alias-markdown-inline-code": "rgba(216,237,229,.96)", "--dsw-alias-scrollbar-bg-l2": "rgba(71,103,93,.34)", "--dsw-alias-scrollbar-hover-l2": "rgba(71,103,93,.52)", "--dsw-specific-menu": "rgba(248,252,250,.98)", "--dsw-specific-tip": "rgba(241,249,246,.96)"
      },
      jadeDark: {
        "--dsw-alias-border-l1": "rgba(209,250,229,.1)", "--dsw-alias-border-l2": "rgba(209,250,229,.17)", "--dsw-alias-border-l2-darkmode-thin": "rgba(209,250,229,.11)", "--dsw-alias-border-l3": "rgba(209,250,229,.24)",
        "--dsw-alias-label-primary": "#ffffff", "--dsw-alias-label-primary-dimmed": "#f8fafc", "--dsw-alias-label-primary-bluish": "#99f6e4", "--dsw-alias-label-primary-foreground": "#0f141d", "--dsw-alias-label-primary-inverted": "#182130", "--dsw-alias-label-secondary": "#f1f5f9", "--dsw-alias-label-tertiary": "#e2e8f0", "--dsw-alias-label-caption": "#cbd5e1", "--dsw-alias-label-dimmed": "#94a3b8", "--dsw-alias-label-quaternary": "#94a3b8",
        "--dsw-alias-brand-primary": "#99f6e4", "--dsw-alias-brand-text": "#99f6e4", "--dsw-alias-brand-primary-new-colorprimary-new-color": "#6ee7c8", "--dsw-static-blue-500": "#6ee7c8", "--dsw-alias-button-primary-fill": "#99f6e4", "--dsw-alias-button-primary-hover": "#6ee7c8", "--dsw-alias-button-ghost-active-fill": "rgba(110,231,200,.18)",
        "--dsw-alias-interactive-bg-active": "rgba(110,231,200,.18)", "--dsw-alias-interactive-bg-hover": "rgba(209,250,229,.1)", "--dsw-alias-interactive-bg-hover-solid": "rgba(31,63,53,.95)",
        "--dsw-alias-state-business-primary": "#6ee7c8", "--dsw-alias-state-business-tertiary": "#164e3f", "--dsw-alias-state-error-primary": "#ff9b9b", "--dsw-alias-state-error-secondary": "#ffb8b8", "--dsw-alias-state-success-primary": "#6ee7a0", "--dsw-alias-state-success-secondary": "#8ff0b4", "--dsw-alias-state-success-tertiary": "#1d4c34", "--dsw-alias-state-warn-label": "#fcd57a", "--dsw-alias-state-warn-primary": "#eab54f", "--dsw-alias-state-warn-secondary": "#f6ca72", "--dsw-alias-state-warn-tertiary": "#594516",
        "--dsw-alias-markdown-citation": "#99f6e4", "--dsw-alias-markdown-code-block": "rgba(10,26,21,.95)", "--dsw-alias-markdown-inline-code": "rgba(27,58,48,.96)", "--dsw-alias-scrollbar-bg-l2": "rgba(167,243,208,.34)", "--dsw-alias-scrollbar-hover-l2": "rgba(167,243,208,.52)", "--dsw-specific-menu": "rgba(20,36,31,.98)", "--dsw-specific-tip": "rgba(25,47,40,.96)"
      },
      nativeLight: {
        "--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-1000)", "--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-950)", "--dsw-alias-label-primary-bluish": "var(--dsw-static-blue-900)", "--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-00)", "--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-00)", "--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-700)", "--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-600)", "--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-400)", "--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-200)",
        "--dsw-alias-brand-primary-new-colorprimary-new-color": "rgb(65,118,230)", "--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-100)",
        "--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-500)", "--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-100)", "--dsw-alias-state-error-primary": "var(--dsw-static-red-600)", "--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)", "--dsw-alias-state-success-primary": "var(--dsw-static-green-500)", "--dsw-alias-state-success-tertiary": "var(--dsw-static-green-100)", "--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)", "--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-100)"
      },
      nativeDark: {
        "--dsw-alias-label-primary": "var(--dsw-static-neutral-bluish-50)", "--dsw-alias-label-primary-dimmed": "var(--dsw-static-neutral-bluish-100)", "--dsw-alias-label-primary-bluish": "var(--dsw-static-neutral-bluish-50)", "--dsw-alias-label-primary-foreground": "var(--dsw-static-neutral-bluish-1000)", "--dsw-alias-label-primary-inverted": "var(--dsw-static-neutral-bluish-800)", "--dsw-alias-label-secondary": "var(--dsw-static-neutral-bluish-300)", "--dsw-alias-label-tertiary": "var(--dsw-static-neutral-bluish-400)", "--dsw-alias-label-caption": "var(--dsw-static-neutral-bluish-600)", "--dsw-alias-label-dimmed": "var(--dsw-static-neutral-bluish-750)",
        "--dsw-alias-brand-primary-new-colorprimary-new-color": "var(--dsw-static-deepseek-450)", "--dsw-alias-markdown-citation": "var(--dsw-static-neutral-bluish-800)",
        "--dsw-alias-state-business-primary": "var(--dsw-static-deepseek-400)", "--dsw-alias-state-business-tertiary": "var(--dsw-static-deepseek-800)", "--dsw-alias-state-error-primary": "var(--dsw-static-red-400)", "--dsw-alias-state-error-secondary": "var(--dsw-static-red-400)", "--dsw-alias-state-success-primary": "var(--dsw-static-green-500)", "--dsw-alias-state-success-tertiary": "var(--dsw-static-green-900)", "--dsw-alias-state-warn-label": "var(--dsw-static-amber-600)", "--dsw-alias-state-warn-tertiary": "var(--dsw-static-amber-900)"
      }
    };

    var TRAJECTORY_SCHEMES = {
      native: { label: "nativeScheme", light: "nativeLight", dark: "nativeDark", swatches: ["#f7f8fa", "#4176e6", "#1b1b1c"] },
      clear: { label: "clearScheme", light: "clearLight", dark: "clearDark", lightSurface: "rgba(255,255,255,.92)", darkSurface: "rgba(15,20,29,.92)", swatches: ["#edf6ff", "#2563eb", "#8bd5ff"] },
      jade: { label: "jadeScheme", light: "jadeLight", dark: "jadeDark", lightSurface: "rgba(244,250,247,.94)", darkSurface: "rgba(16,31,26,.94)", swatches: ["#eef9f5", "#14866d", "#6ee7c8"] }
    };
    var TRAJECTORY_SCHEME_ORDER = ["native", "clear", "jade"];

    var HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

    function normalizeHexColor(value, fallback) {
      var color = String(value || "").trim();
      return HEX_COLOR_RE.test(color) ? color : fallback;
    }


    var I18N = {
      zh: {
        language: "界面语言", wallpaperEnabled: "启用壁纸效果", mainPane: "主界面", trajectoryPane: "轨迹页", preview: "预览",
        noWallpaperCurrent: "当前无壁纸（DSH 原样）", inheritMain: "跟随主界面", inheritCurrent: "当前跟随主界面壁纸",
        presets: "预设", noWallpaper: "无壁纸", library: "图片库", upload: "上传图片",
        importFolder: "导入文件夹", cropCurrent: "裁剪当前图片", processing: "处理中…",
        storage: "图片以原始字节存于浏览器 IndexedDB（不压缩、不受 5 MB 限制）。", librarySize: "共 {size}",
        emptyLibrary: "还没有图片——上传一张，或「导入文件夹」批量加入。",
        setBackground: "点击设为背景：{name}", remove: "删除", effects: "效果", blur: "模糊",
        opacity: "表面不透明度", readability: "文字可读性", textColor: "文字颜色",
        auto: "自动", light: "浅色", dark: "深色", custom: "自定义", colorValue: "颜色值", textShadow: "文字阴影", on: "开", off: "关",
        trajectoryColorScheme: "轨迹配色方案", nativeScheme: "DSH 原生", clearScheme: "清澈", jadeScheme: "青玉",
        fillPosition: "填充与位置", cover: "裁切填充", contain: "完整显示", stretch: "拉伸",
        posX: "水平位置", posY: "垂直位置", cropTitle: "裁剪图片 · 拖拽框选要保留的区域",
        cancel: "取消", applyCrop: "应用裁剪", saveFailed: "保存失败：{error}",
        folderEmpty: "该目录下没有图片文件。", importing: "正在导入 {count} 张图片…",
        importFailed: "导入失败，请重试。", croppedName: "裁剪-{time}.jpg"
      },
      en: {
        language: "Language", wallpaperEnabled: "Wallpaper effects", mainPane: "Main UI", trajectoryPane: "Trajectory", preview: "Preview",
        noWallpaperCurrent: "No wallpaper (DSH default)", inheritMain: "Follow main UI", inheritCurrent: "Following the main wallpaper",
        presets: "Presets", noWallpaper: "None", library: "Image library", upload: "Upload image",
        importFolder: "Import folder", cropCurrent: "Crop current image", processing: "Processing…",
        storage: "Original image bytes are stored in browser IndexedDB (no compression, no 5 MB limit).", librarySize: "{size} total",
        emptyLibrary: "No images yet. Upload one or import a folder.",
        setBackground: "Set as background: {name}", remove: "Delete", effects: "Effects", blur: "Blur",
        opacity: "Surface opacity", readability: "Readability", textColor: "Text color",
        auto: "Auto", light: "Light", dark: "Dark", custom: "Custom", colorValue: "Color value", textShadow: "Text shadow", on: "On", off: "Off",
        trajectoryColorScheme: "Trajectory color scheme", nativeScheme: "DSH native", clearScheme: "Clear", jadeScheme: "Jade",
        fillPosition: "Fit and position", cover: "Cover", contain: "Contain", stretch: "Stretch",
        posX: "Horizontal position", posY: "Vertical position", cropTitle: "Crop image · drag to select the retained area",
        cancel: "Cancel", applyCrop: "Apply crop", saveFailed: "Save failed: {error}",
        folderEmpty: "No image files were found in this folder.", importing: "Importing {count} images…",
        importFailed: "Import failed. Please try again.", croppedName: "crop-{time}.jpg"
      }
    };

    function translate(lang, key, values) {
      var table = I18N[lang] || I18N.zh;
      var value = table[key] || I18N.zh[key] || key;
      if (!values) return value;
      return value.replace(/\{(\w+)\}/g, function (_, name) {
        return values[name] == null ? "" : String(values[name]);
      });
    }

    var IMG_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|avif|svg)$/i;

    var UI_CSS = [
      ".dshwp-root{font-size:13px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:12px;max-width:700px;padding:2px 0 28px;}",
      ".dshwp-toolbar{display:flex;justify-content:flex-end;align-items:center;gap:10px;min-height:30px;}",
      ".dshwp-toolbar-label{color:var(--dsw-alias-label-secondary);font-size:12px;}",
      ".dshwp-toggle{display:inline-flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:12px;cursor:pointer;user-select:none;}",
      ".dshwp-toggle input{accent-color:var(--dsw-alias-state-business-primary);width:14px;height:14px;margin:0;}",
      ".dshwp-segment{display:inline-flex;align-items:center;gap:2px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:8px;padding:2px;}",
      ".dshwp-segment .dshwp-btn{border:0;border-radius:6px;padding:4px 9px;line-height:18px;}",
      ".dshwp-segment .dshwp-active{outline:0;background:var(--dsw-alias-interactive-bg-active);box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2);}",
      ".dshwp-scheme-grid{flex:1;min-width:300px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}",
      ".dshwp-scheme-btn{appearance:none;cursor:pointer;min-width:0;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px;display:flex;flex-direction:column;gap:5px;font-size:12px;line-height:16px;text-align:left;}",
      ".dshwp-scheme-btn:hover{background:var(--dsw-alias-interactive-bg-hover);}",
      ".dshwp-scheme-colors{width:100%;height:18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--dsw-alias-border-l2);border-radius:5px;overflow:hidden;}",
      ".dshwp-scheme-color{display:block;min-width:0;}",
      ".dshwp-scheme-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
      ".dshwp-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:8px;padding:14px 16px;}",
      ".dshwp-title{font-size:14px;font-weight:600;margin:0 0 10px;color:var(--dsw-alias-label-primary);}",
      ".dshwp-row{display:flex;align-items:center;gap:10px;margin:8px 0;flex-wrap:wrap;}",
      ".dshwp-row label{flex:0 0 140px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}",
      ".dshwp-row input[type=range]{flex:1;min-width:0;}",
      ".dshwp-val{flex:0 0 46px;text-align:right;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;}",
      ".dshwp-btn{appearance:none;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-ghost-fill,transparent);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 12px;font-size:12px;line-height:18px;}",
      ".dshwp-btn:hover{background:var(--dsw-alias-interactive-bg-hover);}",
      ".dshwp-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px;}",
      ".dshwp-btn:disabled{opacity:0.45;cursor:not-allowed;}",
      ".dshwp-btn-primary{background:var(--dsw-alias-state-business-primary);border-color:transparent;color:#fff;}",
      ".dshwp-btn-primary:hover{filter:brightness(1.06);}",
      ".dshwp-active{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px;}",
      ".dshwp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(124px,1fr));gap:10px;}",
      ".dshwp-swatch{position:relative;height:64px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);cursor:pointer;padding:0;overflow:hidden;background-size:cover;background-position:center;}",
      ".dshwp-swatch-label{position:absolute;left:0;right:0;bottom:0;padding:3px 8px;font-size:11px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,0.55));text-align:left;}",
      ".dshwp-preview{height:132px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background-color:var(--dsw-alias-bg-layer-2);background-size:cover;background-position:center;background-repeat:no-repeat;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);}",
      ".dshwp-modal-mask{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:60;display:flex;align-items:center;justify-content:center;padding:16px;}",
      ".dshwp-modal{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:16px;max-width:min(620px,92vw);box-shadow:0 8px 30px rgba(0,0,0,0.35);}",
      ".dshwp-crop-canvas{display:block;touch-action:none;cursor:crosshair;max-width:100%;border-radius:8px;}",
      ".dshwp-note{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;}",
      ".dshwp-error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;}",
      ".dshwp-file-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:10px;max-height:320px;overflow-y:auto;}",
      ".dshwp-file-item{display:flex;flex-direction:column;gap:4px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:8px;padding:8px;cursor:pointer;position:relative;}",
      ".dshwp-file-item:hover{border-color:var(--dsw-alias-state-business-primary);}",
      ".dshwp-file-item.active{border-color:var(--dsw-alias-state-business-primary);}",
      ".dshwp-file-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:12px;}",
      ".dshwp-file-size{color:var(--dsw-alias-label-tertiary);font-size:11px;}",
      ".dshwp-file-thumb{width:100%;height:84px;object-fit:cover;border-radius:6px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);}",
      ".dshwp-file-thumb-empty{display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);font-size:16px;}",
      ".dshwp-del{position:absolute;top:4px;right:4px;width:20px;height:20px;border:none;border-radius:50%;background:rgba(0,0,0,0.55);color:#fff;font-size:12px;line-height:20px;text-align:center;cursor:pointer;padding:0;}",
      ".dshwp-color-controls{display:flex;align-items:center;gap:8px;min-width:0;}",
      ".dshwp-color-input{appearance:none;width:34px;height:30px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;padding:2px;cursor:pointer;}",
      ".dshwp-color-input::-webkit-color-swatch-wrapper{padding:0;}",
      ".dshwp-color-input::-webkit-color-swatch{border:0;border-radius:3px;}",
      ".dshwp-color-code{box-sizing:border-box;width:94px;height:30px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-specific-input-major);color:var(--dsw-alias-label-primary);padding:4px 8px;font:var(--dsw-font-xs-13);text-transform:uppercase;}",
      ".dshwp-color-code:focus{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px;}",
      "@media(max-width:640px){.dshwp-root{gap:10px}.dshwp-card{padding:12px}.dshwp-row label{flex-basis:100%}.dshwp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dshwp-scheme-grid{min-width:0;grid-template-columns:1fr}.dshwp-file-list{grid-template-columns:repeat(2,minmax(0,1fr))}}"
    ].join("");

    function safeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function safeSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } }

    function defaultConfig() {
      return {
        mode: "none",            // "none" | "gradient" | "image"
        gradient: GRADIENTS[0].css,
        activeId: null,          // 当前激活图片在 IndexedDB 里的 id
        blur: 0,
        opacity: 0.9,
        trajectoryMode: "inherit",
        trajectoryGradient: GRADIENTS[4].css,
        trajectoryActiveId: null,
        trajectoryBlur: 0,
        trajectoryOpacity: 0.72,
        trajectoryFit: "cover",
        trajectoryPosX: 50,
        trajectoryPosY: 50,
        trajectoryColorScheme: "native",
        enabled: true,
        uiLanguage: "zh",
        textMode: "auto",
        textColor: "#f9fafb",
        textShadow: false,
        readability: "balanced",
        fit: "cover",
        posX: 50,
        posY: 50
      };
    }

    function loadConfig() {
      var raw = safeGet(STORAGE_KEY);
      if (!raw) return defaultConfig();
      try {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          var config = Object.assign(defaultConfig(), parsed);
          ["brightness", "dim", "maskStyle", "trajectoryBrightness", "trajectoryDim", "trajectoryMaskStyle"].forEach(function (key) {
            delete config[key];
          });
          if (config.trajectoryColorScheme === "light" || config.trajectoryColorScheme === "dark") config.trajectoryColorScheme = "clear";
          if (!TRAJECTORY_SCHEMES[config.trajectoryColorScheme]) config.trajectoryColorScheme = "native";
          return config;
        }
      } catch (e) { /* 忽略损坏配置 */ }
      return defaultConfig();
    }

    function injectCss(css) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-wallpaper";
      tag.textContent = css;
      document.head.appendChild(tag);
      return function () { tag.remove(); };
    }

    // ---- IndexedDB（图片以原始 Blob 存储）----
    function openDb() {
      return new Promise(function (resolve, reject) {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function (e) {
          var db = e.target.result;
          if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: "id" });
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    }

    function idbPut(record) {
      return openDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(DB_STORE, "readwrite");
          tx.objectStore(DB_STORE).put(record);
          tx.oncomplete = function () { db.close(); resolve(record); };
          tx.onerror = function () { db.close(); reject(tx.error); };
        });
      });
    }

    function idbGet(id) {
      return openDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(DB_STORE, "readonly");
          var req = tx.objectStore(DB_STORE).get(id);
          req.onsuccess = function () { db.close(); resolve(req.result); };
          req.onerror = function () { db.close(); reject(req.error); };
        });
      });
    }

    function idbDelete(id) {
      return openDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(DB_STORE, "readwrite");
          tx.objectStore(DB_STORE).delete(id);
          tx.oncomplete = function () { db.close(); resolve(); };
          tx.onerror = function () { db.close(); reject(tx.error); };
        });
      });
    }

    function idbList() {
      return openDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(DB_STORE, "readonly");
          var req = tx.objectStore(DB_STORE).getAll();
          req.onsuccess = function () {
            db.close();
            resolve((req.result || []).map(function (r) { return { id: r.id, name: r.name, size: r.size, mimeType: r.mimeType }; }));
          };
          req.onerror = function () { db.close(); reject(req.error); };
        });
      });
    }

    var inject = ["slots", "theme"];
    var name = "dsh-wallpaper";

    function apply(ctx) {
      var slots = ctx.slots;
      var theme = ctx.theme;

      var cfg = loadConfig();
      var disposeStyle = null;
      var disposeTokens = null;
      var activeUrls = { main: null, trajectory: null };
      var applySeq = 0;          // 防止异步 apply 竞态

      function paneConfig(c, pane) {
        if (pane === "main") {
          return {
            mode: c.mode || "none",
            gradient: c.gradient,
            activeId: c.activeId,
            blur: c.blur,
            opacity: c.opacity,
            fit: c.fit,
            posX: c.posX,
            posY: c.posY
          };
        }
        if ((c.trajectoryMode || "inherit") === "inherit") return paneConfig(c, "main");
        return {
          mode: c.trajectoryMode || "none",
          gradient: c.trajectoryGradient,
          activeId: c.trajectoryActiveId,
          blur: c.trajectoryBlur,
          opacity: c.trajectoryOpacity,
          fit: c.trajectoryFit,
          posX: c.trajectoryPosX,
          posY: c.trajectoryPosY
        };
      }

      function panePatch(pane, patch) {
        if (pane === "main") return patch;
        var result = {};
        if (Object.prototype.hasOwnProperty.call(patch, "mode")) result.trajectoryMode = patch.mode;
        if (Object.prototype.hasOwnProperty.call(patch, "gradient")) result.trajectoryGradient = patch.gradient;
        if (Object.prototype.hasOwnProperty.call(patch, "activeId")) result.trajectoryActiveId = patch.activeId;
        if (Object.prototype.hasOwnProperty.call(patch, "blur")) result.trajectoryBlur = patch.blur;
        if (Object.prototype.hasOwnProperty.call(patch, "opacity")) result.trajectoryOpacity = patch.opacity;
        if (Object.prototype.hasOwnProperty.call(patch, "fit")) result.trajectoryFit = patch.fit;
        if (Object.prototype.hasOwnProperty.call(patch, "posX")) result.trajectoryPosX = patch.posX;
        if (Object.prototype.hasOwnProperty.call(patch, "posY")) result.trajectoryPosY = patch.posY;
        return result;
      }

      function bgValue(pane, url) {
        if (pane.mode === "image" && url) return 'url("' + url + '")';
        if (pane.mode === "gradient") return pane.gradient || GRADIENTS[0].css;
        return "none";
      }

      function surfaceOpacity(pane) {
        var op = Number(pane.opacity);
        if (!Number.isFinite(op)) op = 0.9;
        return Math.max(0, Math.min(1, op));
      }

      function surfaceValues(pane) {
        if (pane.mode === "none") return null;
        var op = surfaceOpacity(pane);
        function alphaOf(kind) {
          if (kind === "base") return Math.max(0, op - 0.25);
          if (kind === "input") return Math.min(1, op + 0.05);
          return op;
        }
        var values = { light: {}, dark: {} };
        ["light", "dark"].forEach(function (tone) {
          var base = SURFACE_TOKENS["--dsw-alias-bg-base"];
          var input = SURFACE_TOKENS["--dsw-specific-input-major"];
          values[tone]["--dsw-alias-bg-base"] = "rgba(" + base[tone] + "," + alphaOf("base") + ")";
          values[tone]["--dsw-specific-input-major"] = "rgba(" + input[tone] + "," + alphaOf("input") + ")";
        });
        return values;
      }

      function opaqueSurfaceValues() {
        var values = { light: {}, dark: {} };
        ["light", "dark"].forEach(function (tone) {
          values[tone]["--dsw-alias-bg-base"] = "rgb(" + SURFACE_TOKENS["--dsw-alias-bg-base"][tone] + ")";
          values[tone]["--dsw-specific-input-major"] = "rgb(" + SURFACE_TOKENS["--dsw-specific-input-major"][tone] + ")";
        });
        return values;
      }

      function sidebarSurfaceValues(pane) {
        var token = SURFACE_TOKENS["--dsw-specific-sidebar-fill"];
        if (pane.mode === "none") return { light: "rgb(" + token.light + ")", dark: "rgb(" + token.dark + ")" };
        var op = surfaceOpacity(pane);
        return { light: "rgba(" + token.light + "," + op + ")", dark: "rgba(" + token.dark + "," + op + ")" };
      }

      function buildTokens(pane) {
        if (pane.mode === "none") return {};
        var op = surfaceOpacity(pane);
        var tokens = {};
        for (var tokenName in SURFACE_TOKENS) {
          var token = SURFACE_TOKENS[tokenName];
          var alpha = token.kind === "base"
            ? Math.max(0, op - 0.25)
            : token.kind === "input" ? Math.min(1, op + 0.05) : op;
          tokens[tokenName] = {
            light: "rgba(" + token.light + "," + alpha + ")",
            dark: "rgba(" + token.dark + "," + alpha + ")"
          };
        }
        return tokens;
      }

      function declarations(values) {
        var list = [];
        for (var key in values) list.push(key + ":" + values[key]);
        return list.join(";") + ";";
      }

      function textColor(c) {
        if (c.textMode === "light" || c.textMode === "dark") return TEXT_COLORS[c.textMode];
        if (c.textMode === "custom") return normalizeHexColor(c.textColor, TEXT_COLORS.light);
        return null;
      }

      function buildTextCss(c) {
        var workspaceScope = "*:has(>[data-conversation-scroll])";
        var mainWorkspace = "body:not(:has([data-trajectory-scroll])) " + workspaceScope;
        var color = textColor(c);
        var labelTokens = [
          "--dsw-alias-label-primary",
          "--dsw-alias-label-primary-dimmed",
          "--dsw-alias-label-secondary",
          "--dsw-alias-label-tertiary",
          "--dsw-alias-label-caption",
          "--dsw-alias-label-dimmed",
          "--dsw-alias-label-quaternary"
        ];
        var css = [];
        function tokenValues(value) {
          return labelTokens.map(function (token) { return token + ":" + value; }).join(";");
        }
        function addColor(scope, value) {
          var scroll = scope + " [data-conversation-scroll]";
          var composer = scope + " [data-composer-seat]";
          var rows = scope + " :where([data-variant=\"think\"],[data-variant=\"others\"],[data-tool],[data-role=\"tool\"])";
          var values = tokenValues(value);
          css.push(scroll + "{" + values + ";color:" + value + "!important;}");
          css.push(composer + "{" + values + ";color:" + value + "!important;}");
          css.push(composer + " :where(button[aria-label],input,textarea,[role=\"button\"])," + composer + " :where(button[aria-label],input,textarea,[role=\"button\"]) :where(span,svg){color:" + value + "!important;-webkit-text-fill-color:" + value + "!important;}");
          css.push(composer + " :where(input,textarea)::placeholder{color:" + value + "!important;opacity:.72!important;}");
          css.push(composer + " button[class*=\"_primary\"]{color:var(--dsw-alias-label-primary-foreground)!important;-webkit-text-fill-color:var(--dsw-alias-label-primary-foreground)!important;}");
          css.push(rows + "{color:" + value + "!important;-webkit-text-fill-color:" + value + "!important;}");
          css.push(rows + " :where(*){color:" + value + "!important;-webkit-text-fill-color:" + value + "!important;}");
          css.push(rows + " [data-error=\"true\"]," + rows + " [data-error=\"true\"] :where(*)," + rows + "[data-state=\"error\"]," + rows + "[data-state=\"error\"] :where(*){color:var(--dsw-alias-state-error-primary)!important;-webkit-text-fill-color:var(--dsw-alias-state-error-primary)!important;}");
          css.push(scope + " [data-approval-key] > div > div:last-child > button:last-child{color:#fff!important;-webkit-text-fill-color:#fff!important;}");
        }
        function addHeaderColor(scope, value) {
          var header = scope + " header:not([role=\"dialog\"]):not([role=\"dialog\"] *)";
          css.push(header + "{" + tokenValues(value) + ";color:" + value + "!important;}");
          css.push(header + " :where(*):not([role=\"dialog\"],[role=\"dialog\"] *){color:" + value + "!important;-webkit-text-fill-color:" + value + "!important;}");
        }
        function addSidebarColor(scope, value) {
          var descendants = scope.split(",").map(function (target) { return target + " :where(*)"; }).join(",");
          css.push(scope + "{" + tokenValues(value) + ";color:" + value + "!important;}");
          css.push(descendants + "{color:" + value + "!important;-webkit-text-fill-color:" + value + "!important;}");
        }
        function sidebarScope(prefix) {
          return prefix + " .hHd-Xa_logoRow," + prefix + " .hHd-Xa_newSession," + prefix + " .hHd-Xa_regionArea," + prefix + " .hHd-Xa_footerActions," + prefix + " [data-slot=\"sidebar.workspaces\"]";
        }
        if (color) {
          addColor(mainWorkspace, color);
          addHeaderColor(workspaceScope, color);
          if (c.textShadow) css.push(mainWorkspace + " [data-conversation-scroll]," + workspaceScope + " header:not([role=\"dialog\"]):not([role=\"dialog\"] *){text-shadow:0 1px 2px rgba(0,0,0,.55);}");
        } else {
          var lightMain = "body:not([data-ds-dark-theme]):not(:has([data-trajectory-scroll])) " + workspaceScope;
          var darkMain = "body[data-ds-dark-theme]:not(:has([data-trajectory-scroll])) " + workspaceScope;
          var lightAll = "body:not([data-ds-dark-theme]) " + workspaceScope;
          var darkAll = "body[data-ds-dark-theme] " + workspaceScope;
          addColor(lightMain, TEXT_COLORS.dark);
          addColor(darkMain, TEXT_COLORS.light);
          addHeaderColor(lightAll, TEXT_COLORS.dark);
          addHeaderColor(darkAll, TEXT_COLORS.light);
          if (c.textShadow) {
            css.push(lightMain + " [data-conversation-scroll]," + lightAll + " header:not([role=\"dialog\"]):not([role=\"dialog\"] *){text-shadow:0 1px 2px rgba(255,255,255,.6);}");
            css.push(darkMain + " [data-conversation-scroll]," + darkAll + " header:not([role=\"dialog\"]):not([role=\"dialog\"] *){text-shadow:0 1px 2px rgba(0,0,0,.6);}");
          }
        }
        addSidebarColor(sidebarScope("body:not([data-ds-dark-theme])"), TEXT_COLORS.dark);
        addSidebarColor(sidebarScope("body[data-ds-dark-theme]"), TEXT_COLORS.light);
        return css.join("");
      }

      function trajectoryPalette(paletteName) {
        var source = TRAJECTORY_PALETTES[paletteName] || {};
        var result = {};
        Object.keys(source).forEach(function (token) {
          var isColorToken = token.indexOf("--dsw-alias-label-") === 0
            || token.indexOf("--dsw-alias-border-") === 0
            || token.indexOf("--dsw-alias-brand-") === 0
            || token.indexOf("--dsw-alias-state-") === 0
            || token.indexOf("--dsw-alias-button-") === 0
            || token.indexOf("--dsw-alias-interactive-") === 0
            || token.indexOf("--dsw-alias-scrollbar-") === 0
            || token === "--dsw-static-blue-500"
            || token === "--dsw-alias-markdown-citation"
            || token === "--dsw-alias-markdown-code-block"
            || token === "--dsw-alias-markdown-inline-code"
            || token === "--dsw-specific-menu"
            || token === "--dsw-specific-tip";
          if (isColorToken) result[token] = source[token];
        });
        if (paletteName.indexOf("clear") === 0 || paletteName.indexOf("jade") === 0) {
          var plainText = /Dark$/.test(paletteName) ? TEXT_COLORS.light : TEXT_COLORS.dark;
          ["primary", "primary-dimmed", "secondary", "tertiary", "caption", "dimmed", "quaternary"].forEach(function (name) {
            result["--dsw-alias-label-" + name] = plainText;
          });
        }
        return result;
      }

      function buildTrajectorySchemeCss(c, trajectoryWorkspace, trajectoryRoot) {
        var schemeId = c.trajectoryColorScheme || "native";
        if (!TRAJECTORY_SCHEMES[schemeId]) schemeId = "native";
        var scheme = TRAJECTORY_SCHEMES[schemeId];
        var rootScope = trajectoryWorkspace + " " + trajectoryRoot;
        var lightScope = "body:not([data-ds-dark-theme]) " + rootScope;
        var darkScope = "body[data-ds-dark-theme] " + rootScope;
        var controlColor = "var(--dsw-alias-label-primary)";
        var rules = [];
        rules.push(lightScope + "{" + declarations(trajectoryPalette(scheme.light)) + "}");
        rules.push(darkScope + "{" + declarations(trajectoryPalette(scheme.dark)) + "}");
        if (scheme.lightSurface && scheme.darkSurface) {
          rules.push(lightScope + " [role=tooltip]," + lightScope + " [class*=\"_requestBoundaryControl\"]::after," + lightScope + " > :first-child input{background:" + scheme.lightSurface + "!important;}");
          rules.push(darkScope + " [role=tooltip]," + darkScope + " [class*=\"_requestBoundaryControl\"]::after," + darkScope + " > :first-child input{background:" + scheme.darkSurface + "!important;}");
        }
        rules.push(rootScope + "{color:var(--dsw-alias-label-primary)!important;}");
        rules.push(rootScope + " > :first-child :where(button,input,svg,span)," + rootScope + " > :nth-child(2) :where(button,span,svg){color:" + controlColor + "!important;-webkit-text-fill-color:" + controlColor + "!important;}");
        rules.push(rootScope + " > :first-child input::placeholder{color:" + controlColor + "!important;opacity:.72!important;}");
        return rules.join("");
      }

      function buildCss(c, urls) {
        var main = paneConfig(c, "main");
        var trajectory = paneConfig(c, "trajectory");
        var mainSize = main.fit === "stretch" ? "100% 100%" : (main.fit || "cover");
        var mainPos = (main.posX != null ? main.posX : 50) + "% " + (main.posY != null ? main.posY : 50) + "%";
        var trajectorySize = trajectory.fit === "stretch" ? "100% 100%" : (trajectory.fit || "cover");
        var trajectoryPos = (trajectory.posX != null ? trajectory.posX : 50) + "% " + (trajectory.posY != null ? trajectory.posY : 50) + "%";
        var mainBlur = Math.max(0, Number(main.blur) || 0);
        var trajectoryBlur = Math.max(0, Number(trajectory.blur) || 0);
        var workspaceScope = "*:has(>[data-conversation-scroll])";
        var trajectoryWorkspace = workspaceScope + ":has([data-trajectory-scroll])";
        var trajectoryRoot = "[data-conversation-composer-overlay]";
        var mainSurface = surfaceValues(main);
        var trajectorySurface = surfaceValues(trajectory);
        var trajectorySidebarSurface = sidebarSurfaceValues(trajectory);
        var surfaceCss = [];
        if (mainSurface) {
          surfaceCss.push("body:not([data-ds-dark-theme]) " + workspaceScope + "{" + declarations(mainSurface.light) + "}");
          surfaceCss.push("body[data-ds-dark-theme] " + workspaceScope + "{" + declarations(mainSurface.dark) + "}");
        }
        if (trajectorySurface) {
          surfaceCss.push("body:not([data-ds-dark-theme]) " + trajectoryWorkspace + "{" + declarations(trajectorySurface.light) + "}");
          surfaceCss.push("body[data-ds-dark-theme] " + trajectoryWorkspace + "{" + declarations(trajectorySurface.dark) + "}");
        } else if (mainSurface) {
          var opaque = opaqueSurfaceValues();
          surfaceCss.push("body:not([data-ds-dark-theme]) " + trajectoryWorkspace + "{" + declarations(opaque.light) + "}");
          surfaceCss.push("body[data-ds-dark-theme] " + trajectoryWorkspace + "{" + declarations(opaque.dark) + "}");
        }
        surfaceCss.push("body:not([data-ds-dark-theme]):has([data-trajectory-scroll]) .hHd-Xa_root{--dsw-specific-sidebar-fill:" + trajectorySidebarSurface.light + ";}");
        surfaceCss.push("body[data-ds-dark-theme]:has([data-trajectory-scroll]) .hHd-Xa_root{--dsw-specific-sidebar-fill:" + trajectorySidebarSurface.dark + ";}");
        return [
          "body{isolation:isolate;}",
          "body *:has(>[data-conversation-scroll])>header{background:transparent!important;}",
          "body *:has(>[data-conversation-scroll])>header:after{background:transparent!important;}",
          'body::before{content:"";position:fixed;inset:0;z-index:-1;background-image:' + bgValue(main, urls.main) + ';background-size:' + mainSize + ';background-position:' + mainPos + ';background-repeat:no-repeat;filter:blur(' + mainBlur + 'px);' + (mainBlur > 0 ? "transform:scale(1.06);" : "") + 'pointer-events:none;}',
          'body:has([data-trajectory-scroll])::before{background-image:' + bgValue(trajectory, urls.trajectory) + ';background-size:' + trajectorySize + ';background-position:' + trajectoryPos + ';filter:blur(' + trajectoryBlur + 'px);transform:' + (trajectoryBlur > 0 ? "scale(1.06)" : "none") + ';}',
          '[data-conversation-scroll]>[data-composer-seat]{background:transparent!important;}',
          '[data-conversation-scroll]>[data-composer-seat]::before,[data-conversation-scroll]>[data-composer-seat]::after{background:transparent!important;box-shadow:none!important;}',
          '[data-slot="sidebar.workspaces"] [role="tree"]+span,[data-slot="sidebar.workspaces"] div:has(>[role="tree"])+span{background:transparent!important;}',
          '[data-conversation-scroll]:has([data-conversation-composer-overlay])>[data-composer-seat]{display:none!important;}',
          '[data-conversation-composer-overlay]{position:relative;z-index:1;background:transparent!important;}',
          '[data-conversation-composer-overlay] > :first-child,[data-conversation-composer-overlay] > :nth-child(2),[data-conversation-composer-overlay] > :nth-child(2) > *{background:transparent!important;}',
          '[data-conversation-composer-overlay] > *:has([data-trajectory-scroll]),[data-conversation-composer-overlay] > *:has([data-trajectory-scroll]) :has(>[data-trajectory-scroll]){background:transparent!important;}',
          '[data-conversation-composer-overlay] [data-trajectory-scroll] table,[data-conversation-composer-overlay] [data-trajectory-scroll] table th{background:transparent!important;}',
          '[data-conversation-composer-overlay] [data-trajectory-scroll] tr[data-history-load] button,[data-conversation-composer-overlay] [data-trajectory-scroll] > [role="status"] > span{background:transparent!important;}',
          '[data-conversation-composer-overlay] :where([class*="_turnLabel"],[class*="_details"],[class*="_overviewHeading"],[class*="_overviewPreview"],[class*="_assistantOutput"],[class*="_schema"],[class*="_promptDiff"]){background:transparent!important;}',
          '[data-conversation-composer-overlay] [class*="_requestBoundaryControl"]::before{box-shadow:0 0 0 2px transparent!important;}',
          '[data-conversation-composer-overlay] svg{color:inherit;}',
          '[data-conversation-composer-overlay]>*{--dsh-trajectory-bottom-clearance:0px!important;}',
          surfaceCss.join(""),
          trajectoryWorkspace + "{background:var(--dsw-alias-bg-base)!important;}",
          buildTextCss(c),
          buildTrajectorySchemeCss(c, trajectoryWorkspace, trajectoryRoot)
        ].join("");
      }

      function revokeActiveUrls() {
        var seen = [];
        [activeUrls.main, activeUrls.trajectory].forEach(function (url) {
          if (url && seen.indexOf(url) === -1) {
            seen.push(url);
            URL.revokeObjectURL(url);
          }
        });
        activeUrls = { main: null, trajectory: null };
      }

      async function applyWallpaper(c) {
        var seq = ++applySeq;
        if (disposeStyle) { disposeStyle(); disposeStyle = null; }
        if (disposeTokens) { disposeTokens(); disposeTokens = null; }
        revokeActiveUrls();
        if (c.enabled === false) return;

        var main = paneConfig(c, "main");
        var trajectory = paneConfig(c, "trajectory");
        var imageIds = [];
        [main, trajectory].forEach(function (pane) {
          if (pane.mode === "image" && pane.activeId && imageIds.indexOf(pane.activeId) === -1) imageIds.push(pane.activeId);
        });
        var records = {};
        await Promise.all(imageIds.map(function (id) {
          return idbGet(id).then(function (rec) { records[id] = rec; }).catch(function () { records[id] = null; });
        }));
        if (seq !== applySeq) return;

        var urls = {};
        imageIds.forEach(function (id) {
          if (records[id] && records[id].blob) urls[id] = URL.createObjectURL(records[id].blob);
        });
        if (main.mode === "image") activeUrls.main = urls[main.activeId] || null;
        if (trajectory.mode === "image") activeUrls.trajectory = urls[trajectory.activeId] || null;

        var next = Object.assign({}, c);
        if (main.mode === "image" && !activeUrls.main) next = Object.assign(next, { mode: "none", activeId: null });
        if (trajectory.mode === "image" && !activeUrls.trajectory && c.trajectoryMode !== "inherit") next = Object.assign(next, { trajectoryMode: "none", trajectoryActiveId: null });
        if (next !== c) {
          cfg = next;
          safeSet(STORAGE_KEY, JSON.stringify(next));
        }
        if (theme) {
          var tokens = buildTokens(paneConfig(next, "main"));
          if (Object.keys(tokens).length > 0) disposeTokens = theme.overrideTokens("dsh-wallpaper", tokens);
        }
        disposeStyle = injectCss(buildCss(next, activeUrls));
      }

      function persist() {
        return safeSet(STORAGE_KEY, JSON.stringify(cfg));
      }

      function commit(patch) {
        cfg = Object.assign({}, cfg, patch);
        persist();
        applyWallpaper(cfg);
        return cfg;
      }

      applyWallpaper(cfg);
      ctx.effect(function () { return injectCss(UI_CSS); });
      ctx.effect(function () {
        return function () {
          if (disposeStyle) { disposeStyle(); disposeStyle = null; }
          if (disposeTokens) { disposeTokens(); disposeTokens = null; }
          revokeActiveUrls();
        };
      });


      // ---- 图片工具 ----
      function newId() {
        return "img-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
      }
      function saveBlob(blob, nm) {
        var id = newId();
        return idbPut({ id: id, name: nm || "图片", size: blob.size, mimeType: blob.type || "image/jpeg", blob: blob })
          .then(function () { return id; });
      }

      // ---- React 组件 ----
      var h = React.createElement;

      function rangeRow(label, value, min, max, step, unit, onChange) {
        return h("div", { className: "dshwp-row" },
          h("label", null, label),
          h("input", { type: "range", min: min, max: max, step: step, value: value, onChange: function (e) { onChange(Number(e.target.value)); } }),
          h("span", { className: "dshwp-val" }, String(value) + unit)
        );
      }

      function fmtSize(n) {
        if (n == null || n <= 0) return "0 B";
        if (n < 1024) return n + " B";
        if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
        return (n / 1048576).toFixed(2) + " MB";
      }

      function previewStyle(pane, url) {
        return {
          backgroundImage: bgValue(pane, url),
          backgroundSize: pane.fit === "stretch" ? "100% 100%" : (pane.fit || "cover"),
          backgroundPosition: (pane.posX != null ? pane.posX : 50) + "% " + (pane.posY != null ? pane.posY : 50) + "%",
          backgroundRepeat: "no-repeat"
        };
      }

      function WallpaperPreview(props) {
        var _u = React.useState(null), url = _u[0], setUrl = _u[1];
        React.useEffect(function () {
          var cancelled = false;
          var objectUrl = null;
          setUrl(null);
          if (props.pane.mode !== "image" || !props.pane.activeId) return function () {};
          idbGet(props.pane.activeId).then(function (rec) {
            if (cancelled || !rec || !rec.blob) return;
            objectUrl = URL.createObjectURL(rec.blob);
            setUrl(objectUrl);
          }).catch(function () {});
          return function () {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
          };
        }, [props.pane.mode, props.pane.activeId]);
        return h("div", { className: "dshwp-preview", style: previewStyle(props.pane, url) },
          props.pane.mode === "none" ? props.emptyLabel : null
        );
      }

      // 图片库缩略图：按需从 IndexedDB 读 blob → object URL，卸载时 revoke。
      function GalleryThumb(props) {
        var _u = React.useState(null), url = _u[0], setUrl = _u[1];
        React.useEffect(function () {
          var cancelled = false;
          var objectUrl = null;
          idbGet(props.id).then(function (rec) {
            if (cancelled || !rec || !rec.blob) return;
            objectUrl = URL.createObjectURL(rec.blob);
            setUrl(objectUrl);
          }).catch(function () {});
          return function () {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
          };
        }, [props.id]);
        return url
          ? h("img", { className: "dshwp-file-thumb", src: url, alt: props.name })
          : h("div", { className: "dshwp-file-thumb dshwp-file-thumb-empty" }, "…");
      }

      function CropModal(props) {
        var canvasRef = React.useRef(null);
        var dragRef = React.useRef(null);
        var _u1 = React.useState(null), img = _u1[0], setImg = _u1[1];
        var _u2 = React.useState(null), sel = _u2[0], setSel = _u2[1];
        var _u3 = React.useState(1), scale = _u3[0], setScale = _u3[1];

        React.useEffect(function () {
          var image = new Image();
          image.onload = function () { setImg(image); };
          image.onerror = function () { props.onCancel(); };
          image.src = props.src;
        }, [props.src]);

        React.useEffect(function () {
          var cv = canvasRef.current;
          if (!cv || !img) return;
          var maxW = 560, maxH = 360;
          var s = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
          cv.width = Math.round(img.naturalWidth * s);
          cv.height = Math.round(img.naturalHeight * s);
          setScale(s);
          var g = cv.getContext("2d");
          g.clearRect(0, 0, cv.width, cv.height);
          g.drawImage(img, 0, 0, cv.width, cv.height);
          if (sel) {
            var r = sel;
            g.fillStyle = "rgba(0,0,0,0.55)";
            g.fillRect(0, 0, cv.width, r.y);
            g.fillRect(0, r.y + r.h, cv.width, cv.height - r.y - r.h);
            g.fillRect(0, r.y, r.x, r.h);
            g.fillRect(r.x + r.w, r.y, cv.width - r.x - r.w, r.h);
            g.strokeStyle = "#ffffff";
            g.lineWidth = 2;
            g.strokeRect(r.x, r.y, r.w, r.h);
          }
        }, [img, sel]);

        var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
        var pointerPos = function (e) {
          var r = canvasRef.current.getBoundingClientRect();
          return { x: e.clientX - r.left, y: e.clientY - r.top };
        };
        var onDown = function (e) {
          var cv = canvasRef.current;
          var p = pointerPos(e);
          var x0 = clamp(p.x, 0, cv.width);
          var y0 = clamp(p.y, 0, cv.height);
          dragRef.current = { x0: x0, y0: y0 };
          setSel({ x: x0, y: y0, w: 0, h: 0 });
        };
        var onMove = function (e) {
          if (!dragRef.current) return;
          var cv = canvasRef.current;
          var p = pointerPos(e);
          var x = clamp(p.x, 0, cv.width);
          var y = clamp(p.y, 0, cv.height);
          var d = dragRef.current;
          setSel({ x: Math.min(d.x0, x), y: Math.min(d.y0, y), w: Math.abs(x - d.x0), h: Math.abs(y - d.y0) });
        };
        var onUp = function () { dragRef.current = null; };

        var applyCrop = function () {
          if (!img || !sel || sel.w < 4 || sel.h < 4) return;
          var out = document.createElement("canvas");
          var sw = sel.w / scale, sh = sel.h / scale;
          out.width = Math.max(1, Math.round(sw));
          out.height = Math.max(1, Math.round(sh));
          out.getContext("2d").drawImage(img, sel.x / scale, sel.y / scale, sw, sh, 0, 0, out.width, out.height);
          out.toBlob(function (blob) {
            if (blob) props.onApply(blob);
          }, "image/jpeg", 0.92);
        };

        return h("div", { className: "dshwp-modal-mask", onMouseDown: function (e) { if (e.target === e.currentTarget) props.onCancel(); } },
          h("div", { className: "dshwp-modal" },
            h("div", { className: "dshwp-title", style: { marginBottom: 8 } }, props.t("cropTitle")),
            h("canvas", {
              ref: canvasRef, className: "dshwp-crop-canvas",
              onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerLeave: onUp
            }),
            h("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 } },
              h("button", { className: "dshwp-btn", onClick: props.onCancel }, props.t("cancel")),
              h("button", { className: "dshwp-btn dshwp-btn-primary", onClick: applyCrop, disabled: !sel || sel.w < 4 || sel.h < 4 }, props.t("applyCrop"))
            )
          )
        );
      }

      function WallpaperSection() {
        var _s = React.useState(cfg), c = _s[0], setC = _s[1];
        var _s2 = React.useState([]), gallery = _s2[0], setGallery = _s2[1];
        var _s3 = React.useState(false), cropping = _s3[0], setCropping = _s3[1];
        var _s4 = React.useState(""), notice = _s4[0], setNotice = _s4[1];
        var _s5 = React.useState(false), busy = _s5[0], setBusy = _s5[1];
        var _s6 = React.useState("main"), pane = _s6[0], setPane = _s6[1];
        var fileRef = React.useRef(null);
        var dirRef = React.useRef(null);
        var cropSrcUrl = React.useRef(null);
        var lang = c.uiLanguage === "en" ? "en" : "zh";
        var t = function (key, values) { return translate(lang, key, values); };
        var selected = paneConfig(c, pane);
        var trajectoryInherited = pane === "trajectory" && c.trajectoryMode === "inherit";
        var activeTrajectoryScheme = TRAJECTORY_SCHEMES[c.trajectoryColorScheme] ? c.trajectoryColorScheme : "native";

        var refreshGallery = function () {
          idbList().then(function (rows) { setGallery(rows); }).catch(function () {});
        };

        React.useEffect(function () { refreshGallery(); }, []);

        var commit = function (patch) {
          cfg = Object.assign({}, cfg, patch);
          persist();
          applyWallpaper(cfg);
          setC(cfg);
        };

        var commitPane = function (patch) {
          var next = patch;
          if (pane === "trajectory" && c.trajectoryMode === "inherit") {
            next = Object.assign({}, paneConfig(c, "main"), patch);
          }
          commit(panePatch(pane, next));
        };

        var saveAndActivate = function (blob, nm) {
          setBusy(true);
          return saveBlob(blob, nm).then(function (id) {
            setBusy(false);
            refreshGallery();
            commitPane({ mode: "image", activeId: id });
          }).catch(function (e) {
            setBusy(false);
            setNotice(t("saveFailed", { error: e && e.message ? e.message : String(e) }));
          });
        };

        var onFile = function (e) {
          var file = e.target.files && e.target.files[0];
          if (!file) return;
          saveAndActivate(file, file.name);
          e.target.value = "";
        };

        var onDir = function (e) {
          var files = e.target.files;
          var imgs = [];
          if (files) for (var i = 0; i < files.length; i++) if (IMG_EXT_RE.test(files[i].name)) imgs.push(files[i]);
          e.target.value = "";
          if (imgs.length === 0) { setNotice(t("folderEmpty")); return; }
          setBusy(true);
          setNotice(t("importing", { count: imgs.length }));
          var firstId = null;
          var queue = imgs.slice();
          async function worker() {
            while (queue.length > 0) {
              var f = queue.shift();
              try {
                var id = await saveBlob(f, f.name);
                if (firstId === null) firstId = id;
              } catch (err) {}
            }
          }
          var workers = [];
          for (var w = 0; w < Math.min(4, queue.length); w++) workers.push(worker());
          Promise.all(workers).then(function () {
            setBusy(false);
            setNotice("");
            refreshGallery();
            if (firstId) commitPane({ mode: "image", activeId: firstId });
            else setNotice(t("importFailed"));
          });
        };

        var removeImage = function (id) {
          idbDelete(id).then(function () {
            refreshGallery();
            var patch = {};
            if (cfg.activeId === id) Object.assign(patch, { mode: "none", activeId: null });
            if (cfg.trajectoryActiveId === id) Object.assign(patch, { trajectoryMode: "none", trajectoryActiveId: null });
            if (Object.keys(patch).length > 0) commit(patch);
          }).catch(function () {});
        };

        var activateImage = function (id) {
          commitPane({ mode: "image", activeId: id });
        };

        var startCrop = function () {
          if (selected.mode !== "image" || !selected.activeId) return;
          idbGet(selected.activeId).then(function (rec) {
            if (rec && rec.blob) {
              if (cropSrcUrl.current) URL.revokeObjectURL(cropSrcUrl.current);
              cropSrcUrl.current = URL.createObjectURL(rec.blob);
              setCropping(true);
            }
          }).catch(function () {});
        };

        var onCrop = function (blob) {
          if (cropSrcUrl.current) { URL.revokeObjectURL(cropSrcUrl.current); cropSrcUrl.current = null; }
          setCropping(false);
          saveAndActivate(blob, t("croppedName", { time: Date.now() }));
        };

        var onCropCancel = function () {
          if (cropSrcUrl.current) { URL.revokeObjectURL(cropSrcUrl.current); cropSrcUrl.current = null; }
          setCropping(false);
        };

        var total = 0;
        for (var gi = 0; gi < gallery.length; gi++) total += gallery[gi].size || 0;

        return h("div", { className: "dshwp-root" },
          h("div", { className: "dshwp-toolbar", style: { justifyContent: "space-between", flexWrap: "wrap" } },
            h("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" } },
              h("label", { className: "dshwp-toggle" },
                h("input", {
                  type: "checkbox",
                  checked: c.enabled !== false,
                  onChange: function (e) { commit({ enabled: e.target.checked }); }
                }),
                t("wallpaperEnabled")
              ),
              h("span", { className: "dshwp-toolbar-label" }, pane === "main" ? t("mainPane") : t("trajectoryPane")),
              h("div", { className: "dshwp-segment" },
                [["main", t("mainPane")], ["trajectory", t("trajectoryPane")]].map(function (item) {
                  return h("button", {
                    key: item[0],
                    className: "dshwp-btn" + (pane === item[0] ? " dshwp-active" : ""),
                    "aria-pressed": pane === item[0],
                    onClick: function () { setNotice(""); setPane(item[0]); }
                  }, item[1]);
                })
              )
            ),
            h("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
              h("span", { className: "dshwp-toolbar-label" }, t("language")),
              h("div", { className: "dshwp-segment" },
                [["zh", "中文"], ["en", "English"]].map(function (item) {
                  return h("button", {
                    key: item[0],
                    className: "dshwp-btn" + (lang === item[0] ? " dshwp-active" : ""),
                    "aria-pressed": lang === item[0],
                    onClick: function () { setNotice(""); commit({ uiLanguage: item[0] }); }
                  }, item[1]);
                })
              )
            )
          ),
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, t("preview")),
            h(WallpaperPreview, {
              pane: selected,
              emptyLabel: trajectoryInherited ? t("inheritCurrent") : t("noWallpaperCurrent")
            })
          ),
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, t("presets")),
            h("div", { className: "dshwp-grid" },
              pane === "trajectory"
                ? h("button", {
                    key: "inherit",
                    className: "dshwp-swatch" + (trajectoryInherited ? " dshwp-active" : ""),
                    style: { background: "linear-gradient(135deg,rgba(99,102,241,.8),rgba(14,165,233,.65))" },
                    title: t("inheritMain"),
                    onClick: function () { commitPane({ mode: "inherit" }); }
                  }, h("span", { className: "dshwp-swatch-label" }, t("inheritMain")))
                : null,
              h("button", {
                key: "none",
                className: "dshwp-swatch" + (!trajectoryInherited && selected.mode === "none" ? " dshwp-active" : ""),
                style: { background: "repeating-conic-gradient(#e5e9f2 0% 25%, #f8fafc 0% 50%) 50%/20px 20px" },
                title: t("noWallpaper"),
                onClick: function () { commitPane({ mode: "none", activeId: null }); }
              }, h("span", { className: "dshwp-swatch-label" }, t("noWallpaper"))),
              GRADIENTS.map(function (g) {
                var gradientLabel = g[lang] || g.en;
                return h("button", {
                  key: g.id,
                  className: "dshwp-swatch" + (!trajectoryInherited && selected.mode === "gradient" && selected.gradient === g.css ? " dshwp-active" : ""),
                  style: { background: g.css },
                  title: gradientLabel,
                  onClick: function () { commitPane({ mode: "gradient", gradient: g.css }); }
                }, h("span", { className: "dshwp-swatch-label" }, gradientLabel));
              })
            )
          ),
          h("section", { className: "dshwp-card" },
            h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline" } },
              h("div", { className: "dshwp-title" }, t("library")),
              h("span", { className: "dshwp-note" }, t("librarySize", { size: fmtSize(total) }))
            ),
            h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
              h("input", { ref: fileRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: onFile }),
              h("input", { ref: dirRef, type: "file", webkitdirectory: "", multiple: "", style: { display: "none" }, onChange: onDir }),
              h("button", { className: "dshwp-btn dshwp-btn-primary", onClick: function () { if (fileRef.current) fileRef.current.click(); } }, t("upload")),
              h("button", { className: "dshwp-btn", onClick: function () { if (dirRef.current) dirRef.current.click(); } }, t("importFolder")),
              selected.mode === "image" && selected.activeId
                ? h("button", { className: "dshwp-btn", onClick: startCrop }, t("cropCurrent"))
                : null
            ),
            busy ? h("div", { className: "dshwp-note", style: { marginTop: 8 } }, notice || t("processing")) : null,
            notice && !busy ? h("div", { className: "dshwp-error", style: { marginTop: 8 } }, notice) : null,
            h("div", { className: "dshwp-note", style: { marginTop: 8 } }, t("storage")),
            gallery.length === 0
              ? h("div", { className: "dshwp-note", style: { marginTop: 8 } }, t("emptyLibrary"))
              : h("div", { className: "dshwp-file-list" },
                  gallery.map(function (g) {
                    return h("div", {
                      key: g.id,
                      className: "dshwp-file-item" + (selected.mode === "image" && selected.activeId === g.id ? " active" : ""),
                      title: t("setBackground", { name: g.name }),
                      onClick: function () { activateImage(g.id); }
                    },
                      h(GalleryThumb, { id: g.id, name: g.name }),
                      h("span", { className: "dshwp-file-name" }, g.name),
                      h("span", { className: "dshwp-file-size" }, fmtSize(g.size)),
                      h("button", {
                        className: "dshwp-del",
                        title: t("remove"),
                        onClick: function (ev) { ev.stopPropagation(); removeImage(g.id); }
                      }, "×")
                    );
                  })
                )
          ),
          (pane === "main" || !trajectoryInherited)
            ? h("section", { className: "dshwp-card" },
                h("div", { className: "dshwp-title" }, t("effects")),
                rangeRow(t("blur"), selected.blur, 0, 50, 1, " px", function (v) { commitPane({ blur: v }); }),
                rangeRow(t("opacity"), selected.opacity, 0, 1, 0.05, "", function (v) { commitPane({ opacity: v }); })
              )
            : null,
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, t("readability")),
            pane === "trajectory"
              ? h(React.Fragment, null,
                  h("div", { className: "dshwp-row" },
                    h("label", null, t("trajectoryColorScheme")),
                    h("div", { className: "dshwp-scheme-grid" },
                      TRAJECTORY_SCHEME_ORDER.map(function (schemeId) {
                        var option = TRAJECTORY_SCHEMES[schemeId];
                        return h("button", {
                          key: schemeId,
                          className: "dshwp-scheme-btn" + (activeTrajectoryScheme === schemeId ? " dshwp-active" : ""),
                          "aria-pressed": activeTrajectoryScheme === schemeId,
                          onClick: function () { commit({ trajectoryColorScheme: schemeId }); }
                        },
                          h("span", { className: "dshwp-scheme-colors", "aria-hidden": "true" },
                            option.swatches.map(function (color, index) {
                              return h("span", { key: index, className: "dshwp-scheme-color", style: { background: color } });
                            })
                          ),
                          h("span", { className: "dshwp-scheme-name" }, t(option.label))
                        );
                      })
                    )
                  )
                )
              : h(React.Fragment, null,
                  h("div", { className: "dshwp-row" },
                    h("label", null, t("textColor")),
                    h("div", { className: "dshwp-segment" },
                      ["auto", "light", "dark", "custom"].map(function (m) {
                        return h("button", {
                          key: m,
                          className: "dshwp-btn" + (c.textMode === m ? " dshwp-active" : ""),
                          "aria-pressed": c.textMode === m,
                          onClick: function () { commit({ textMode: m, textColor: normalizeHexColor(c.textColor, TEXT_COLORS.light) }); }
                        }, t(m));
                      })
                    )
                  ),
                  c.textMode === "custom"
                    ? h("div", { className: "dshwp-row" },
                        h("label", null, t("colorValue")),
                        h("div", { className: "dshwp-color-controls" },
                          h("input", {
                            className: "dshwp-color-input",
                            type: "color",
                            value: normalizeHexColor(c.textColor, TEXT_COLORS.light),
                            title: t("colorValue"),
                            onChange: function (e) { commit({ textMode: "custom", textColor: e.target.value }); }
                          }),
                          h("input", {
                            className: "dshwp-color-code",
                            type: "text",
                            value: normalizeHexColor(c.textColor, TEXT_COLORS.light),
                            maxLength: 7,
                            spellCheck: false,
                            "aria-label": t("colorValue"),
                            onChange: function (e) {
                              var value = e.target.value;
                              if (HEX_COLOR_RE.test(value)) commit({ textMode: "custom", textColor: value });
                            }
                          })
                        )
                      )
                    : null,
                  h("div", { className: "dshwp-row" },
                    h("label", null, t("textShadow")),
                    h("button", {
                      className: "dshwp-btn" + (c.textShadow ? " dshwp-active" : ""),
                      "aria-pressed": c.textShadow,
                      onClick: function () { commit({ textShadow: !c.textShadow }); }
                    }, c.textShadow ? t("on") : t("off"))
                  )
                )
          ),
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, t("fillPosition")),
            h("div", { className: "dshwp-segment", style: { marginBottom: 4 } },
              ["cover", "contain", "stretch"].map(function (f) {
                return h("button", {
                  key: f,
                  className: "dshwp-btn" + (selected.fit === f ? " dshwp-active" : ""),
                  "aria-pressed": selected.fit === f,
                  onClick: function () { commitPane({ fit: f }); }
                }, t(f));
              })
            ),
            selected.fit !== "stretch" ? rangeRow(t("posX"), selected.posX, 0, 100, 1, " %", function (v) { commitPane({ posX: v }); }) : null,
            selected.fit !== "stretch" ? rangeRow(t("posY"), selected.posY, 0, 100, 1, " %", function (v) { commitPane({ posY: v }); }) : null
          ),
          cropping && cropSrcUrl.current
            ? h(CropModal, {
                src: cropSrcUrl.current,
                t: t,
                onApply: onCrop,
                onCancel: onCropCancel
              })
            : null
        );

      }

      if (slots) {
        slots.inject("settings.section", function () {
          return slots.register(
            { name: "settings.section", id: "wallpaper", order: 300, label: "壁纸 / Wallpaper" },
            WallpaperSection
          );
        });
      }
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.name = name;
    return module.exports;
  }
});

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
      "--dsw-specific-input-major": { light: "255,255,255", dark: "44,44,46", kind: "input" }
    };

    // Forced text colors are injected only into the chat session subtree. They
    // must not leak into Settings, Trajectory, sidebar or other opaque surfaces.
    var TEXT_COLORS = {
      light: {
        "--dsw-alias-label-primary": "249,250,251",
        "--dsw-alias-label-primary-dimmed": "229,231,235",
        "--dsw-alias-label-secondary": "207,211,214",
        "--dsw-alias-label-tertiary": "173,178,184",
        "--dsw-alias-label-caption": "173,178,184",
        "--dsw-alias-label-dimmed": "151,157,166"
      },
      dark: {
        "--dsw-alias-label-primary": "15,17,21",
        "--dsw-alias-label-primary-dimmed": "39,42,47",
        "--dsw-alias-label-secondary": "97,102,107",
        "--dsw-alias-label-tertiary": "129,133,140",
        "--dsw-alias-label-caption": "129,133,140",
        "--dsw-alias-label-dimmed": "151,157,166"
      }
    };

    var I18N = {
      zh: {
        language: "界面语言", mainPane: "主界面", trajectoryPane: "轨迹页", preview: "预览",
        noWallpaperCurrent: "当前无壁纸（DSH 原样）", inheritMain: "跟随主界面", inheritCurrent: "当前跟随主界面壁纸",
        presets: "预设", noWallpaper: "无壁纸", library: "图片库", upload: "上传图片",
        importFolder: "导入文件夹", cropCurrent: "裁剪当前图片", processing: "处理中…",
        storage: "图片以原始字节存于浏览器 IndexedDB（不压缩、不受 5 MB 限制）。", librarySize: "共 {size}",
        emptyLibrary: "还没有图片——上传一张，或「导入文件夹」批量加入。",
        setBackground: "点击设为背景：{name}", remove: "删除", effects: "效果", blur: "模糊",
        brightness: "壁纸亮度", dim: "可读性遮罩", opacity: "表面不透明度", readability: "文字可读性", textColor: "文字颜色",
        auto: "自动", light: "浅色", dark: "深色", textShadow: "文字阴影", on: "开", off: "关",
        readabilityNote: "文字颜色仅作用于聊天内容；如需增强对比，可在「效果」里调遮罩或不透明度。",
        fillPosition: "填充与位置", cover: "裁切填充", contain: "完整显示", stretch: "拉伸",
        posX: "水平位置", posY: "垂直位置", cropTitle: "裁剪图片 · 拖拽框选要保留的区域",
        cancel: "取消", applyCrop: "应用裁剪", saveFailed: "保存失败：{error}",
        folderEmpty: "该目录下没有图片文件。", importing: "正在导入 {count} 张图片…",
        importFailed: "导入失败，请重试。", croppedName: "裁剪-{time}.jpg"
      },
      en: {
        language: "Language", mainPane: "Main UI", trajectoryPane: "Trajectory", preview: "Preview",
        noWallpaperCurrent: "No wallpaper (DSH default)", inheritMain: "Follow main UI", inheritCurrent: "Following the main wallpaper",
        presets: "Presets", noWallpaper: "None", library: "Image library", upload: "Upload image",
        importFolder: "Import folder", cropCurrent: "Crop current image", processing: "Processing…",
        storage: "Original image bytes are stored in browser IndexedDB (no compression, no 5 MB limit).", librarySize: "{size} total",
        emptyLibrary: "No images yet. Upload one or import a folder.",
        setBackground: "Set as background: {name}", remove: "Delete", effects: "Effects", blur: "Blur",
        brightness: "Wallpaper brightness", dim: "Readability overlay", opacity: "Surface opacity", readability: "Readability", textColor: "Text color",
        auto: "Auto", light: "Light", dark: "Dark", textShadow: "Text shadow", on: "On", off: "Off",
        readabilityNote: "Text color is scoped to chat content; to boost contrast, adjust the overlay or opacity under Effects.",
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
      ".dshwp-segment{display:inline-flex;align-items:center;gap:2px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:8px;padding:2px;}",
      ".dshwp-segment .dshwp-btn{border:0;border-radius:6px;padding:4px 9px;line-height:18px;}",
      ".dshwp-segment .dshwp-active{outline:0;background:var(--dsw-alias-interactive-bg-active);box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2);}",
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
      "@media(max-width:640px){.dshwp-root{gap:10px}.dshwp-card{padding:12px}.dshwp-row label{flex-basis:100%}.dshwp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dshwp-file-list{grid-template-columns:repeat(2,minmax(0,1fr))}}"
    ].join("");

    function safeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function safeSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } }

    function defaultConfig() {
      return {
        mode: "none",            // "none" | "gradient" | "image"
        gradient: GRADIENTS[0].css,
        activeId: null,          // 当前激活图片在 IndexedDB 里的 id
        blur: 0,
        brightness: 1,
        dim: 0.35,
        opacity: 0.9,
        trajectoryMode: "inherit",
        trajectoryGradient: GRADIENTS[4].css,
        trajectoryActiveId: null,
        trajectoryBlur: 0,
        trajectoryBrightness: 1,
        trajectoryDim: 0.28,
        trajectoryOpacity: 0.72,
        trajectoryFit: "cover",
        trajectoryPosX: 50,
        trajectoryPosY: 50,
        uiLanguage: "zh",
        textMode: "auto",
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
        if (parsed && typeof parsed === "object") return Object.assign(defaultConfig(), parsed);
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
      var appliedTokenKey = null;
      var activeUrl = null;      // 当前激活图片的 object URL
      var applySeq = 0;          // 防止异步 apply 竞态

      function bgValue(c) {
        if (c.mode === "image" && activeUrl) return 'url("' + activeUrl + '")';
        if (c.mode === "gradient") return c.gradient || GRADIENTS[0].css;
        return null;
      }

      function buildCss(c) {
        if (c.mode === "none") return "";
        var size = c.fit === "stretch" ? "100% 100%" : (c.fit || "cover");
        var pos = (c.posX != null ? c.posX : 50) + "% " + (c.posY != null ? c.posY : 50) + "%";
        var blur = Number(c.blur) || 0;
        var overscan = blur > 0 ? "transform:scale(1.06);" : "";
        var dim = Math.max(0, Math.min(0.9, Number(c.dim) || 0));
        var sessionScope = '[data-conversation-scroll]:not(:has([data-conversation-composer-overlay]))>[data-slot="conversation.session"]';
        var textCss = "";
        if (c.textMode === "light" || c.textMode === "dark") {
          var cols = TEXT_COLORS[c.textMode];
          var declarations = [];
          for (var labelToken in cols) declarations.push(labelToken + ":rgb(" + cols[labelToken] + ")");
          textCss = sessionScope + "{" + declarations.join(";") + ";}";
        }
        // 文字阴影（可选投影）
        var shadowCss = "";
        if (c.textShadow) {
          if (c.textMode === "light") shadowCss = sessionScope + "{text-shadow:0 1px 2px rgba(0,0,0,0.5);}";
          else if (c.textMode === "dark") shadowCss = sessionScope + "{text-shadow:0 1px 2px rgba(255,255,255,0.5);}";
          else shadowCss = 'body:not([data-ds-dark-theme]) ' + sessionScope + '{text-shadow:0 1px 2px rgba(255,255,255,0.6);}body[data-ds-dark-theme] ' + sessionScope + '{text-shadow:0 1px 2px rgba(0,0,0,0.6);}';
        }
        return [
          "body{isolation:isolate;}",
          'body::before{content:"";position:fixed;inset:0;z-index:-1;',
          "background-image:" + bgValue(c) + ";",
          "background-size:" + size + ";background-position:" + pos + ";background-repeat:no-repeat;",
          "filter:blur(" + blur + "px);" + overscan,
          "pointer-events:none;}",
          'body::after{content:"";position:fixed;inset:0;z-index:-1;',
          "background:rgba(0,0,0," + dim + ");pointer-events:none;}",
          '[data-conversation-scroll]>[data-composer-seat]{background:transparent!important;}',
          '[data-conversation-scroll]>[data-composer-seat]::before,[data-conversation-scroll]>[data-composer-seat]::after{background:transparent!important;box-shadow:none!important;}',
          '[data-slot="sidebar.workspaces"] [role="tree"]+span,[data-slot="sidebar.workspaces"] div:has(>[role="tree"])+span{background:transparent!important;}',
          '[data-conversation-scroll]:has([data-conversation-composer-overlay])>[data-composer-seat]{display:none!important;}',
          '[data-conversation-composer-overlay]{position:relative;z-index:1;background:var(--dsw-alias-bg-layer-1)!important;}',
          '[data-conversation-composer-overlay]>*{--dsh-trajectory-bottom-clearance:0px!important;}',
          textCss,
          shadowCss
        ].join("");
      }

      function buildTokens(c) {
        if (c.mode === "none") return {};
        var op = Math.max(0.25, Math.min(1, Number(c.opacity) || 0.9));
        function alphaOf(kind) {
          if (kind === "base") return Math.max(0.15, op - 0.25);
          if (kind === "input") return Math.min(1, op + 0.05);
          return op;
        }
        var tokens = {};
        for (var tn in SURFACE_TOKENS) {
          var t = SURFACE_TOKENS[tn];
          var a = alphaOf(t.kind);
          tokens[tn] = { light: "rgba(" + t.light + "," + a + ")", dark: "rgba(" + t.dark + "," + a + ")" };
        }
        return tokens;
      }

      async function applyWallpaper(c) {
        var seq = ++applySeq;
        if (disposeStyle) { disposeStyle(); disposeStyle = null; }
        if (activeUrl) { URL.revokeObjectURL(activeUrl); activeUrl = null; }

        if (c.mode === "image" && c.activeId) {
          try {
            var rec = await idbGet(c.activeId);
            if (seq !== applySeq) return; // 已有更新的 apply
            if (rec && rec.blob) activeUrl = URL.createObjectURL(rec.blob);
            else { c = Object.assign({}, c, { mode: "none" }); safeSet(STORAGE_KEY, JSON.stringify(c)); cfg = c; }
          } catch (e) {
            if (seq !== applySeq) return;
            c = Object.assign({}, c, { mode: "none" }); safeSet(STORAGE_KEY, JSON.stringify(c)); cfg = c;
          }
        }

        if (seq !== applySeq) return;
        if (c.mode !== "none") disposeStyle = injectCss(buildCss(c));
        var tokenKey = c.mode + "|" + String(c.opacity) + "|" + (c.textMode || "auto");
        if (theme && tokenKey !== appliedTokenKey) {
          appliedTokenKey = tokenKey;
          if (disposeTokens) { disposeTokens(); disposeTokens = null; }
          var toks = buildTokens(c);
          if (Object.keys(toks).length > 0) disposeTokens = theme.overrideTokens("dsh-wallpaper", toks);
        }
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
          if (activeUrl) { URL.revokeObjectURL(activeUrl); activeUrl = null; }
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

      function previewStyle(c) {
        var style = {
          backgroundSize: c.fit === "stretch" ? "100% 100%" : (c.fit || "cover"),
          backgroundPosition: (c.posX != null ? c.posX : 50) + "% " + (c.posY != null ? c.posY : 50) + "%",
          backgroundRepeat: "no-repeat"
        };
        var bg = bgValue(c);
        if (bg) style.backgroundImage = bg;
        return style;
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
        var fileRef = React.useRef(null);
        var dirRef = React.useRef(null);
        var cropSrcUrl = React.useRef(null);
        var lang = c.uiLanguage === "en" ? "en" : "zh";
        var t = function (key, values) { return translate(lang, key, values); };

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

        var saveAndActivate = function (blob, nm) {
          setBusy(true);
          return saveBlob(blob, nm).then(function (id) {
            setBusy(false);
            refreshGallery();
            commit({ mode: "image", activeId: id });
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
            if (firstId) commit({ mode: "image", activeId: firstId });
            else setNotice(t("importFailed"));
          });
        };

        var removeImage = function (id) {
          idbDelete(id).then(function () {
            refreshGallery();
            if (cfg.activeId === id) commit({ mode: "none", activeId: null });
          }).catch(function () {});
        };

        var activateImage = function (id) {
          commit({ mode: "image", activeId: id });
        };

        var startCrop = function () {
          if (c.mode !== "image" || !c.activeId) return;
          idbGet(c.activeId).then(function (rec) {
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
          h("div", { className: "dshwp-toolbar" },
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
          ),
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, t("preview")),
            h("div", { className: "dshwp-preview", style: previewStyle(c) },
              c.mode === "none" ? t("noWallpaperCurrent") : null)
          ),
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, t("presets")),
            h("div", { className: "dshwp-grid" },
              h("button", {
                key: "none",
                className: "dshwp-swatch" + (c.mode === "none" ? " dshwp-active" : ""),
                style: { background: "repeating-conic-gradient(#e5e9f2 0% 25%, #f8fafc 0% 50%) 50%/20px 20px" },
                title: t("noWallpaper"),
                onClick: function () { commit({ mode: "none" }); }
              }, h("span", { className: "dshwp-swatch-label" }, t("noWallpaper"))),
              GRADIENTS.map(function (g) {
                var gradientLabel = g[lang] || g.en;
                return h("button", {
                  key: g.id,
                  className: "dshwp-swatch" + (c.mode === "gradient" && c.gradient === g.css ? " dshwp-active" : ""),
                  style: { background: g.css },
                  title: gradientLabel,
                  onClick: function () { commit({ mode: "gradient", gradient: g.css }); }
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
              c.mode === "image" && c.activeId
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
                      className: "dshwp-file-item" + (c.mode === "image" && c.activeId === g.id ? " active" : ""),
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
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, t("effects")),
            rangeRow(t("blur"), c.blur, 0, 50, 1, " px", function (v) { commit({ blur: v }); }),
            rangeRow(t("dim"), c.dim, 0, 0.9, 0.05, "", function (v) { commit({ dim: v }); }),
            rangeRow(t("opacity"), c.opacity, 0.3, 1, 0.05, "", function (v) { commit({ opacity: v }); })
          ),
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, t("readability")),
            h("div", { className: "dshwp-row" },
              h("label", null, t("textColor")),
              h("div", { className: "dshwp-segment" },
                ["auto", "light", "dark"].map(function (m) {
                  return h("button", {
                    key: m,
                    className: "dshwp-btn" + (c.textMode === m ? " dshwp-active" : ""),
                    "aria-pressed": c.textMode === m,
                    onClick: function () { commit({ textMode: m }); }
                  }, t(m));
                })
              )
            ),
            h("div", { className: "dshwp-row" },
              h("label", null, t("textShadow")),
              h("button", {
                className: "dshwp-btn" + (c.textShadow ? " dshwp-active" : ""),
                "aria-pressed": c.textShadow,
                onClick: function () { commit({ textShadow: !c.textShadow }); }
              }, c.textShadow ? t("on") : t("off"))
            ),
            h("div", { className: "dshwp-note" }, t("readabilityNote"))
          ),
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, t("fillPosition")),
            h("div", { className: "dshwp-segment", style: { marginBottom: 4 } },
              ["cover", "contain", "stretch"].map(function (f) {
                return h("button", {
                  key: f,
                  className: "dshwp-btn" + (c.fit === f ? " dshwp-active" : ""),
                  "aria-pressed": c.fit === f,
                  onClick: function () { commit({ fit: f }); }
                }, t(f));
              })
            ),
            c.fit !== "stretch" ? rangeRow(t("posX"), c.posX, 0, 100, 1, " %", function (v) { commit({ posX: v }); }) : null,
            c.fit !== "stretch" ? rangeRow(t("posY"), c.posY, 0, 100, 1, " %", function (v) { commit({ posY: v }); }) : null
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

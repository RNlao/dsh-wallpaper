// ============================================================================
// dsh-wallpaper · 客户端半 (browser half) —— 静态插件格式 v2
// ----------------------------------------------------------------------------
// 纯客户端实现：渐变 / 图片壁纸 + 无壁纸（恢复 DSH 原样）、图片库、裁剪、
// 模糊、遮罩、面板透明、文字颜色/阴影。图片以 data URL 存浏览器 localStorage。
// ============================================================================
window.__ModuleLoader__.load({
  id: "dsh-wallpaper",
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");

    var STORAGE_KEY = "dsh-wallpaper:v2";
    var MAX_LOCALSTORAGE = 5 * 1024 * 1024; // 约 5MB（浏览器典型配额）
    var KEEP_ORIGINAL_BYTES = 4 * 1024 * 1024; // 原图 ≤ 4MB 时保留原图，否则压缩

    var GRADIENTS = [
      { id: "aurora", name: "极光 Aurora", css: "linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)" },
      { id: "sunset", name: "日落 Sunset", css: "linear-gradient(135deg,#f6d365 0%,#fda085 100%)" },
      { id: "ocean", name: "海洋 Ocean", css: "linear-gradient(135deg,#2193b0 0%,#6dd5ed 100%)" },
      { id: "forest", name: "森林 Forest", css: "linear-gradient(135deg,#134e5e 0%,#71b280 100%)" },
      { id: "night", name: "暗夜 Night", css: "linear-gradient(135deg,#141e30 0%,#243b55 100%)" },
      { id: "rose", name: "玫瑰 Rose", css: "linear-gradient(135deg,#ee9ca7 0%,#ffdde1 100%)" },
      { id: "violet", name: "暮紫 Violet", css: "linear-gradient(135deg,#4568dc 0%,#b06ab3 100%)" },
      { id: "ember", name: "余烬 Ember", css: "linear-gradient(135deg,#3a1c71 0%,#d76d77 50%,#ffaf7b 100%)" }
    ];

    var SURFACE_TOKENS = {
      "--dsw-alias-bg-base": { light: "255,255,255", dark: "21,21,23", kind: "base" },
      "--dsw-alias-bg-layer-1": { light: "255,255,255", dark: "35,35,36", kind: "layer" },
      "--dsw-alias-bg-layer-2": { light: "255,255,255", dark: "44,44,46", kind: "layer" },
      "--dsw-alias-bg-layer-3": { light: "255,255,255", dark: "53,54,56", kind: "layer" },
      "--dsw-alias-bg-module-platform": { light: "245,246,247", dark: "53,54,56", kind: "layer" },
      "--dsw-alias-bg-multi-select": { light: "245,246,247", dark: "44,44,46", kind: "layer" },
      "--dsw-alias-bg-overlay": { light: "233,236,242", dark: "97,102,107", kind: "layer" },
      "--dsw-specific-menu": { light: "255,255,255", dark: "53,54,56", kind: "layer" },
      "--dsw-specific-input-major": { light: "255,255,255", dark: "44,44,46", kind: "input" },
      "--dsw-specific-login-input": { light: "249,250,251", dark: "27,27,28", kind: "input" },
      "--dsw-specific-selector": { light: "245,246,247", dark: "53,54,56", kind: "input" },
      "--dsw-specific-tip": { light: "245,246,247", dark: "53,54,56", kind: "input" },
      "--dsw-specific-sidebar-fill": { light: "249,250,251", dark: "27,27,28", kind: "layer" },
      "--dsw-specific-sidebar-nav-item-active": { light: "235,238,242", dark: "67,69,74", kind: "solid" },
      "--dsw-specific-sidebar-nav-item-hover": { light: "241,243,245", dark: "44,44,46", kind: "solid" },
      "--dsw-specific-sidebar-nav-item-active-accent": { light: "228,237,253", dark: "53,54,56", kind: "solid" },
      "--dsw-specific-bubble": { light: "237,243,254", dark: "44,44,46", kind: "layer" },
      "--dsw-specific-bubble-highlight": { light: "211,226,255", dark: "67,69,74", kind: "layer" }
    };

    var TEXT_COLORS = {
      light: {
        "--dsw-alias-label-primary": "249,250,251",
        "--dsw-alias-label-secondary": "207,211,214",
        "--dsw-alias-label-tertiary": "173,178,184",
        "--dsw-alias-label-caption": "173,178,184",
        "--dsw-alias-label-dimmed": "151,157,166"
      },
      dark: {
        "--dsw-alias-label-primary": "15,17,21",
        "--dsw-alias-label-secondary": "97,102,107",
        "--dsw-alias-label-tertiary": "129,133,140",
        "--dsw-alias-label-caption": "129,133,140",
        "--dsw-alias-label-dimmed": "151,157,166"
      }
    };

    var IMG_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|avif|svg)$/i;

    var UI_CSS = [
      ".dshwp-root{font-size:13px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:14px;max-width:680px;padding:2px 0 28px;}",
      ".dshwp-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:14px 16px;}",
      ".dshwp-title{font-size:14px;font-weight:600;margin:0 0 10px;color:var(--dsw-alias-label-primary);}",
      ".dshwp-row{display:flex;align-items:center;gap:10px;margin:8px 0;flex-wrap:wrap;}",
      ".dshwp-row label{flex:0 0 120px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}",
      ".dshwp-row input[type=range]{flex:1;min-width:0;}",
      ".dshwp-val{flex:0 0 46px;text-align:right;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;}",
      ".dshwp-btn{appearance:none;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-ghost-fill,transparent);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 12px;font-size:12px;line-height:18px;}",
      ".dshwp-btn:hover{background:var(--dsw-alias-interactive-bg-hover);}",
      ".dshwp-btn:disabled{opacity:0.45;cursor:not-allowed;}",
      ".dshwp-btn-primary{background:var(--dsw-alias-state-business-primary);border-color:transparent;color:#fff;}",
      ".dshwp-btn-primary:hover{filter:brightness(1.06);}",
      ".dshwp-active{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px;}",
      ".dshwp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(124px,1fr));gap:10px;}",
      ".dshwp-swatch{position:relative;height:64px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);cursor:pointer;padding:0;overflow:hidden;background-size:cover;background-position:center;}",
      ".dshwp-swatch-label{position:absolute;left:0;right:0;bottom:0;padding:3px 8px;font-size:11px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,0.55));text-align:left;}",
      ".dshwp-preview{height:132px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background-color:var(--dsw-alias-bg-base);background-size:cover;background-position:center;background-repeat:no-repeat;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);}",
      ".dshwp-modal-mask{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:60;display:flex;align-items:center;justify-content:center;padding:16px;}",
      ".dshwp-modal{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:16px;max-width:min(620px,92vw);box-shadow:0 8px 30px rgba(0,0,0,0.35);}",
      ".dshwp-crop-canvas{display:block;touch-action:none;cursor:crosshair;max-width:100%;border-radius:8px;}",
      ".dshwp-note{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;}",
      ".dshwp-error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;}",
      ".dshwp-file-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:10px;max-height:280px;overflow-y:auto;}",
      ".dshwp-file-item{display:flex;flex-direction:column;gap:4px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;padding:8px;cursor:pointer;position:relative;}",
      ".dshwp-file-item:hover{border-color:var(--dsw-alias-state-business-primary);}",
      ".dshwp-file-item.active{border-color:var(--dsw-alias-state-business-primary);}",
      ".dshwp-file-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:12px;}",
      ".dshwp-file-size{color:var(--dsw-alias-label-tertiary);font-size:11px;}",
      ".dshwp-file-thumb{width:100%;height:84px;object-fit:cover;border-radius:6px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);}",
      ".dshwp-file-thumb-empty{display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);font-size:16px;}",
      ".dshwp-del{position:absolute;top:4px;right:4px;width:20px;height:20px;border:none;border-radius:50%;background:rgba(0,0,0,0.55);color:#fff;font-size:12px;line-height:20px;text-align:center;cursor:pointer;padding:0;}"
    ].join("");

    function safeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function safeSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } }

    function dataUrlBytes(dataUrl) {
      var i = dataUrl.indexOf(",");
      if (i === -1) return 0;
      return Math.round((dataUrl.length - i - 1) * 3 / 4);
    }

    function defaultConfig() {
      return {
        mode: "none",            // "none" | "gradient" | "image"
        gradient: GRADIENTS[0].css,
        activeId: null,          // 当前激活图片的 id
        gallery: [],             // [{ id, name, dataUrl, size }]
        blur: 0,
        dim: 0.35,
        opacity: 0.95,           // 默认接近原样
        textMode: "auto",
        textShadow: false,
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
          var c = Object.assign(defaultConfig(), parsed);
          if (!Array.isArray(c.gallery)) c.gallery = [];
          return c;
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

    var inject = ["slots", "theme"];
    var name = "dsh-wallpaper";

    function apply(ctx) {
      var slots = ctx.slots;
      var theme = ctx.theme;

      var cfg = loadConfig();
      var disposeStyle = null;
      var disposeTokens = null;
      var appliedTokenKey = null;

      function activeImage() {
        if (cfg.mode !== "image") return null;
        for (var i = 0; i < cfg.gallery.length; i++) if (cfg.gallery[i].id === cfg.activeId) return cfg.gallery[i];
        return null;
      }

      function backgroundImageValue(c) {
        if (c.mode === "image") { var img = activeImage(); if (img) return 'url("' + img.dataUrl + '")'; }
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
        var ts = c.textMode === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
        var shadowCss = c.textShadow ? "body{text-shadow:0 1px 2px " + ts + ";}" : "";
        return [
          "body{isolation:isolate;}",
          'body::before{content:"";position:fixed;inset:0;z-index:-1;',
          "background-image:" + backgroundImageValue(c) + ";",
          "background-size:" + size + ";background-position:" + pos + ";background-repeat:no-repeat;",
          "filter:blur(" + blur + "px);" + overscan,
          "pointer-events:none;}",
          'body::after{content:"";position:fixed;inset:0;z-index:-1;',
          "background:rgba(0,0,0," + dim + ");pointer-events:none;}",
          shadowCss
        ].join("");
      }

      function buildTokens(c) {
        if (c.mode === "none") return {};
        var op = Math.max(0.25, Math.min(1, Number(c.opacity) || 0.95));
        function alphaOf(kind) {
          if (kind === "base") return Math.max(0.1, op - 0.25);
          if (kind === "input") return Math.min(1, op + 0.1);
          if (kind === "solid") return Math.min(1, op + 0.15);
          return op;
        }
        var tokens = {};
        for (var tn in SURFACE_TOKENS) {
          var t = SURFACE_TOKENS[tn];
          var a = alphaOf(t.kind);
          tokens[tn] = { light: "rgba(" + t.light + "," + a + ")", dark: "rgba(" + t.dark + "," + a + ")" };
        }
        if (c.textMode === "light" || c.textMode === "dark") {
          var cols = TEXT_COLORS[c.textMode];
          for (var ln in cols) {
            var rgb = "rgb(" + cols[ln] + ")";
            tokens[ln] = { light: rgb, dark: rgb };
          }
        }
        return tokens;
      }

      function applyWallpaper(c) {
        if (disposeStyle) { disposeStyle(); disposeStyle = null; }
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

      function galleryTotalBytes() {
        var n = 0;
        for (var i = 0; i < cfg.gallery.length; i++) n += cfg.gallery[i].size || 0;
        return n;
      }

      function addImageToGallery(dataUrl, nm) {
        var img = { id: "img-" + Date.now() + "-" + Math.floor(Math.random() * 10000), name: nm || "图片", dataUrl: dataUrl, size: dataUrlBytes(dataUrl) };
        cfg = Object.assign({}, cfg, { gallery: cfg.gallery.concat([img]) });
        var ok = persist();
        return { img: img, ok: ok };
      }

      function removeImage(id) {
        var gallery = cfg.gallery.filter(function (g) { return g.id !== id; });
        var patch = { gallery: gallery };
        if (cfg.activeId === id) patch.mode = "none";
        commit(patch);
      }

      function activateImage(id) {
        for (var i = 0; i < cfg.gallery.length; i++) if (cfg.gallery[i].id === id) {
          commit({ mode: "image", activeId: id });
          return;
        }
      }

      applyWallpaper(cfg);
      ctx.effect(function () { return injectCss(UI_CSS); });
      ctx.effect(function () {
        return function () {
          if (disposeStyle) { disposeStyle(); disposeStyle = null; }
          if (disposeTokens) { disposeTokens(); disposeTokens = null; }
        };
      });

      // ---- 图片工具 ----
      function downscale(dataUrl, maxDim) {
        return new Promise(function (resolve) {
          var img = new Image();
          img.onload = function () {
            var w = img.naturalWidth, hh = img.naturalHeight;
            var s = Math.min(1, maxDim / Math.max(w, hh));
            if (s >= 1) { resolve(dataUrl); return; }
            var cv = document.createElement("canvas");
            cv.width = Math.round(w * s);
            cv.height = Math.round(hh * s);
            cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
            resolve(cv.toDataURL("image/jpeg", 0.9));
          };
          img.onerror = function () { resolve(dataUrl); };
          img.src = dataUrl;
        });
      }

      // 读取文件：≤ 4MB 保留原图（不压缩），更大才压缩到 2560px。
      function readFileToDataUrl(file) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function () { resolve(String(reader.result)); };
          reader.onerror = function () { reject(new Error("read failed")); };
          reader.readAsDataURL(file);
        }).then(function (dataUrl) {
          if (dataUrlBytes(dataUrl) > KEEP_ORIGINAL_BYTES) return downscale(dataUrl, 2560);
          return dataUrl;
        });
      }

      function makeThumb(dataUrl, maxW) {
        return new Promise(function (resolve, reject) {
          var img = new Image();
          img.onload = function () {
            var w = img.naturalWidth, hh = img.naturalHeight;
            var scale = Math.min(1, maxW / w);
            var cv = document.createElement("canvas");
            cv.width = Math.max(1, Math.round(w * scale));
            cv.height = Math.max(1, Math.round(hh * scale));
            cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
            resolve(cv.toDataURL("image/jpeg", 0.7));
          };
          img.onerror = function () { reject(new Error("decode failed")); };
          img.src = dataUrl;
        });
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
        var bg = backgroundImageValue(c);
        if (bg) style.backgroundImage = bg;
        return style;
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
          props.onApply(out.toDataURL("image/jpeg", 0.92));
        };

        return h("div", { className: "dshwp-modal-mask", onMouseDown: function (e) { if (e.target === e.currentTarget) props.onCancel(); } },
          h("div", { className: "dshwp-modal" },
            h("div", { className: "dshwp-title", style: { marginBottom: 8 } }, "裁剪图片 · 拖拽框选要保留的区域"),
            h("canvas", {
              ref: canvasRef, className: "dshwp-crop-canvas",
              onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerLeave: onUp
            }),
            h("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 } },
              h("button", { className: "dshwp-btn", onClick: props.onCancel }, "取消"),
              h("button", { className: "dshwp-btn dshwp-btn-primary", onClick: applyCrop, disabled: !sel || sel.w < 4 || sel.h < 4 }, "应用裁剪")
            )
          )
        );
      }

      function WallpaperSection() {
        var _s = React.useState(cfg), c = _s[0], setC = _s[1];
        var _s2 = React.useState(false), cropping = _s2[0], setCropping = _s2[1];
        var _s3 = React.useState(null), dirFiles = _s3[0], setDirFiles = _s3[1];
        var _s4 = React.useState({}), thumbs = _s4[0], setThumbs = _s4[1];
        var _s5 = React.useState(false), notice = _s5[0], setNotice = _s5[1];
        var fileRef = React.useRef(null);
        var dirRef = React.useRef(null);
        var thumbBatch = React.useRef(0);

        var commit = function (patch) {
          cfg = Object.assign({}, cfg, patch);
          persist();
          applyWallpaper(cfg);
          setC(cfg);
        };

        var onFile = function (e) {
          var file = e.target.files && e.target.files[0];
          if (!file) return;
          readFileToDataUrl(file).then(function (dataUrl) {
            var r = addImageToGallery(dataUrl, file.name);
            if (r.ok) commit({ mode: "image", activeId: r.img.id });
            else setNotice("存储已满（约 5MB），图片未能保存——请先删除一些旧图片。");
          });
          e.target.value = "";
        };

        var onDir = function (e) {
          var files = e.target.files;
          var imgs = [];
          if (files) {
            for (var i = 0; i < files.length; i++) {
              if (IMG_EXT_RE.test(files[i].name)) imgs.push({ name: files[i].name, size: files[i].size, file: files[i] });
            }
          }
          imgs.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
          setDirFiles(imgs);
          setThumbs({});
          loadThumbsFromFiles(imgs, ++thumbBatch.current).catch(function () {});
          e.target.value = "";
        };

        var loadThumbsFromFiles = async function (files, batch) {
          var queue = files.slice();
          var workerCount = Math.min(4, queue.length);
          async function worker() {
            while (queue.length > 0) {
              if (thumbBatch.current !== batch) return;
              var f = queue.shift();
              setThumbs(function (prev) { var n = Object.assign({}, prev); n[f.name] = { state: "loading" }; return n; });
              try {
                var dataUrl = await readFileToDataUrl(f.file);
                var thumb = await makeThumb(dataUrl, 160);
                if (thumbBatch.current !== batch) return;
                setThumbs(function (prev) { var n = Object.assign({}, prev); n[f.name] = { state: "done", thumb: thumb, full: dataUrl }; return n; });
              } catch (err) {
                setThumbs(function (prev) { var n = Object.assign({}, prev); n[f.name] = { state: "error" }; return n; });
              }
            }
          }
          var workers = [];
          for (var i = 0; i < workerCount; i++) workers.push(worker());
          await Promise.all(workers);
        };

        var applyLocal = function (key) {
          var t = thumbs[key];
          if (t && t.state === "done" && t.full) {
            var r = addImageToGallery(t.full, key);
            if (r.ok) commit({ mode: "image", activeId: r.img.id });
            else setNotice("存储已满（约 5MB），图片未能保存。");
          }
        };

        var onCrop = function (dataUrl) {
          var r = addImageToGallery(dataUrl, "裁剪 " + Date.now());
          if (r.ok) commit({ mode: "image", activeId: r.img.id });
          else setNotice("存储已满（约 5MB），图片未能保存。");
          setCropping(false);
        };

        var total = galleryTotalBytes();

        return h("div", { className: "dshwp-root" },
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, "预览"),
            h("div", { className: "dshwp-preview", style: previewStyle(c) },
              c.mode === "none" ? "当前无壁纸（DSH 原样）" : null)
          ),
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, "预设"),
            h("div", { className: "dshwp-grid" },
              h("button", {
                key: "none",
                className: "dshwp-swatch" + (c.mode === "none" ? " dshwp-active" : ""),
                style: { background: "repeating-conic-gradient(#e5e9f2 0% 25%, #f8fafc 0% 50%) 50%/20px 20px" },
                title: "无壁纸",
                onClick: function () { commit({ mode: "none" }); }
              }, h("span", { className: "dshwp-swatch-label" }, "无壁纸")),
              GRADIENTS.map(function (g) {
                return h("button", {
                  key: g.id,
                  className: "dshwp-swatch" + (c.mode === "gradient" && c.gradient === g.css ? " dshwp-active" : ""),
                  style: { background: g.css },
                  title: g.name,
                  onClick: function () { commit({ mode: "gradient", gradient: g.css }); }
                }, h("span", { className: "dshwp-swatch-label" }, g.name));
              })
            )
          ),
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, "图片库"),
            h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
              h("input", { ref: fileRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: onFile }),
              h("button", { className: "dshwp-btn dshwp-btn-primary", onClick: function () { if (fileRef.current) fileRef.current.click(); } }, "上传图片"),
              c.mode === "image" && activeImage()
                ? h("button", { className: "dshwp-btn", onClick: function () { setCropping(true); } }, "裁剪当前图片")
                : null
            ),
            notice ? h("div", { className: "dshwp-error", style: { marginTop: 8 } }, notice) : null,
            h("div", { className: "dshwp-note", style: { marginTop: 8 } }, "图片保存在浏览器 localStorage（非磁盘文件）。已用 " + fmtSize(total) + " / 约 " + fmtSize(MAX_LOCALSTORAGE) + "。"),
            c.gallery.length === 0
              ? h("div", { className: "dshwp-note", style: { marginTop: 8 } }, "还没有图片——上传一张，或从下方「本地文件夹」选图。")
              : h("div", { className: "dshwp-file-list" },
                  c.gallery.map(function (g) {
                    return h("div", {
                      key: g.id,
                      className: "dshwp-file-item" + (c.mode === "image" && c.activeId === g.id ? " active" : ""),
                      title: "点击设为背景：" + g.name,
                      onClick: function () { activateImage(g.id); setC(cfg); }
                    },
                      h("img", { className: "dshwp-file-thumb", src: g.dataUrl, alt: g.name }),
                      h("span", { className: "dshwp-file-name" }, g.name),
                      h("span", { className: "dshwp-file-size" }, fmtSize(g.size)),
                      h("button", {
                        className: "dshwp-del",
                        title: "删除",
                        onClick: function (ev) { ev.stopPropagation(); removeImage(g.id); setC(cfg); }
                      }, "×")
                    );
                  })
                )
          ),
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, "本地文件夹"),
            h("div", { style: { display: "flex", gap: 8, alignItems: "center" } },
              h("input", { ref: dirRef, type: "file", webkitdirectory: "", multiple: "", style: { display: "none" }, onChange: onDir }),
              h("button", { className: "dshwp-btn dshwp-btn-primary", onClick: function () { if (dirRef.current) dirRef.current.click(); } }, "选择目录")
            ),
            h("div", { className: "dshwp-note", style: { marginTop: 8 } }, "选择一个文件夹，列出其中图片并生成缩略图（Chrome / Edge / Safari 支持），点选加入图片库。"),
            dirFiles && dirFiles.length === 0
              ? h("div", { className: "dshwp-note", style: { marginTop: 8 } }, "该目录下没有找到图片文件。")
              : null,
            dirFiles && dirFiles.length > 0
              ? h("div", { className: "dshwp-file-list" },
                  dirFiles.map(function (f) {
                    var t = thumbs[f.name];
                    return h("div", {
                      key: f.name,
                      className: "dshwp-file-item",
                      title: "点击加入图片库：" + f.name,
                      onClick: function () { applyLocal(f.name); setC(cfg); }
                    },
                      t && t.state === "done"
                        ? h("img", { className: "dshwp-file-thumb", src: t.thumb, alt: f.name })
                        : h("div", { className: "dshwp-file-thumb dshwp-file-thumb-empty" }, t && t.state === "error" ? "×" : "…"),
                      h("span", { className: "dshwp-file-name" }, f.name),
                      h("span", { className: "dshwp-file-size" }, fmtSize(f.size))
                    );
                  })
                )
              : null
          ),
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, "效果"),
            rangeRow("模糊", c.blur, 0, 50, 1, " px", function (v) { commit({ blur: v }); }),
            rangeRow("遮罩", c.dim, 0, 0.9, 0.05, "", function (v) { commit({ dim: v }); }),
            rangeRow("面板不透明度", c.opacity, 0.3, 1, 0.05, "", function (v) { commit({ opacity: v }); })
          ),
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, "文字可读性"),
            h("div", { className: "dshwp-row" },
              h("label", null, "文字颜色"),
              ["auto", "light", "dark"].map(function (m) {
                return h("button", {
                  key: m,
                  className: "dshwp-btn" + (c.textMode === m ? " dshwp-active" : ""),
                  onClick: function () { commit({ textMode: m }); }
                }, m === "auto" ? "自动" : m === "light" ? "浅色" : "深色");
              })
            ),
            h("div", { className: "dshwp-row" },
              h("label", null, "文字阴影"),
              h("button", {
                className: "dshwp-btn" + (c.textShadow ? " dshwp-active" : ""),
                onClick: function () { commit({ textShadow: !c.textShadow }); }
              }, c.textShadow ? "开" : "关")
            ),
            h("div", { className: "dshwp-note" }, "浅色/深色文字覆盖 DSH 字体颜色；「自动」跟随主题。文字阴影增强任意壁纸下的对比度。")
          ),
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, "填充与位置"),
            h("div", { style: { display: "flex", gap: 8, marginBottom: 4 } },
              ["cover", "contain", "stretch"].map(function (f) {
                return h("button", {
                  key: f,
                  className: "dshwp-btn" + (c.fit === f ? " dshwp-active" : ""),
                  onClick: function () { commit({ fit: f }); }
                }, f === "cover" ? "裁切填充" : f === "contain" ? "完整显示" : "拉伸");
              })
            ),
            c.fit !== "stretch" ? rangeRow("水平位置", c.posX, 0, 100, 1, " %", function (v) { commit({ posX: v }); }) : null,
            c.fit !== "stretch" ? rangeRow("垂直位置", c.posY, 0, 100, 1, " %", function (v) { commit({ posY: v }); }) : null
          ),
          cropping && activeImage()
            ? h(CropModal, {
                src: activeImage().dataUrl,
                onApply: onCrop,
                onCancel: function () { setCropping(false); }
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

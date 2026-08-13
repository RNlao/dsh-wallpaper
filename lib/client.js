// ============================================================================
// dsh-wallpaper · 客户端半 (browser half) —— 静态插件格式
// ----------------------------------------------------------------------------
// 这是 DSH 静态客户端插件 bundle：被 Node 侧扫描后通过 /plugins/<id>/client.js
// 提供给浏览器，浏览器加载本脚本即注册 factory，运行时物化后得到 Cordis 插件。
// 纯客户端实现（无需 host 半做事）：渐变、上传图片、webkitdirectory 选目录、
// 裁剪、模糊、遮罩、面板半透明、位置，配置持久化到 localStorage。
// ============================================================================
window.__ModuleLoader__.load({
  id: "dsh-wallpaper",
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");

    var STORAGE_KEY = "dsh-wallpaper:v1";

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

    // 半透明面板所需的底色通道（与 design-platform.css 的 --dsw-static-* 一致）。
    var THEME_PALETTES = {
      light: { base: "255,255,255", layer1: "255,255,255", layer2: "255,255,255", layer3: "255,255,255", sidebar: "249,250,251" },
      dark: { base: "21,21,23", layer1: "35,35,36", layer2: "44,44,46", layer3: "53,54,56", sidebar: "27,27,28" }
    };

    var IMG_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|avif|svg)$/i;

    var UI_CSS = [
      ".dshwp-root{font-size:13px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:14px;max-width:680px;padding:2px 0 28px;}",
      ".dshwp-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:14px 16px;}",
      ".dshwp-title{font-size:14px;font-weight:600;margin:0 0 10px;color:var(--dsw-alias-label-primary);}",
      ".dshwp-row{display:flex;align-items:center;gap:10px;margin:8px 0;}",
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
      ".dshwp-preview{height:132px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background-color:var(--dsw-alias-bg-base);background-size:cover;background-position:center;background-repeat:no-repeat;}",
      ".dshwp-modal-mask{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:60;display:flex;align-items:center;justify-content:center;padding:16px;}",
      ".dshwp-modal{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:16px;max-width:min(620px,92vw);box-shadow:0 8px 30px rgba(0,0,0,0.35);}",
      ".dshwp-crop-canvas{display:block;touch-action:none;cursor:crosshair;max-width:100%;border-radius:8px;}",
      ".dshwp-note{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;}",
      ".dshwp-error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;}",
      ".dshwp-file-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:10px;max-height:280px;overflow-y:auto;}",
      ".dshwp-file-item{display:flex;flex-direction:column;gap:4px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;padding:8px;cursor:pointer;}",
      ".dshwp-file-item:hover{border-color:var(--dsw-alias-state-business-primary);}",
      ".dshwp-file-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:12px;}",
      ".dshwp-file-size{color:var(--dsw-alias-label-tertiary);font-size:11px;}",
      ".dshwp-file-thumb{width:100%;height:84px;object-fit:cover;border-radius:6px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);}",
      ".dshwp-file-thumb-empty{display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);font-size:16px;}"
    ].join("");

    function safeGet(key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function safeSet(key, value) {
      try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
    }

    function defaultConfig() {
      return {
        type: "gradient",
        gradient: GRADIENTS[0].css,
        url: null,
        blur: 0,
        dim: 0.35,
        opacity: 0.85,
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

    // 注入一段 CSS，返回「移除该 style 标签」的 disposer。
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
      // 硬依赖（inject 声明）保证 slots/theme 服务就绪后才 activate；不要用
      // ctx.get 做可选查找——immediately 加载时服务可能尚未就绪，会静默跳过注册。
      var slots = ctx.slots;
      var theme = ctx.theme;

      var cfg = loadConfig();
      var disposeStyle = null;
      var disposeTokens = null;
      var appliedOpacity = null;

      function backgroundImageValue(c) {
        if (c.type === "image" && c.url) return 'url("' + c.url + '")';
        return c.gradient || GRADIENTS[0].css;
      }
      function buildCss(c) {
        var size = c.fit === "stretch" ? "100% 100%" : (c.fit || "cover");
        var pos = (c.posX != null ? c.posX : 50) + "% " + (c.posY != null ? c.posY : 50) + "%";
        var blur = Number(c.blur) || 0;
        var overscan = blur > 0 ? "transform:scale(1.06);" : "";
        var dim = Math.max(0, Math.min(0.9, Number(c.dim) || 0));
        return [
          "body{isolation:isolate;}",
          'body::before{content:"";position:fixed;inset:0;z-index:-1;',
          "background-image:" + backgroundImageValue(c) + ";",
          "background-size:" + size + ";background-position:" + pos + ";background-repeat:no-repeat;",
          "filter:blur(" + blur + "px);" + overscan,
          "pointer-events:none;}",
          'body::after{content:"";position:fixed;inset:0;z-index:-1;',
          "background:rgba(0,0,0," + dim + ");pointer-events:none;}"
        ].join("");
      }

      function buildTokens(c) {
        var a = Math.max(0.25, Math.min(1, Number(c.opacity) || 0.85));
        var base = Math.max(0.1, a - 0.2);
        var P = THEME_PALETTES;
        return {
          "--dsw-alias-bg-base": { light: "rgba(" + P.light.base + "," + base + ")", dark: "rgba(" + P.dark.base + "," + base + ")" },
          "--dsw-alias-bg-layer-1": { light: "rgba(" + P.light.layer1 + "," + a + ")", dark: "rgba(" + P.dark.layer1 + "," + a + ")" },
          "--dsw-alias-bg-layer-2": { light: "rgba(" + P.light.layer2 + "," + a + ")", dark: "rgba(" + P.dark.layer2 + "," + a + ")" },
          "--dsw-alias-bg-layer-3": { light: "rgba(" + P.light.layer3 + "," + a + ")", dark: "rgba(" + P.dark.layer3 + "," + a + ")" },
          "--dsw-specific-sidebar-fill": { light: "rgba(" + P.light.sidebar + "," + a + ")", dark: "rgba(" + P.dark.sidebar + "," + a + ")" }
        };
      }

      function applyWallpaper(c) {
        if (disposeStyle) { disposeStyle(); disposeStyle = null; }
        disposeStyle = injectCss(buildCss(c));
        if (theme && c.opacity !== appliedOpacity) {
          appliedOpacity = c.opacity;
          if (disposeTokens) { disposeTokens(); disposeTokens = null; }
          disposeTokens = theme.overrideTokens("dsh-wallpaper", buildTokens(c));
        }
      }

      function update(patch) {
        cfg = Object.assign({}, cfg, patch);
        safeSet(STORAGE_KEY, JSON.stringify(cfg));
        applyWallpaper(cfg);
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

      function readFileToDataUrl(file) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function () { resolve(String(reader.result)); };
          reader.onerror = function () { reject(new Error("read failed")); };
          reader.readAsDataURL(file);
        }).then(function (dataUrl) { return downscale(dataUrl, 1920); });
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
            resolve(cv.toDataURL("image/jpeg", 0.72));
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

      function previewStyle(c) {
        var style = {
          backgroundSize: c.fit === "stretch" ? "100% 100%" : (c.fit || "cover"),
          backgroundPosition: (c.posX != null ? c.posX : 50) + "% " + (c.posY != null ? c.posY : 50) + "%",
          backgroundRepeat: "no-repeat"
        };
        if (c.type === "image" && c.url) style.backgroundImage = 'url("' + c.url + '")';
        else style.background = c.gradient || GRADIENTS[0].css;
        return style;
      }

      function CropModal(props) {
        var canvasRef = React.useRef(null);
        var dragRef = React.useRef(null);
        var _useState = React.useState(null), img = _useState[0], setImg = _useState[1];
        var _useState2 = React.useState(null), sel = _useState2[0], setSel = _useState2[1];
        var _useState3 = React.useState(1), scale = _useState3[0], setScale = _useState3[1];

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
        var fileRef = React.useRef(null);
        var dirRef = React.useRef(null);
        var thumbBatch = React.useRef(0);

        var commit = function (patch) {
          var next = Object.assign({}, c, patch);
          setC(next);
          update(next);
        };

        var onFile = function (e) {
          var file = e.target.files && e.target.files[0];
          if (!file) return;
          readFileToDataUrl(file).then(function (dataUrl) {
            commit({ type: "image", url: dataUrl, fit: "cover", posX: 50, posY: 50 });
          });
          e.target.value = "";
        };

        // webkitdirectory 选目录：遍历 FileList，筛选图片，逐张生成缩略图。
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
          loadThumbsFromFiles(imgs, ++thumbBatch.current).catch(function () { /* 单张失败已在缩略图位体现 */ });
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
            commit({ type: "image", url: t.full, fit: "cover", posX: 50, posY: 50 });
          }
        };

        var fmtSize = function (n) {
          if (n == null || n <= 0) return "";
          if (n < 1024) return n + " B";
          if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
          return (n / 1048576).toFixed(1) + " MB";
        };

        return h("div", { className: "dshwp-root" },
          // 预览
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, "预览"),
            h("div", { className: "dshwp-preview", style: previewStyle(c) })
          ),
          // 预设
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, "预设"),
            h("div", { className: "dshwp-grid" },
              GRADIENTS.map(function (g) {
                return h("button", {
                  key: g.id,
                  className: "dshwp-swatch" + (c.type === "gradient" && c.gradient === g.css ? " dshwp-active" : ""),
                  style: { background: g.css },
                  title: g.name,
                  onClick: function () { commit({ type: "gradient", gradient: g.css }); }
                }, h("span", { className: "dshwp-swatch-label" }, g.name));
              })
            )
          ),
          // 图片
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, "图片"),
            h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
              h("input", { ref: fileRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: onFile }),
              h("button", { className: "dshwp-btn dshwp-btn-primary", onClick: function () { if (fileRef.current) fileRef.current.click(); } }, "上传图片"),
              c.type === "image" && c.url
                ? h("button", { className: "dshwp-btn", onClick: function () { setCropping(true); } }, "裁剪当前图片")
                : null,
              c.type === "image"
                ? h("button", { className: "dshwp-btn", onClick: function () { commit({ type: "gradient" }); } }, "移除图片")
                : null
            )
          ),
          // 本地文件夹（webkitdirectory，纯浏览器）
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, "本地文件夹"),
            h("div", { style: { display: "flex", gap: 8, alignItems: "center" } },
              h("input", { ref: dirRef, type: "file", webkitdirectory: "", multiple: "", style: { display: "none" }, onChange: onDir }),
              h("button", { className: "dshwp-btn dshwp-btn-primary", onClick: function () { if (dirRef.current) dirRef.current.click(); } }, "选择目录")
            ),
            h("div", { className: "dshwp-note", style: { marginTop: 8 } }, "选择一个文件夹，自动列出其中图片并生成缩略图（Chrome / Edge / Safari 支持）。"),
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
                      title: "点击设为背景：" + f.name,
                      onClick: function () { applyLocal(f.name); }
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
          // 效果
          h("section", { className: "dshwp-card" },
            h("div", { className: "dshwp-title" }, "效果"),
            rangeRow("模糊", c.blur, 0, 50, 1, " px", function (v) { commit({ blur: v }); }),
            rangeRow("遮罩", c.dim, 0, 0.9, 0.05, "", function (v) { commit({ dim: v }); }),
            rangeRow("面板不透明度", c.opacity, 0.3, 1, 0.05, "", function (v) { commit({ opacity: v }); })
          ),
          // 填充与位置
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
          cropping && c.url
            ? h(CropModal, {
                src: c.url,
                onApply: function (dataUrl) {
                  commit({ type: "image", url: dataUrl, fit: "cover", posX: 50, posY: 50 });
                  setCropping(false);
                },
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

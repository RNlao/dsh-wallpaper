// ============================================================================
// dsh-wallpaper · 客户端半 (browser half)
// ----------------------------------------------------------------------------
// 这是「动态 Cordis 插件」的 code.client 源码：一段 async 函数体，必须 return
// 一个插件对象 { apply(ctx) {...} }。运行环境：纯 JavaScript，禁止 import /
// require / JSX / TypeScript。可用的闭包符号：React、console、styles、host。
// document / localStorage / FileReader / Image 等浏览器全局可直接使用。
//
// 本文件的内容原样填入 cordis_define 的 code.client 字段即可（见 README.md）。
// ============================================================================

const STORAGE_KEY = 'dsh-wallpaper:v1';

const GRADIENTS = [
  { id: 'aurora', name: '极光 Aurora', css: 'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)' },
  { id: 'sunset', name: '日落 Sunset', css: 'linear-gradient(135deg,#f6d365 0%,#fda085 100%)' },
  { id: 'ocean', name: '海洋 Ocean', css: 'linear-gradient(135deg,#2193b0 0%,#6dd5ed 100%)' },
  { id: 'forest', name: '森林 Forest', css: 'linear-gradient(135deg,#134e5e 0%,#71b280 100%)' },
  { id: 'night', name: '暗夜 Night', css: 'linear-gradient(135deg,#141e30 0%,#243b55 100%)' },
  { id: 'rose', name: '玫瑰 Rose', css: 'linear-gradient(135deg,#ee9ca7 0%,#ffdde1 100%)' },
  { id: 'violet', name: '暮紫 Violet', css: 'linear-gradient(135deg,#4568dc 0%,#b06ab3 100%)' },
  { id: 'ember', name: '余烬 Ember', css: 'linear-gradient(135deg,#3a1c71 0%,#d76d77 50%,#ffaf7b 100%)' },
];

// 半透明面板所需的底色通道（与 design-platform.css 的 --dsw-static-* 一致）。
const THEME_PALETTES = {
  light: { base: '255,255,255', layer1: '255,255,255', layer2: '255,255,255', layer3: '255,255,255', sidebar: '249,250,251' },
  dark: { base: '21,21,23', layer1: '35,35,36', layer2: '44,44,46', layer3: '53,54,56', sidebar: '27,27,28' },
};

const UI_CSS = [
  '.dshwp-root{font-size:13px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:14px;max-width:680px;padding:2px 0 28px;}',
  '.dshwp-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:14px 16px;}',
  '.dshwp-title{font-size:14px;font-weight:600;margin:0 0 10px;color:var(--dsw-alias-label-primary);}',
  '.dshwp-row{display:flex;align-items:center;gap:10px;margin:8px 0;}',
  '.dshwp-row label{flex:0 0 120px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}',
  '.dshwp-row input[type=range]{flex:1;min-width:0;}',
  '.dshwp-val{flex:0 0 46px;text-align:right;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;}',
  '.dshwp-btn{appearance:none;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-ghost-fill,transparent);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 12px;font-size:12px;line-height:18px;}',
  '.dshwp-btn:hover{background:var(--dsw-alias-interactive-bg-hover);}',
  '.dshwp-btn:disabled{opacity:0.45;cursor:not-allowed;}',
  '.dshwp-btn-primary{background:var(--dsw-alias-state-business-primary);border-color:transparent;color:#fff;}',
  '.dshwp-btn-primary:hover{filter:brightness(1.06);}',
  '.dshwp-active{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px;}',
  '.dshwp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(124px,1fr));gap:10px;}',
  '.dshwp-swatch{position:relative;height:64px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);cursor:pointer;padding:0;overflow:hidden;background-size:cover;background-position:center;}',
  '.dshwp-swatch-label{position:absolute;left:0;right:0;bottom:0;padding:3px 8px;font-size:11px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,0.55));text-align:left;}',
  '.dshwp-preview{height:132px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background-color:var(--dsw-alias-bg-base);background-size:cover;background-position:center;background-repeat:no-repeat;}',
  '.dshwp-modal-mask{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:60;display:flex;align-items:center;justify-content:center;padding:16px;}',
  '.dshwp-modal{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:16px;max-width:min(620px,92vw);box-shadow:0 8px 30px rgba(0,0,0,0.35);}',
  '.dshwp-crop-canvas{display:block;touch-action:none;cursor:crosshair;max-width:100%;border-radius:8px;}',
  '.dshwp-input{flex:1;min-width:0;appearance:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:8px;padding:6px 10px;font-size:12px;line-height:18px;}',
  '.dshwp-input:focus{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-1px;}',
  '.dshwp-note{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;}',
  '.dshwp-error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;}',
  '.dshwp-file-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:10px;max-height:280px;overflow-y:auto;}',
  '.dshwp-file-item{display:flex;flex-direction:column;gap:4px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;padding:8px;}',
  '.dshwp-file-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:12px;}',
  '.dshwp-file-size{color:var(--dsw-alias-label-tertiary);font-size:11px;}',
  '.dshwp-file-thumb{width:100%;height:84px;object-fit:cover;border-radius:6px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);}',
  '.dshwp-file-thumb-empty{display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);font-size:16px;}',
  '.dshwp-file-item{cursor:pointer;}',
  '.dshwp-file-item:hover{border-color:var(--dsw-alias-state-business-primary);}',
].join('');

function safeGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
}

function defaultConfig() {
  return {
    type: 'gradient',   // 'gradient' | 'image'
    gradient: GRADIENTS[0].css,
    url: null,          // 图片 data URL
    blur: 0,            // 0..50 px
    dim: 0.35,          // 0..0.9 暗色遮罩
    opacity: 0.85,      // 面板不透明度 0.3..1
    fit: 'cover',       // 'cover' | 'contain' | 'stretch'
    posX: 50,           // 0..100
    posY: 50,           // 0..100
  };
}

function loadConfig() {
  const raw = safeGet(STORAGE_KEY);
  if (!raw) return defaultConfig();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return Object.assign(defaultConfig(), parsed);
  } catch (e) { /* 忽略损坏的配置 */ }
  return defaultConfig();
}

return {
  name: 'dsh-wallpaper',
  apply(ctx) {
    const slots = ctx.get('slots');
    const theme = ctx.get('theme');

    let cfg = loadConfig();
    let disposeStyle = null;
    let appliedOpacity = null;

    // ---- 背景层 CSS（image / gradient + 裁切位置 + 模糊 + 遮罩）----
    function backgroundImageValue(c) {
      if (c.type === 'image' && c.url) return 'url("' + c.url + '")';
      return c.gradient || GRADIENTS[0].css;
    }
    function buildCss(c) {
      const size = c.fit === 'stretch' ? '100% 100%' : (c.fit || 'cover');
      const pos = (c.posX != null ? c.posX : 50) + '% ' + (c.posY != null ? c.posY : 50) + '%';
      const blur = Number(c.blur) || 0;
      const overscan = blur > 0 ? 'transform:scale(1.06);' : '';
      const dim = Math.max(0, Math.min(0.9, Number(c.dim) || 0));
      return [
        // 让 body 建立独立层叠上下文：负 z-index 的伪元素才会留在 body 自身背景之上、
        // 应用内容之下，而不是掉到 body 背景后面被遮住。
        'body{isolation:isolate;}',
        'body::before{content:"";position:fixed;inset:0;z-index:-1;',
        'background-image:' + backgroundImageValue(c) + ';',
        'background-size:' + size + ';background-position:' + pos + ';background-repeat:no-repeat;',
        'filter:blur(' + blur + 'px);' + overscan,
        'pointer-events:none;}',
        'body::after{content:"";position:fixed;inset:0;z-index:-1;',
        'background:rgba(0,0,0,' + dim + ');pointer-events:none;}',
      ].join('');
    }

    // ---- 面板半透明 token 覆盖（只随 opacity 变化重建）----
    function buildTokens(c) {
      const a = Math.max(0.25, Math.min(1, Number(c.opacity) || 0.85));
      const base = Math.max(0.1, a - 0.2);
      const P = THEME_PALETTES;
      return {
        '--dsw-alias-bg-base': { light: 'rgba(' + P.light.base + ',' + base + ')', dark: 'rgba(' + P.dark.base + ',' + base + ')' },
        '--dsw-alias-bg-layer-1': { light: 'rgba(' + P.light.layer1 + ',' + a + ')', dark: 'rgba(' + P.dark.layer1 + ',' + a + ')' },
        '--dsw-alias-bg-layer-2': { light: 'rgba(' + P.light.layer2 + ',' + a + ')', dark: 'rgba(' + P.dark.layer2 + ',' + a + ')' },
        '--dsw-alias-bg-layer-3': { light: 'rgba(' + P.light.layer3 + ',' + a + ')', dark: 'rgba(' + P.dark.layer3 + ',' + a + ')' },
        '--dsw-specific-sidebar-fill': { light: 'rgba(' + P.light.sidebar + ',' + a + ')', dark: 'rgba(' + P.dark.sidebar + ',' + a + ')' },
      };
    }

    function applyWallpaper(c) {
      if (disposeStyle) { disposeStyle(); disposeStyle = null; }
      disposeStyle = styles.insert(buildCss(c));
      if (theme && c.opacity !== appliedOpacity) {
        appliedOpacity = c.opacity;
        theme.overrideTokens('panel', buildTokens(c));
      }
    }

    function update(patch) {
      cfg = Object.assign({}, cfg, patch);
      safeSet(STORAGE_KEY, JSON.stringify(cfg));
      applyWallpaper(cfg);
    }

    // 初始应用 + UI 样式表（UI 样式随插件卸载自动清理）
    applyWallpaper(cfg);
    styles.insert(UI_CSS);

    // ======================= 图片工具 =======================
    function downscale(dataUrl, maxDim) {
      return new Promise(function (resolve) {
        const img = new Image();
        img.onload = function () {
          const w = img.naturalWidth, hh = img.naturalHeight;
          const s = Math.min(1, maxDim / Math.max(w, hh));
          if (s >= 1) { resolve(dataUrl); return; }
          const cv = document.createElement('canvas');
          cv.width = Math.round(w * s);
          cv.height = Math.round(hh * s);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          resolve(cv.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = function () { resolve(dataUrl); };
        img.src = dataUrl;
      });
    }

    function readImage(file) {
      return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () { resolve(String(reader.result)); };
        reader.onerror = function () { reject(new Error('read failed')); };
        reader.readAsDataURL(file);
      }).then(function (dataUrl) { return downscale(dataUrl, 1920); });
    }

    // 用 canvas 把一张 data URL 压成宽 maxW 的 JPEG 缩略图（用于本地文件夹预览）。
    function makeThumb(dataUrl, maxW) {
      return new Promise(function (resolve, reject) {
        const img = new Image();
        img.onload = function () {
          const w = img.naturalWidth, hh = img.naturalHeight;
          const scale = Math.min(1, maxW / w);
          const cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(w * scale));
          cv.height = Math.max(1, Math.round(hh * scale));
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          resolve(cv.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = function () { reject(new Error('decode failed')); };
        img.src = dataUrl;
      });
    }

    // ======================= React 组件 =======================
    const h = React.createElement;

    function rangeRow(label, value, min, max, step, unit, onChange) {
      return h('div', { className: 'dshwp-row' },
        h('label', null, label),
        h('input', { type: 'range', min: min, max: max, step: step, value: value, onChange: function (e) { onChange(Number(e.target.value)); } }),
        h('span', { className: 'dshwp-val' }, String(value) + unit)
      );
    }

    function previewStyle(c) {
      const style = {
        backgroundSize: c.fit === 'stretch' ? '100% 100%' : (c.fit || 'cover'),
        backgroundPosition: (c.posX != null ? c.posX : 50) + '% ' + (c.posY != null ? c.posY : 50) + '%',
        backgroundRepeat: 'no-repeat',
      };
      if (c.type === 'image' && c.url) style.backgroundImage = 'url("' + c.url + '")';
      else style.background = c.gradient || GRADIENTS[0].css;
      return style;
    }

    function CropModal(props) {
      const canvasRef = React.useRef(null);
      const dragRef = React.useRef(null);
      const [img, setImg] = React.useState(null);
      const [sel, setSel] = React.useState(null);
      const [scale, setScale] = React.useState(1);

      React.useEffect(function () {
        const image = new Image();
        image.onload = function () { setImg(image); };
        image.onerror = function () { props.onCancel(); };
        image.src = props.src;
      }, [props.src]);

      React.useEffect(function () {
        const cv = canvasRef.current;
        if (!cv || !img) return;
        const maxW = 560, maxH = 360;
        const s = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
        cv.width = Math.round(img.naturalWidth * s);
        cv.height = Math.round(img.naturalHeight * s);
        setScale(s);
        const g = cv.getContext('2d');
        g.clearRect(0, 0, cv.width, cv.height);
        g.drawImage(img, 0, 0, cv.width, cv.height);
        if (sel) {
          const r = sel;
          g.fillStyle = 'rgba(0,0,0,0.55)';
          g.fillRect(0, 0, cv.width, r.y);
          g.fillRect(0, r.y + r.h, cv.width, cv.height - r.y - r.h);
          g.fillRect(0, r.y, r.x, r.h);
          g.fillRect(r.x + r.w, r.y, cv.width - r.x - r.w, r.h);
          g.strokeStyle = '#ffffff';
          g.lineWidth = 2;
          g.strokeRect(r.x, r.y, r.w, r.h);
        }
      }, [img, sel]);

      const clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
      const pointerPos = function (e) {
        const r = canvasRef.current.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      const onDown = function (e) {
        const cv = canvasRef.current;
        const p = pointerPos(e);
        const x0 = clamp(p.x, 0, cv.width);
        const y0 = clamp(p.y, 0, cv.height);
        dragRef.current = { x0: x0, y0: y0 };
        setSel({ x: x0, y: y0, w: 0, h: 0 });
      };
      const onMove = function (e) {
        if (!dragRef.current) return;
        const cv = canvasRef.current;
        const p = pointerPos(e);
        const x = clamp(p.x, 0, cv.width);
        const y = clamp(p.y, 0, cv.height);
        const d = dragRef.current;
        setSel({ x: Math.min(d.x0, x), y: Math.min(d.y0, y), w: Math.abs(x - d.x0), h: Math.abs(y - d.y0) });
      };
      const onUp = function () { dragRef.current = null; };

      const applyCrop = function () {
        if (!img || !sel || sel.w < 4 || sel.h < 4) return;
        const out = document.createElement('canvas');
        const sw = sel.w / scale, sh = sel.h / scale;
        out.width = Math.max(1, Math.round(sw));
        out.height = Math.max(1, Math.round(sh));
        out.getContext('2d').drawImage(img, sel.x / scale, sel.y / scale, sw, sh, 0, 0, out.width, out.height);
        props.onApply(out.toDataURL('image/jpeg', 0.92));
      };

      return h('div', { className: 'dshwp-modal-mask', onMouseDown: function (e) { if (e.target === e.currentTarget) props.onCancel(); } },
        h('div', { className: 'dshwp-modal' },
          h('div', { className: 'dshwp-title', style: { marginBottom: 8 } }, '裁剪图片 · 拖拽框选要保留的区域'),
          h('canvas', {
            ref: canvasRef, className: 'dshwp-crop-canvas',
            onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerLeave: onUp,
          }),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 } },
            h('button', { className: 'dshwp-btn', onClick: props.onCancel }, '取消'),
            h('button', { className: 'dshwp-btn dshwp-btn-primary', onClick: applyCrop, disabled: !sel || sel.w < 4 || sel.h < 4 }, '应用裁剪')
          )
        )
      );
    }

    function WallpaperSection() {
      const [c, setC] = React.useState(cfg);
      const [cropping, setCropping] = React.useState(false);
      const [dirPath, setDirPath] = React.useState('');
      const [dirFiles, setDirFiles] = React.useState(null);
      const [dirError, setDirError] = React.useState(null);
      const [dirBusy, setDirBusy] = React.useState(false);
      const [thumbs, setThumbs] = React.useState({});   // path -> { state, thumb?, full? }
      const fileRef = React.useRef(null);
      const thumbBatch = React.useRef(0);

      const commit = function (patch) {
        const next = Object.assign({}, c, patch);
        setC(next);
        update(next);
      };

      const onFile = function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        readImage(file).then(function (dataUrl) {
          commit({ type: 'image', url: dataUrl, fit: 'cover', posX: 50, posY: 50 });
        });
        e.target.value = '';
      };

      const browseDir = function () {
        const p = (dirPath || '').trim();
        if (!p) { setDirError('请输入一个目录的绝对路径，例如 /Users/you/Pictures'); return; }
        setDirBusy(true);
        setDirError(null);
        host.call('listDir', { path: p }).then(function (res) {
          setDirBusy(false);
          if (res && res.ok) {
            const files = res.files || [];
            setDirFiles(files);
            setThumbs({});
            loadThumbs(files, ++thumbBatch.current).catch(function () { /* 单张失败已在缩略图位体现 */ });
          } else {
            setDirError((res && res.error) || '读取目录失败');
          }
        }).catch(function (err) {
          setDirBusy(false);
          setDirError('无法访问 host 半：请确认已同时定义并运行 code.host。' + (err && err.message ? '（' + err.message + '）' : ''));
        });
      };

      // 并发受限地逐个加载缩略图：readImage 读完整图 -> canvas 压成 160px 缩略图，
      // 同时缓存完整 data URL，点击时零延迟直接设为背景。
      const loadThumbs = async function (files, batch) {
        const queue = files.slice();
        const workerCount = Math.min(4, queue.length);
        async function worker() {
          while (queue.length > 0) {
            if (thumbBatch.current !== batch) return;
            const f = queue.shift();
            setThumbs(function (prev) { const n = Object.assign({}, prev); n[f.path] = { state: 'loading' }; return n; });
            try {
              const res = await host.call('readImage', { path: f.path });
              if (!res || !res.ok || !res.dataUrl) throw new Error((res && res.error) || 'read failed');
              const thumb = await makeThumb(res.dataUrl, 160);
              if (thumbBatch.current !== batch) return;
              setThumbs(function (prev) { const n = Object.assign({}, prev); n[f.path] = { state: 'done', thumb: thumb, full: res.dataUrl }; return n; });
            } catch (err) {
              setThumbs(function (prev) { const n = Object.assign({}, prev); n[f.path] = { state: 'error' }; return n; });
            }
          }
        }
        const workers = [];
        for (let i = 0; i < workerCount; i++) workers.push(worker());
        await Promise.all(workers);
      };

      // 优先用缩略图阶段缓存的完整图；未缓存则回退到即时读取。
      const applyLocal = function (path) {
        const t = thumbs[path];
        if (t && t.state === 'done' && t.full) {
          commit({ type: 'image', url: t.full, fit: 'cover', posX: 50, posY: 50 });
          return;
        }
        pickLocal(path);
      };

      const pickLocal = function (path) {
        setDirBusy(true);
        setDirError(null);
        host.call('readImage', { path: path }).then(function (res) {
          setDirBusy(false);
          if (res && res.ok && res.dataUrl) {
            commit({ type: 'image', url: res.dataUrl, fit: 'cover', posX: 50, posY: 50 });
          } else {
            setDirError((res && res.error) || '读取图片失败');
          }
        }).catch(function (err) {
          setDirBusy(false);
          setDirError('读取图片失败：' + (err && err.message ? err.message : String(err)));
        });
      };

      const fmtSize = function (n) {
        if (n == null || n <= 0) return '';
        if (n < 1024) return n + ' B';
        if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
        return (n / 1048576).toFixed(1) + ' MB';
      };

      return h('div', { className: 'dshwp-root' },
        // 预览
        h('section', { className: 'dshwp-card' },
          h('div', { className: 'dshwp-title' }, '预览'),
          h('div', { className: 'dshwp-preview', style: previewStyle(c) })
        ),
        // 预设
        h('section', { className: 'dshwp-card' },
          h('div', { className: 'dshwp-title' }, '预设'),
          h('div', { className: 'dshwp-grid' },
            GRADIENTS.map(function (g) {
              return h('button', {
                key: g.id,
                className: 'dshwp-swatch' + (c.type === 'gradient' && c.gradient === g.css ? ' dshwp-active' : ''),
                style: { background: g.css },
                title: g.name,
                onClick: function () { commit({ type: 'gradient', gradient: g.css }); },
              }, h('span', { className: 'dshwp-swatch-label' }, g.name));
            })
          )
        ),
        // 图片
        h('section', { className: 'dshwp-card' },
          h('div', { className: 'dshwp-title' }, '图片'),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            h('input', { ref: fileRef, type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: onFile }),
            h('button', { className: 'dshwp-btn dshwp-btn-primary', onClick: function () { if (fileRef.current) fileRef.current.click(); } }, '上传图片'),
            c.type === 'image' && c.url
              ? h('button', { className: 'dshwp-btn', onClick: function () { setCropping(true); } }, '裁剪当前图片')
              : null,
            c.type === 'image'
              ? h('button', { className: 'dshwp-btn', onClick: function () { commit({ type: 'gradient' }); } }, '移除图片')
              : null
          )
        ),
        // 本地文件夹（需要 code.host）
        h('section', { className: 'dshwp-card' },
          h('div', { className: 'dshwp-title' }, '本地文件夹'),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('input', {
              className: 'dshwp-input',
              placeholder: '绝对路径，例如 /Users/you/Pictures',
              value: dirPath,
              onChange: function (e) { setDirPath(e.target.value); },
              onKeyDown: function (e) { if (e.key === 'Enter') browseDir(); },
            }),
            h('button', { className: 'dshwp-btn dshwp-btn-primary', onClick: browseDir, disabled: dirBusy }, dirBusy ? '读取中…' : '浏览')
          ),
          dirError ? h('div', { className: 'dshwp-error', style: { marginTop: 8 } }, dirError) : null,
          dirFiles && dirFiles.length === 0
            ? h('div', { className: 'dshwp-note', style: { marginTop: 8 } }, '该目录下没有找到图片文件。')
            : null,
          dirFiles && dirFiles.length > 0
            ? h('div', { className: 'dshwp-file-list' },
                dirFiles.map(function (f) {
                  const t = thumbs[f.path];
                  return h('div', {
                    key: f.path,
                    className: 'dshwp-file-item',
                    title: '点击设为背景：' + f.name,
                    onClick: function () { applyLocal(f.path); },
                  },
                    t && t.state === 'done'
                      ? h('img', { className: 'dshwp-file-thumb', src: t.thumb, alt: f.name })
                      : h('div', { className: 'dshwp-file-thumb dshwp-file-thumb-empty' }, t && t.state === 'error' ? '×' : '…'),
                    h('span', { className: 'dshwp-file-name' }, f.name),
                    h('span', { className: 'dshwp-file-size' }, fmtSize(f.size)),
                    h('button', {
                      className: 'dshwp-btn',
                      onClick: function (e) { e.stopPropagation(); applyLocal(f.path); },
                    }, '设为背景')
                  );
                })
              )
            : null
        ),
        // 效果
        h('section', { className: 'dshwp-card' },
          h('div', { className: 'dshwp-title' }, '效果'),
          rangeRow('模糊', c.blur, 0, 50, 1, ' px', function (v) { commit({ blur: v }); }),
          rangeRow('遮罩', c.dim, 0, 0.9, 0.05, '', function (v) { commit({ dim: v }); }),
          rangeRow('面板不透明度', c.opacity, 0.3, 1, 0.05, '', function (v) { commit({ opacity: v }); })
        ),
        // 填充与位置
        h('section', { className: 'dshwp-card' },
          h('div', { className: 'dshwp-title' }, '填充与位置'),
          h('div', { style: { display: 'flex', gap: 8, marginBottom: 4 } },
            ['cover', 'contain', 'stretch'].map(function (f) {
              return h('button', {
                key: f,
                className: 'dshwp-btn' + (c.fit === f ? ' dshwp-active' : ''),
                onClick: function () { commit({ fit: f }); },
              }, f === 'cover' ? '裁切填充' : f === 'contain' ? '完整显示' : '拉伸');
            })
          ),
          c.fit !== 'stretch' ? rangeRow('水平位置', c.posX, 0, 100, 1, ' %', function (v) { commit({ posX: v }); }) : null,
          c.fit !== 'stretch' ? rangeRow('垂直位置', c.posY, 0, 100, 1, ' %', function (v) { commit({ posY: v }); }) : null
        ),
        // 裁剪弹窗
        cropping && c.url
          ? h(CropModal, {
              src: c.url,
              onApply: function (dataUrl) {
                commit({ type: 'image', url: dataUrl, fit: 'cover', posX: 50, posY: 50 });
                setCropping(false);
              },
              onCancel: function () { setCropping(false); },
            })
          : null
      );
    }

    // 注册「设置 → 壁纸」页面（等待声明后注册，卸载自动清理）
    if (slots) {
      slots.inject('settings.section', function () {
        return slots.register(
          { name: 'settings.section', id: 'wallpaper', order: 300, label: '壁纸 / Wallpaper' },
          WallpaperSection
        );
      });
    }
  }
};

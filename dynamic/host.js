// ============================================================================
// dsh-wallpaper · 宿主半 (host half) —— 可选
// ----------------------------------------------------------------------------
// 这是「动态 Cordis 插件」的 code.host 源码：一段 async 函数体，必须 return
// 一个插件对象 { apply(ctx) {...} }。运行环境：Node `vm` 沙箱，纯 JavaScript，
// 禁止 import / require / TypeScript。可用闭包符号：ctx、harness、console、
// btoa、atob、TextEncoder、TextDecoder（无 Buffer / process / fs 模块）。
//
// 职责：让浏览器半能「浏览本地文件夹并读取图片」，通过 harness.handle 注册
// 两个 Package 私有的 JSON RPC，浏览器半用 host.call(method, args) 调用。
//
//   host.call('listDir',   { path })  -> { dir, files: [{name,size,path}] }
//   host.call('readImage', { path })  -> { mime, dataUrl }
//
// 本文件的内容原样填入 cordis_define 的 code.host 字段即可（见 README.md）。
// ============================================================================

const IMAGE_EXTS = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
};

// 沙箱里没有 Buffer，`btoa` 也只接受 UTF-8 文本，所以这里手写一个纯 JS 的
// base64 编码器，直接把 readBytes 返回的 Uint8Array 转成 base64 字符串。
const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function bytesToBase64(bytes) {
  let out = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < len ? B64_ALPHABET[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < len ? B64_ALPHABET[b2 & 63] : '=';
  }
  return out;
}

function extOf(name) {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

return {
  name: 'dsh-wallpaper-host',
  apply(ctx) {
    const fs = ctx.get('fs');
    if (fs === undefined) return;

    // 列出目录下的图片文件（只列直接子级，不递归）
    harness.handle('listDir', async (args) => {
      const path = args && typeof args.path === 'string' ? args.path : null;
      if (!path) {
        return { ok: false, error: '请提供一个目录的绝对路径，例如 /Users/you/Pictures' };
      }
      try {
        const target = await fs.resolve(path);
        const entries = await fs.listDir(target);
        const files = [];
        for (const e of entries) {
          if (e.type !== 'file') continue;
          const ext = extOf(e.name);
          if (!(ext in IMAGE_EXTS)) continue;
          files.push({ name: e.name, size: e.size != null ? e.size : 0, path: e.target.displayPath });
        }
        // 按名字排序，观感稳定
        files.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
        return { ok: true, dir: target.displayPath, files: files };
      } catch (err) {
        return { ok: false, error: String((err && err.message) || err) };
      }
    });

    // 读取单张图片，返回 data URL（上限 15 MiB）
    harness.handle('readImage', async (args) => {
      const path = args && typeof args.path === 'string' ? args.path : null;
      if (!path) {
        return { ok: false, error: '缺少图片路径' };
      }
      try {
        const target = await fs.resolve(path);
        const bytes = await fs.readBytes(target, undefined, 15 * 1024 * 1024);
        const mime = IMAGE_EXTS[extOf(path)] || 'image/jpeg';
        return { ok: true, mime: mime, dataUrl: 'data:' + mime + ';base64,' + bytesToBase64(bytes) };
      } catch (err) {
        return { ok: false, error: String((err && err.message) || err) };
      }
    });
  }
};

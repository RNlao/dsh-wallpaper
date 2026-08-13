// ============================================================================
// dsh-wallpaper · 宿主半 (host half)
// ----------------------------------------------------------------------------
// 把壁纸图片作为真实文件存到 DSH 配置目录 $DSH_HOME/wallpaper/（默认 ~/.dsh/wallpaper），
// 并通过 webServer 暴露 4 个 HTTP 路由给浏览器半：
//   GET  /dsh-wallpaper/list         -> { ok, files: [{id,name,size}] }
//   POST /dsh-wallpaper/save         -> { ok, id, size }   (body: {name, dataUrl})
//   GET  /dsh-wallpaper/delete?id=   -> { ok }
//   GET  /dsh-wallpaper/file/<id>    -> 图片二进制（浏览器直接加载，不占 localStorage）
// 静态插件是普通 ESM，可直接用 Node 原生 fs 读写二进制文件。
// ============================================================================
import { mkdir, writeFile, readFile, readdir, unlink, stat } from "node:fs/promises";
import { join, basename, extname } from "node:path";

export const name = "dsh-wallpaper";
export const inject = ["webServer"];

const IMG_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|avif|svg)$/i;
const MIME = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
  webp: "image/webp", bmp: "image/bmp", avif: "image/avif", svg: "image/svg+xml"
};

function dirOf() {
  const home = process.env.DSH_HOME || join(process.env.HOME || "", ".dsh");
  return join(home, "wallpaper");
}

function extOf(fileName) {
  const e = extname(fileName).slice(1).toLowerCase();
  return IMG_EXT_RE.test("." + e) ? e : "jpg";
}

function safeId(id) {
  if (typeof id !== "string" || id.length === 0) return null;
  if (id.includes("/") || id.includes("\\") || id.includes("..") || id.startsWith(".")) return null;
  return id;
}

function mimeOf(id) {
  return MIME[extOf(id)] || "application/octet-stream";
}

function json(res, code, obj) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

export function apply(ctx) {
  const dir = dirOf();
  mkdir(dir, { recursive: true }).catch(() => {});

  // 列出图片
  ctx.effect(() => ctx.webServer.register({ kind: "exact", path: "/dsh-wallpaper/list", handler: async (_req, res) => {
    try {
      const names = await readdir(dir);
      const files = [];
      for (const f of names) {
        if (!IMG_EXT_RE.test(f)) continue;
        try {
          const s = await stat(join(dir, f));
          if (s.isFile()) files.push({ id: f, name: f, size: s.size });
        } catch (e) { /* 忽略消失的文件 */ }
      }
      files.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      json(res, 200, { ok: true, files });
    } catch (e) {
      json(res, 500, { ok: false, error: String((e && e.message) || e) });
    }
  }}));

  // 保存图片（body: {name, dataUrl}，base64 解码后写原图字节）
  ctx.effect(() => ctx.webServer.register({ kind: "exact", path: "/dsh-wallpaper/save", handler: async (req, res) => {
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const rawName = typeof body.name === "string" ? basename(body.name) : "image";
      const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
      const comma = dataUrl.indexOf(",");
      if (comma === -1) { json(res, 400, { ok: false, error: "invalid dataUrl" }); return; }
      const ext = extOf(rawName);
      const id = "wp-" + Date.now() + "-" + Math.floor(Math.random() * 100000) + "." + ext;
      const buf = Buffer.from(dataUrl.slice(comma + 1), "base64");
      await writeFile(join(dir, id), buf);
      json(res, 200, { ok: true, id, size: buf.length });
    } catch (e) {
      json(res, 500, { ok: false, error: String((e && e.message) || e) });
    }
  }}));

  // 删除图片
  ctx.effect(() => ctx.webServer.register({ kind: "exact", path: "/dsh-wallpaper/delete", handler: async (req, res) => {
    try {
      const id = safeId(new URL(req.url, "http://x").searchParams.get("id") || "");
      if (!id) { json(res, 400, { ok: false, error: "invalid id" }); return; }
      await unlink(join(dir, id));
      json(res, 200, { ok: true });
    } catch (e) {
      json(res, 500, { ok: false, error: String((e && e.message) || e) });
    }
  }}));

  // 读取图片（静态服务）
  ctx.effect(() => ctx.webServer.register({ kind: "prefix", path: "/dsh-wallpaper/file", handler: async (req, res) => {
    try {
      const prefix = "/dsh-wallpaper/file/";
      const p = new URL(req.url, "http://x").pathname;
      if (!p.startsWith(prefix)) { res.writeHead(400); res.end(); return; }
      const id = safeId(decodeURIComponent(p.slice(prefix.length)));
      if (!id) { res.writeHead(400); res.end(); return; }
      const buf = await readFile(join(dir, id));
      res.writeHead(200, { "content-type": mimeOf(id), "cache-control": "no-cache" });
      res.end(buf);
    } catch (e) {
      res.writeHead(404);
      res.end();
    }
  }}));
}

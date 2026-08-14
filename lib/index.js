// ============================================================================
// dsh-wallpaper · 宿主半 (host half)
// ----------------------------------------------------------------------------
// 纯客户端插件：图片以原始字节存浏览器 IndexedDB，host 半无需做任何事。
// 它存在的唯一目的是作为一个可被 Cordis loader 加载的配置项，让
// `dsh-client-modules` 扫描到 package.json 里的 `dsh.client` 声明，从而通过
// `/plugins/dsh-wallpaper/client.js` 把浏览器半提供给前端。
// ============================================================================

export const name = "dsh-wallpaper";

export const inject = [];

export function apply(_ctx) {
  // 纯 client 插件：图片存浏览器 IndexedDB，host 半保持空实现。
}

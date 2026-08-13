// ============================================================================
// dsh-wallpaper · 宿主半 (host half)
// ----------------------------------------------------------------------------
// 本插件是纯客户端（client）实现，host 半本身不做任何运行时工作。它存在的
// 唯一目的是作为一个可被 Cordis loader 加载的配置项，让 `dsh-client-modules`
// 的 Node 侧扫描到 package.json 里的 `dsh.client` 声明，从而通过
// `/plugins/dsh-wallpaper/client.js` 把浏览器半提供给前端。
// ============================================================================

export const name = "dsh-wallpaper";

export const inject = [];

export function apply(_ctx) {
  // 纯 client 插件：host 半保持空实现。
}

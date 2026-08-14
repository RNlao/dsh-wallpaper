#!/usr/bin/env node
// ============================================================================
// install.mjs —— dsh-wallpaper 跨平台安装 / 卸载脚本
// ----------------------------------------------------------------------------
// 用法（在仓库根目录运行）：
//   node install.mjs                    # 安装到默认 profile（web）
//   node install.mjs --profile web      # 指定 profile
//   node install.mjs --dsh-home <path>  # 指定 DSH 数据目录（默认 $DSH_HOME 或 ~/.dsh）
//   node install.mjs --uninstall        # 卸载
//
// 它做的事（对应 DSH 插件加载的三条硬性要求）：
//   1. 在 <profile>/node_modules/dsh-wallpaper 创建指向本仓库的软链接（改代码免重装）；
//   2. 把 "dsh-wallpaper": "link:…" 写入 <profile>/package.json 的 dependencies；
//   3. 把 "dsh-wallpaper" 加入 dsh.profile.bundles。
// 幂等：可重复运行；修改前会备份 package.json（.dsh-wallpaper-backup）。
// ============================================================================
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const PKG = "dsh-wallpaper";
const SRC = dirname(fileURLToPath(import.meta.url)); // 本仓库根目录

function printHelp() {
  console.log(`用法：node install.mjs [选项]

选项：
  --profile <name>    要安装到的 profile（默认 web）
  --dsh-home <path>   DSH 数据目录（默认 $DSH_HOME 或 ~/.dsh）
  --uninstall         卸载（移除软链接 + dependencies + bundles）
  -h, --help          显示本帮助`);
}

function parseArgs(argv) {
  const opts = { profile: "web", uninstall: false, dshHome: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--profile" || a === "-p") opts.profile = argv[++i];
    else if (a === "--dsh-home") opts.dshHome = argv[++i];
    else if (a === "--uninstall") opts.uninstall = true;
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
    else { console.error(`未知参数：${a}\n`); printHelp(); process.exit(1); }
  }
  return opts;
}

function dshHomeOf(opts) {
  if (opts.dshHome) return resolve(opts.dshHome);
  if (process.env.DSH_HOME) return resolve(process.env.DSH_HOME);
  return join(homedir(), ".dsh");
}

// 删除一个路径（symlink/junction 只删自身，目录递归删除）
function removePath(p) {
  try {
    const st = lstatSync(p);
    if (st.isSymbolicLink()) rmSync(p, { force: true });
    else rmSync(p, { recursive: true, force: true });
  } catch (e) { /* 不存在则忽略 */ }
}

function readManifest(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeManifest(path, manifest) {
  writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
}

function verify(profileDir, dest, manifest) {
  const deps = manifest.dependencies && manifest.dependencies[PKG];
  const bundles = manifest.dsh?.profile?.bundles || [];
  const linkOk = existsSync(dest);
  const depsOk = typeof deps === "string" && deps.startsWith("link:");
  const bundlesOk = bundles.includes(PKG);
  console.log("\n检查结果（三条硬性要求）：");
  console.log(`  ${linkOk ? "✓" : "✗"} node_modules/${PKG} 存在`);
  console.log(`  ${depsOk ? "✓" : "✗"} dependencies 里有 "${PKG}": "link:…"`);
  console.log(`  ${bundlesOk ? "✓" : "✗"} dsh.profile.bundles 含 "${PKG}"`);
  return linkOk && depsOk && bundlesOk;
}

const opts = parseArgs(process.argv.slice(2));
const dshHome = dshHomeOf(opts);
const profileDir = join(dshHome, "profiles", opts.profile);
const manifestPath = join(profileDir, "package.json");
const dest = join(profileDir, "node_modules", PKG);

// ---- 卸载 ----
if (opts.uninstall) {
  removePath(dest);
  if (existsSync(manifestPath)) {
    const manifest = readManifest(manifestPath);
    if (manifest.dependencies) delete manifest.dependencies[PKG];
    if (manifest.dsh?.profile?.bundles) {
      manifest.dsh.profile.bundles = manifest.dsh.profile.bundles.filter((b) => b !== PKG);
    }
    writeManifest(manifestPath, manifest);
  }
  console.log(`✓ ${PKG} 已卸载（profile: ${opts.profile}）`);
  process.exit(0);
}

// ---- 安装 ----
if (!existsSync(manifestPath)) {
  console.error(`✗ 未找到 profile：${profileDir}`);
  console.error("  请先运行一次 `dsh web`（它会初始化该 profile），再执行本脚本。");
  process.exit(1);
}

// 备份（仅首次）
const backupPath = manifestPath + ".dsh-wallpaper-backup";
if (!existsSync(backupPath)) {
  writeFileSync(backupPath, readFileSync(manifestPath, "utf8"));
}

// 创建软链接（Windows 用 junction，无需管理员权限）
mkdirSync(join(profileDir, "node_modules"), { recursive: true });
removePath(dest);
const linkType = process.platform === "win32" ? "junction" : "dir";
symlinkSync(SRC, dest, linkType);

// 更新 manifest：dependencies + bundles
const manifest = readManifest(manifestPath);
manifest.dependencies = manifest.dependencies || {};
manifest.dependencies[PKG] = "link:" + SRC.replace(/\\/g, "/");
manifest.dsh = manifest.dsh || {};
manifest.dsh.profile = manifest.dsh.profile || {};
manifest.dsh.profile.bundles = manifest.dsh.profile.bundles || [];
if (!manifest.dsh.profile.bundles.includes(PKG)) {
  manifest.dsh.profile.bundles.push(PKG);
}
writeManifest(manifestPath, manifest);

console.log(`✓ ${PKG} 已安装`);
console.log(`  DSH_HOME : ${dshHome}`);
console.log(`  profile  : ${opts.profile}`);
console.log(`  软链接   : ${dest}`);
console.log(`  指向     : ${SRC}`);
verify(profileDir, dest, manifest);
console.log("\n下一步：重启 dsh web，浏览器强刷（macOS Cmd+Shift+R / Windows·Linux Ctrl+Shift+R）。");

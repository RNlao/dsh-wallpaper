# dsh-wallpaper · wallpaper plugin for DeepSeek Harness

[中文](./README.md) | **English**

<p align="center"><img src="https://repository-images.githubusercontent.com/1333486205/208d5ee9-1233-4bdb-a99c-f985e7ccd975" alt="dsh-wallpaper" width="800" /></p>

Set a custom background for the DSH web GUI: no-wallpaper mode, gradient presets, image upload, **folder import**, **crop**, **blur**, dim overlay, panel translucency, text color/shadow, **contrast protection**, and fit/position controls — with a switchable Chinese / English UI.

Images are stored as **raw bytes in browser IndexedDB** (no compression, no base64, no 5MB localStorage cap) and displayed via object URLs. The current selection and effect settings live in `localStorage`.

## Install

**One-command install (recommended, cross-platform):**

```bash
git clone https://github.com/RNlao/dsh-wallpaper.git
cd dsh-wallpaper
node install.mjs
```

The script detects the DSH home (`$DSH_HOME` or `~/.dsh`), creates the symlink, and writes the package into `dependencies` and `dsh.profile.bundles`. To uninstall: `node install.mjs --uninstall`.

**Manual install (alternative):**

```bash
dsh plugin --profile web add link:/path/to/dsh-wallpaper
```

After installing: restart `dsh web`, hard-refresh the browser, then open **Settings → Wallpaper**.

## Platform compatibility

The plugin itself is **cross-platform** (a pure browser implementation with an empty host half — no OS-specific code), so it behaves identically on Windows / macOS / Linux. Only paths and shortcuts differ:

- **DSH home**: `~/.dsh` on macOS / Linux; `%USERPROFILE%\.dsh` on Windows.
- **Manual install path**: Windows uses `link:C:\path\to\dsh-wallpaper`; if the path contains spaces, `cd` into the profile directory and run `pnpm add "link:…"` (quoted).
- **Hard refresh**: `Cmd+Shift+R` on macOS; `Ctrl+Shift+R` on Windows / Linux.
- **Folder import** relies on `webkitdirectory`, a browser feature (Chrome / Edge / Safari support it, Firefox does not) — independent of the operating system.

`node install.mjs` handles these path differences for you.

## Features

- **No wallpaper**: restore the stock DSH look (the default state — the plugin does nothing until you pick a background).
- **Presets**: 8 built-in gradients.
- **Image library**: uploaded / imported / cropped images (thumbnail grid, delete, click to set as background).
- **Crop**: drag to select the region to keep, export a new image.
- **Blur** 0–50px, **dim** 0–0.9, **panel opacity** 0.3–1.0.
- **UI language**: switch between Chinese and English at the top of the settings page.
- **Text readability**: text color (auto / light / dark, scoped to chat content) + text shadow + **contrast protection** (off / balanced / strong, adds a theme-aware backing to reasoning blocks and input hints).
- **Fit & position**: cover / contain / stretch; horizontal and vertical position.

## Storage

- Raw image bytes → browser **IndexedDB** (database `dsh-wallpaper`, store `images`). No compression, no base64, no 5MB cap.
- Current selection + effect settings → `localStorage` (tiny metadata only).

## How it works

- **Background layer**: `body::before` (fixed, `z-index:-1`) holds the image/gradient, `body::after` holds the dim overlay; `body{isolation:isolate}` keeps the negative-z layers under the app content.
- **Panel translucency (scoped)**: `ctx.theme.overrideTokens` makes only **three** large-area tokens translucent — `--dsw-alias-bg-base` (main canvas), `--dsw-specific-sidebar-fill` (sidebar), `--dsw-specific-input-major` (input box). Inner surfaces (`bg-layer-*`, menus, bubbles) stay opaque so text stays readable and the UI never feels "too transparent".
- **Image storage**: images are kept as Blobs in IndexedDB; `URL.createObjectURL(blob)` produces temporary URLs for `<img>`/CSS, revoked with `revokeObjectURL` after use. Thumbnails load on demand (`GalleryThumb` reads on mount, releases on unmount).
- **Text color & contrast protection**: text color is injected only into the chat session subtree (`[data-slot="conversation.session"]`), never leaking into Settings, Trajectory, or the sidebar; contrast protection adds a theme-aware translucent backing to reasoning blocks (`[data-variant="think"]`) and input hints (`[data-decoration="hint"]`).
- **Settings page**: `slots.inject('settings.section', …)` registers the "Wallpaper" section.
- **Lifecycle**: styles, token overrides, slot registration, and object URLs are all owned by the plugin fiber and cleaned up on disable/unload.

## Known limitations

- Folder import relies on `webkitdirectory` (Chrome / Edge / Safari; Firefox unsupported). Single-image upload works in all browsers.
- Images live in IndexedDB: clearing site data (cache / private browsing) also clears them; not shared across browsers.
- The translucent panel tints come from the current DSH `design-platform.css`; if those token values change in a future DSH version, the translucency appearance may shift slightly (functionality unaffected).

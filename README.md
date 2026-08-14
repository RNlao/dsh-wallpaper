# dsh-wallpaper · wallpaper plugin for DeepSeek Harness

Set a custom background for the DSH web GUI: no-wallpaper mode, gradient presets, image upload, **folder import**, **crop**, **blur**, dim overlay, panel translucency, text color/shadow, and fit/position controls.

Images are stored as **raw bytes in browser IndexedDB** (no compression, no base64, no 5MB localStorage cap) and displayed via object URLs. The current selection and effect settings live in `localStorage`.

## Install

**Recommended — one command** (`dsh plugin add` switches into the profile directory, runs pnpm add, and reconciles the package into `dsh.profile.bundles` for you):

```bash
git clone https://github.com/RNlao/dsh-wallpaper.git

# link: points at the cloned directory; editing the code only needs a restart
dsh plugin --profile web add link:/path/to/dsh-wallpaper
```

Then **restart `dsh web`** (Ctrl-C and start again) and **hard-refresh the browser** (`Cmd+Shift+R`). Open **Settings (bottom-left) → Wallpaper**.

### Why the manual docs used `cd ~/.dsh/profiles/web`

That was the manual pnpm path: `pnpm add` must run **inside the profile directory** (`~/.dsh/profiles/web`, the pnpm workspace root) so the dependency lands in that profile's `package.json` and `node_modules`:

```bash
cd ~/.dsh/profiles/web
pnpm add 'dsh-wallpaper@link:/path/to/dsh-wallpaper'
```

`dsh plugin add` does exactly that `cd` + `pnpm add` internally, so it's the recommended form — no manual `cd` needed.

### Three hard requirements

Whichever way you install, these three must all hold (otherwise DSH throws `ERR_MODULE_NOT_FOUND` when importing the host half from the profile directory):

1. `~/.dsh/profiles/web/package.json` has `"dsh-wallpaper": "link:…"` in `dependencies`;
2. `~/.dsh/profiles/web/node_modules/dsh-wallpaper` exists (a link symlink or a real directory);
3. the `dsh.profile.bundles` array contains `"dsh-wallpaper"`.

> A global `npm install -g` does **not** help — Node's ESM resolution never looks in global packages. A `link:` symlink is the easiest option (edit code, restart, no reinstall).

## Features

- **No wallpaper**: restore the stock DSH look (the default state — the plugin does nothing until you pick a background).
- **Presets**: 8 built-in gradients.
- **Image library**: uploaded / imported / cropped images (thumbnail grid, delete, click to set as background).
- **Crop**: drag to select the region to keep, export a new image.
- **Blur** 0–50px, **dim** 0–0.9, **panel opacity** 0.3–1.0.
- **Text readability**: text color (auto / light / dark) + text shadow.
- **Fit & position**: cover / contain / stretch; horizontal and vertical position.

## Storage

- Raw image bytes → browser **IndexedDB** (database `dsh-wallpaper`, store `images`). No compression, no base64, no 5MB cap.
- Current selection + effect settings → `localStorage` (tiny metadata only).

## How it works

- **Background layer**: `body::before` (fixed, `z-index:-1`) holds the image/gradient, `body::after` holds the dim overlay; `body{isolation:isolate}` keeps the negative-z layers under the app content.
- **Panel translucency (scoped)**: `ctx.theme.overrideTokens` makes only **three** large-area tokens translucent — `--dsw-alias-bg-base` (main canvas), `--dsw-specific-sidebar-fill` (sidebar), `--dsw-specific-input-major` (input box). Inner surfaces (`bg-layer-*`, menus, bubbles) stay opaque so text stays readable and the UI never feels "too transparent".
- **Image storage**: images are kept as Blobs in IndexedDB; `URL.createObjectURL(blob)` produces temporary URLs for `<img>`/CSS, revoked with `revokeObjectURL` after use. Thumbnails load on demand (`GalleryThumb` reads on mount, releases on unmount).
- **Text color**: overrides `--dsw-alias-label-*` tokens; text shadow uses `text-shadow`.
- **Settings page**: `slots.inject('settings.section', …)` registers the "Wallpaper" section.
- **Lifecycle**: styles, token overrides, slot registration, and object URLs are all owned by the plugin fiber and cleaned up on disable/unload.

## Known limitations

- Folder import relies on `webkitdirectory` (Chrome / Edge / Safari; Firefox unsupported). Single-image upload works in all browsers.
- Images live in IndexedDB: clearing site data (cache / private browsing) also clears them; not shared across browsers.
- The translucent panel tints come from the current DSH `design-platform.css`; if those token values change in a future DSH version, the translucency appearance may shift slightly (functionality unaffected).

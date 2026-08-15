# dsh-wallpaper · wallpaper plugin for DeepSeek Harness

[中文](./README.md) | **English**

<p align="center"><img src="https://repository-images.githubusercontent.com/1333486205/208d5ee9-1233-4bdb-a99c-f985e7ccd975" alt="dsh-wallpaper" width="800" /></p>

Set custom backgrounds for the DSH web GUI: independent Main UI / Trajectory wallpapers, no-wallpaper mode, gradient presets, image upload, **folder import**, **crop**, **blur**, panel translucency, workspace-wide custom text color/shadow, and fit/position controls, with a master enable switch and a switchable Chinese / English UI.

Images are stored as **raw bytes in browser IndexedDB** (no compression, no base64, no 5MB localStorage cap) and displayed via object URLs. The current selection and effect settings live in `localStorage`.

## Install

### Install from GitHub (recommended)

```bash
dsh plugin --profile web add github:RNlao/dsh-wallpaper#v0.1.0
```

### Install from a Release

Download [dsh-wallpaper-0.1.0.tgz](https://github.com/RNlao/dsh-wallpaper/releases/download/v0.1.0/dsh-wallpaper-0.1.0.tgz), then run:

```bash
dsh plugin --profile web add /path/to/dsh-wallpaper-0.1.0.tgz
```

### Install from source / development link (not persistent)

```bash
git clone https://github.com/RNlao/dsh-wallpaper.git
dsh plugin --profile web add link:./dsh-wallpaper
```

You can also choose **Code → Download ZIP** on the repository page, extract it, and run `dsh plugin --profile web add link:./dsh-wallpaper-main` from the parent directory. If the `web` profile has not been initialized, run `dsh web` once first.

`link:` is a development link, not a persistent install: the plugin continues to depend on that source directory and stops working if the directory is moved or deleted. The source only needs to be linked once; editing `lib/client.js` does not require relinking or restarting, and DSH client HMR reloads it. Hard-refresh if the change is not immediately visible.

### Activation and updates

- **First install or uninstall**: if `dsh web` is already running, restart it and hard-refresh the browser so the new profile bundle list takes effect.
- **Host or mount configuration changes**: restart `dsh web`. This plugin's host half is currently empty, so normal development only changes the client half.

After installation, open **Settings → Wallpaper**. To uninstall: `dsh plugin --profile web remove dsh-wallpaper`.

## Platform compatibility

The plugin itself is **cross-platform** (a pure browser implementation with an empty host half and no OS-specific code). Only paths and shortcuts differ:

- **DSH home**: `~/.dsh` on macOS / Linux; `%USERPROFILE%\.dsh` on Windows.
- **Install commands**: GitHub, Release, and source `link:./dsh-wallpaper` installs work the same on every platform.
- **Hard refresh**: `Cmd+Shift+R` on macOS; `Ctrl+Shift+R` on Windows / Linux.
- **Folder import** relies on `webkitdirectory`, a browser feature (Chrome / Edge / Safari support it, Firefox does not), independent of the operating system.

## Features

- **Master switch**: turn off “Wallpaper effects” to remove the plugin's background, translucency, and text styles and restore the original DSH appearance; turn it back on to restore the saved configuration.
- **No wallpaper**: disable the wallpaper for the selected page while keeping other plugin settings available.
- **Main UI / Trajectory**: two independent wallpaper configurations; Trajectory follows Main UI by default, or can use its own image, gradient, or no wallpaper. The sidebar has no separate wallpaper selector and automatically follows the active page.
- **Presets**: 8 built-in gradients.
- **Image library**: uploaded / imported / cropped images (thumbnail grid, delete, click to set as background for the selected page).
- **Crop**: drag to select the region to keep, export a new image.
- **Blur and surface opacity**: Main UI and independent Trajectory wallpapers each save blur 0–50px and surface opacity 0–1.0; the workspace and sidebar can become fully transparent while the input retains a minimal surface at the lowest value. Trajectory inherits the Main UI effects while following its wallpaper.
- **UI language**: switch between Chinese and English at the top of the settings page.
- **Text readability**: Main UI text color supports auto / light / dark / custom picker and applies to the header, composer permission/model controls, thinking, and tool calls. Solid primary actions keep their inverse text color for contrast. The sidebar independently follows the DSH appearance: dark text and icons in light appearance, light text and icons in dark appearance. Plugin text rules never enter DSH settings.
- **Trajectory color schemes**: Trajectory offers DSH native, Clear, and Jade. Every scheme contains light- and dark-appearance palettes and follows the DSH appearance automatically. Clear and Jade use the same high-contrast dark/light colors for ordinary text without forced shadows; scheme differences stay in brand, status, border, and small-popover colors. Main and Trajectory share one session-header text rule, so switching routes does not change header brightness.
- **Fit & position**: cover / contain / stretch; horizontal and vertical position, saved independently per page.

## Storage

- Raw image bytes → browser **IndexedDB** (database `dsh-wallpaper`, store `images`). No compression, no base64, no 5MB cap.
- Current selection + effect settings → `localStorage` (tiny metadata only).

## How it works

- **Background layer**: `body::before` (fixed, `z-index:-1`) holds the active Main UI or Trajectory image/gradient. `:has([data-trajectory-scroll])` identifies the active Trajectory view, so the session header, sidebar and current view share the active page wallpaper.
- **Panel translucency**: Main UI and Trajectory use adjustable translucent surfaces. The sidebar keeps a slightly stronger layer to distinguish navigation, while the input retains a light surface. Small controls, menus, hover, and selection states keep the contrast they need. Turning off the master switch restores the original DSH appearance.
- **Image storage**: images are kept as Blobs in IndexedDB; `URL.createObjectURL(blob)` produces temporary URLs for `<img>`/CSS, revoked with `revokeObjectURL` after use. Thumbnails load on demand (`GalleryThumb` reads on mount, releases on unmount).
- **Text color and Trajectory schemes**: the Main UI color applies to the session header, conversation text tokens, thinking, tool calls and composer hints through a positive region allowlist that excludes DSH settings. One selected Trajectory scheme consistently controls its toolbar, timeline, search, table text and icons, choosing its light or dark palette from the DSH appearance. Semantic status colors remain distinct, and the solid approval action explicitly retains white text for contrast.
- **Settings page**: `slots.inject('settings.section', …)` registers the "Wallpaper" section. The toolbar switches between Main UI and Trajectory; Trajectory follows Main UI by default. Plugin settings controls use the native DSH theme tokens.
- **Lifecycle**: styles, slot registration, and object URLs are owned by the plugin fiber and cleaned up on disable/unload.

## Known limitations

- Folder import relies on `webkitdirectory` (Chrome / Edge / Safari; Firefox unsupported). Single-image upload works in all browsers.
- Images live in IndexedDB: clearing site data (cache / private browsing) also clears them; not shared across browsers.
- The translucent panel tints come from the current DSH `design-platform.css`; if those token values change in a future DSH version, the translucency appearance may shift slightly (functionality unaffected).

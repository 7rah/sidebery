# Chrome Core Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome-compatible Sidebery core edition that preserves the main sidebar / tree-tabs workflow while leaving the Firefox build intact and disabling Firefox-only features instead of emulating them.

**Architecture:** Keep `src/manifest.json` and `src/bg/background.ts` as the Firefox source of truth. Add a Chrome-specific manifest, a Chrome MV3 service worker entry, and a thin platform layer that routes supported features to Chrome APIs and turns unsupported Firefox APIs into explicit no-ops or hidden UI. Use the existing storage-backed `tabsDataCache` path as the primary Chrome restore mechanism so we do not have to recreate Firefox `sessions.*Value` behavior.

**Tech Stack:** TypeScript, Vue 3 SFCs, Sidebery custom Node build scripts, Chrome Extensions MV3 (`action`, `sidePanel`, `service_worker`), existing `browser`-style code compiled to Chromium with additive Chrome-only shims.

---

## Constraints

- No automated tests in this plan. The user explicitly asked not to write tests, so verification is limited to build checks and manual smoke checks.
- Firefox remains the primary code path. Prefer additive Chrome-specific files and capability guards over large cross-cutting rewrites.
- Non-goals for Chrome core:
  - Firefox Containers / `contextualIdentities`
  - Per-container proxy / per-container user agent / container reopen rules
  - `page_action` proxy popup
  - Firefox theme integration via `browser.theme`
  - `tabHide`-driven features such as hiding inactive tabs
  - Native context menu override via `menus.overrideContext`
  - Dynamic sidebar title and window title preface features that depend on Firefox-only sidebar/window APIs
  - Full screenshot-based preview parity

## File Structure

### New files

- `src/manifest.chrome.json`
  Chrome MV3 manifest source. This is the Chrome source of truth instead of mutating the Firefox manifest at copy time.

- `src/bg/background.chrome.ts`
  Chrome service worker bootstrap. This file must stay free of `window`, `document`, `XMLSerializer`, and other DOM-only imports.

- `src/services/platform.ts`
  Shared platform state and capability flags such as `isChrome`, `hasSidePanel`, `hasSessionValues`, `hasTabHide`, `hasFirefoxThemeApi`, `hasContextualIdentities`.

- `src/services/platform.actions.ts`
  Thin wrappers for browser differences: open side panel, create action context menus, run search, persist per-window/per-tab state, safe no-op wrappers for unsupported APIs.

- `src/services/settings.bg.ts`
  Chrome-safe background settings loader/listener with no dependency on `tabs.preview`, `window.matchMedia`, or foreground-only modules.

- `src/services/sidebar.bg.ts`
  Chrome-safe background sidebar/nav state loader for the service worker. This file should only read/write storage state needed by the background.

- `src/types/chromium-ext.d.ts`
  Minimal Chromium-only type additions for `sidePanel`, `contextMenus`, and any Chrome-only Promise-returning APIs we use directly.

### Existing files to modify

- `build/copy.js`
  Stop patching `src/manifest.json` in place for Chromium. Select `src/manifest.chrome.json` directly when `--chromium` is present.

- `package.json`
  Add explicit Chrome build scripts so the Chrome target is easy to build repeatedly.

- `src/services/info.ts`
  Add simple platform metadata if needed by the UI or setup page.

- `src/services/info.actions.ts`
  Guard Firefox-only debug/platform calls such as `browser.runtime.getBrowserInfo()`.

- `src/services/sidebar.actions.ts`
  Replace direct `sessions.*Value` and `sidebarAction.setTitle()` calls with platform wrappers or Chrome-safe fallbacks.

- `src/services/windows.actions.ts`
  Route `sessions.*Value`, `captureTab`, `moveInSuccession`, `titlePreface`, and container-specific window creation through capability checks.

- `src/services/tabs.fg.actions.ts`
  Replace direct `sessions.setTabValue`, `search.search`, `moveInSuccession`, and `tabs.hide/show` calls with capability-gated helpers.

- `src/services/tabs.fg.handlers.ts`
  Prefer `tabsDataCache` restore on Chrome and guard `tabs.hide/show` usage.

- `src/services/tabs.fg.create.ts`
  Remove Chrome dependence on `cookieStoreId` / container reopen rules and wrap search dispatch.

- `src/services/tabs.fg.move.ts`
  Remove `sidebarAction` / `moveInSuccession` assumptions from the Chrome path.

- `src/services/tabs.bg.actions.ts`
  No-op `pageAction` proxy badge behavior on Chrome and keep `captureTab` best-effort only.

- `src/services/styles.actions.ts`
  Disable Firefox theme listeners/parsing on Chrome and fall back to system/custom theme logic only.

- `src/services/permissions.actions.ts`
  Hide Chrome-unsupported permission flows and normalize related settings off when capabilities are missing.

- `src/services/setup-page.ts`
  Remove unsupported settings sections from the setup page nav when running on Chrome.

- `src/services/setup-page.actions.ts`
  Guard Firefox-only debug info collection and permission deep links.

- `src/services/containers.actions.ts`
  Early-return in Chrome instead of calling `browser.contextualIdentities`.

- `src/services/containers.handlers.ts`
  Do not register Firefox container listeners in Chrome.

- `src/services/web-req.actions.ts`
  Early-return in Chrome so proxy/webRequest-specific listeners never attach.

- `src/services/menu.actions.ts`
  Route native action menu creation through a platform wrapper and add a safe wrapper around `overrideContext`.

- `src/page.setup/components/settings.vue`
  Hide entire unsupported sections when the platform says they are unavailable.

- `src/page.setup/components/popup.permissions.vue`
  Remove Chrome-unsupported permission toggles such as proxy/webRequest/tabHide flows.

- `src/page.setup/components/settings.general.vue`
  Hide `updateSidebarTitle` and `markWindow` controls on Chrome.

- `src/page.setup/components/settings.menu.vue`
  Hide or disable `ctxMenuNative` on Chrome.

- `src/page.setup/components/settings.tabs.vue`
  Hide or disable `hideInact`, `hideFoldedTabs` combinations that depend on `tabHide`, and preview controls that require screenshot capture parity.

- `src/page.setup/components/settings.containers.vue`
  Hide the Containers section on Chrome.

- `src/page.setup/components/popup.container-config.vue`
  Hide Chrome-unsupported container proxy / UA controls.

- `src/page.setup/components/popup.import-config.vue`
  Strip or warn about imported container/proxy/tabHide settings on Chrome.

- `src/sidebar/components/popup.container-config.vue`
  Hide in-sidebar container editing on Chrome.

- `src/components/popup.tab-move-rules.vue`
  Hide or disable rules that depend on containers.

- `src/components/popup.tab-reopen-rules.vue`
  Hide or disable rules that depend on proxy/container reopen logic.

- `src/components/bookmark-node.vue`
  Replace direct `browser.menus.overrideContext()` calls with a safe helper.

- `src/sidebar/components/bookmark-card.vue`
  Replace direct `browser.menus.overrideContext()` calls with a safe helper.

- `src/sidebar/components/history-item.vue`
  Replace direct `browser.menus.overrideContext()` calls with a safe helper.

- `src/sidebar/components/bar.new-tab.vue`
  Replace direct `browser.menus.overrideContext()` calls with a safe helper.

- `src/sidebar/components/bar.navigation.vue`
  Replace direct `browser.menus.overrideContext()` calls with a safe helper.

- `src/sidebar/components/panel.bookmarks.vue`
  Replace direct `browser.menus.overrideContext()` calls with a safe helper.

- `src/sidebar/components/panel.tabs.vue`
  Replace direct `browser.menus.overrideContext()` calls with a safe helper.

- `src/sidebar/components/tab.vue`
  Replace direct `browser.menus.overrideContext()` calls with a safe helper.

- `README.md`
  Add one short build note for the Chrome target if we ship `npm run build.chrome`.

## Task 1: Add an explicit Chrome packaging target

**Files:**
- Create: `src/manifest.chrome.json`
- Modify: `build/copy.js`
- Modify: `package.json`
- Modify: `README.md`

- [ ] Copy `src/manifest.json` into `src/manifest.chrome.json` and convert it into a Chrome MV3 manifest:
  - replace `sidebar_action` with `side_panel.default_path`
  - add `action.default_title` / `action.default_icon`
  - replace `background.page` assumptions with `background.service_worker`
  - rename `_execute_sidebar_action` to `_execute_action`
  - replace Firefox-only permissions with Chrome-supported ones such as `contextMenus`
  - remove `page_action`, `contextualIdentities`, `menus.overrideContext`, `theme`, `tabHide`, proxy/webRequestBlocking-only wiring

- [ ] Keep `src/manifest.json` unchanged as the Firefox source of truth.

- [ ] Change `build/copy.js` so `--chromium` copies `src/manifest.chrome.json` directly instead of destructively patching the Firefox manifest.

- [ ] Add `npm run dev.chrome` and `npm run build.chrome` to `package.json` using `node build/all.js --chromium`.

- [ ] Add one short README note showing the Chrome build command and “load unpacked from `addon/`”.

- [ ] Run `npm run build.chrome`.
  Expected:
  - build completes without copy/bundle failures
  - `addon/manifest.json` contains `background.service_worker`
  - `addon/manifest.json` contains `side_panel.default_path`

- [ ] Commit.

```bash
git add src/manifest.chrome.json build/copy.js package.json README.md
git commit -m "build: add explicit chrome manifest target"
```

## Task 2: Create Chrome-safe background-only modules

**Files:**
- Create: `src/services/settings.bg.ts`
- Create: `src/services/sidebar.bg.ts`
- Modify: `src/services/info.ts`
- Modify: `src/services/info.actions.ts`
- Modify: `src/services/windows.actions.ts`

- [ ] Create `src/services/settings.bg.ts` with only the background-safe subset of settings behavior:
  - load stored settings
  - expose current settings state needed by the background
  - register storage change listeners
  - skip imports that pull in `tabs.preview`, `window.matchMedia`, `document`, or foreground-only services

- [ ] Create `src/services/sidebar.bg.ts` with only the background-safe subset of sidebar behavior:
  - load nav / panel metadata from storage
  - expose “has tabs / has bookmarks / has history” booleans needed by the background
  - do not import `Tabs.fg`, `Menu`, or DOM-dependent code

- [ ] Add a simple platform flag to `src/services/info.ts` / `src/services/info.actions.ts` if the setup page needs to know “Firefox vs Chrome”.

- [ ] Guard `browser.runtime.getBrowserInfo()` in `src/services/info.actions.ts` and `src/services/setup-page.actions.ts` so Chrome can still open the debug/details view without throwing.

- [ ] In `src/services/windows.actions.ts`, wrap `titlePreface`, `captureTab`, `moveInSuccession`, and `cookieStoreId`-dependent branches behind capability checks so the future Chrome worker can import the module safely.

- [ ] Run `npm run build.chrome`.
  Expected:
  - no new import-time errors from background-safe helper modules
  - no direct Chrome build failure caused by `getBrowserInfo`, `titlePreface`, or missing `cookieStoreId`

- [ ] Commit.

```bash
git add src/services/settings.bg.ts src/services/sidebar.bg.ts src/services/info.ts src/services/info.actions.ts src/services/windows.actions.ts src/services/setup-page.actions.ts
git commit -m "refactor: add chrome-safe background helper modules"
```

## Task 3: Add the Chrome MV3 service worker entry

**Files:**
- Create: `src/bg/background.chrome.ts`
- Create: `src/types/chromium-ext.d.ts`
- Modify: `src/services/platform.ts`
- Modify: `src/services/platform.actions.ts`

- [ ] Create `src/types/chromium-ext.d.ts` with the minimal type surface required for:
  - `browser.sidePanel`
  - `browser.contextMenus`
  - Chrome search method differences if used directly

- [ ] Create `src/services/platform.ts` with capability flags for:
  - `isChrome`
  - `hasSidePanel`
  - `hasFirefoxSidebarAction`
  - `hasContextualIdentities`
  - `hasSessionValues`
  - `hasFirefoxThemeApi`
  - `hasTabHide`
  - `hasMenusOverrideContext`
  - `hasPageAction`

- [ ] Create `src/services/platform.actions.ts` with wrappers for:
  - opening the side panel
  - creating action context menus through `contextMenus`
  - safe no-op `overrideContext`
  - search dispatch
  - window/tab state persistence fallback

- [ ] Build `src/bg/background.chrome.ts` as a service worker entry that only imports Chrome-safe modules:
  - IPC / Logs / Info
  - `settings.bg`
  - `sidebar.bg`
  - background-safe tab/window bookkeeping
  - no DOM-only services

- [ ] In `src/bg/background.chrome.ts`, replace toolbar/sidebar logic with `browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` and register the action context menu without using the Firefox-only `Menu` module.

- [ ] Load `addon/` in Chrome and verify the extension installs without “service worker registration failed”.

- [ ] Click the toolbar button and verify the Side Panel opens `sidebar/sidebar.html`.

- [ ] Commit.

```bash
git add src/bg/background.chrome.ts src/types/chromium-ext.d.ts src/services/platform.ts src/services/platform.actions.ts
git commit -m "feat: add chrome side panel service worker"
```

## Task 4: Replace direct Firefox-only API calls with platform wrappers

**Files:**
- Modify: `src/services/sidebar.actions.ts`
- Modify: `src/services/windows.actions.ts`
- Modify: `src/services/tabs.fg.actions.ts`
- Modify: `src/services/tabs.fg.handlers.ts`
- Modify: `src/services/tabs.fg.create.ts`
- Modify: `src/services/tabs.fg.move.ts`
- Modify: `src/services/tabs.bg.actions.ts`
- Modify: `src/services/styles.actions.ts`
- Modify: `src/services/menu.actions.ts`
- Modify: `src/components/bookmark-node.vue`
- Modify: `src/sidebar/components/bookmark-card.vue`
- Modify: `src/sidebar/components/history-item.vue`
- Modify: `src/sidebar/components/bar.new-tab.vue`
- Modify: `src/sidebar/components/bar.navigation.vue`
- Modify: `src/sidebar/components/panel.bookmarks.vue`
- Modify: `src/sidebar/components/panel.tabs.vue`
- Modify: `src/sidebar/components/tab.vue`

- [ ] Replace `browser.sidebarAction.*` usages in `src/services/sidebar.actions.ts` and `src/services/tabs.fg.move.ts` with platform helpers. Chrome should never call `sidebarAction.toggle()` or `sidebarAction.setTitle()`.

- [ ] Replace direct `browser.search.search()` calls in `src/services/tabs.fg.actions.ts` and `src/services/tabs.fg.create.ts` with a wrapper that uses Chrome-compatible search dispatch.

- [ ] Replace direct `browser.sessions.getTabValue()`, `setTabValue()`, `getWindowValue()`, and `setWindowValue()` calls with platform helpers. On Chrome these helpers should use storage-backed fallbacks instead of calling missing APIs.

- [ ] Replace direct `browser.tabs.moveInSuccession()` calls with a best-effort helper. Chrome should treat this as optional and continue without throwing.

- [ ] Replace direct `browser.tabs.hide()` / `show()` paths with capability checks so Chrome disables these branches cleanly instead of partially executing them.

- [ ] Replace `browser.pageAction.*` calls in `src/services/tabs.bg.actions.ts` with a no-op helper so Chrome does not try to show the removed proxy badge UI.

- [ ] In `src/services/styles.actions.ts`, skip `browser.theme.onUpdated` / `browser.theme.getCurrent()` on Chrome and leave only system/custom theme flows.

- [ ] In `src/services/menu.actions.ts`, centralize native context menu creation and `overrideContext` behind wrappers. Then update the eight direct caller components so they only call the safe helper, never `browser.menus.overrideContext()` directly.

- [ ] Run `npm run build.chrome`.
  Expected:
  - no unresolved references to `sidebarAction`, `pageAction`, `menus.overrideContext`, `theme.getCurrent`, or `search.search` in the Chrome build

- [ ] Commit.

```bash
git add src/services/sidebar.actions.ts src/services/windows.actions.ts src/services/tabs.fg.actions.ts src/services/tabs.fg.handlers.ts src/services/tabs.fg.create.ts src/services/tabs.fg.move.ts src/services/tabs.bg.actions.ts src/services/styles.actions.ts src/services/menu.actions.ts src/components/bookmark-node.vue src/sidebar/components/bookmark-card.vue src/sidebar/components/history-item.vue src/sidebar/components/bar.new-tab.vue src/sidebar/components/bar.navigation.vue src/sidebar/components/panel.bookmarks.vue src/sidebar/components/panel.tabs.vue src/sidebar/components/tab.vue
git commit -m "refactor: wrap firefox-only extension APIs"
```

## Task 5: Make storage-backed restore the Chrome primary path

**Files:**
- Modify: `src/services/tabs.bg.actions.ts`
- Modify: `src/services/tabs.fg.actions.ts`
- Modify: `src/services/tabs.fg.handlers.ts`
- Modify: `src/services/sidebar.actions.ts`
- Modify: `src/services/windows.actions.ts`

- [ ] Keep `src/services/tabs.bg.actions.ts` writing `tabsDataCache` to `storage.local`; this becomes the Chrome source of truth for restore.

- [ ] In `src/services/tabs.fg.actions.ts`, change restore order so Chrome always tries `tabsDataCache` first and only uses `sessions.getTabValue()` when the platform reports session values are available.

- [ ] In `src/services/sidebar.actions.ts`, move `activePanelId` and `hiddenPanels` persistence behind platform helpers. Chrome should store them in `storage.local` keyed by window id instead of `sessions.setWindowValue()`.

- [ ] In `src/services/windows.actions.ts`, generate / persist `uniqWinId` through the platform helper rather than `sessions.setWindowValue()` when running on Chrome.

- [ ] Verify that Chrome can reopen the side panel without losing panel order, panel visibility, and tab tree structure after a normal browser restart.

- [ ] Run `npm run build.chrome`.
  Expected:
  - build succeeds
  - no restore path assumes Firefox session-value APIs exist

- [ ] Commit.

```bash
git add src/services/tabs.bg.actions.ts src/services/tabs.fg.actions.ts src/services/tabs.fg.handlers.ts src/services/sidebar.actions.ts src/services/windows.actions.ts
git commit -m "feat: use storage-backed restore path for chrome"
```

## Task 6: Hide unsupported Chrome features in setup and sidebar UI

**Files:**
- Modify: `src/services/setup-page.ts`
- Modify: `src/services/setup-page.actions.ts`
- Modify: `src/services/permissions.actions.ts`
- Modify: `src/services/containers.actions.ts`
- Modify: `src/services/containers.handlers.ts`
- Modify: `src/services/web-req.actions.ts`
- Modify: `src/page.setup/components/settings.vue`
- Modify: `src/page.setup/components/popup.permissions.vue`
- Modify: `src/page.setup/components/settings.general.vue`
- Modify: `src/page.setup/components/settings.menu.vue`
- Modify: `src/page.setup/components/settings.tabs.vue`
- Modify: `src/page.setup/components/settings.containers.vue`
- Modify: `src/page.setup/components/popup.container-config.vue`
- Modify: `src/page.setup/components/popup.import-config.vue`
- Modify: `src/sidebar/components/popup.container-config.vue`
- Modify: `src/components/popup.tab-move-rules.vue`
- Modify: `src/components/popup.tab-reopen-rules.vue`

- [ ] Remove `settings_containers` from the Chrome setup-page nav and do not mount `ContainersSection` in `src/page.setup/components/settings.vue` when `platform.hasContextualIdentities` is false.

- [ ] Hide or disable the following Chrome-incompatible controls:
  - `updateSidebarTitle`
  - `markWindow` / `markWindowPreface`
  - `ctxMenuNative`
  - `hideInact` and other `tabHide`-driven flows
  - screenshot-heavy preview settings if they depend on `captureTab` parity

- [ ] Remove Chrome-unsupported permission rows from `src/page.setup/components/popup.permissions.vue` and simplify `src/services/permissions.actions.ts` so it does not request proxy/webRequestBlocking/tabHide on Chrome.

- [ ] Make `src/services/containers.actions.ts` and `src/services/containers.handlers.ts` no-op on Chrome instead of calling `browser.contextualIdentities`.

- [ ] Make `src/services/web-req.actions.ts` return early on Chrome so proxy/auth listeners never register.

- [ ] In import/config popups, strip imported container/proxy/tabHide-only settings on Chrome and show a clear “not supported in Chrome core” note instead of importing them silently.

- [ ] Run the setup page manually in Chrome and verify the user cannot navigate into dead-end Firefox-only settings.

- [ ] Commit.

```bash
git add src/services/setup-page.ts src/services/setup-page.actions.ts src/services/permissions.actions.ts src/services/containers.actions.ts src/services/containers.handlers.ts src/services/web-req.actions.ts src/page.setup/components/settings.vue src/page.setup/components/popup.permissions.vue src/page.setup/components/settings.general.vue src/page.setup/components/settings.menu.vue src/page.setup/components/settings.tabs.vue src/page.setup/components/settings.containers.vue src/page.setup/components/popup.container-config.vue src/page.setup/components/popup.import-config.vue src/sidebar/components/popup.container-config.vue src/components/popup.tab-move-rules.vue src/components/popup.tab-reopen-rules.vue
git commit -m "feat: hide firefox-only features in chrome ui"
```

## Task 7: Run the manual Chrome smoke pass

**Files:**
- Modify: none required unless fixes are found during smoke

- [ ] Run `npm run build.chrome`.

- [ ] Open `chrome://extensions` in Chrome, enable Developer mode, and load unpacked from `addon/`.

- [ ] Verify installation sanity:
  - the extension loads without manifest errors
  - the service worker stays running long enough to open the side panel
  - clicking the toolbar icon opens the Side Panel

- [ ] Verify core sidebar behavior:
  - current window tabs render
  - opening / closing / moving / pinning tabs updates the tree
  - switching panels still works
  - bookmarks panel loads when permission is granted
  - history panel loads when permission is granted
  - search still opens results / reuses the current search tab path

- [ ] Verify Chrome-specific feature cuts:
  - no Containers section is shown
  - no proxy popup / proxy badge is shown
  - no “native context menu” breakage occurs on right click
  - no hidden-tab behavior is triggered
  - no console error appears for `contextualIdentities`, `sidebarAction`, `pageAction`, `theme`, `menus.overrideContext`, `tabs.hide`, or `tabs.moveInSuccession`

- [ ] Verify persistence:
  - panel order survives a reload
  - hidden panels survive a reload
  - tab tree restore comes back after restarting Chrome and reopening the extension

- [ ] If smoke uncovers breakage, fix the issue in the same task before moving on.

- [ ] Commit the final Chrome-core fixes.

```bash
git add .
git commit -m "fix: finish chrome core smoke issues"
```

## Manual Smoke Checklist

Use this exact order after Task 6:

1. `npm run build.chrome`
2. Load `addon/` unpacked in Chrome
3. Click the toolbar button and confirm the panel opens
4. Open a few tabs, move them, pin one, unload one, and confirm the sidebar tree updates
5. Open settings and confirm Firefox-only sections are hidden
6. Restart Chrome and verify tree + active panel state restore from storage

## Rollout Notes

- Do not delete Firefox-only source files unless they block the Chrome build. Leaving dormant Firefox files in the repo is cheaper than trying to unify every path.
- Prefer no-op wrappers over partial emulation. If Chrome cannot support a Firefox behavior, hide the entry point and log once instead of inventing a fragile compatibility layer.
- Keep the first Chrome milestone narrow: “loadable extension + usable tree tabs + usable bookmarks/history/search + stable restore”.

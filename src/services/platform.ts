export const Platform = {
  browserName: typeof browser.runtime.getBrowserInfo === 'function' ? 'firefox' : 'chrome',

  hasSidePanel: typeof browser.sidePanel !== 'undefined',
  hasFirefoxSidebarAction: typeof browser.sidebarAction !== 'undefined',
  hasContextMenus: typeof browser.contextMenus !== 'undefined',
  hasContextualIdentities: typeof browser.contextualIdentities !== 'undefined',
  hasSessionValues:
    typeof browser.sessions.getWindowValue === 'function' &&
    typeof browser.sessions.setWindowValue === 'function' &&
    typeof browser.sessions.getTabValue === 'function' &&
    typeof browser.sessions.setTabValue === 'function',
  hasFirefoxThemeApi: typeof browser.theme !== 'undefined',
  hasTabHide: typeof browser.tabs.hide === 'function' && typeof browser.tabs.show === 'function',
  hasMenusOverrideContext:
    typeof browser.menus !== 'undefined' && typeof browser.menus.overrideContext === 'function',
  hasPageAction: typeof browser.pageAction !== 'undefined',
  storagePrefix: 'platform',
}

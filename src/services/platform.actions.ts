import * as Logs from 'src/services/logs'
import { Platform } from './platform'

const ACTION_MENU_OPEN_SETTINGS = 'open_settings'
const ACTION_MENU_OPEN_SETTINGS_TITLE = 'Open settings'

let actionMenuListenerInstalled = false

export async function configureSidePanel(path: string): Promise<void> {
  if (!Platform.hasSidePanel) return

  try {
    await browser.sidePanel.setOptions({ enabled: true, path })
    await browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  } catch (err) {
    Logs.err('Platform.configureSidePanel: Cannot configure side panel:', err)
  }
}

export async function openPrimarySidebar(windowId?: ID): Promise<void> {
  try {
    if (Platform.hasSidePanel && typeof browser.sidePanel.open === 'function') {
      if (windowId !== undefined) await browser.sidePanel.open({ windowId })
      else await browser.sidePanel.open()
      return
    }

    if (Platform.hasFirefoxSidebarAction) {
      await browser.sidebarAction.toggle()
    }
  } catch (err) {
    Logs.err('Platform.openPrimarySidebar: Cannot open sidebar:', err)
  }
}

export async function ensureActionContextMenu(): Promise<void> {
  const menusApi = Platform.hasContextMenus ? browser.contextMenus : browser.menus
  if (!menusApi) return

  try {
    await menusApi.removeAll()
  } catch (err) {
    Logs.err('Platform.ensureActionContextMenu: Cannot clear menus:', err)
  }

  try {
    menusApi.create({
      id: ACTION_MENU_OPEN_SETTINGS,
      title: ACTION_MENU_OPEN_SETTINGS_TITLE,
      contexts: ['action'],
    })
  } catch (err) {
    Logs.err('Platform.ensureActionContextMenu: Cannot create menu:', err)
  }

  if (!actionMenuListenerInstalled) {
    menusApi.onClicked.addListener(onActionMenuClicked)
    actionMenuListenerInstalled = true
  }
}

export function overrideContext(contextOptions: browser.menus.ContextOptions): void {
  if (!Platform.hasMenusOverrideContext) return
  browser.menus.overrideContext(contextOptions)
}

export async function search(query: string, tabId?: ID): Promise<void> {
  try {
    if (typeof browser.search.search === 'function') {
      if (tabId !== undefined) await browser.search.search({ query, tabId })
      else await browser.search.search({ query, disposition: 'NEW_TAB' })
      return
    }

    if (typeof browser.search.query === 'function') {
      await browser.search.query({
        text: query,
        tabId,
        disposition: tabId !== undefined ? 'CURRENT_TAB' : 'NEW_TAB',
      })
      return
    }
  } catch (err) {
    Logs.err('Platform.search: Native search failed:', err)
  }

  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`
  if (tabId !== undefined) await browser.tabs.update(tabId, { url })
  else await browser.tabs.create({ url })
}

export async function getWindowState<T>(windowId: ID, key: string): Promise<T | undefined> {
  if (Platform.hasSessionValues && typeof browser.sessions.getWindowValue === 'function') {
    return browser.sessions.getWindowValue(windowId, key)
  }

  const storageKey = getStorageKey('window', windowId, key)
  const stored = await browser.storage.local.get<Record<string, T | undefined>>(storageKey)
  return stored[storageKey]
}

export async function setWindowState<T>(windowId: ID, key: string, value: T): Promise<void> {
  if (Platform.hasSessionValues && typeof browser.sessions.setWindowValue === 'function') {
    await browser.sessions.setWindowValue(windowId, key, value)
    return
  }

  const storageKey = getStorageKey('window', windowId, key)
  await browser.storage.local.set({ [storageKey]: value })
}

export async function getTabState<T>(tabId: ID, key: string): Promise<T | undefined> {
  if (Platform.hasSessionValues && typeof browser.sessions.getTabValue === 'function') {
    return browser.sessions.getTabValue(tabId, key)
  }

  const storageKey = getStorageKey('tab', tabId, key)
  const stored = await browser.storage.local.get<Record<string, T | undefined>>(storageKey)
  return stored[storageKey]
}

export async function setTabState<T>(tabId: ID, key: string, value: T): Promise<void> {
  if (Platform.hasSessionValues && typeof browser.sessions.setTabValue === 'function') {
    await browser.sessions.setTabValue(tabId, key, value)
    return
  }

  const storageKey = getStorageKey('tab', tabId, key)
  await browser.storage.local.set({ [storageKey]: value })
}

function onActionMenuClicked(info: browser.menus.OnClickData): void {
  if (String(info.menuItemId) !== ACTION_MENU_OPEN_SETTINGS) return
  browser.runtime.openOptionsPage()
}

function getStorageKey(scope: 'window' | 'tab', id: ID, key: string): string {
  return `${Platform.storagePrefix}.${scope}.${String(id)}.${key}`
}

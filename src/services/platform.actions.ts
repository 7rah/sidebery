import { Platform } from './platform'

const ACTION_MENU_OPEN_SETTINGS = 'open_settings'
const ACTION_MENU_OPEN_SETTINGS_TITLE = 'Open settings'

interface ActionMenuApi {
  removeAll(): void | Promise<void>
  create(createProperties: browser.menus.CreateProperties): string | number
  onClicked: typeof browser.menus.onClicked
}

let actionMenuListenerInstalled = false
let actionMenuSetup: Promise<void> | undefined

export async function configureSidePanel(path: string): Promise<void> {
  if (!Platform.hasSidePanel) return

  try {
    await browser.sidePanel.setOptions({ enabled: true, path })
    await browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  } catch (err) {
    logError('Platform.configureSidePanel: Cannot configure side panel:', err)
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
    logError('Platform.openPrimarySidebar: Cannot open sidebar:', err)
  }
}

export async function isPrimarySidebarOpen(windowId: ID): Promise<boolean> {
  if (!Platform.hasFirefoxSidebarAction || typeof browser.sidebarAction.isOpen !== 'function') {
    return false
  }

  try {
    return await browser.sidebarAction.isOpen({ windowId })
  } catch (err) {
    logError('Platform.isPrimarySidebarOpen: Cannot read sidebar state:', err)
    return false
  }
}

export async function setSidebarTitle(title: string, windowId?: ID): Promise<void> {
  if (!Platform.hasFirefoxSidebarAction || typeof browser.sidebarAction.setTitle !== 'function') {
    return
  }

  try {
    await browser.sidebarAction.setTitle({ title, windowId })
  } catch (err) {
    logError('Platform.setSidebarTitle: Cannot set sidebar title:', err)
  }
}

export async function ensureActionContextMenu(): Promise<void> {
  const menusApi = (Platform.hasContextMenus ? browser.contextMenus : browser.menus) as
    | ActionMenuApi
    | undefined
  if (!menusApi) return

  if (actionMenuSetup) return actionMenuSetup
  actionMenuSetup = setupActionContextMenu(menusApi).finally(() => {
    actionMenuSetup = undefined
  })
  return actionMenuSetup
}

async function setupActionContextMenu(menusApi: ActionMenuApi): Promise<void> {
  try {
    await menusApi.removeAll()
  } catch (err) {
    logError('Platform.ensureActionContextMenu: Cannot clear menus:', err)
  }

  try {
    menusApi.create({
      id: ACTION_MENU_OPEN_SETTINGS,
      title: ACTION_MENU_OPEN_SETTINGS_TITLE,
      contexts: ['action'],
    })
  } catch (err) {
    logError('Platform.ensureActionContextMenu: Cannot create menu:', err)
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
    logError('Platform.search: Native search failed:', err)
  }

  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`
  if (tabId !== undefined) await browser.tabs.update(tabId, { url })
  else await createTab({ url })
}

export async function createTab(
  createProperties: browser.tabs.CreateProperties = {}
): Promise<browser.tabs.Tab> {
  const normalized = { ...createProperties }
  const shouldDiscardAfterCreate =
    normalized.discarded === true &&
    Platform.browserName !== 'firefox' &&
    normalized.active !== true &&
    typeof browser.tabs.discard === 'function'

  if (!Platform.hasContextualIdentities && 'cookieStoreId' in normalized) {
    delete normalized.cookieStoreId
  }

  if (Platform.browserName !== 'firefox') {
    if ('discarded' in normalized) delete normalized.discarded
    if ('title' in normalized) delete normalized.title
  }

  const createdTab = await browser.tabs.create(normalized)

  if (shouldDiscardAfterCreate) {
    try {
      await browser.tabs.discard(createdTab.id)
      createdTab.discarded = true
    } catch (err) {
      logError('Platform.createTab: Cannot discard created tab:', err)
    }
  }

  return createdTab
}

export async function updateTab(
  tabId: ID,
  updateProperties: browser.tabs.UpdateProperties
): Promise<browser.tabs.Tab> {
  const normalized = { ...updateProperties }

  if (normalized.openerTabId === tabId && Platform.browserName !== 'firefox') {
    delete normalized.openerTabId
  }

  if (!Object.keys(normalized).length) return browser.tabs.get(tabId)

  return browser.tabs.update(tabId, normalized)
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

export async function moveTabsInSuccession(tabIds: ID[], successorTabId?: ID): Promise<boolean> {
  if (typeof browser.tabs.moveInSuccession !== 'function') return false

  try {
    if (successorTabId !== undefined) await browser.tabs.moveInSuccession(tabIds, successorTabId)
    else await browser.tabs.moveInSuccession(tabIds)
    return true
  } catch (err) {
    logError('Platform.moveTabsInSuccession: Cannot update succession:', err)
    return false
  }
}

export async function updateNativeTabsVisibility(toShow: ID[], toHide: ID[]): Promise<void> {
  if (typeof browser.tabs.show !== 'function' || typeof browser.tabs.hide !== 'function') return

  const tasks: Promise<any>[] = []
  if (toShow.length) tasks.push(browser.tabs.show(toShow))
  if (toHide.length) tasks.push(browser.tabs.hide(toHide))
  if (tasks.length) await Promise.allSettled(tasks)
}

export async function showPageAction(tabId: ID, title: string): Promise<void> {
  if (!Platform.hasPageAction) return

  try {
    browser.pageAction.setTitle({ title, tabId })
    await browser.pageAction.show(tabId)
  } catch (err) {
    logError('Platform.showPageAction: Cannot show page action:', err)
  }
}

export async function hidePageAction(tabId: ID, title?: string): Promise<void> {
  if (!Platform.hasPageAction) return

  try {
    await browser.pageAction.hide(tabId)
    if (title !== undefined) browser.pageAction.setTitle({ title, tabId })
  } catch (err) {
    logError('Platform.hidePageAction: Cannot hide page action:', err)
  }
}

function onActionMenuClicked(info: browser.menus.OnClickData): void {
  if (String(info.menuItemId) !== ACTION_MENU_OPEN_SETTINGS) return
  browser.runtime.openOptionsPage()
}

function getStorageKey(scope: 'window' | 'tab', id: ID, key: string): string {
  return `${Platform.storagePrefix}.${scope}.${String(id)}.${key}`
}

function logError(...args: unknown[]): void {
  console.error(...args)
}

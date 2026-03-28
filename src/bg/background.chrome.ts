import { InstanceType } from 'src/types'
import { SettingsBg } from 'src/services/settings.bg'
import { SidebarBg } from 'src/services/sidebar.bg'
import { configureSidePanel, ensureActionContextMenu } from 'src/services/platform.actions'

const SIDEBAR_PATH = 'sidebar/sidebar.html'
const ts = performance.now()
const BG_CONNECTION_CONFIRM_ID = -1
const cacheByWindow: Record<ID, TabCacheLike[]> = {}
const sidebarPorts = new Map<ID, browser.runtime.Port>()
const setupPagePorts = new Map<ID, browser.runtime.Port>()
const panelConfigPorts = new Map<ID, browser.runtime.Port>()

const actions: Record<string, (...args: any[]) => any> = {
  cacheTabsData,
  getGroupPageInitData,
  tabsApiProxy,
  getSidebarTabs,
  isWindowTabsLocked,
  saveInLocalStorage,
}

browser.runtime.onConnect.addListener(onConnect)
browser.runtime.onMessage.addListener(onMessage)

browser.runtime.onInstalled.addListener(() => {
  void setupChromeUi()
})
browser.runtime.onStartup.addListener(() => {
  void setupChromeUi()
})
browser.runtime.onUpdateAvailable.addListener(details => {
  const currentVersion = versionToInt(browser.runtime.getManifest().version)
  const newVersion = versionToInt(details.version)
  if (newVersion <= currentVersion) browser.runtime.reload()
})

void (async function main() {
  await setupChromeUi()
  await Promise.all([SettingsBg.loadSettings(), SidebarBg.loadState()])
  SettingsBg.setupSettingsChangeListener()
  SidebarBg.setupSidebarChangeListener()
  console.info(`Chrome bg init end: ${performance.now() - ts}ms`)
})()

async function setupChromeUi(): Promise<void> {
  await configureSidePanel(SIDEBAR_PATH)
  await ensureActionContextMenu()
}

function cacheTabsData(windowId: ID, tabs: TabCacheLike[], delay = 300): void {
  cacheByWindow[windowId] = tabs

  setTimeout(() => {
    const tabsDataCache = Object.values(cacheByWindow).filter(cache => cache.length)
    void browser.storage.local.set({ tabsDataCache })
  }, delay)
}

async function getGroupPageInitData(winId: ID, tabId: ID): Promise<Record<string, any>> {
  return {
    theme: SettingsBg.state.theme,
    groupLayout: SettingsBg.state.groupLayout,
    animations: SettingsBg.state.animations,
    winId,
    tabId,
  }
}

async function getSidebarTabs(windowId: ID, tabIds?: ID[]): Promise<browser.tabs.Tab[]> {
  const tabs = await browser.tabs.query({ windowId })
  if (!tabIds?.length) return tabs

  const tabIdsSet = new Set(tabIds)
  return tabs.filter(tab => tab.id !== undefined && tabIdsSet.has(tab.id))
}

function tabsApiProxy(method: string, ...args: any[]): any {
  const tabsApi = browser.tabs as unknown as Record<string, (...args: any[]) => any>
  const fn = tabsApi[method]
  if (typeof fn !== 'function') return

  return fn(...args)
}

function isWindowTabsLocked(): boolean {
  return false
}

async function saveInLocalStorage(
  newValues: Record<string, unknown>,
  srcInfo?: { type?: number; winId?: ID; tabId?: ID }
): Promise<void> {
  await browser.storage.local.set(newValues)
  broadcastStorageChange(newValues, srcInfo)
}

function broadcastStorageChange(
  newValues: Record<string, unknown>,
  srcInfo?: { type?: number; winId?: ID; tabId?: ID }
): void {
  for (const [winId, port] of sidebarPorts) {
    if (srcInfo?.type === InstanceType.sidebar && srcInfo.winId === winId) continue
    postMessageSafely(port, { action: 'storageChanged', args: [newValues] })
  }

  for (const [tabId, port] of setupPagePorts) {
    if (srcInfo?.type === InstanceType.setup && srcInfo.tabId === tabId) continue
    postMessageSafely(port, { action: 'storageChanged', args: [newValues] })
  }

  for (const [winId, port] of panelConfigPorts) {
    if (srcInfo?.type === InstanceType.panelConfig && srcInfo.winId === winId) continue
    postMessageSafely(port, { action: 'storageChanged', args: [newValues] })
  }
}

function onConnect(port: browser.runtime.Port): void {
  const portNameData = parsePortName(port.name)
  if (!portNameData) return
  if (portNameData.dstType !== InstanceType.bg) return

  if (portNameData.srcType === InstanceType.sidebar && portNameData.srcWinId !== undefined) {
    sidebarPorts.set(portNameData.srcWinId, port)
  }
  if (portNameData.srcType === InstanceType.setup && portNameData.srcTabId !== undefined) {
    setupPagePorts.set(portNameData.srcTabId, port)
  }
  if (portNameData.srcType === InstanceType.panelConfig && portNameData.srcWinId !== undefined) {
    panelConfigPorts.set(portNameData.srcWinId, port)
  }

  port.onMessage.addListener(msg => {
    void onPortMessage(msg, port)
  })
  port.onDisconnect.addListener(() => {
    if (portNameData.srcType === InstanceType.sidebar && portNameData.srcWinId !== undefined) {
      const activePort = sidebarPorts.get(portNameData.srcWinId)
      if (activePort === port) sidebarPorts.delete(portNameData.srcWinId)
    }
    if (portNameData.srcType === InstanceType.setup && portNameData.srcTabId !== undefined) {
      const activePort = setupPagePorts.get(portNameData.srcTabId)
      if (activePort === port) setupPagePorts.delete(portNameData.srcTabId)
    }
    if (portNameData.srcType === InstanceType.panelConfig && portNameData.srcWinId !== undefined) {
      const activePort = panelConfigPorts.get(portNameData.srcWinId)
      if (activePort === port) panelConfigPorts.delete(portNameData.srcWinId)
    }
  })

  postMessageSafely(port, BG_CONNECTION_CONFIRM_ID)
}

function onMessage(msg: IPCMessage): Promise<any> | undefined {
  if (msg.dstType !== undefined && msg.dstType !== InstanceType.bg) return
  return runAction(msg)
}

async function onPortMessage(msg: IPCMessage | number, port: browser.runtime.Port): Promise<void> {
  if (typeof msg === 'number') return
  if (!msg.action) return

  if (!msg.id) {
    await runAction(msg)
    return
  }

  let result: any
  let error: string | undefined

  try {
    result = runAction(msg)
  } catch (err) {
    error = String(err)
  }

  if (result instanceof Promise) {
    postMessageSafely(port, msg.id)
    try {
      result = await result
    } catch (err) {
      error = String(err)
      result = undefined
    }
  }

  postMessageSafely(port, { id: msg.id, result, error })
}

function runAction(msg: IPCMessage): Promise<any> | any {
  if (!msg.action) return
  const action = actions[msg.action]
  if (!action) return
  if (msg.arg !== undefined) return action(msg.arg)
  if (msg.args) return action(...msg.args)
  return action()
}

function parsePortName(name: string): PortNameData | undefined {
  try {
    return JSON.parse(name) as PortNameData
  } catch {
    return undefined
  }
}

function postMessageSafely(port: browser.runtime.Port, msg: IPCMessage | number): void {
  try {
    port.postMessage(msg)
  } catch (err) {
    console.warn('Chrome bg: Cannot post message:', err)
  }
}

function versionToInt(version: string): number {
  return version
    .split('.')
    .map(part => Number.parseInt(part, 10) || 0)
    .reduce((acc, part, index) => acc + part * 1000 ** (3 - index), 0)
}

interface PortNameData {
  srcType: number
  dstType: number
  srcWinId?: ID
  srcTabId?: ID
}

interface IPCMessage {
  id?: number
  dstType?: number
  action?: string
  arg?: any
  args?: any[]
  result?: any
  error?: string
}

interface TabCacheLike {
  id: ID
  url: string
}

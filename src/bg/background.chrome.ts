import type { IPCNodeInfo } from 'src/types/ipc'
import type { Stored } from 'src/types/storage'
import type { Tab, TabCache } from 'src/types/tabs'
import { InstanceType } from 'src/types/ipc'
import * as IPC from 'src/services/ipc'
import * as Logs from 'src/services/logs'
import { Info } from 'src/services/info'
import { Store } from 'src/services/storage'
import { Windows } from 'src/services/windows'
import { SettingsBg } from 'src/services/settings.bg'
import { SidebarBg } from 'src/services/sidebar.bg'
import { configureSidePanel, ensureActionContextMenu } from 'src/services/platform.actions'
import { versionToInt } from 'src/services/info.actions'

const SIDEBAR_PATH = 'sidebar/sidebar.html'
const ts = performance.now()
const cacheByWindow: Record<ID, TabCache[]> = {}

Info.setInstanceType(InstanceType.bg)
IPC.setInstanceType(InstanceType.bg)
Logs.setInstanceType(InstanceType.bg)

Logs.info('Chrome bg init start')

IPC.registerActions({
  cacheTabsData,
  getGroupPageInitData,
  tabsApiProxy,
  getSidebarTabs,
  isWindowTabsLocked: Windows.isWindowTabsLocked,
  saveInLocalStorage: Store.setFromRemoteFg,
} as any)

IPC.setupGlobalMessageListener()
IPC.setupConnectionListener()

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
  await Promise.all([
    SettingsBg.loadSettings(),
    SidebarBg.loadState(),
    Info.loadVersionInfo(),
    Info.loadPlatformInfo(),
  ])

  Info.saveVersion()
  Logs.info(`Chrome bg init end: ${performance.now() - ts}ms`)
})()

async function setupChromeUi(): Promise<void> {
  await configureSidePanel(SIDEBAR_PATH)
  await ensureActionContextMenu()
}

function cacheTabsData(windowId: ID, tabs: TabCache[], delay = 300): void {
  cacheByWindow[windowId] = tabs

  setTimeout(() => {
    const tabsDataCache = Object.values(cacheByWindow).filter(cache => cache.length)
    void browser.storage.local.set<Stored>({ tabsDataCache })
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

async function getSidebarTabs(windowId: ID, tabIds?: ID[]): Promise<Tab[]> {
  const tabs = (await browser.tabs.query({ windowId })) as Tab[]
  if (!tabIds?.length) return tabs

  const tabIdsSet = new Set(tabIds)
  return tabs.filter(tab => tabIdsSet.has(tab.id))
}

function tabsApiProxy(method: string, ...args: any[]): any {
  const tabsApi = browser.tabs as unknown as Record<string, (...args: any[]) => any>
  const fn = tabsApi[method]
  if (typeof fn !== 'function') return

  return fn(...args)
}

function saveInLocalStorage(newValues: Stored, srcInfo: IPCNodeInfo): void {
  Store.setFromRemoteFg(newValues, srcInfo)
}

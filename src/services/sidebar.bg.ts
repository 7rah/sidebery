import { PanelType } from 'src/types/sidebar'
import type { PanelConfig, SidebarConfig } from 'src/types/sidebar'
import type { Stored } from 'src/types/storage'

type StoredChange = browser.storage.StorageChange<Stored[keyof Stored]>

const DEFAULT_TABS_PANEL_ID = 'tabs'

export const SidebarBg = {
  config: createFallbackSidebarConfig(),
  nav: [] as ID[],
  hasTabs: false,
  hasBookmarks: false,
  hasHistory: false,
  hasSync: false,

  loadState,
  setupSidebarChangeListener,
  resetSidebarChangeListener,
}

export async function loadState(): Promise<void> {
  let storage = await browser.storage.managed.get<Stored>('sidebar').catch(() => ({} as Stored))
  if (!storage.sidebar) storage = await browser.storage.local.get<Stored>('sidebar')

  const sidebar = storage.sidebar?.nav?.length ? storage.sidebar : createFallbackSidebarConfig()
  SidebarBg.config = sidebar
  SidebarBg.nav = sidebar.nav
  parseSidebarState(sidebar)
}

export function setupSidebarChangeListener(): void {
  browser.storage.onChanged.addListener(onSidebarChanged)
}

export function resetSidebarChangeListener(): void {
  browser.storage.onChanged.removeListener(onSidebarChanged)
}

function onSidebarChanged(changes: Record<string, StoredChange>, areaName: string): void {
  if (areaName !== 'local' && areaName !== 'managed') return
  if (!changes.sidebar) return
  void loadState()
}

function parseSidebarState(config: SidebarConfig): void {
  SidebarBg.hasTabs = false
  SidebarBg.hasBookmarks = false
  SidebarBg.hasHistory = false
  SidebarBg.hasSync = false

  for (const id of config.nav) {
    const panel = config.panels[id]
    if (!panel) continue

    if (!SidebarBg.hasTabs && panel.type === PanelType.tabs) SidebarBg.hasTabs = true
    if (!SidebarBg.hasBookmarks && panel.type === PanelType.bookmarks) SidebarBg.hasBookmarks = true
    if (!SidebarBg.hasHistory && panel.type === PanelType.history) SidebarBg.hasHistory = true
    if (!SidebarBg.hasSync && panel.type === PanelType.sync) SidebarBg.hasSync = true
  }
}

function createFallbackSidebarConfig(): SidebarConfig {
  const tabsPanel = { id: DEFAULT_TABS_PANEL_ID, type: PanelType.tabs } as PanelConfig
  return {
    panels: { [DEFAULT_TABS_PANEL_ID]: tabsPanel },
    nav: [DEFAULT_TABS_PANEL_ID, 'add_tp', 'sp-0', 'settings'],
  }
}

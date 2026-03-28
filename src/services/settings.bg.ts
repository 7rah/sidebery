import * as Utils from 'src/utils'
import { DEFAULT_SETTINGS } from 'src/defaults/settings'
import type { SettingsState } from 'src/types/settings'
import type { Stored } from 'src/types/storage'

type StoredChange = browser.storage.StorageChange<Stored[keyof Stored]>

export const SettingsBg = {
  state: Utils.cloneObject(DEFAULT_SETTINGS),

  loadSettings,
  setupSettingsChangeListener,
  resetSettingsChangeListener,
}

export async function loadSettings(): Promise<void> {
  const [managedResult, localResult] = await Promise.allSettled([
    browser.storage.managed.get<Stored>('settings'),
    browser.storage.local.get<Stored>('settings'),
  ])

  const storedManaged = Utils.settledOr(managedResult, {} as Stored)
  if (!storedManaged.settings) storedManaged.settings = {} as SettingsState

  const storedLocal = Utils.settledOr(localResult, {} as Stored)
  if (!storedLocal.settings) storedLocal.settings = {} as SettingsState

  Utils.normalizeObject(storedManaged.settings, storedLocal.settings)
  Utils.normalizeObject(storedManaged.settings, DEFAULT_SETTINGS)
  Utils.updateObject(SettingsBg.state, storedManaged.settings, SettingsBg.state)

  if (SettingsBg.state.hideInact) {
    SettingsBg.state.activateLastTabOnPanelSwitching = true
    SettingsBg.state.tabsPanelSwitchActMove = true
  }
}

export function setupSettingsChangeListener(): void {
  browser.storage.onChanged.addListener(onSettingsChanged)
}

export function resetSettingsChangeListener(): void {
  browser.storage.onChanged.removeListener(onSettingsChanged)
}

function onSettingsChanged(changes: Record<string, StoredChange>, areaName: string): void {
  if (areaName !== 'local' && areaName !== 'managed') return
  if (!changes.settings) return
  void loadSettings()
}

import { DEFAULT_SETTINGS } from 'src/defaults/settings'
import type { SettingsState } from 'src/types/settings'
import type { Stored } from 'src/types/storage'

type StoredChange = browser.storage.StorageChange<Stored[keyof Stored]>

export const SettingsBg = {
  state: cloneObject(DEFAULT_SETTINGS),

  loadSettings,
  setupSettingsChangeListener,
  resetSettingsChangeListener,
}

export async function loadSettings(): Promise<void> {
  const [managedResult, localResult] = await Promise.allSettled([
    browser.storage.managed.get<Stored>('settings'),
    browser.storage.local.get<Stored>('settings'),
  ])

  const storedManaged = settledOr(managedResult, {} as Stored)
  if (!storedManaged.settings) storedManaged.settings = {} as SettingsState

  const storedLocal = settledOr(localResult, {} as Stored)
  if (!storedLocal.settings) storedLocal.settings = {} as SettingsState

  normalizeObject(storedManaged.settings, storedLocal.settings)
  normalizeObject(storedManaged.settings, DEFAULT_SETTINGS)
  updateObject(SettingsBg.state, storedManaged.settings, SettingsBg.state)

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

function cloneArray<T>(arr: readonly T[]): T[] {
  const out: T[] = []
  for (const item of arr) {
    if (Array.isArray(item)) out.push(cloneArray(item) as unknown as T)
    else if (typeof item === 'object' && item !== null) out.push(cloneObject(item))
    else out.push(item)
  }
  return out
}

function cloneObject<T extends object>(obj: T): T {
  const out = {} as T
  for (const prop of Object.keys(obj) as (keyof T)[]) {
    const value = obj[prop]
    if (Array.isArray(value)) out[prop] = cloneArray(value) as T[keyof T]
    else if (typeof value === 'object' && value !== null) {
      out[prop] = cloneObject(value as object) as T[keyof T]
    } else {
      out[prop] = value
    }
  }
  return out
}

function normalizeObject<T extends object>(obj: T, defaults: T): void {
  const clonedDefaults = cloneObject(defaults)
  for (const key of Object.keys(clonedDefaults) as (keyof T)[]) {
    if (obj[key] === undefined) obj[key] = clonedDefaults[key]
  }
}

function updateObject<T extends object>(obj: T, src: T, keysSrc: T | (keyof T)[]): void {
  const keys = Array.isArray(keysSrc) ? keysSrc : (Object.keys(keysSrc) as (keyof T)[])
  for (const key of keys) {
    if (src[key] === undefined) continue
    obj[key] = src[key]
  }
}

function settledOr<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback
}

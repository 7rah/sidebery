import { NativeTab, Tab } from 'src/types'

type NativeSyncTab = Pick<
  NativeTab,
  | 'id'
  | 'active'
  | 'audible'
  | 'discarded'
  | 'favIconUrl'
  | 'hidden'
  | 'mutedInfo'
  | 'pinned'
  | 'status'
  | 'title'
  | 'url'
>

export function getNativeTabChange(
  tab: Pick<Tab, keyof NativeSyncTab>,
  nativeTab: NativeSyncTab
): browser.tabs.ChangeInfo | undefined {
  let change: browser.tabs.ChangeInfo | undefined
  const set = <K extends keyof browser.tabs.ChangeInfo>(
    key: K,
    value: browser.tabs.ChangeInfo[K]
  ): void => {
    if (!change) change = {}
    change[key] = value
  }

  if (nativeTab.audible !== undefined && tab.audible !== nativeTab.audible) {
    set('audible', nativeTab.audible)
  }
  if (nativeTab.discarded !== undefined && !!tab.discarded !== nativeTab.discarded) {
    set('discarded', nativeTab.discarded)
  }
  if (nativeTab.favIconUrl !== undefined && tab.favIconUrl !== nativeTab.favIconUrl) {
    set('favIconUrl', nativeTab.favIconUrl)
  }
  if (tab.hidden !== nativeTab.hidden) set('hidden', nativeTab.hidden)
  if (nativeTab.mutedInfo !== undefined && tab.mutedInfo?.muted !== nativeTab.mutedInfo.muted) {
    set('mutedInfo', nativeTab.mutedInfo)
  }
  if (tab.pinned !== nativeTab.pinned) set('pinned', nativeTab.pinned)
  if (nativeTab.status !== undefined && tab.status !== nativeTab.status) {
    set('status', nativeTab.status)
  }
  if (tab.title !== nativeTab.title) set('title', nativeTab.title)
  if (tab.url !== nativeTab.url) set('url', nativeTab.url)

  return change
}

export function getNativeTabsById(
  tabs: Pick<Tab, 'id'>[],
  nativeTabs: NativeTab[]
): Record<ID, NativeTab> | undefined {
  if (nativeTabs.length !== tabs.length) return

  const nativeTabsById: Record<ID, NativeTab> = {}
  for (const nativeTab of nativeTabs) {
    nativeTabsById[nativeTab.id] = nativeTab
  }

  for (const tab of tabs) {
    if (!nativeTabsById[tab.id]) return
  }

  return nativeTabsById
}

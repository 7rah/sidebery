import { ReactiveTabProps, Tab, TabSessionData, TabStatus } from 'src/types'
import { NOID } from 'src/defaults'
import { test } from 'vitest'

export class MTab implements Tab {
  isParent: boolean = false
  folded: boolean = false
  autoUnloadFoldedTimeout?: number | undefined
  invisible: boolean = false
  parentId: ID = NOID
  panelId: ID = '123'
  prevPanelId: ID = NOID
  lvl: number = 0
  sel: boolean = false
  selLock: boolean = false
  updated: boolean = false
  loading: boolean | 'ok' | 'err' = false
  warn: boolean = false
  unread?: boolean | undefined
  proxified?: boolean | undefined
  relGroupId: ID = NOID
  dstPanelId: ID = NOID
  autoGroupped?: boolean | undefined
  unpinning?: boolean | undefined
  moveTime?: number | undefined
  childLastAccessed?: number | undefined
  lastExpanded?: number | undefined
  reloadingChecks?: number | undefined
  mediaPaused: boolean = false
  reopened?: boolean | undefined
  internal?: boolean | undefined
  isGroup: boolean = false
  reopening?: { id: ID } | undefined
  reopenInContainer?: string | undefined
  customTitle?: string | undefined
  customColor?: string | undefined
  reloadOnActivation?: boolean | undefined
  moving?: boolean | undefined
  preventAutoReopening?: boolean | undefined
  previewImg?: string | undefined
  removing?: boolean | undefined
  flashAnimationTimeout?: number | undefined
  reactive: ReactiveTabProps = {
    active: false,
    mediaAudible: false,
    mediaMuted: false,
    mediaPaused: false,
    containerColor: null,
    discarded: false,
    pinned: false,
    status: TabStatus.Complete,
    isParent: false,
    folded: false,
    tooltip: '',
    customTitleEdit: false,
    url: 'about:newtab',
    lvl: 0,
    branchLen: 0,
    sel: false,
    selLock: false,
    warn: false,
    updated: false,
    unread: false,
    flash: false,
    color: null,
    branchColor: null,
    customColor: null,
    isGroup: false,
    preview: false,
  }
  sessionData?: TabSessionData | undefined
  titleEl?: HTMLElement | undefined
  favImgEl?: HTMLImageElement | undefined
  favSvgUseEl?: SVGElement | undefined
  flashFxEl?: HTMLElement | undefined
  checkingSessionRestore?: Promise<boolean> | undefined
  resolveSessionRestoreDetection?: ((isSessionRestore: boolean) => void) | undefined
  active: boolean = false
  attention?: boolean | undefined
  audible?: boolean | undefined
  autoDiscardable?: boolean | undefined
  cookieStoreId: string = 'firefox-default'
  discarded?: boolean | undefined
  favIconUrl?: string | undefined
  hidden: boolean = false
  width?: number | undefined
  height?: number | undefined
  highlighted: boolean = false
  sharingState?: { camera?: boolean; microphone?: boolean } | undefined
  id: ID = 2
  index: number = 0
  incognito: boolean = false
  isArticle?: boolean | undefined
  isInReaderMode: boolean = false
  lastAccessed: number = Date.now()
  mutedInfo?: browser.tabs.MutedInfo | undefined
  openerTabId?: ID | undefined
  pinned: boolean = false
  sessionId?: string | undefined
  status?: string | undefined
  successorTabId?: ID | undefined
  title: string = 'New Tab'
  url: string = 'about:newtab'
  windowId: ID = 1
  groupId?: ID | undefined

  constructor(ptab?: Partial<Tab>, prtab?: Partial<ReactiveTabProps>) {
    if (ptab) {
      for (const k of Object.keys(ptab) as (keyof browser.tabs.Tab)[]) {
        if (ptab[k]) (this[k] as any) = ptab[k]
      }
    }
    if (prtab) {
      for (const k of Object.keys(prtab) as (keyof ReactiveTabProps)[]) {
        if (prtab[k]) (this.reactive[k] as any) = prtab[k]
      }
    }
  }
}

test.todo('...')

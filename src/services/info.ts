import { InstanceType } from 'src/types'
import * as InfoActions from 'src/services/info.actions'
import { NOID } from 'src/defaults'

export type BrowserName = 'firefox' | 'chrome'

const BROWSER_NAME: BrowserName =
  typeof browser.runtime.getBrowserInfo === 'function' ? 'firefox' : 'chrome'

interface InfoState {
  os: string
  addonVer: string
  browserName: BrowserName
}

export const Info = {
  reactive: {
    os: 'unknown',
    addonVer: browser.runtime.getManifest().version,
    browserName: BROWSER_NAME,
  } as InfoState,

  instanceType: InstanceType.unknown,
  isFirefox: BROWSER_NAME === 'firefox',
  isChrome: BROWSER_NAME === 'chrome',
  isSidebar: false,
  isSetup: false,
  isGroup: false,
  isProxy: false,
  isUrl: false,
  isBg: false,
  isSearch: false,
  isEditing: false,
  isPreview: false,
  isSync: false,
  isPanelConfig: false,

  majorVersion: undefined as number | undefined,
  prevMajorVersion: undefined as number | undefined,
  prevVersion: undefined as string | undefined,

  currentTabId: NOID,

  ...InfoActions,
}

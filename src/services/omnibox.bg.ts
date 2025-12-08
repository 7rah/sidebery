import { Container } from 'src/types'
import { InstanceType } from 'src/enums'
import { DEFAULT_CONTAINER, DEFAULT_CONTAINER_ID, NOID } from 'src/defaults'
import { translate } from 'src/dict'
import * as Containers from 'src/services/containers'
import * as IPC from 'src/services/ipc'
import * as Logs from 'src/services/logs'
import * as Utils from 'src/utils'
import * as Tabs from 'src/services/tabs.bg'
import * as Windows from 'src/services/windows.bg'

function setupListeners() {
  browser.omnibox.setDefaultSuggestion({
    description: translate('omnibox.container_switch.prompt'),
  })

  function matchContainers(input: string): Container[] {
    if (!input) return []

    const focusedWindow = Windows.byId.get(Windows.lastFocusedId ?? NOID)
    if (focusedWindow?.incognito) return []

    const activeTab = focusedWindow?.tabs?.find(t => t.active)
    const containers = Object.values(Containers.reactive.byId)

    if (activeTab?.cookieStoreId !== DEFAULT_CONTAINER_ID) {
      const defaultContainer = Utils.clone(DEFAULT_CONTAINER)
      defaultContainer.id = DEFAULT_CONTAINER_ID
      defaultContainer.cookieStoreId = DEFAULT_CONTAINER_ID
      defaultContainer.name = translate('omnibox.container_switch.default_conatiner')
      defaultContainer.color = 'toolbar'
      containers.unshift(defaultContainer)
    }

    return containers.filter(container => {
      if (activeTab && activeTab.cookieStoreId === container.id) return false
      return container.name.toLowerCase().includes(input.toLowerCase())
    })
  }

  browser.omnibox.onInputChanged.addListener((input, suggest) => {
    const suggestions = matchContainers(input).map(ctx => ({
      content: ctx.name,
      description: ctx.name,
      deletable: false,
    }))
    suggest(suggestions)
  })

  browser.omnibox.onInputEntered.addListener(async (input, _disposition) => {
    // NOTE: We're semantically _re-opening_ tabs, which conflicts with a disposition. Ignore it.

    if (Windows.lastFocusedId === NOID) {
      Logs.err('omnibox: no last focused window ID found')
      return
    }

    const matchingContainers = matchContainers(input)
    if (matchingContainers.length <= 0) {
      Logs.warn('omnibox: no matching containers found')
      return
    }
    const firstMatchingContainer = matchingContainers[0]

    const sidebarTabs = await Tabs.getSidebarTabs(Windows.lastFocusedId)
    if (!sidebarTabs) {
      Logs.err('omnibox: no sidebar tabs found for last focused window ID')
      return
    }

    const con = IPC.getConnection(InstanceType.sidebar, Windows.lastFocusedId)
    if ((con?.localPort && con.localPort.error) || (con?.remotePort && con.remotePort.error)) {
      Logs.err('need to fall back to creating tabs by hand')
      return
    }

    const activeTabs = sidebarTabs.filter(tab => tab.active)
    try {
      await IPC.sidebar(
        Windows.lastFocusedId,
        'reopenInContainer',
        activeTabs.map(tab => tab.id),
        firstMatchingContainer.id
      )
    } catch {
      Logs.warn('failed to re-open tabs', activeTabs, 'in container', firstMatchingContainer)
    }
  })
}

export { setupListeners }

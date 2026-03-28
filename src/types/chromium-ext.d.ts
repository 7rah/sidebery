declare namespace browser {
  namespace contextMenus {
    type ContextType = menus.ContextType
    type OnClickData = menus.OnClickData
    type ClickListener = menus.ClickListener

    interface CreateProperties extends menus.CreateProperties {}

    function removeAll(): void | Promise<void>
    function create(createProperties: CreateProperties): string | number

    const onClicked: EventTarget<ClickListener>
  }

  namespace sidePanel {
    interface PanelBehavior {
      openPanelOnActionClick?: boolean
    }

    interface PanelOptions {
      enabled?: boolean
      path?: string
      tabId?: ID
    }

    interface OpenOptions {
      tabId?: ID
      windowId?: ID
    }

    function setOptions(options: PanelOptions): Promise<void> | void
    function setPanelBehavior(behavior: PanelBehavior): Promise<void> | void
    function open(options?: OpenOptions): Promise<void> | void
  }

  namespace search {
    interface QueryInfo {
      text: string
      tabId?: ID
      disposition?: 'CURRENT_TAB' | 'NEW_TAB'
    }

    function query(info: QueryInfo): Promise<void> | void
  }
}

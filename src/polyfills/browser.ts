if (typeof globalThis.browser === 'undefined' && typeof globalThis.chrome !== 'undefined') {
  const chromeApi = globalThis.chrome as any

  if (!chromeApi.menus && chromeApi.contextMenus) {
    chromeApi.menus = chromeApi.contextMenus
  }

  if (!chromeApi.browserAction && chromeApi.action) {
    chromeApi.browserAction = chromeApi.action
  }

  if (!chromeApi.sidebarAction && chromeApi.sidePanel) {
    let isOpen = false

    chromeApi.sidebarAction = {
      setTitle() {
        // Chromium side panel does not allow custom titles yet
      },
      async toggle(details?: { windowId?: number }) {
        const targetWindowId = details?.windowId ?? chromeApi.windows?.WINDOW_ID_CURRENT
        if (!chromeApi.sidePanel) return

        if (isOpen) {
          try {
            await chromeApi.sidePanel.close?.({ windowId: targetWindowId })
          } catch (err) {
            console.warn('Sidebery: cannot close side panel', err)
          }
          isOpen = false
        } else {
          try {
            await chromeApi.sidePanel.open({ windowId: targetWindowId })
            isOpen = true
          } catch (err) {
            console.warn('Sidebery: cannot open side panel', err)
          }
        }
      },
    }
  }

  const wrapNamespace = (target: any, seen = new WeakMap()): any => {
    if (!target || typeof target !== 'object') return target
    if (seen.has(target)) return seen.get(target)

    const proxy = new Proxy(target, {
      get(obj, prop) {
        const value = obj[prop]

        if (typeof value === 'function') {
          return (...args: any[]) => {
            const lastArg = args[args.length - 1]
            if (typeof lastArg === 'function') {
              return value.apply(obj, args)
            }

            return new Promise((resolve, reject) => {
              const callback = (...cbArgs: any[]) => {
                const err = chromeApi.runtime?.lastError
                if (err) reject(new Error(err.message))
                else resolve(cbArgs.length > 1 ? cbArgs : cbArgs[0])
              }

              try {
                value.call(obj, ...args, callback)
              } catch (error) {
                reject(error)
              }
            })
          }
        }

        if (value && typeof value === 'object') {
          if ('addListener' in value && typeof value.addListener === 'function') {
            return value
          }
          return wrapNamespace(value, seen)
        }

        return value
      },
    })

    seen.set(target, proxy)
    return proxy
  }

  globalThis.browser = wrapNamespace(chromeApi)
}

export {}

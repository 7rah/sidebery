/* eslint no-console: off */
import fs from 'fs'
import path from 'path'
import { IS_DEV, ADDON_PATH, treeToList, watch, log, logOk, VUE_DIST, logErr } from './utils.js'

const COPY = {
  './src/manifest.json': {
    path: `${ADDON_PATH}/`,
    handler: handleManifest,
  },
  './src/_locales/dict.browser.json': {
    path: `${ADDON_PATH}/_locales/`,
    handler: handleLocales,
  },
  './src/assets/logo-native-dark.svg': `${ADDON_PATH}/assets/`,
  './src/assets/logo-native-light.svg': `${ADDON_PATH}/assets/`,
  './src/assets/logo-native.svg': `${ADDON_PATH}/assets/`,
  './src/assets/logo.svg': `${ADDON_PATH}/assets/`,
  './src/assets/group-page-favicon.svg': `${ADDON_PATH}/assets/`,
  './src/assets/snapshot-native.svg': `${ADDON_PATH}/assets/`,
  './src/assets/proxy-native.svg': `${ADDON_PATH}/assets/`,
  './src/assets/undo-native.svg': `${ADDON_PATH}/assets/`,
  './src/assets/window-native.svg': `${ADDON_PATH}/assets/`,
  './src/assets/private-window-native.svg': `${ADDON_PATH}/assets/`,
  [`./node_modules/vue/dist/${VUE_DIST}`]: `${ADDON_PATH}/vendor/`,
}

/**
 * ...
 */
async function build() {
  const entries = await parseEntries()
  await copyAllEntries(entries)
}

/**
 * ...
 */
async function copyAndWatch() {
  const entries = await parseEntries()
  await copyAllEntries(entries)

  const tasks = entries
    .filter(e => !e.srcIsDir)
    .map(e => {
      e.files = [e.src]
      return e
    })

  watch(
    tasks,
    affectedTasks => changeHandler(affectedTasks),
    (task, file) => {
      log(`Copy: File ${file} was renamed, restart this script`)
      tasks.forEach(t => t.watchers.forEach(w => w.close()))
    }
  )
}

/**
 * ...
 */
async function changeHandler(changedFiles) {
  for (const info of changedFiles) {
    log(`Copy: Changed source: ${info.src}`)
    await fs.promises.copyFile(info.src, info.dst)
  }
}

/**
 * ...
 */
async function parseEntries() {
  const entriesInfo = []
  for (const src of Object.keys(COPY)) {
    const srcStats = await fs.promises.stat(src)
    const info = { src, srcIsDir: srcStats.isDirectory() }

    const dst = COPY[src]
    let dstPath
    if (typeof dst === 'string') dstPath = dst
    else {
      dstPath = dst.path
      if (dst.handler) info.srcHandler = dst.handler
    }

    if (dstPath) {
      info.dst = path.resolve(dstPath)
      if (dstPath.endsWith('/')) {
        info.destDir = info.dst
        if (!info.srcIsDir) info.dst = path.join(info.dst, path.basename(src))
      } else {
        info.destDir = path.dirname(info.dst)
      }
    }

    entriesInfo.push(info)
  }
  return entriesInfo
}

/**
 * ...
 */
async function copyAllEntries(entries) {
  for (const info of entries) {
    await copyEntry(info)
  }
}

/**
 * ...
 */
async function copyEntry(info) {
  await fs.promises.mkdir(info.destDir, { recursive: true })

  const normSrc = path.normalize(info.src)

  if (info.srcIsDir) {
    for (const f of await treeToList(normSrc)) {
      const destDir = path.normalize(f.dir.replace(normSrc, info.dst + path.sep))

      if (f.file) {
        const srcPath = path.join(f.dir, f.file)
        const dstPath = path.join(destDir, f.file)
        if (info.srcHandler) await info.srcHandler(srcPath, dstPath)
        else await fs.promises.copyFile(srcPath, dstPath)
      } else await fs.promises.mkdir(destDir, { recursive: true })
    }
  } else {
    if (info.srcHandler) await info.srcHandler(info.src, info.dst)
    else await fs.promises.copyFile(info.src, info.dst)
  }
}

/**
 * Main
 */
function main() {
  log('Copy: Copying')

  if (IS_DEV) {
    copyAndWatch()
    logOk('Copy: Watching')
  } else {
    build()
    logOk('Copy: Done')
  }
}
main()

async function handleManifest(srcPath, dstPath) {
  const forChromium = process.argv.includes('--chromium')

  // Parse and patch manifest for chromium-based browser
  if (forChromium) {
    const srcData = await fs.promises.readFile(srcPath, 'utf-8')
    const data = JSON.parse(srcData)

    // Base adjustments for Chromium MV3
    data.manifest_version = 3
    delete data.page_action
    delete data.browser_specific_settings

    const browserAction = data.browser_action ?? {}
    data.action = {
      default_icon: browserAction.default_icon,
      default_title: browserAction.default_title,
      theme_icons: browserAction.theme_icons,
    }
    delete data.browser_action

    if (data.sidebar_action?.default_panel) {
      data.side_panel = { default_path: data.sidebar_action.default_panel }
    }
    delete data.sidebar_action

    data.background = {
      service_worker: 'bg/background.js',
      type: 'module',
    }

    const commands = data.commands ?? {}
    for (const key of Object.keys(commands)) {
      const cmd = commands[key]
      if (!cmd) continue
      if (cmd.suggested_key) {
        if (key === '_execute_sidebar_action' && cmd.suggested_key.windows) {
          cmd.suggested_key.windows = cmd.suggested_key.default
        } else {
          delete cmd.suggested_key
        }
      }
    }

    const permissions = new Set(data.permissions ?? [])
    permissions.delete('contextualIdentities')
    permissions.delete('tabHide')
    permissions.delete('menus.overrideContext')
    permissions.delete('theme')
    if (permissions.delete('menus')) permissions.add('contextMenus')
    permissions.add('sidePanel')
    data.permissions = Array.from(permissions)

    const optionalPermissions = new Set(data.optional_permissions ?? [])
    optionalPermissions.delete('tabHide')
    data.optional_permissions = Array.from(optionalPermissions)

    const allUrlsIndex = data.optional_permissions.indexOf('<all_urls>')
    if (allUrlsIndex !== -1) data.optional_permissions.splice(allUrlsIndex, 1)
    data.host_permissions = ['<all_urls>']

    data.web_accessible_resources = [
      {
        resources: ['**/*'],
        matches: ['<all_urls>'],
      },
    ]

    const dstData = JSON.stringify(data, null, 2)
    await fs.promises.writeFile(dstPath, dstData)
  }

  // Copy
  else {
    return fs.promises.copyFile(srcPath, dstPath)
  }
}

async function handleLocales(srcPath, dstPath) {
  const dirPath = path.dirname(dstPath)
  const srcData = await fs.promises.readFile(srcPath, 'utf-8')
  const jsonData = JSON.parse(srcData)

  const langs = {}

  for (const key of Object.keys(jsonData)) {
    const dict = jsonData[key]
    if (!dict || typeof dict !== 'object') {
      logErr(`Copy: Locales: No dictionary for: ${key}`)
      break
    }

    for (const lang of Object.keys(dict)) {
      if (!langs[lang]) langs[lang] = {}
      langs[lang][key] = { message: dict[lang] }
    }
  }

  for (const lang of Object.keys(langs)) {
    const dict = langs[lang]
    const jsonStr = JSON.stringify(dict)
    await fs.promises.mkdir(path.join(dirPath, lang), { recursive: true })
    await fs.promises.writeFile(path.join(dirPath, lang, 'messages.json'), jsonStr)
  }
}

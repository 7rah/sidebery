<template lang="pug">
.Settings
  section(ref="el")
    h2
      span {{translate('settings.storage_title')}}
      .title-note   (~{{state.storageOveral}})
    span.header-shadow
    .storage-section
      .storage-prop(v-for="info in state.storedProps" @click="openStoredData(info.name)")
        .name {{info.name}}
        .len(v-if="info.len") {{info.len}}
        .size {{info.sizeStr}}
        .btn.-warn(@click.stop="deleteStoredData(info.name)") {{translate('settings.storage_delete_prop')}}

    .ctrls
      .btn(@click="calcStorageInfo") {{translate('settings.update_storage_info')}}
      .btn.-warn(@click="clearStorage") {{translate('settings.clear_storage_info')}}

    .storage-section(v-if="state.faviconsCache.length")
      .sub-title: .text {{translate('settings.favs_title')}}
      .favs
        .fav(v-for="fav in state.faviconsCache" :key="fav.tooltip" :title="fav.tooltip")
          img(:src="fav.favicon")
    
    .ctrls(v-if="state.faviconsCache.length")
      .btn(@click="calcStorageInfo") {{translate('settings.update_storage_info')}}
      .btn.-warn(@click="clearFaviconsCache") {{translate('settings.clear_favicons_cache')}}

  section(v-if="Settings.state.syncUseGoogleDrive")
    h2 Google Drive Files
    span.header-shadow
    .storage-section
      .storage-prop(
        v-for="info in state.googleDriveFiles"
        :title="info.tooltip"
        :data-loading="info.loading"
        :data-profile-without-data="info.profileInfoWithoutData"
        @click="openStoredData(info.name)")
        .left-group
          .name {{info.name}}
          .profile ({{info.profile}})
        .right-group
          .time {{info.timeStr}}
          .size {{info.sizeStr}}
        .btn.-warn(@click.stop="deleteGoogleDriveFile(info)") {{translate('settings.storage_delete_prop')}}

    .ctrls
      .btn(@click="loadGoogleDriveFiles") Update

  FooterSection
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { translate } from 'src/dict'
import * as Utils from 'src/utils'
import { Stored } from 'src/types'
import { Store } from 'src/services/storage'
import { SetupPage } from 'src/services/setup-page'
import { Settings } from 'src/services/settings'
import * as Logs from 'src/services/logs'
import FooterSection from './footer-section.vue'
import { Google, Sync } from 'src/services/_services'

interface GoogleDriveFileInfo {
  id: string
  name: string
  profile: string
  profileId: string
  profileInfoWithoutData: boolean
  isProfile: boolean
  size: number
  sizeStr: string
  time: number
  timeStr: string
  tooltip: string
  loading: boolean
}

const el = ref<HTMLElement | null>(null)
const state = reactive({
  storedProps: [] as { name: string; size: number; sizeStr: string; len: string }[],
  storageOveral: '-',
  faviconsCache: [] as { favicon: string; tooltip: string }[],
  googleDriveFiles: [] as GoogleDriveFileInfo[],
})

onMounted(() => {
  SetupPage.registerEl('settings_storage', el.value)
  calcStorageInfo()
})

async function calcStorageInfo(): Promise<void> {
  let stored: Stored
  try {
    stored = await browser.storage.local.get<Stored>()
  } catch (err) {
    return
  }

  state.storageOveral = Utils.strSize(JSON.stringify(stored))
  state.storedProps = Object.keys(stored)
    .map(key => {
      const value = stored[key as keyof Stored]
      const size = new Blob([JSON.stringify(value)]).size
      const len = Array.isArray(value) ? `(${value.length as number}) ` : ''
      return { name: key, size, len, sizeStr: '~' + Utils.strSize(JSON.stringify(value)) }
    })
    .sort((a, b) => b.size - a.size)

  state.faviconsCache = []
  if (stored.favicons_01 && stored.favDomains) {
    const fullList = [
      ...(stored.favicons_01 ?? []),
      ...(stored.favicons_02 ?? []),
      ...(stored.favicons_03 ?? []),
      ...(stored.favicons_04 ?? []),
      ...(stored.favicons_05 ?? []),
    ]
    const favsDomainsInfo: { domain: string; index: number; len: number }[][] = []
    for (const d of Object.keys(stored.favDomains)) {
      const domainInfo = stored.favDomains[d]
      const fdi = favsDomainsInfo[domainInfo.index]
      if (fdi) fdi.push({ domain: d, ...domainInfo })
      else favsDomainsInfo[domainInfo.index] = [{ domain: d, ...domainInfo }]
    }
    for (let fav, domains, i = 0; i < fullList.length; i++) {
      fav = fullList[i]
      domains = favsDomainsInfo[i]
      const tooltipInfo = []
      if (fav) {
        tooltipInfo.push(`${fav.substring(0, 32)}...\nSize: ${Utils.sizeToString(fav.length)}`)
      }
      if (domains?.length) {
        const index = domains[0].index
        tooltipInfo.push(`Index: ${index}`)

        for (const domain of domains) {
          tooltipInfo.push(`Domain: ${domain.domain} | src url len: ${domain.len}`)
        }
      }
      state.faviconsCache.push({ favicon: fav, tooltip: tooltipInfo.join('\n') })
    }
  }
}

async function openStoredData(prop: string): Promise<void> {
  let stored
  try {
    stored = await browser.storage.local.get<Stored>(prop)
  } catch (err) {
    SetupPage.reactive.detailsTitle = 'Error: Cannot get value'
    SetupPage.reactive.detailsText = String(err)
    return
  }
  if (stored && stored[prop as keyof Stored] !== undefined) {
    SetupPage.reactive.detailsMode = 'view'
    SetupPage.reactive.detailsTitle = prop
    SetupPage.reactive.detailsText = JSON.stringify(stored[prop as keyof Stored], null, 2)
    SetupPage.reactive.detailsEdit = (newValue: string) => {
      let json
      try {
        json = JSON.parse(newValue) as unknown
      } catch (err) {
        return Logs.err('Settings.Storage: Cannot parse json', err)
      }

      Store.set({ [prop]: json })
    }
  }
}

async function deleteStoredData(prop: string): Promise<void> {
  if (window.confirm(translate('settings.storage_delete_confirm') + `"${prop}"?`)) {
    try {
      await browser.storage.local.remove(prop)
    } catch (err) {
      return Logs.err('deleteStoredData: Cannot remove value', err)
    }
    calcStorageInfo()
  }
}

async function clearStorage(): Promise<void> {
  if (!window.confirm(translate('settings.clear_storage_confirm'))) return

  try {
    await browser.storage.local.clear()
  } catch (err) {
    return Logs.err('clearStorage: Cannot clean storage', err)
  }
  browser.runtime.reload()
}

async function clearFaviconsCache() {
  if (!window.confirm(translate('settings.clear_favicons_cache_confirm'))) return

  try {
    await browser.storage.local.remove([
      'favDomains',
      'favHashes',
      'favicons_01',
      'favicons_02',
      'favicons_03',
      'favicons_04',
      'favicons_05',
    ])
  } catch (err) {
    return Logs.err('clearStorage: Cannot clean favicons', err)
  }
  browser.runtime.reload()
}

async function loadGoogleDriveFiles(): Promise<void> {
  const files = await Google.Drive.listFiles({
    fields: ['id', 'name', 'size', 'modifiedTime', 'appProperties'],
  })
  if (!files) return

  const profileNames: Record<ID, string> = {}
  const filesInfo = files.map(f => {
    let size = 0
    if (f.size) size = parseInt(f.size)
    if (isNaN(size)) size = 0

    let time = 0
    let modDate
    if (f.modifiedTime) {
      modDate = new Date(f.modifiedTime)
      time = modDate.getTime()
    }

    let name, profileId, isProfileInfo
    if (f.appProperties) {
      if (f.appProperties.profileId) profileId = f.appProperties.profileId
      if (f.appProperties.type === 'profile-info') {
        name = 'Profile Info'
        isProfileInfo = true
        profileNames[f.appProperties.profileId] = f.appProperties.profileName
      } else if (f.appProperties.type === 'settings') name = 'Settings'
      else if (f.appProperties.type === 'ctx-menu') name = 'Context Menu'
      else if (f.appProperties.type === 'keybindings') name = 'Keybindings'
      else if (f.appProperties.type === 'styles') name = 'Styles'
      else if (f.appProperties.type === 'tabs') name = 'Tabs'
    }

    return {
      id: f.id ?? '',
      name: name ?? f.name ?? '???',
      profile: '',
      profileId: profileId ?? '',
      profileInfoWithoutData: false,
      isProfile: !!isProfileInfo,
      size: size,
      sizeStr: Utils.sizeToString(size),
      time,
      timeStr: modDate ? `${Utils.dDate(modDate)} - ${Utils.dTime(modDate)}` : '???',
      loading: false,
      tooltip: f.name ?? '',
    }
  })

  for (const info of filesInfo) {
    const profileName = profileNames[info.profileId]
    if (profileName) info.profile = profileName
    else info.profile = info.profileId
  }

  filesInfo.sort((a, b) => (b.time ?? 0) - (a.time ?? 0))

  checkIfProfileInfoIsUseless(filesInfo)

  state.googleDriveFiles = filesInfo
}

function checkIfProfileInfoIsUseless(files?: GoogleDriveFileInfo[]) {
  if (!files) files = state.googleDriveFiles
  for (const fileInfo of files) {
    if (!fileInfo.isProfile) continue
    const p = files.find(f => !f.isProfile && f.profileId === fileInfo.profileId)
    fileInfo.profileInfoWithoutData = !p
  }
}

async function deleteGoogleDriveFile(file: GoogleDriveFileInfo) {
  if (file.loading) return
  file.loading = true

  try {
    await Google.Drive.deleteFile(file.id)
    await Sync.Google.removeCachedId(file.id)
    await Utils.sleep(250)
    await loadGoogleDriveFiles()
  } finally {
    file.loading = false
  }
}
</script>

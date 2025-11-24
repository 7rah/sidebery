import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { Sidebar } from './sidebar'
import { BOOKMARKS_PANEL_STATE, DEFAULT_SETTINGS, TABS_PANEL_STATE } from 'src/defaults'
import * as Utils from 'src/utils'
import { Settings } from './settings'

describe('Sidebar.switchPanel()', () => {
  beforeEach(() => {
    Settings.state.navSwitchPanelsDelay = 0
    Settings.state.hideEmptyPanels = false
    Settings.state.hideDiscardedTabPanels = false
    Sidebar.ready = true

    Sidebar.activePanelId = 'a'
    Sidebar.nav = ['a', 'b', 'c', 'd']
    Sidebar.panelsById = {
      a: { ...Utils.clone(TABS_PANEL_STATE), id: 'a' },
      b: { ...Utils.clone(TABS_PANEL_STATE), id: 'b', skipOnSwitching: true },
      c: { ...Utils.clone(TABS_PANEL_STATE), id: 'c' },
      d: { ...Utils.clone(TABS_PANEL_STATE), id: 'd', hidden: true },
    }
    Sidebar.panels = Sidebar.nav.map(id => Sidebar.panelsById[id])
    Sidebar.hasTabs = true
  })

  afterEach(() => {
    Settings.state = Utils.cloneObject(DEFAULT_SETTINGS)
  })

  test('to the next panel', () => {
    Sidebar.activePanelId = 'a'
    Sidebar.switchPanel(1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('c')
  })
  test('to the prev panel', () => {
    Sidebar.activePanelId = 'c'
    Sidebar.switchPanel(-1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('a')
  })

  test('to the next panel without looping', () => {
    Sidebar.activePanelId = 'd'
    Sidebar.switchPanel(1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('d')
  })
  test('to the prev panel without looping', () => {
    Sidebar.activePanelId = 'a'
    Sidebar.switchPanel(-1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('a')
  })

  test('to the prev cyclically', () => {
    Sidebar.activePanelId = 'a'
    Sidebar.switchPanel(-1, false, false, false, true)
    expect(Sidebar.activePanelId).toBe('d')
  })
  test('to the next cyclically', () => {
    Sidebar.activePanelId = 'd'
    Sidebar.switchPanel(1, false, false, false, true)
    expect(Sidebar.activePanelId).toBe('a')
  })
  test('cyclically through the list', () => {
    Sidebar.activePanelId = 'a'
    Sidebar.switchPanel(1, false, false, false, true)
    expect(Sidebar.activePanelId).toBe('c')
    Sidebar.switchPanel(1, false, false, false, true)
    expect(Sidebar.activePanelId).toBe('d')
  })

  test('ignoring hidden panels', () => {
    Sidebar.activePanelId = 'a'
    Sidebar.switchPanel(1, true, false, false, false)
    expect(Sidebar.activePanelId).toBe('c')

    Sidebar.switchPanel(1, true, false, false, false)
    expect(Sidebar.activePanelId).toBe('c')

    Sidebar.switchPanel(1, true, false, false, true)
    expect(Sidebar.activePanelId).toBe('a')

    Sidebar.switchPanel(-1, true, false, false, true)
    expect(Sidebar.activePanelId).toBe('c')
  })

  test('with the hidden panels popup after "a", ignoring hidden panels', () => {
    Settings.state.navBarInline = false
    Sidebar.activePanelId = 'a'
    Sidebar.nav = ['a', 'hdn', 'b', 'c', 'd']

    Sidebar.switchPanel(1, true, false, false, false)
    expect(Sidebar.activePanelId).toBe('c')
    Sidebar.switchPanel(-1, true, false, false, false)
    expect(Sidebar.activePanelId).toBe('a')
  })

  test('with the hidden panels popup after "a", opening/closing the hidden panels popup', () => {
    Settings.state.navBarInline = false
    Sidebar.activePanelId = 'a'
    Sidebar.nav = ['a', 'hdn', 'b', 'c', 'd']

    Sidebar.switchPanel(1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('d')
    expect(Sidebar.reactive.hiddenPanelsPopup).toBe(true)
    Sidebar.switchPanel(1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('c')
    expect(Sidebar.reactive.hiddenPanelsPopup).toBe(false)
    Sidebar.switchPanel(-1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('d')
    expect(Sidebar.reactive.hiddenPanelsPopup).toBe(true)
    Sidebar.switchPanel(-1, false, false, false, false)
    expect(Sidebar.activePanelId).toBe('a')
    expect(Sidebar.reactive.hiddenPanelsPopup).toBe(false)
  })

  test("looping without ignoring hidden panels, when there's no hidden panels", () => {
    Sidebar.activePanelId = 'a'
    Sidebar.nav = ['a', 'b', 'c']

    Sidebar.switchPanel(-1, false, false, false, true)
    expect(Sidebar.activePanelId).toBe('c')
    expect(Sidebar.reactive.hiddenPanelsPopup).toBe(false)
  })

  test('looping forward when the first panel is a bookmarks panel set to be skipped', () => {
    Sidebar.activePanelId = 'c'
    Sidebar.nav = ['a', 'b', 'c']
    Sidebar.panelsById = {
      a: { ...Utils.clone(BOOKMARKS_PANEL_STATE), id: 'a', skipOnSwitching: true },
      b: { ...Utils.clone(TABS_PANEL_STATE), id: 'b' },
      c: { ...Utils.clone(TABS_PANEL_STATE), id: 'c' },
    }
    Sidebar.panels = Sidebar.nav.map(id => Sidebar.panelsById[id])
    Sidebar.hasTabs = true
    Sidebar.hasBookmarks = true

    Sidebar.switchPanel(1, true, false, false, true)
    expect(Sidebar.activePanelId).toBe('b')
  })

  test('looping backward when the first panel is a bookmarks panel set to be skipped', () => {
    Sidebar.activePanelId = 'b'
    Sidebar.nav = ['a', 'b', 'c']
    Sidebar.panelsById = {
      a: { ...Utils.clone(BOOKMARKS_PANEL_STATE), id: 'a', skipOnSwitching: true },
      b: { ...Utils.clone(TABS_PANEL_STATE), id: 'b' },
      c: { ...Utils.clone(TABS_PANEL_STATE), id: 'c' },
    }
    Sidebar.panels = Sidebar.nav.map(id => Sidebar.panelsById[id])
    Sidebar.hasTabs = true
    Sidebar.hasBookmarks = true

    Sidebar.switchPanel(-1, true, false, false, true)
    expect(Sidebar.activePanelId).toBe('c')
  })

  test('looping backward when the last panel is a bookmarks panel set to be skipped', () => {
    Sidebar.activePanelId = 'a'
    Sidebar.nav = ['a', 'b', 'c']
    Sidebar.panelsById = {
      a: { ...Utils.clone(TABS_PANEL_STATE), id: 'a' },
      b: { ...Utils.clone(TABS_PANEL_STATE), id: 'b' },
      c: { ...Utils.clone(BOOKMARKS_PANEL_STATE), id: 'c', skipOnSwitching: true },
    }
    Sidebar.panels = Sidebar.nav.map(id => Sidebar.panelsById[id])
    Sidebar.hasTabs = true
    Sidebar.hasBookmarks = true

    Sidebar.switchPanel(-1, true, false, false, true)
    expect(Sidebar.activePanelId).toBe('b')
  })
})

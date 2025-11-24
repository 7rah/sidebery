import { afterEach, describe, expect, test } from 'vitest'
import { Tabs } from './tabs.fg'
import { Keybindings } from './_services'
import { Selection } from './_services.fg'
import { MTab } from './tabs.fg.test'

describe('Keybindings.onKeySelectTabsBranch()', () => {
  afterEach(() => {
    Tabs.list = []
    Tabs.byId = {}
    Selection.resetSelection()
  })

  test('Select branch of active non-parent tab', () => {
    Tabs.list = [new MTab({ id: 2, index: 0, active: true }), new MTab({ id: 3, index: 1 })]
    Tabs.list.forEach(t => (Tabs.byId[t.id] = t))
    Tabs.activeId = 2

    Keybindings.TESTING.onKeySelectTabsBranch()
    expect(Tabs.byId[2]?.sel).toBe(true)
    expect(Tabs.byId[3]?.sel).toBe(false)
  })

  test('Select branch of active parent tab', () => {
    Tabs.list = [
      new MTab({ id: 2, index: 0, active: true, isParent: true }),
      new MTab({ id: 3, index: 1, parentId: 2, lvl: 1 }),
    ]
    Tabs.list.forEach(t => (Tabs.byId[t.id] = t))
    Tabs.activeId = 2

    Keybindings.TESTING.onKeySelectTabsBranch()
    expect(Tabs.byId[2]?.sel).toBe(true)
    expect(Tabs.byId[3]?.sel).toBe(true)
  })

  test('Select branch of selected parent tab', () => {
    Tabs.list = [
      new MTab({ id: 2, index: 0, active: true }),
      new MTab({ id: 3, index: 1, isParent: true }),
      new MTab({ id: 4, index: 2, parentId: 3, lvl: 1 }),
      new MTab({ id: 5, index: 3, parentId: 3, lvl: 1 }),
      new MTab({ id: 6, index: 4 }),
    ]
    Tabs.list.forEach(t => (Tabs.byId[t.id] = t))
    Tabs.activeId = 2
    Selection.selectTab(3)

    Keybindings.TESTING.onKeySelectTabsBranch()
    expect(Tabs.byId[2]?.sel).toBe(false)
    expect(Tabs.byId[3]?.sel).toBe(true)
    expect(Tabs.byId[4]?.sel).toBe(true)
    expect(Tabs.byId[5]?.sel).toBe(true)
    expect(Tabs.byId[6]?.sel).toBe(false)
  })

  test('Select multiple branches of selected tabs', () => {
    Tabs.list = [
      new MTab({ id: 2, index: 0, active: true }),
      new MTab({ id: 3, index: 1, isParent: true }),
      new MTab({ id: 4, index: 2, parentId: 3, lvl: 1, isParent: true }),
      new MTab({ id: 5, index: 3, parentId: 4, lvl: 2 }),
      new MTab({ id: 6, index: 4, isParent: true }),
      new MTab({ id: 7, index: 5, parentId: 6, lvl: 1 }),
    ]
    Tabs.list.forEach(t => (Tabs.byId[t.id] = t))
    Tabs.activeId = 2
    Selection.selectTab(2)
    Selection.selectTab(3)
    Selection.selectTab(6)

    Keybindings.TESTING.onKeySelectTabsBranch()
    expect(Selection.ids()).toStrictEqual([2, 3, 4, 5, 6, 7])
  })
})

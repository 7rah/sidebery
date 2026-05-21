import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getNativeTabChange } from 'src/services/tabs.fg.native-sync'

describe('tabs native sync', () => {
  it('builds change info for native tab drift', () => {
    const localTab = {
      audible: true,
      discarded: false,
      favIconUrl: 'old-icon',
      hidden: false,
      mutedInfo: { muted: false },
      pinned: false,
      status: 'loading',
      title: 'old title',
      url: 'https://old.example/',
    }
    const nativeTab = {
      audible: false,
      discarded: true,
      favIconUrl: 'new-icon',
      hidden: false,
      mutedInfo: { muted: true },
      pinned: false,
      status: 'complete',
      title: 'new title',
      url: 'https://new.example/',
    }

    assert.deepEqual(getNativeTabChange(localTab, nativeTab), {
      audible: false,
      discarded: true,
      favIconUrl: 'new-icon',
      mutedInfo: { muted: true },
      status: 'complete',
      title: 'new title',
      url: 'https://new.example/',
    })
  })

  it('ignores absent optional native fields', () => {
    const localTab = {
      audible: true,
      discarded: true,
      favIconUrl: 'old-icon',
      hidden: false,
      mutedInfo: { muted: true },
      pinned: false,
      status: 'loading',
      title: 'title',
      url: 'https://example.com/',
    }
    const nativeTab = {
      hidden: false,
      pinned: false,
      title: 'title',
      url: 'https://example.com/',
    }

    assert.equal(getNativeTabChange(localTab, nativeTab), undefined)
  })
})

import { createElement } from 'react'
import { act, create } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const doubles = vi.hoisted(() => ({
  loaded: false,
  switched: false,
  canGoBack: true,
  opens: 0,
  calls: [] as string[],
  afterClose: null as (() => boolean) | null
}))

vi.mock('expo-router', () => ({
  useRouter: () => ({
    canGoBack: () => doubles.canGoBack,
    back: () => doubles.calls.push('back'),
    dismissTo: (href: string) => doubles.calls.push(`dismissTo ${href}`)
  })
}))
vi.mock('./use-host-switcher', () => ({
  useHostSwitcher: () => ({
    canSwitch: true,
    loaded: doubles.loaded,
    open: openSwitcher,
    pickerProps: { onAfterClose: () => doubles.switched }
  })
}))
vi.mock('./host-switcher-sheet', () => ({
  HostSwitcherSheet: ({
    switcher
  }: {
    switcher: { pickerProps: { onAfterClose: () => boolean } }
  }) => {
    doubles.afterClose = switcher.pickerProps.onAfterClose
    return null
  }
}))

function openSwitcher() {
  doubles.opens += 1
}

import { SwitchDesktopScreen } from './switch-desktop-screen'

async function mount() {
  const element = () => createElement(SwitchDesktopScreen, { fromHostId: 'studio' })
  let renderer: ReturnType<typeof create> | null = null
  await act(async () => {
    renderer = create(element())
  })
  return {
    rerender: async () => {
      await act(async () => {
        renderer?.update(element())
      })
    },
    close: () => doubles.afterClose?.()
  }
}

beforeEach(() => {
  Object.assign(doubles, {
    loaded: true,
    switched: false,
    canGoBack: true,
    opens: 0,
    calls: [],
    afterClose: null
  })
})

describe('the switch-desktop screen', () => {
  it('opens the sheet only once the desktop list has loaded', async () => {
    doubles.loaded = false
    const screen = await mount()
    expect(doubles.opens).toBe(0)
    doubles.loaded = true
    await screen.rerender()
    expect(doubles.opens).toBe(1)
  })

  it('returns to the page when closed without a switch', async () => {
    const screen = await mount()
    screen.close()
    expect(doubles.calls).toEqual(['back'])
  })

  it('goes home when a link opened it with nothing beneath', async () => {
    doubles.canGoBack = false
    const screen = await mount()
    screen.close()
    expect(doubles.calls).toEqual(['dismissTo /'])
  })

  it('leaves navigation to the switch when one happened', async () => {
    doubles.switched = true
    const screen = await mount()
    screen.close()
    expect(doubles.calls).toEqual([])
  })
})

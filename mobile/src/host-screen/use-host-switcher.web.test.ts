import { createElement } from 'react'
import { act, create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'

const doubles = vi.hoisted(() => ({
  session: null as { hostSwitcher: boolean } | null,
  pushed: [] as string[]
}))

vi.mock('../transport/client-context.web', () => ({
  usePageBridgeClientIfPresent: () => ({ getShellSession: () => doubles.session })
}))
vi.mock('../navigation/route-handoff', () => ({
  useRouteHandoff: () => ({ push: (href: string) => doubles.pushed.push(href) })
}))

import type { HostSwitcher } from './use-host-switcher'
import { useHostSwitcher } from './use-host-switcher.web'

async function mount(hostId: string): Promise<HostSwitcher> {
  const latest: { current: HostSwitcher | null } = { current: null }
  function Probe() {
    latest.current = useHostSwitcher(hostId, null)
    return null
  }
  await act(async () => {
    create(createElement(Probe))
  })
  if (latest.current === null) {
    throw new Error('hook did not render')
  }
  return latest.current
}

describe("the page's desktop switcher", () => {
  it('stays hidden unless the shell says another desktop exists', async () => {
    doubles.session = null
    expect((await mount('studio')).canSwitch).toBe(false)
    doubles.session = { hostSwitcher: false }
    expect((await mount('studio')).canSwitch).toBe(false)
  })

  it("opens the shell's switcher screen for this desktop", async () => {
    doubles.session = { hostSwitcher: true }
    doubles.pushed = []
    const switcher = await mount('wt/1')
    expect(switcher.canSwitch).toBe(true)
    switcher.open()
    expect(doubles.pushed).toEqual(['/switch-desktop?from=wt%2F1'])
  })
})

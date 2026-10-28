import { createElement } from 'react'
import { act, create } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HostCatalogEntry } from '../transport/types'

const doubles = vi.hoisted(() => ({
  catalog: [] as HostCatalogEntry[],
  loads: 0,
  ctx: {
    primeHosts: () => {},
    getKnownState: () => 'connected' as const,
    subscribeHostState: () => () => {}
  }
}))

vi.mock('../transport/client-context', () => ({ useRpcClientContext: () => doubles.ctx }))
vi.mock('../transport/host-store', () => ({
  loadHostCatalog: async () => {
    doubles.loads += 1
    return doubles.catalog
  }
}))

import { useHostSwitcher, type HostSwitcher } from './use-host-switcher'

function entry(
  id: string,
  lastConnected: number,
  credentialStatus: HostCatalogEntry['credentialStatus'] = 'ready'
): HostCatalogEntry {
  const stored = {
    id,
    name: id,
    endpoint: `ws://10.0.0.1:6768/${id}`,
    publicKeyB64: `key-${id}`,
    lastConnected
  }
  return {
    ...stored,
    credentialStatus,
    profile: credentialStatus === 'ready' ? { ...stored, deviceToken: 'token' } : null
  }
}

async function mount(currentHostId: string) {
  const router = { calls: [] as string[] }
  const routerApi = {
    dismissTo: (href: '/') => router.calls.push(`dismissTo ${href}`),
    push: (href: `/h/${string}`) => router.calls.push(`push ${href}`)
  }
  const latest: { current: HostSwitcher | null } = { current: null }
  function Probe() {
    latest.current = useHostSwitcher(currentHostId, routerApi)
    return null
  }
  await act(async () => {
    create(createElement(Probe))
  })
  const switcher = () => {
    if (latest.current === null) {
      throw new Error('hook did not render')
    }
    return latest.current
  }
  return { router, switcher }
}

async function pickThenClose(
  { switcher }: Awaited<ReturnType<typeof mount>>,
  hostId: string | null
) {
  await act(async () => switcher().open())
  await act(async () => {
    if (hostId !== null) {
      switcher().pickerProps.onSelect(hostId)
    }
    switcher().pickerProps.onClose()
  })
  await act(async () => switcher().pickerProps.onAfterClose())
}

beforeEach(() => {
  doubles.loads = 0
  doubles.catalog = [
    entry('studio', 10),
    entry('locked', 99, 'temporarily-unavailable'),
    entry('laptop', 50)
  ]
})

describe('useHostSwitcher', () => {
  it('lists connectable desktops newest first and leaves out ones whose login is unavailable', async () => {
    const { switcher } = await mount('studio')
    expect(switcher().canSwitch).toBe(true)
    expect(switcher().pickerProps.options.map((option) => option.value)).toEqual([
      'laptop',
      'studio'
    ])
  })

  it('is not offered when no other connectable desktop exists', async () => {
    doubles.catalog = [entry('studio', 10), entry('locked', 99, 'temporarily-unavailable')]
    expect((await mount('studio')).switcher().canSwitch).toBe(false)
  })

  it('is still offered when the current desktop itself dropped out of the list', async () => {
    doubles.catalog = [entry('studio', 10, 'temporarily-unavailable'), entry('laptop', 50)]
    expect((await mount('studio')).switcher().canSwitch).toBe(true)
  })

  it('goes home and then opens the picked desktop, only after the sheet closes', async () => {
    const mounted = await mount('studio')
    await pickThenClose(mounted, 'laptop')
    expect(mounted.router.calls).toEqual(['dismissTo /', 'push /h/laptop'])
  })

  it('stays put when the current desktop is picked or nothing is picked', async () => {
    const mounted = await mount('studio')
    await pickThenClose(mounted, 'studio')
    await pickThenClose(mounted, null)
    expect(mounted.router.calls).toEqual([])
  })

  it('drops a pick that was unpaired while the sheet was open', async () => {
    const mounted = await mount('studio')
    await act(async () => mounted.switcher().open())
    doubles.catalog = [entry('studio', 10), entry('desk', 20)]
    await act(async () => mounted.switcher().open())
    await act(async () => {
      mounted.switcher().pickerProps.onSelect('laptop')
      mounted.switcher().pickerProps.onClose()
    })
    await act(async () => mounted.switcher().pickerProps.onAfterClose())
    expect(mounted.router.calls).toEqual([])
  })

  it('reloads the desktop list on mount and on open, not on close', async () => {
    const mounted = await mount('studio')
    await pickThenClose(mounted, null)
    expect(doubles.loads).toBe(2)
  })
})

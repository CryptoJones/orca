import { describe, expect, it } from 'vitest'
import type { HostCatalogEntry } from '../transport/types'
import { hostSwitcherHosts, hostSwitcherOptions } from './host-switcher-options'

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

describe('host switcher options', () => {
  it('offers connectable desktops newest first, each with its live connection state', () => {
    const hosts = hostSwitcherHosts([
      entry('studio', 10),
      entry('locked', 99, 'temporarily-unavailable'),
      entry('laptop', 50)
    ])
    const states = { laptop: 'connected', studio: 'reconnecting' } as const
    expect(
      hostSwitcherOptions(hosts, (hostId) =>
        hostId === 'laptop' || hostId === 'studio' ? states[hostId] : 'disconnected'
      ).map(({ value, state }) => ({ value, state }))
    ).toEqual([
      { value: 'laptop', state: 'connected' },
      { value: 'studio', state: 'reconnecting' }
    ])
  })
})

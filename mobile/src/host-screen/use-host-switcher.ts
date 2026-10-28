import { useCallback, useEffect, useRef, useState } from 'react'
import { switchHostRoute } from '../host-route-exit'
import { useRpcClientContext } from '../transport/client-context'
import { loadHostCatalog } from '../transport/host-store'
import type { ConnectionState, HostProfile } from '../transport/types'
import { hostSwitcherHosts, hostSwitcherOptions } from './host-switcher-options'

type HostSwitcherRouter = Parameters<typeof switchHostRoute>[0]

export type HostSwitcher = ReturnType<typeof useHostSwitcher>

export function useHostSwitcher(currentHostId: string | undefined, router: HostSwitcherRouter) {
  const ctx = useRpcClientContext()
  const [hosts, setHosts] = useState<HostProfile[]>([])
  const [visible, setVisible] = useState(false)
  const [loadKey, setLoadKey] = useState(0)
  const [states, setStates] = useState<Record<string, ConnectionState>>({})
  const pickedRef = useRef<string | null>(null)

  // Load on mount for the trigger and again on each open, so a desktop paired or removed elsewhere shows up.
  useEffect(() => {
    let live = true
    void loadHostCatalog()
      .then((catalog) => {
        if (live) {
          const next = hostSwitcherHosts(catalog)
          ctx.primeHosts(next)
          setHosts(next)
        }
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [ctx, loadKey])

  useEffect(() => {
    if (!visible) {
      return
    }
    const known: Record<string, ConnectionState> = {}
    for (const host of hosts) {
      known[host.id] = ctx.getKnownState(host.id) ?? 'disconnected'
    }
    setStates(known)
    const unsubscribes = hosts.map((host) =>
      ctx.subscribeHostState(host.id, (state) =>
        setStates((previous) => ({ ...previous, [host.id]: state }))
      )
    )
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
  }, [ctx, hosts, visible])

  const open = useCallback(() => {
    pickedRef.current = null
    setLoadKey((key) => key + 1)
    setVisible(true)
  }, [])
  const close = useCallback(() => setVisible(false), [])

  const onAfterClose = useCallback(() => {
    const picked = pickedRef.current
    pickedRef.current = null
    // The list reloads while the sheet is open, so the pick may have been unpaired meanwhile.
    if (!picked || picked === currentHostId || !hosts.some((host) => host.id === picked)) {
      return
    }
    switchHostRoute(router, picked)
  }, [currentHostId, hosts, router])

  return {
    // Count other desktops: the current one may itself have dropped out of the connectable list.
    canSwitch: currentHostId !== undefined && hosts.some((host) => host.id !== currentHostId),
    open,
    pickerProps: {
      visible,
      options: hostSwitcherOptions(hosts, (hostId) => states[hostId] ?? 'disconnected'),
      selected: currentHostId ?? '',
      onSelect: (hostId: string) => {
        pickedRef.current = hostId
      },
      onClose: close,
      onAfterClose
    }
  }
}

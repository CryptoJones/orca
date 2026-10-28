import { useCallback, useEffect, useRef, useState } from 'react'
import { hostStackHostRoute } from '../navigation/host-stack-navigation'
import { useRpcClientContext } from '../transport/client-context'
import { loadHostCatalog } from '../transport/host-store'
import type { ConnectionState, HostProfile } from '../transport/types'
import { hostSwitcherHosts, hostSwitcherOptions } from './host-switcher-options'

type HostSwitcherRouter = {
  dismissTo: (href: '/') => void
  push: (href: `/h/${string}`) => void
}

export type HostSwitcher = ReturnType<typeof useHostSwitcher>

export function useHostSwitcher(currentHostId: string | undefined, router: HostSwitcherRouter) {
  const ctx = useRpcClientContext()
  const [hosts, setHosts] = useState<HostProfile[]>([])
  const [visible, setVisible] = useState(false)
  const [states, setStates] = useState<Record<string, ConnectionState>>({})
  const pickedRef = useRef<string | null>(null)

  // Reload on open so a desktop paired or removed elsewhere shows up correctly.
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
  }, [ctx, visible])

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
    setVisible(true)
  }, [])
  const close = useCallback(() => setVisible(false), [])

  const onAfterClose = useCallback(() => {
    const picked = pickedRef.current
    pickedRef.current = null
    if (!picked || picked === currentHostId) {
      return
    }
    // Rebuild the stack as Home → host so Back returns home, not to the previous desktop.
    router.dismissTo('/')
    router.push(hostStackHostRoute(picked))
  }, [currentHostId, router])

  return {
    canSwitch: currentHostId !== undefined && hosts.length > 1,
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

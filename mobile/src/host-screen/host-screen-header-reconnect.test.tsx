import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { ForceReconnect } from '../transport/rpc-client-context-contract'

vi.mock('react-native', () => ({
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Text: 'Text',
  View: 'View'
}))
vi.mock('lucide-react-native', () => ({
  ChevronDown: 'Icon',
  ChevronLeft: 'Icon',
  Filter: 'Icon',
  Layers: 'Icon',
  List: 'Icon',
  PanelLeftClose: 'Icon',
  Plus: 'Icon',
  Search: 'Icon',
  SlidersHorizontal: 'Icon',
  SquareTerminal: 'Icon',
  UserCircle: 'Icon',
  X: 'Icon'
}))

vi.mock('./host-switcher-sheet', () => ({ HostSwitcherSheet: 'HostSwitcherSheet' }))

import { resolveHostDisplay } from '../../../src/shared/host-display-resolution'
import { HostScreenHeader } from './host-screen-header'

// Use the unreachable verdict that offers native Reconnect to prove the page still withholds it.
function controllerWith(
  forceReconnectHost: ForceReconnect,
  hostSwitcher: { canSwitch: boolean; open: () => void } = { canSwitch: false, open: () => {} }
) {
  const fields = {
    actions: {
      leaveHost: () => {},
      navigateFromHostList: () => {},
      openNewWorktreeModal: () => {}
    },
    connectionVerdict: {
      kind: 'unreachable',
      label: "Can't reach desktop",
      reason: 'never-connected'
    },
    connState: 'reconnecting',
    embedded: false,
    floatingWorkspaceEnabled: false,
    forceReconnectHost,
    hostId: 'host-a',
    hostDisplay: resolveHostDisplay({ name: 'Desk' }),
    hostSwitcher,
    lastConnectedAt: null,
    onHideSidebar: undefined,
    settings: { activeFilterCount: 0 },
    state: { hostName: 'Desk', view: { groupBy: 'none' }, showSearch: false }
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the header reads only these members on a narrow, non-embedded layout; the rest of the controller is unreachable from it.
  return fields as unknown as Parameters<typeof HostScreenHeader>[0]['controller']
}

function render(
  forceReconnectHost: ForceReconnect,
  hostSwitcher?: Parameters<typeof controllerWith>[1]
): ReactTestRenderer {
  const rendered: { tree: ReactTestRenderer | null } = { tree: null }
  act(() => {
    rendered.tree = create(
      createElement(HostScreenHeader, {
        controller: controllerWith(forceReconnectHost, hostSwitcher)
      })
    )
  })
  if (rendered.tree === null) {
    throw new Error('the header did not render')
  }
  return rendered.tree
}

function reconnectControls(tree: ReactTestRenderer): ReactTestInstance[] {
  return tree.root.findAll(
    (node) => String(node.type) === 'Pressable' && node.props.accessibilityLabel === 'Reconnect'
  )
}

describe("the host header's Reconnect", () => {
  it('is absent on the page, where nothing can re-dial the connection the shell owns', () => {
    expect(reconnectControls(render(null))).toHaveLength(0)
  })

  it('still renders natively and re-dials this host', () => {
    const forceReconnect = vi.fn(() => Promise.resolve())
    const [control] = reconnectControls(render(forceReconnect))
    act(() => {
      control?.props.onPress()
    })
    expect(forceReconnect.mock.calls).toEqual([['host-a']])
  })
})

function switchControls(tree: ReactTestRenderer): ReactTestInstance[] {
  return tree.root.findAll(
    (node) =>
      String(node.type) === 'Pressable' &&
      node.props.accessibilityLabel === 'Switch desktop, current: Desk'
  )
}

describe("the host header's desktop switcher", () => {
  it('is not offered when this is the only paired desktop', () => {
    const tree = render(null)
    expect(switchControls(tree)).toHaveLength(0)
    expect(tree.root.findAll((node) => String(node.type) === 'HostSwitcherSheet')).toHaveLength(0)
  })

  it('opens from the host name when another desktop is paired', () => {
    const open = vi.fn()
    const [control] = switchControls(render(null, { canSwitch: true, open }))
    act(() => {
      control?.props.onPress()
    })
    expect(open).toHaveBeenCalledOnce()
  })
})

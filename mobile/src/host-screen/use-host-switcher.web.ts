import { useCallback } from 'react'
import { useRouteHandoff } from '../navigation/route-handoff'
import { usePageBridgeClientIfPresent } from '../transport/client-context.web'
import { switchDesktopRoute } from './switch-desktop-route'
import type { HostSwitcher } from './use-host-switcher'

// The shell draws the sheet, so the page's own picker never opens.
const SHELL_OWNED_PICKER: HostSwitcher['pickerProps'] = {
  visible: false,
  options: [],
  selected: '',
  onSelect: () => {},
  onClose: () => {},
  onAfterClose: () => false
}

// The page knows only its own desktop: the shell says in init whether another exists, and opens its own sheet.
export function useHostSwitcher(currentHostId: string | undefined, _router: unknown): HostSwitcher {
  const router = useRouteHandoff()
  // Older shells omit the fact, which hides the switcher.
  const offered = usePageBridgeClientIfPresent()?.getShellSession()?.hostSwitcher === true
  const open = useCallback(() => {
    if (currentHostId !== undefined) {
      router.push(switchDesktopRoute(currentHostId))
    }
  }, [currentHostId, router])
  return {
    canSwitch: offered && currentHostId !== undefined,
    open,
    pickerProps: SHELL_OWNED_PICKER
  }
}

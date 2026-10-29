import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { leaveHostRoute } from '../host-route-exit'
import { HostSwitcherSheet } from './host-switcher-sheet'
import { useHostSwitcher } from './use-host-switcher'

// Draws only the sheet, over the host page that asked for it; closing without a switch returns there.
export function SwitchDesktopScreen({ fromHostId }: { fromHostId: string | undefined }) {
  const router = useRouter()
  const switcher = useHostSwitcher(fromHostId, router)
  const { loaded, open } = switcher
  // Wait for the list so the sheet does not open empty and then resize.
  useEffect(() => {
    if (loaded) {
      open()
    }
  }, [loaded, open])
  const { onAfterClose } = switcher.pickerProps
  return (
    <HostSwitcherSheet
      switcher={{
        ...switcher,
        pickerProps: {
          ...switcher.pickerProps,
          onAfterClose: () => {
            if (onAfterClose()) {
              return true
            }
            // A link can open this screen with nothing beneath it.
            if (router.canGoBack()) {
              router.back()
            } else {
              leaveHostRoute(router)
            }
            return true
          }
        }
      }}
    />
  )
}

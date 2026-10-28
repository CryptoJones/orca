import { useEffect } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { HostSwitcherSheet } from '../src/host-screen/host-switcher-sheet'
import { useHostSwitcher } from '../src/host-screen/use-host-switcher'
import { firstParam } from '../src/navigation/route-param-reader'

// Draws only the sheet, over the host page that asked for it; closing without a switch returns there.
export default function SwitchDesktopRoute() {
  const params = useLocalSearchParams<{ from?: string | string[] }>()
  const from = firstParam(params.from)
  const router = useRouter()
  const switcher = useHostSwitcher(from === '' ? undefined : from, router)
  const { open } = switcher
  useEffect(() => {
    open()
  }, [open])
  const { onAfterClose } = switcher.pickerProps
  return (
    <HostSwitcherSheet
      switcher={{
        ...switcher,
        pickerProps: {
          ...switcher.pickerProps,
          onAfterClose: () => {
            if (!onAfterClose()) {
              router.back()
            }
            return true
          }
        }
      }}
    />
  )
}

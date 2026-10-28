import { PickerModal } from '../components/PickerModal'
import { StatusDot } from '../components/StatusDot'
import type { HostSwitcher } from './use-host-switcher'

export function HostSwitcherSheet({ switcher }: { switcher: HostSwitcher }) {
  const { options, ...props } = switcher.pickerProps
  return (
    <PickerModal
      title="Switch Desktop"
      {...props}
      options={options.map(({ state, ...option }) => ({
        ...option,
        renderIcon: () => <StatusDot state={state} />
      }))}
    />
  )
}

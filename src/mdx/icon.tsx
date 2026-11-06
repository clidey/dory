import { CatalogIcon } from '@clidey/ux'
import { icons } from '@clidey/ux/icons'
import { resolveIconName } from './icon-names'
import classNames from 'classnames'

export function Icon({ icon, color, size = 24, className, style, ...rest }: {
  icon: string
  color?: string
  size?: number
} & Omit<React.ComponentPropsWithoutRef<'svg'>, 'color'>) {
  const name = resolveIconName(icon);
  const available = Object.prototype.hasOwnProperty.call(icons, name);
  if (!available) console.warn(`Unknown documentation icon: ${icon}`);
  return (
    <CatalogIcon
      name={available ? name : 'help'}
      style={{ color, ...(typeof style === 'object' && style !== null ? style : {}) }}
      size={size}
      className={classNames('inline-block align-[-0.2em]', className)}
      {...rest}
    />
  )
}

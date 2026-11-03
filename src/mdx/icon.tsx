import { CatalogIcon } from '@clidey/ux'
import { resolveIconName } from './icon-names'
import classNames from 'classnames'

export function Icon({ icon, color, size = 24, className, style, ...rest }: {
  icon: string
  color?: string
  size?: number
} & Omit<React.ComponentPropsWithoutRef<'svg'>, 'color'>) {
  return (
    <CatalogIcon
      name={resolveIconName(icon)}
      style={{ color, ...(typeof style === 'object' && style !== null ? style : {}) }}
      size={size}
      className={classNames('inline-block align-[-0.2em]', className)}
      {...rest}
    />
  )
}

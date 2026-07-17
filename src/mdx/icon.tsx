import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as solidIcons from '@fortawesome/free-solid-svg-icons'
import * as regularIcons from '@fortawesome/free-regular-svg-icons'
import * as brandIcons from '@fortawesome/free-brands-svg-icons'
import classNames from 'classnames'
import * as LucideIcons from 'lucide-react'

// Map types to icon sets and FontAwesome prefixes
const iconSets = {
  solid: solidIcons,
  regular: regularIcons,
  brands: brandIcons,
}

const prefixes = {
  solid: 'fas',
  regular: 'far',
  brands: 'fab',
} as const

export function Icon({
  icon,
  iconType = 'solid',
  color = '',
  size = 24,
  className,
  ...rest
}: {
  icon: string
  iconType?: keyof typeof iconSets
  color?: string
  size?: number
} & Omit<React.ComponentPropsWithoutRef<'svg'>, 'color'>) {
  // Convert kebab-case or snake_case to PascalCase (for Lucide and FA variable names)
  const pascalCase = icon
    .replace(/[-_](.)/g, (_, group1) => group1.toUpperCase())
    .replace(/^(.)/, (_, group1) => group1.toUpperCase())

  // --- Try Lucide First ---
  const LucideComponent = LucideIcons[pascalCase as keyof typeof LucideIcons] as any
  if (LucideComponent) {
    return (
      <LucideComponent
        className={classNames("stroke-black dark:stroke-white", className)}
        color={color}
        size={size}
        {...rest}
      />
    )
  }

  // --- Try Font Awesome ---
  // Fall back to the brands set: Lucide 1.x removed all brand icons
  // (github, twitter, npm, ...), which live only in FA brands.
  const iconKey = `fa${pascalCase}`
  const setsToTry: Array<keyof typeof iconSets> =
    iconType === 'brands' ? ['brands'] : [iconType, 'brands']

  for (const setName of setsToTry) {
    const faSet = iconSets[setName] ?? solidIcons
    const faIcon = faSet[iconKey as keyof typeof faSet]

    if (faIcon && typeof faIcon === 'object' && 'iconName' in faIcon) {
      library.add(faIcon)
      return (
        <FontAwesomeIcon
          icon={[prefixes[setName] || 'fas', faIcon.iconName] as any}
          className={classNames("stroke-black dark:stroke-white", className)}
          color={color as any}
          size={size as any}
          {...rest as any}
        />
      )
    }
  }

  console.warn(`⚠️ Icon not found: "${icon}" (converted to ${iconKey}) in ${iconType}`)
  return null // or return a default/fallback icon if preferred
}

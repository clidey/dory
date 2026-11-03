import { iconSourceVariants } from './icon-source-variants'

// Keep common names used by existing Dory documents working after the icon migration.
const aliases: Record<string, string> = {
  activity: 'progress',
  'alert-triangle': 'warning',
  'bar-chart': 'chart',
  box: 'packages',
  'chart-column': 'chart',
  'chevrons-down-up': 'up-down',
  'circle-alert': 'alert-circle',
  'circle-check': 'check-circle',
  'code-2': 'code',
  'columns-2': 'columns',
  'columns-3': 'columns',
  'file-json': 'file-code',
  'external-link': 'external',
  github: 'code',
  'git-branch': 'branch',
  'git-fork': 'branch',
  'git-pull-request': 'branch',
  hammer: 'settings',
  image: 'file-image',
  'layout-dashboard': 'dashboard',
  layers: 'layout',
  'list-ordered': 'list',
  'message-square': 'chat',
  'maximize-2': 'fullscreen',
  map: 'globe',
  package: 'packages',
  palette: 'layout',
  'play-circle': 'play',
  'share-2': 'share',
  'settings-2': 'settings',
  'shield-check': 'shield',
  'sliders-horizontal': 'sliders',
  sparkles: 'ai',
  'square-terminal': 'terminal',
  plug: 'integration',
  tag: 'price-tag',
  heart: 'star',
  rocket: 'promote',
  zap: 'bolt',
}

function normalize(name: string) {
  const kebab = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase()
  return aliases[kebab] ?? kebab
}

/** Compatibility names accepted by Dory's MDX Icon component. */
export function resolveIconName(name: string): string {
  const [source, sourceName] = name.split('/', 2)
  if (sourceName) {
    if (source !== 'community' && source !== 'enterprise-core' && source !== 'enterprise') return name
    const normalized = normalize(sourceName)
    return iconSourceVariants[`${source}/${normalized}`] ?? normalized
  }
  return normalize(name)
}

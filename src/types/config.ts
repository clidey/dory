/**
 * TypeScript interfaces for dory.json configuration
 */

export interface DoryColors {
  primary: string;
  light: string;
  dark: string;
  background?: string;
  surface?: string;
  surfaceElevated?: string;
  foreground?: string;
  mutedForeground?: string;
  border?: string;
  accent?: string;
}

export interface DoryFontDefinition {
  family: string;
  source?: string;
  format?: string;
  weight?: string;
}

export interface DoryFonts {
  family: string;
  source?: string;
  format?: string;
  stylesheet?: string;
  heading?: DoryFontDefinition;
  mono?: DoryFontDefinition;
}

export interface DoryLogo {
  light: string;
  dark: string;
}

export interface DoryNavigationPage {
  [key: string]: string;
}

/** Page entry with extras, e.g. { "page": "components/overview", "badge": "New" }. */
export interface DoryNavigationPageEntry {
  page: string;
  badge?: string;
}

export interface DoryNavigationGroup {
  group: string;
  pages: Array<string | DoryNavigationPageEntry>;
}

export interface DoryNavigationTab {
  tab: string;
  groups: DoryNavigationGroup[];
}

export interface DoryNavigation {
  tabs: DoryNavigationTab[];
}

export interface DoryEmbedConfig {
  enabled?: boolean;
  version?: string;
  defaults?: {
    position?: 'left' | 'right' | 'bottom';
    width?: number;
    height?: string;
    theme?: 'light' | 'dark' | 'inherit';
    showOverlay?: boolean;
    closeOnEscape?: boolean;
    closeOnOverlayClick?: boolean;
  };
  branding?: {
    showLogo?: boolean;
    showName?: boolean;
    customCSS?: string;
  };
  features?: {
    search?: boolean;
    toc?: boolean;
    codeBlocks?: boolean;
    mermaid?: boolean;
    katex?: boolean;
    apiPlayground?: boolean;
    darkMode?: boolean;
  };
  analytics?: {
    enabled?: boolean;
    trackEvents?: string[];
  };
  security?: {
    allowedOrigins?: string[];
    corsEnabled?: boolean;
  };
  performance?: {
    lazyLoadImages?: boolean;
    prefetchPages?: boolean;
    cacheStrategy?: 'cache-first' | 'network-first';
  };
}

export interface DoryAnalytics {
  posthog?: {
    token: string;
    apiHost?: string;
  };
}

export interface DorySeo {
  /** Applied to page titles, e.g. "%s — WhoDB"; %s is the page title. Default: no template. */
  titleTemplate?: string;
  keywords?: string[];
  author?: string;
  /** Absolute URL or path resolved against config.url. */
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  /** e.g. "en_US" */
  locale?: string;
  /** Extra lines appended to robots.txt. */
  robotsTxt?: string[];
  /** Site-wide meta robots noindex (for staging environments). */
  noindex?: boolean;
}

export interface DoryTheme {
  mode?: 'light' | 'dark' | 'system';
  radius?: string;
}

export interface DoryConfig {
  name: string;
  title?: string;
  description?: string;
  image?: string;
  /** Origin the site is published at, e.g. "https://example.com" (no base path). */
  url?: string;
  /** Path prefix the site is served under, e.g. "/docs". Default: served at the root. */
  basePath?: string;
  /** Shown in the sidebar version card, e.g. "1.0.8 · Latest". */
  version?: string;
  twitter?: string;
  favicon: string;
  colors?: DoryColors;
  fonts?: DoryFonts;
  theme?: DoryTheme;
  navigation: DoryNavigation;
  logo: DoryLogo;
  embed?: DoryEmbedConfig;
  analytics?: DoryAnalytics;
  seo?: DorySeo;
}

/**
 * TypeScript interfaces for dory.json configuration
 */

export interface DoryColors {
  primary: string;
  light: string;
  dark: string;
}

export interface DoryFonts {
  family: string;
  source: string;
  format: string;
}

export interface DoryLogo {
  light: string;
  dark: string;
}

export interface DoryNavigationPage {
  [key: string]: string;
}

export interface DoryNavigationGroup {
  group: string;
  pages: string[];
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

export interface DoryConfig {
  name: string;
  favicon: string;
  colors?: DoryColors;
  fonts?: DoryFonts;
  navigation: DoryNavigation;
  logo: DoryLogo;
  embed?: DoryEmbedConfig;
}

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

export interface DoryConfig {
  name: string;
  favicon: string;
  colors?: DoryColors;
  fonts?: DoryFonts;
  navigation: DoryNavigation;
  logo: DoryLogo;
}

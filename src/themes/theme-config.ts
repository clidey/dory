export interface ThemeColors {
  // Background colors
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgCode: string;
  bgButton: string;
  bgButtonHover: string;
  bgAccent: string;
  bgError: string;
  bgSuccess: string;
  bgWarning: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textAccent: string;
  textButton: string;
  textError: string;
  textSuccess: string;
  textWarning: string;
  
  // Border colors
  borderPrimary: string;
  borderSecondary: string;
  borderAccent: string;
  borderError: string;
  borderSuccess: string;
  borderWarning: string;
  
  // Interactive colors
  linkPrimary: string;
  linkHover: string;
  focusRing: string;
  
  // Component specific colors
  playgroundBg: string;
  playgroundPanel: string;
  playgroundInput: string;
  playgroundButton: string;
  playgroundButtonHover: string;
  playgroundTab: string;
  playgroundTabActive: string;
  playgroundTabHover: string;
  
  // API colors
  apiBg: string;
  apiPanel: string;
  apiHeader: string;
  apiMethod: string;
  apiPath: string;
  
  // Mermaid colors
  mermaidBg: string;
  mermaidNode: string;
  mermaidNodeBorder: string;
  mermaidText: string;
  mermaidEdge: string;
  mermaidCluster: string;
  mermaidNote: string;
}

export interface ThemeTypography {
  // Font families
  fontFamilyPrimary: string;
  fontFamilySecondary: string;
  fontFamilyMono: string;
  
  // Font sizes
  fontSizeXs: string;
  fontSizeSm: string;
  fontSizeMd: string;
  fontSizeLg: string;
  fontSizeXl: string;
  fontSize2xl: string;
  fontSize3xl: string;
  
  // Font weights
  fontWeightNormal: string;
  fontWeightMedium: string;
  fontWeightSemibold: string;
  fontWeightBold: string;
  
  // Line heights
  lineHeightTight: string;
  lineHeightNormal: string;
  lineHeightRelaxed: string;
}

export interface ThemeSpacing {
  // Spacing scale
  spaceXs: string;
  spaceSm: string;
  spaceMd: string;
  spaceLg: string;
  spaceXl: string;
  space2xl: string;
  space3xl: string;
  
  // Border radius
  radiusXs: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusXl: string;
  radiusFull: string;
  
  // Shadows
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  shadowXl: string;
  
  // Transitions
  transitionFast: string;
  transitionNormal: string;
  transitionSlow: string;
}

export interface ThemeVariant {
  mode: 'light' | 'dark';
  colors: ThemeColors;
}

export interface ThemeBase {
  id: string;
  name: string;
  description: string;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  variants: {
    light: ThemeVariant;
    dark: ThemeVariant;
  };
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  isDark: boolean;
}

// Default typography settings
const defaultTypography: ThemeTypography = {
  fontFamilyPrimary: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif',
  fontFamilySecondary: 'Georgia, "Times New Roman", serif',
  fontFamilyMono: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Source Code Pro", monospace',
  
  fontSizeXs: '0.75rem',
  fontSizeSm: '0.875rem', 
  fontSizeMd: '1rem',
  fontSizeLg: '1.125rem',
  fontSizeXl: '1.25rem',
  fontSize2xl: '1.5rem',
  fontSize3xl: '1.875rem',
  
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightSemibold: '600',
  fontWeightBold: '700',
  
  lineHeightTight: '1.25',
  lineHeightNormal: '1.5',
  lineHeightRelaxed: '1.75'
};

// Default spacing settings
const defaultSpacing: ThemeSpacing = {
  spaceXs: '0.25rem',
  spaceSm: '0.5rem',
  spaceMd: '1rem',
  spaceLg: '1.5rem',
  spaceXl: '2rem',
  space2xl: '3rem',
  space3xl: '4rem',
  
  radiusXs: '0.125rem',
  radiusSm: '0.25rem',
  radiusMd: '0.375rem',
  radiusLg: '0.5rem',
  radiusXl: '0.75rem',
  radiusFull: '9999px',
  
  shadowSm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  shadowXl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  
  transitionFast: 'all 0.15s ease',
  transitionNormal: 'all 0.3s ease',
  transitionSlow: 'all 0.5s ease'
};

// Enhanced typography for different themes
const corporateTypography: ThemeTypography = {
  ...defaultTypography,
  fontFamilyPrimary: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightSemibold: '600',
  fontWeightBold: '700'
};

const minimalTypography: ThemeTypography = {
  ...defaultTypography,
  fontFamilyPrimary: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  fontWeightNormal: '300',
  fontWeightMedium: '400',
  fontWeightSemibold: '500',
  fontWeightBold: '600'
};

const cyberpunkTypography: ThemeTypography = {
  ...defaultTypography,
  fontFamilyPrimary: '"JetBrains Mono", "SF Mono", monospace',
  fontSizeMd: '0.95rem',
  lineHeightTight: '1.2',
  lineHeightNormal: '1.4'
};

const serifTypography: ThemeTypography = {
  ...defaultTypography,
  fontFamilyPrimary: '"Crimson Text", Georgia, "Times New Roman", serif',
  lineHeightNormal: '1.6',
  lineHeightRelaxed: '1.8'
};

// Enhanced spacing for different themes
const compactSpacing: ThemeSpacing = {
  ...defaultSpacing,
  spaceSm: '0.375rem',
  spaceMd: '0.75rem',
  spaceLg: '1.125rem',
  spaceXl: '1.5rem'
};

const relaxedSpacing: ThemeSpacing = {
  ...defaultSpacing,
  spaceSm: '0.625rem',
  spaceMd: '1.25rem',
  spaceLg: '2rem',
  spaceXl: '2.5rem',
  space2xl: '3.5rem'
};

const cyberpunkSpacing: ThemeSpacing = {
  ...defaultSpacing,
  radiusSm: '0rem',
  radiusMd: '0.125rem',
  radiusLg: '0.25rem',
  shadowMd: '0 0 20px rgba(0, 255, 136, 0.3)',
  shadowLg: '0 0 30px rgba(0, 255, 136, 0.4)'
};

// Base theme definitions with light/dark variants
export const baseThemes: ThemeBase[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean and professional theme for optimal readability',
    typography: defaultTypography,
    spacing: defaultSpacing,
    variants: {
      light: {
        mode: 'light',
        colors: {
          bgPrimary: '#ffffff',
          bgSecondary: '#f8f9fa',
          bgTertiary: '#e9ecef',
          bgCode: '#f8f8f8',
          bgButton: '#007bff',
          bgButtonHover: '#0056b3',
          bgAccent: '#e3f2fd',
          bgError: '#ffedef',
          bgSuccess: '#e8f5e8',
          bgWarning: '#fff3cd',
          
          textPrimary: '#212529',
          textSecondary: '#6c757d',
          textTertiary: '#adb5bd',
          textAccent: '#007bff',
          textButton: '#ffffff',
          textError: '#dc3545',
          textSuccess: '#28a745',
          textWarning: '#ffc107',
          
          borderPrimary: '#dee2e6',
          borderSecondary: '#e9ecef',
          borderAccent: '#007bff',
          borderError: '#dc3545',
          borderSuccess: '#28a745',
          borderWarning: '#ffc107',
          
          linkPrimary: '#007bff',
          linkHover: '#0056b3',
          focusRing: '#80bdff',
          
          playgroundBg: '#ffffff',
          playgroundPanel: '#f8f9fa',
          playgroundInput: '#ffffff',
          playgroundButton: '#007bff',
          playgroundButtonHover: '#0056b3',
          playgroundTab: '#f8f9fa',
          playgroundTabActive: '#007bff',
          playgroundTabHover: '#e9ecef',
          
          apiBg: '#ffffff',
          apiPanel: '#f8f9fa',
          apiHeader: '#e9ecef',
          apiMethod: '#007bff',
          apiPath: '#212529',
          
          mermaidBg: '#ffffff',
          mermaidNode: '#f0f0f0',
          mermaidNodeBorder: '#333333',
          mermaidText: '#000000',
          mermaidEdge: '#555555',
          mermaidCluster: '#f8f8f8',
          mermaidNote: '#ffffcc'
        }
      },
      dark: {
        mode: 'dark',
        colors: {
          bgPrimary: '#1a1a1a',
          bgSecondary: '#2d2d2d',
          bgTertiary: '#404040',
          bgCode: '#2a2a2a',
          bgButton: '#0d6efd',
          bgButtonHover: '#0b5ed7',
          bgAccent: '#1a2332',
          bgError: '#2d1b1b',
          bgSuccess: '#1b2d1b',
          bgWarning: '#2d2a1b',
          
          textPrimary: '#ffffff',
          textSecondary: '#b3b3b3',
          textTertiary: '#808080',
          textAccent: '#4dabf7',
          textButton: '#ffffff',
          textError: '#ff6b6b',
          textSuccess: '#51cf66',
          textWarning: '#ffd43b',
          
          borderPrimary: '#404040',
          borderSecondary: '#2d2d2d',
          borderAccent: '#4dabf7',
          borderError: '#ff6b6b',
          borderSuccess: '#51cf66',
          borderWarning: '#ffd43b',
          
          linkPrimary: '#4dabf7',
          linkHover: '#339af0',
          focusRing: '#4dabf7',
          
          playgroundBg: '#1a1a1a',
          playgroundPanel: '#2d2d2d',
          playgroundInput: '#404040',
          playgroundButton: '#0d6efd',
          playgroundButtonHover: '#0b5ed7',
          playgroundTab: '#2d2d2d',
          playgroundTabActive: '#4dabf7',
          playgroundTabHover: '#404040',
          
          apiBg: '#1a1a1a',
          apiPanel: '#2d2d2d',
          apiHeader: '#404040',
          apiMethod: '#4dabf7',
          apiPath: '#ffffff',
          
          mermaidBg: '#1a1a1a',
          mermaidNode: '#333333',
          mermaidNodeBorder: '#aaaaaa',
          mermaidText: '#ffffff',
          mermaidEdge: '#cccccc',
          mermaidCluster: '#2a2a2a',
          mermaidNote: '#2a2a2a'
        }
      }
    }
  },
  {
    id: 'nord',
    name: 'Nord',
    description: 'Arctic-inspired theme with cool blues and whites',
    typography: defaultTypography,
    spacing: defaultSpacing,
    variants: {
      light: {
        mode: 'light',
        colors: {
          bgPrimary: '#eceff4',
          bgSecondary: '#e5e9f0',
          bgTertiary: '#d8dee9',
          bgCode: '#e5e9f0',
          bgButton: '#5e81ac',
          bgButtonHover: '#81a1c1',
          bgAccent: '#d8dee9',
          bgError: '#bf616a',
          bgSuccess: '#a3be8c',
          bgWarning: '#ebcb8b',
          
          textPrimary: '#2e3440',
          textSecondary: '#3b4252',
          textTertiary: '#434c5e',
          textAccent: '#5e81ac',
          textButton: '#eceff4',
          textError: '#bf616a',
          textSuccess: '#a3be8c',
          textWarning: '#ebcb8b',
          
          borderPrimary: '#d8dee9',
          borderSecondary: '#e5e9f0',
          borderAccent: '#5e81ac',
          borderError: '#bf616a',
          borderSuccess: '#a3be8c',
          borderWarning: '#ebcb8b',
          
          linkPrimary: '#5e81ac',
          linkHover: '#81a1c1',
          focusRing: '#88c0d0',
          
          playgroundBg: '#eceff4',
          playgroundPanel: '#e5e9f0',
          playgroundInput: '#eceff4',
          playgroundButton: '#5e81ac',
          playgroundButtonHover: '#81a1c1',
          playgroundTab: '#e5e9f0',
          playgroundTabActive: '#5e81ac',
          playgroundTabHover: '#d8dee9',
          
          apiBg: '#eceff4',
          apiPanel: '#e5e9f0',
          apiHeader: '#d8dee9',
          apiMethod: '#5e81ac',
          apiPath: '#2e3440',
          
          mermaidBg: '#eceff4',
          mermaidNode: '#d8dee9',
          mermaidNodeBorder: '#434c5e',
          mermaidText: '#2e3440',
          mermaidEdge: '#434c5e',
          mermaidCluster: '#e5e9f0',
          mermaidNote: '#d8dee9'
        }
      },
      dark: {
        mode: 'dark',
        colors: {
          bgPrimary: '#2e3440',
          bgSecondary: '#3b4252',
          bgTertiary: '#434c5e',
          bgCode: '#3b4252',
          bgButton: '#5e81ac',
          bgButtonHover: '#81a1c1',
          bgAccent: '#4c566a',
          bgError: '#bf616a',
          bgSuccess: '#a3be8c',
          bgWarning: '#ebcb8b',
          
          textPrimary: '#eceff4',
          textSecondary: '#d8dee9',
          textTertiary: '#8fbcbb',
          textAccent: '#88c0d0',
          textButton: '#eceff4',
          textError: '#bf616a',
          textSuccess: '#a3be8c',
          textWarning: '#ebcb8b',
          
          borderPrimary: '#4c566a',
          borderSecondary: '#434c5e',
          borderAccent: '#88c0d0',
          borderError: '#bf616a',
          borderSuccess: '#a3be8c',
          borderWarning: '#ebcb8b',
          
          linkPrimary: '#88c0d0',
          linkHover: '#8fbcbb',
          focusRing: '#88c0d0',
          
          playgroundBg: '#2e3440',
          playgroundPanel: '#3b4252',
          playgroundInput: '#434c5e',
          playgroundButton: '#5e81ac',
          playgroundButtonHover: '#81a1c1',
          playgroundTab: '#3b4252',
          playgroundTabActive: '#88c0d0',
          playgroundTabHover: '#434c5e',
          
          apiBg: '#2e3440',
          apiPanel: '#3b4252',
          apiHeader: '#434c5e',
          apiMethod: '#88c0d0',
          apiPath: '#eceff4',
          
          mermaidBg: '#2e3440',
          mermaidNode: '#434c5e',
          mermaidNodeBorder: '#8fbcbb',
          mermaidText: '#eceff4',
          mermaidEdge: '#8fbcbb',
          mermaidCluster: '#3b4252',
          mermaidNote: '#4c566a'
        }
      }
    }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep ocean blues with professional appeal',
    typography: defaultTypography,
    spacing: defaultSpacing,
    variants: {
      light: {
        mode: 'light',
        colors: {
          bgPrimary: '#f8fafc',
          bgSecondary: '#f1f5f9',
          bgTertiary: '#e2e8f0',
          bgCode: '#f1f5f9',
          bgButton: '#0ea5e9',
          bgButtonHover: '#0284c7',
          bgAccent: '#e0f2fe',
          bgError: '#fef2f2',
          bgSuccess: '#f0fdf4',
          bgWarning: '#fffbeb',
          
          textPrimary: '#0f172a',
          textSecondary: '#334155',
          textTertiary: '#64748b',
          textAccent: '#0ea5e9',
          textButton: '#f8fafc',
          textError: '#dc2626',
          textSuccess: '#16a34a',
          textWarning: '#ca8a04',
          
          borderPrimary: '#e2e8f0',
          borderSecondary: '#f1f5f9',
          borderAccent: '#0ea5e9',
          borderError: '#dc2626',
          borderSuccess: '#16a34a',
          borderWarning: '#ca8a04',
          
          linkPrimary: '#0ea5e9',
          linkHover: '#0284c7',
          focusRing: '#38bdf8',
          
          playgroundBg: '#f8fafc',
          playgroundPanel: '#f1f5f9',
          playgroundInput: '#f8fafc',
          playgroundButton: '#0ea5e9',
          playgroundButtonHover: '#0284c7',
          playgroundTab: '#f1f5f9',
          playgroundTabActive: '#0ea5e9',
          playgroundTabHover: '#e2e8f0',
          
          apiBg: '#f8fafc',
          apiPanel: '#f1f5f9',
          apiHeader: '#e2e8f0',
          apiMethod: '#0ea5e9',
          apiPath: '#0f172a',
          
          mermaidBg: '#f8fafc',
          mermaidNode: '#e2e8f0',
          mermaidNodeBorder: '#64748b',
          mermaidText: '#0f172a',
          mermaidEdge: '#64748b',
          mermaidCluster: '#f1f5f9',
          mermaidNote: '#e0f2fe'
        }
      },
      dark: {
        mode: 'dark',
        colors: {
          bgPrimary: '#0f172a',
          bgSecondary: '#1e293b',
          bgTertiary: '#334155',
          bgCode: '#1e293b',
          bgButton: '#0ea5e9',
          bgButtonHover: '#0284c7',
          bgAccent: '#1e40af',
          bgError: '#dc2626',
          bgSuccess: '#16a34a',
          bgWarning: '#ca8a04',
          
          textPrimary: '#f8fafc',
          textSecondary: '#cbd5e1',
          textTertiary: '#94a3b8',
          textAccent: '#38bdf8',
          textButton: '#f8fafc',
          textError: '#fca5a5',
          textSuccess: '#86efac',
          textWarning: '#fde047',
          
          borderPrimary: '#475569',
          borderSecondary: '#334155',
          borderAccent: '#38bdf8',
          borderError: '#dc2626',
          borderSuccess: '#16a34a',
          borderWarning: '#ca8a04',
          
          linkPrimary: '#38bdf8',
          linkHover: '#0ea5e9',
          focusRing: '#38bdf8',
          
          playgroundBg: '#0f172a',
          playgroundPanel: '#1e293b',
          playgroundInput: '#334155',
          playgroundButton: '#0ea5e9',
          playgroundButtonHover: '#0284c7',
          playgroundTab: '#1e293b',
          playgroundTabActive: '#38bdf8',
          playgroundTabHover: '#334155',
          
          apiBg: '#0f172a',
          apiPanel: '#1e293b',
          apiHeader: '#334155',
          apiMethod: '#38bdf8',
          apiPath: '#f8fafc',
          
          mermaidBg: '#0f172a',
          mermaidNode: '#334155',
          mermaidNodeBorder: '#94a3b8',
          mermaidText: '#f8fafc',
          mermaidEdge: '#94a3b8',
          mermaidCluster: '#1e293b',
          mermaidNote: '#334155'
        }
      }
    }
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural green theme with earthy tones',
    typography: defaultTypography,
    spacing: defaultSpacing,
    variants: {
      light: {
        mode: 'light',
        colors: {
          bgPrimary: '#f0fdf4',
          bgSecondary: '#dcfce7',
          bgTertiary: '#bbf7d0',
          bgCode: '#dcfce7',
          bgButton: '#22c55e',
          bgButtonHover: '#16a34a',
          bgAccent: '#dcfce7',
          bgError: '#fef2f2',
          bgSuccess: '#f0fdf4',
          bgWarning: '#fffbeb',
          
          textPrimary: '#14532d',
          textSecondary: '#166534',
          textTertiary: '#22c55e',
          textAccent: '#15803d',
          textButton: '#f0fdf4',
          textError: '#dc2626',
          textSuccess: '#22c55e',
          textWarning: '#eab308',
          
          borderPrimary: '#bbf7d0',
          borderSecondary: '#dcfce7',
          borderAccent: '#22c55e',
          borderError: '#dc2626',
          borderSuccess: '#22c55e',
          borderWarning: '#eab308',
          
          linkPrimary: '#15803d',
          linkHover: '#22c55e',
          focusRing: '#4ade80',
          
          playgroundBg: '#f0fdf4',
          playgroundPanel: '#dcfce7',
          playgroundInput: '#f0fdf4',
          playgroundButton: '#22c55e',
          playgroundButtonHover: '#16a34a',
          playgroundTab: '#dcfce7',
          playgroundTabActive: '#22c55e',
          playgroundTabHover: '#bbf7d0',
          
          apiBg: '#f0fdf4',
          apiPanel: '#dcfce7',
          apiHeader: '#bbf7d0',
          apiMethod: '#15803d',
          apiPath: '#14532d',
          
          mermaidBg: '#f0fdf4',
          mermaidNode: '#bbf7d0',
          mermaidNodeBorder: '#166534',
          mermaidText: '#14532d',
          mermaidEdge: '#166534',
          mermaidCluster: '#dcfce7',
          mermaidNote: '#bbf7d0'
        }
      },
      dark: {
        mode: 'dark',
        colors: {
          bgPrimary: '#1c2e1c',
          bgSecondary: '#2d4a2d',
          bgTertiary: '#3d5a3d',
          bgCode: '#2d4a2d',
          bgButton: '#22c55e',
          bgButtonHover: '#16a34a',
          bgAccent: '#15803d',
          bgError: '#dc2626',
          bgSuccess: '#22c55e',
          bgWarning: '#eab308',
          
          textPrimary: '#f0fdf4',
          textSecondary: '#dcfce7',
          textTertiary: '#bbf7d0',
          textAccent: '#4ade80',
          textButton: '#f0fdf4',
          textError: '#fca5a5',
          textSuccess: '#86efac',
          textWarning: '#fde047',
          
          borderPrimary: '#4d6d4d',
          borderSecondary: '#3d5a3d',
          borderAccent: '#4ade80',
          borderError: '#dc2626',
          borderSuccess: '#22c55e',
          borderWarning: '#eab308',
          
          linkPrimary: '#4ade80',
          linkHover: '#22c55e',
          focusRing: '#4ade80',
          
          playgroundBg: '#1c2e1c',
          playgroundPanel: '#2d4a2d',
          playgroundInput: '#3d5a3d',
          playgroundButton: '#22c55e',
          playgroundButtonHover: '#16a34a',
          playgroundTab: '#2d4a2d',
          playgroundTabActive: '#4ade80',
          playgroundTabHover: '#3d5a3d',
          
          apiBg: '#1c2e1c',
          apiPanel: '#2d4a2d',
          apiHeader: '#3d5a3d',
          apiMethod: '#4ade80',
          apiPath: '#f0fdf4',
          
          mermaidBg: '#1c2e1c',
          mermaidNode: '#3d5a3d',
          mermaidNodeBorder: '#bbf7d0',
          mermaidText: '#f0fdf4',
          mermaidEdge: '#bbf7d0',
          mermaidCluster: '#2d4a2d',
          mermaidNote: '#4d6d4d'
        }
      }
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm sunset colors with orange and pink accents',
    typography: defaultTypography,
    spacing: defaultSpacing,
    variants: {
      light: {
        mode: 'light',
        colors: {
          bgPrimary: '#fff7ed',
          bgSecondary: '#ffedd5',
          bgTertiary: '#fed7aa',
          bgCode: '#ffedd5',
          bgButton: '#f97316',
          bgButtonHover: '#ea580c',
          bgAccent: '#fff7ed',
          bgError: '#fef2f2',
          bgSuccess: '#f0fdf4',
          bgWarning: '#fffbeb',
          
          textPrimary: '#9a3412',
          textSecondary: '#c2410c',
          textTertiary: '#ea580c',
          textAccent: '#f97316',
          textButton: '#fff7ed',
          textError: '#dc2626',
          textSuccess: '#16a34a',
          textWarning: '#eab308',
          
          borderPrimary: '#fed7aa',
          borderSecondary: '#ffedd5',
          borderAccent: '#f97316',
          borderError: '#dc2626',
          borderSuccess: '#16a34a',
          borderWarning: '#eab308',
          
          linkPrimary: '#f97316',
          linkHover: '#ea580c',
          focusRing: '#fb923c',
          
          playgroundBg: '#fff7ed',
          playgroundPanel: '#ffedd5',
          playgroundInput: '#fff7ed',
          playgroundButton: '#f97316',
          playgroundButtonHover: '#ea580c',
          playgroundTab: '#ffedd5',
          playgroundTabActive: '#f97316',
          playgroundTabHover: '#fed7aa',
          
          apiBg: '#fff7ed',
          apiPanel: '#ffedd5',
          apiHeader: '#fed7aa',
          apiMethod: '#f97316',
          apiPath: '#9a3412',
          
          mermaidBg: '#fff7ed',
          mermaidNode: '#fed7aa',
          mermaidNodeBorder: '#c2410c',
          mermaidText: '#9a3412',
          mermaidEdge: '#c2410c',
          mermaidCluster: '#ffedd5',
          mermaidNote: '#fed7aa'
        }
      },
      dark: {
        mode: 'dark',
        colors: {
          bgPrimary: '#1f1611',
          bgSecondary: '#2d2319',
          bgTertiary: '#3d3021',
          bgCode: '#2d2319',
          bgButton: '#f97316',
          bgButtonHover: '#ea580c',
          bgAccent: '#dc2626',
          bgError: '#dc2626',
          bgSuccess: '#16a34a',
          bgWarning: '#eab308',
          
          textPrimary: '#fef7ed',
          textSecondary: '#fed7aa',
          textTertiary: '#fdba74',
          textAccent: '#fb923c',
          textButton: '#fef7ed',
          textError: '#fca5a5',
          textSuccess: '#86efac',
          textWarning: '#fde047',
          
          borderPrimary: '#57534e',
          borderSecondary: '#3d3021',
          borderAccent: '#fb923c',
          borderError: '#dc2626',
          borderSuccess: '#16a34a',
          borderWarning: '#eab308',
          
          linkPrimary: '#fb923c',
          linkHover: '#f97316',
          focusRing: '#fb923c',
          
          playgroundBg: '#1f1611',
          playgroundPanel: '#2d2319',
          playgroundInput: '#3d3021',
          playgroundButton: '#f97316',
          playgroundButtonHover: '#ea580c',
          playgroundTab: '#2d2319',
          playgroundTabActive: '#fb923c',
          playgroundTabHover: '#3d3021',
          
          apiBg: '#1f1611',
          apiPanel: '#2d2319',
          apiHeader: '#3d3021',
          apiMethod: '#fb923c',
          apiPath: '#fef7ed',
          
          mermaidBg: '#1f1611',
          mermaidNode: '#3d3021',
          mermaidNodeBorder: '#fdba74',
          mermaidText: '#fef7ed',
          mermaidEdge: '#fdba74',
          mermaidCluster: '#2d2319',
          mermaidNote: '#57534e'
        }
      }
    }
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professional corporate theme with blue and gray',
    typography: corporateTypography,
    spacing: compactSpacing,
    variants: {
      light: {
        mode: 'light',
        colors: {
          bgPrimary: '#ffffff',
          bgSecondary: '#f8f9fa',
          bgTertiary: '#e9ecef',
          bgCode: '#f8f9fa',
          bgButton: '#0d47a1',
          bgButtonHover: '#1565c0',
          bgAccent: '#e3f2fd',
          bgError: '#ffebee',
          bgSuccess: '#e8f5e8',
          bgWarning: '#fff8e1',
          
          textPrimary: '#263238',
          textSecondary: '#546e7a',
          textTertiary: '#90a4ae',
          textAccent: '#1976d2',
          textButton: '#ffffff',
          textError: '#d32f2f',
          textSuccess: '#388e3c',
          textWarning: '#f57c00',
          
          borderPrimary: '#cfd8dc',
          borderSecondary: '#eceff1',
          borderAccent: '#1976d2',
          borderError: '#d32f2f',
          borderSuccess: '#388e3c',
          borderWarning: '#f57c00',
          
          linkPrimary: '#1976d2',
          linkHover: '#1565c0',
          focusRing: '#64b5f6',
          
          playgroundBg: '#ffffff',
          playgroundPanel: '#f8f9fa',
          playgroundInput: '#ffffff',
          playgroundButton: '#0d47a1',
          playgroundButtonHover: '#1565c0',
          playgroundTab: '#f8f9fa',
          playgroundTabActive: '#1976d2',
          playgroundTabHover: '#e9ecef',
          
          apiBg: '#ffffff',
          apiPanel: '#f8f9fa',
          apiHeader: '#e9ecef',
          apiMethod: '#1976d2',
          apiPath: '#263238',
          
          mermaidBg: '#ffffff',
          mermaidNode: '#eceff1',
          mermaidNodeBorder: '#546e7a',
          mermaidText: '#263238',
          mermaidEdge: '#546e7a',
          mermaidCluster: '#f8f9fa',
          mermaidNote: '#fff3e0'
        }
      },
      dark: {
        mode: 'dark',
        colors: {
          bgPrimary: '#1a1a1a',
          bgSecondary: '#2d2d2d',
          bgTertiary: '#404040',
          bgCode: '#2a2a2a',
          bgButton: '#1976d2',
          bgButtonHover: '#1565c0',
          bgAccent: '#0d47a1',
          bgError: '#d32f2f',
          bgSuccess: '#388e3c',
          bgWarning: '#f57c00',
          
          textPrimary: '#eceff1',
          textSecondary: '#cfd8dc',
          textTertiary: '#90a4ae',
          textAccent: '#64b5f6',
          textButton: '#ffffff',
          textError: '#f48fb1',
          textSuccess: '#81c784',
          textWarning: '#ffb74d',
          
          borderPrimary: '#546e7a',
          borderSecondary: '#404040',
          borderAccent: '#64b5f6',
          borderError: '#d32f2f',
          borderSuccess: '#388e3c',
          borderWarning: '#f57c00',
          
          linkPrimary: '#64b5f6',
          linkHover: '#42a5f5',
          focusRing: '#64b5f6',
          
          playgroundBg: '#1a1a1a',
          playgroundPanel: '#2d2d2d',
          playgroundInput: '#404040',
          playgroundButton: '#1976d2',
          playgroundButtonHover: '#1565c0',
          playgroundTab: '#2d2d2d',
          playgroundTabActive: '#64b5f6',
          playgroundTabHover: '#404040',
          
          apiBg: '#1a1a1a',
          apiPanel: '#2d2d2d',
          apiHeader: '#404040',
          apiMethod: '#64b5f6',
          apiPath: '#eceff1',
          
          mermaidBg: '#1a1a1a',
          mermaidNode: '#404040',
          mermaidNodeBorder: '#90a4ae',
          mermaidText: '#eceff1',
          mermaidEdge: '#90a4ae',
          mermaidCluster: '#2d2d2d',
          mermaidNote: '#546e7a'
        }
      }
    }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean minimal theme with subtle grays',
    typography: minimalTypography,
    spacing: compactSpacing,
    variants: {
      light: {
        mode: 'light',
        colors: {
          bgPrimary: '#ffffff',
          bgSecondary: '#fafafa',
          bgTertiary: '#f5f5f5',
          bgCode: '#fafafa',
          bgButton: '#424242',
          bgButtonHover: '#616161',
          bgAccent: '#f5f5f5',
          bgError: '#ffebee',
          bgSuccess: '#e8f5e8',
          bgWarning: '#fff8e1',
          
          textPrimary: '#212121',
          textSecondary: '#616161',
          textTertiary: '#9e9e9e',
          textAccent: '#424242',
          textButton: '#ffffff',
          textError: '#d32f2f',
          textSuccess: '#388e3c',
          textWarning: '#f57c00',
          
          borderPrimary: '#e0e0e0',
          borderSecondary: '#f5f5f5',
          borderAccent: '#424242',
          borderError: '#d32f2f',
          borderSuccess: '#388e3c',
          borderWarning: '#f57c00',
          
          linkPrimary: '#424242',
          linkHover: '#616161',
          focusRing: '#9e9e9e',
          
          playgroundBg: '#ffffff',
          playgroundPanel: '#fafafa',
          playgroundInput: '#ffffff',
          playgroundButton: '#424242',
          playgroundButtonHover: '#616161',
          playgroundTab: '#fafafa',
          playgroundTabActive: '#424242',
          playgroundTabHover: '#f5f5f5',
          
          apiBg: '#ffffff',
          apiPanel: '#fafafa',
          apiHeader: '#f5f5f5',
          apiMethod: '#424242',
          apiPath: '#212121',
          
          mermaidBg: '#ffffff',
          mermaidNode: '#f5f5f5',
          mermaidNodeBorder: '#9e9e9e',
          mermaidText: '#212121',
          mermaidEdge: '#9e9e9e',
          mermaidCluster: '#fafafa',
          mermaidNote: '#fff8e1'
        }
      },
      dark: {
        mode: 'dark',
        colors: {
          bgPrimary: '#121212',
          bgSecondary: '#1e1e1e',
          bgTertiary: '#2d2d2d',
          bgCode: '#1e1e1e',
          bgButton: '#ffffff',
          bgButtonHover: '#f5f5f5',
          bgAccent: '#2d2d2d',
          bgError: '#cf6679',
          bgSuccess: '#81c784',
          bgWarning: '#ffb74d',
          
          textPrimary: '#ffffff',
          textSecondary: '#b3b3b3',
          textTertiary: '#8a8a8a',
          textAccent: '#ffffff',
          textButton: '#121212',
          textError: '#cf6679',
          textSuccess: '#81c784',
          textWarning: '#ffb74d',
          
          borderPrimary: '#404040',
          borderSecondary: '#2d2d2d',
          borderAccent: '#ffffff',
          borderError: '#cf6679',
          borderSuccess: '#81c784',
          borderWarning: '#ffb74d',
          
          linkPrimary: '#ffffff',
          linkHover: '#f5f5f5',
          focusRing: '#ffffff',
          
          playgroundBg: '#121212',
          playgroundPanel: '#1e1e1e',
          playgroundInput: '#2d2d2d',
          playgroundButton: '#ffffff',
          playgroundButtonHover: '#f5f5f5',
          playgroundTab: '#1e1e1e',
          playgroundTabActive: '#ffffff',
          playgroundTabHover: '#2d2d2d',
          
          apiBg: '#121212',
          apiPanel: '#1e1e1e',
          apiHeader: '#2d2d2d',
          apiMethod: '#ffffff',
          apiPath: '#ffffff',
          
          mermaidBg: '#121212',
          mermaidNode: '#2d2d2d',
          mermaidNodeBorder: '#8a8a8a',
          mermaidText: '#ffffff',
          mermaidEdge: '#8a8a8a',
          mermaidCluster: '#1e1e1e',
          mermaidNote: '#404040'
        }
      }
    }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Futuristic theme with neon colors and high contrast',
    typography: cyberpunkTypography,
    spacing: cyberpunkSpacing,
    variants: {
      light: {
        mode: 'light',
        colors: {
          bgPrimary: '#f8fafc',
          bgSecondary: '#e2e8f0',
          bgTertiary: '#cbd5e1',
          bgCode: '#e2e8f0',
          bgButton: '#e94560',
          bgButtonHover: '#dc2626',
          bgAccent: '#e0f2fe',
          bgError: '#fef2f2',
          bgSuccess: '#f0fdf4',
          bgWarning: '#fffbeb',
          
          textPrimary: '#0a0a0f',
          textSecondary: '#1a1a2e',
          textTertiary: '#475569',
          textAccent: '#e94560',
          textButton: '#f8fafc',
          textError: '#dc2626',
          textSuccess: '#16a34a',
          textWarning: '#eab308',
          
          borderPrimary: '#cbd5e1',
          borderSecondary: '#e2e8f0',
          borderAccent: '#e94560',
          borderError: '#dc2626',
          borderSuccess: '#16a34a',
          borderWarning: '#eab308',
          
          linkPrimary: '#e94560',
          linkHover: '#dc2626',
          focusRing: '#ff6b6b',
          
          playgroundBg: '#f8fafc',
          playgroundPanel: '#e2e8f0',
          playgroundInput: '#f8fafc',
          playgroundButton: '#e94560',
          playgroundButtonHover: '#dc2626',
          playgroundTab: '#e2e8f0',
          playgroundTabActive: '#e94560',
          playgroundTabHover: '#cbd5e1',
          
          apiBg: '#f8fafc',
          apiPanel: '#e2e8f0',
          apiHeader: '#cbd5e1',
          apiMethod: '#e94560',
          apiPath: '#0a0a0f',
          
          mermaidBg: '#f8fafc',
          mermaidNode: '#cbd5e1',
          mermaidNodeBorder: '#475569',
          mermaidText: '#0a0a0f',
          mermaidEdge: '#475569',
          mermaidCluster: '#e2e8f0',
          mermaidNote: '#e0f2fe'
        }
      },
      dark: {
        mode: 'dark',
        colors: {
          bgPrimary: '#0a0a0f',
          bgSecondary: '#1a1a2e',
          bgTertiary: '#16213e',
          bgCode: '#1a1a2e',
          bgButton: '#e94560',
          bgButtonHover: '#ff6b6b',
          bgAccent: '#0f3460',
          bgError: '#e94560',
          bgSuccess: '#00ff88',
          bgWarning: '#ffff00',
          
          textPrimary: '#ffffff',
          textSecondary: '#00d9ff',
          textTertiary: '#8892b0',
          textAccent: '#00ff88',
          textButton: '#ffffff',
          textError: '#ff6b6b',
          textSuccess: '#00ff88',
          textWarning: '#ffff00',
          
          borderPrimary: '#0f3460',
          borderSecondary: '#16213e',
          borderAccent: '#00ff88',
          borderError: '#e94560',
          borderSuccess: '#00ff88',
          borderWarning: '#ffff00',
          
          linkPrimary: '#00ff88',
          linkHover: '#00d9ff',
          focusRing: '#00ff88',
          
          playgroundBg: '#0a0a0f',
          playgroundPanel: '#1a1a2e',
          playgroundInput: '#16213e',
          playgroundButton: '#e94560',
          playgroundButtonHover: '#ff6b6b',
          playgroundTab: '#1a1a2e',
          playgroundTabActive: '#00ff88',
          playgroundTabHover: '#16213e',
          
          apiBg: '#0a0a0f',
          apiPanel: '#1a1a2e',
          apiHeader: '#16213e',
          apiMethod: '#00ff88',
          apiPath: '#ffffff',
          
          mermaidBg: '#0a0a0f',
          mermaidNode: '#16213e',
          mermaidNodeBorder: '#00d9ff',
          mermaidText: '#ffffff',
          mermaidEdge: '#00d9ff',
          mermaidCluster: '#1a1a2e',
          mermaidNote: '#0f3460'
        }
      }
    }
  },
  {
    id: 'sepia',
    name: 'Sepia',
    description: 'Warm sepia tones for comfortable reading',
    typography: serifTypography,
    spacing: relaxedSpacing,
    variants: {
      light: {
        mode: 'light',
        colors: {
          bgPrimary: '#fdf6e3',
          bgSecondary: '#eee8d5',
          bgTertiary: '#e3dcc6',
          bgCode: '#eee8d5',
          bgButton: '#b58900',
          bgButtonHover: '#cb4b16',
          bgAccent: '#fdf6e3',
          bgError: '#dc322f',
          bgSuccess: '#859900',
          bgWarning: '#b58900',
          
          textPrimary: '#657b83',
          textSecondary: '#839496',
          textTertiary: '#93a1a1',
          textAccent: '#268bd2',
          textButton: '#fdf6e3',
          textError: '#dc322f',
          textSuccess: '#859900',
          textWarning: '#b58900',
          
          borderPrimary: '#d3cbb7',
          borderSecondary: '#e3dcc6',
          borderAccent: '#268bd2',
          borderError: '#dc322f',
          borderSuccess: '#859900',
          borderWarning: '#b58900',
          
          linkPrimary: '#268bd2',
          linkHover: '#2aa198',
          focusRing: '#268bd2',
          
          playgroundBg: '#fdf6e3',
          playgroundPanel: '#eee8d5',
          playgroundInput: '#fdf6e3',
          playgroundButton: '#b58900',
          playgroundButtonHover: '#cb4b16',
          playgroundTab: '#eee8d5',
          playgroundTabActive: '#268bd2',
          playgroundTabHover: '#e3dcc6',
          
          apiBg: '#fdf6e3',
          apiPanel: '#eee8d5',
          apiHeader: '#e3dcc6',
          apiMethod: '#268bd2',
          apiPath: '#657b83',
          
          mermaidBg: '#fdf6e3',
          mermaidNode: '#e3dcc6',
          mermaidNodeBorder: '#839496',
          mermaidText: '#657b83',
          mermaidEdge: '#839496',
          mermaidCluster: '#eee8d5',
          mermaidNote: '#eee8d5'
        }
      },
      dark: {
        mode: 'dark',
        colors: {
          bgPrimary: '#2d1b0e',
          bgSecondary: '#3d2b1e',
          bgTertiary: '#4d3b2e',
          bgCode: '#3d2b1e',
          bgButton: '#b58900',
          bgButtonHover: '#cb4b16',
          bgAccent: '#2d1b0e',
          bgError: '#dc322f',
          bgSuccess: '#859900',
          bgWarning: '#b58900',
          
          textPrimary: '#fdf6e3',
          textSecondary: '#eee8d5',
          textTertiary: '#d3cbb7',
          textAccent: '#268bd2',
          textButton: '#2d1b0e',
          textError: '#dc322f',
          textSuccess: '#859900',
          textWarning: '#b58900',
          
          borderPrimary: '#5d4b3e',
          borderSecondary: '#4d3b2e',
          borderAccent: '#268bd2',
          borderError: '#dc322f',
          borderSuccess: '#859900',
          borderWarning: '#b58900',
          
          linkPrimary: '#2aa198',
          linkHover: '#268bd2',
          focusRing: '#2aa198',
          
          playgroundBg: '#2d1b0e',
          playgroundPanel: '#3d2b1e',
          playgroundInput: '#4d3b2e',
          playgroundButton: '#b58900',
          playgroundButtonHover: '#cb4b16',
          playgroundTab: '#3d2b1e',
          playgroundTabActive: '#268bd2',
          playgroundTabHover: '#4d3b2e',
          
          apiBg: '#2d1b0e',
          apiPanel: '#3d2b1e',
          apiHeader: '#4d3b2e',
          apiMethod: '#268bd2',
          apiPath: '#fdf6e3',
          
          mermaidBg: '#2d1b0e',
          mermaidNode: '#4d3b2e',
          mermaidNodeBorder: '#839496',
          mermaidText: '#fdf6e3',
          mermaidEdge: '#839496',
          mermaidCluster: '#3d2b1e',
          mermaidNote: '#5d4b3e'
        }
      }
    }
  }
];

// Generate all theme variants (light + dark for each base theme)
export const themes: Theme[] = baseThemes.flatMap(baseTheme => [
  {
    id: `${baseTheme.id}-light`,
    name: `${baseTheme.name} Light`,
    description: `${baseTheme.description} (Light mode)`,
    mode: 'light' as const,
    isDark: false,
    colors: baseTheme.variants.light.colors,
    typography: baseTheme.typography,
    spacing: baseTheme.spacing
  },
  {
    id: `${baseTheme.id}-dark`,
    name: `${baseTheme.name} Dark`,
    description: `${baseTheme.description} (Dark mode)`,
    mode: 'dark' as const,
    isDark: true,
    colors: baseTheme.variants.dark.colors,
    typography: baseTheme.typography,
    spacing: baseTheme.spacing
  }
]);

export function getTheme(id: string): Theme | undefined {
  return themes.find(theme => theme.id === id);
}

export function getThemeNames(): { id: string; name: string; description: string }[] {
  return themes.map(theme => ({ id: theme.id, name: theme.name, description: theme.description }));
}
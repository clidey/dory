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

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  isDark: boolean;
}

export const themes: Theme[] = [
  {
    id: 'light',
    name: 'Light',
    description: 'Clean light theme for optimal readability',
    isDark: false,
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
  {
    id: 'dark',
    name: 'Dark',
    description: 'Sleek dark theme for reduced eye strain',
    isDark: true,
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
  },
  {
    id: 'nord',
    name: 'Nord',
    description: 'Arctic-inspired theme with cool blues and whites',
    isDark: true,
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
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep ocean blues with professional appeal',
    isDark: true,
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
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural green theme with earthy tones',
    isDark: true,
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
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm sunset colors with orange and pink accents',
    isDark: true,
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
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professional corporate theme with blue and gray',
    isDark: false,
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
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean minimal theme with subtle grays',
    isDark: false,
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
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Futuristic theme with neon colors and high contrast',
    isDark: true,
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
  },
  {
    id: 'sepia',
    name: 'Sepia',
    description: 'Warm sepia tones for comfortable reading',
    isDark: false,
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
  }
];

export function getTheme(id: string): Theme | undefined {
  return themes.find(theme => theme.id === id);
}

export function getThemeNames(): { id: string; name: string; description: string }[] {
  return themes.map(theme => ({ id: theme.id, name: theme.name, description: theme.description }));
}
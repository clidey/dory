/**
 * TypeScript interfaces for Dory embedded documentation
 */

export interface DoryEmbedConfig {
  baseUrl: string;
  position?: 'left' | 'right' | 'bottom';
  width?: number | string;
  height?: string;
  theme?: 'light' | 'dark' | 'inherit';
  initialPath?: string;
  trigger?: string | HTMLElement;
  autoInit?: boolean;
  showOverlay?: boolean;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onNavigate?: (path: string) => void;
  onReady?: () => void;
  authToken?: string;
  getAuthToken?: () => Promise<string>;
}

export interface EmbeddedAppConfig {
  container: HTMLElement;
  config: DoryEmbedConfig;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

export interface RouterContext {
  currentPath: string;
  navigate: (path: string) => void;
}

declare global {
  interface Window {
    DoryDocs: DoryDocsAPI;
    __DoryWidget__: any;
  }
}

export interface DoryDocsAPI {
  init(userConfig: Partial<DoryEmbedConfig>): DoryDocsAPI;
  open(path?: string): Promise<void>;
  close(): Promise<void>;
  toggle(): Promise<void>;
  navigate(path: string): Promise<void>;
  setTheme(theme: 'light' | 'dark'): Promise<void>;
  isOpen(): boolean;
  destroy(): Promise<void>;
  on(event: string, handler: Function): DoryDocsAPI;
}

/**
 * Dory Widget Shell (Stage 2) - Iframe Approach
 * Creates an iframe pointing to the already-built documentation
 * This is simpler and more reliable than rebuilding the app
 */

import type { DoryEmbedConfig } from './types';

export class DoryWidget {
  private config: DoryEmbedConfig;
  private container: HTMLElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private overlay: HTMLElement | null = null;
  private isOpenState = false;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(config: DoryEmbedConfig) {
    this.config = config;
    this.init();
  }

  private init() {
    this.createContainer();
    this.setupEventListeners();
  }

  private createContainer() {
    // Create overlay
    if (this.config.showOverlay !== false) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'dory-embed-overlay';
      this.overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999998;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      `;

      if (this.config.closeOnOverlayClick !== false) {
        this.overlay.addEventListener('click', () => this.close());
      }

      document.body.appendChild(this.overlay);
    }

    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'dory-embed-container';
    this.container.setAttribute('data-position', this.config.position || 'right');
    this.container.style.cssText = this.getContainerStyles();

    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
    this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
    this.iframe.src = this.buildIframeUrl();

    this.container.appendChild(this.iframe);

    // Add container to body
    document.body.appendChild(this.container);

    // Setup iframe communication
    this.setupIframeMessaging();
  }

  private buildIframeUrl(): string {
    const baseUrl = this.config.baseUrl;
    const path = this.config.initialPath || '/';
    const params = new URLSearchParams();

    // Add embedded mode flag
    params.set('embedded', 'true');

    // Add theme
    if (this.config.theme && this.config.theme !== 'inherit') {
      params.set('theme', this.config.theme);
    }

    const url = new URL(baseUrl);
    url.pathname = path;
    url.search = params.toString();

    return url.toString();
  }

  private setupIframeMessaging() {
    window.addEventListener('message', (event) => {
      // Verify origin
      if (event.origin !== new URL(this.config.baseUrl).origin) {
        return;
      }

      const message = event.data;

      switch (message.type) {
        case 'navigate':
          this.emit('navigate', message.path);
          break;
        case 'ready':
          this.emit('ready');
          break;
      }
    });
  }

  private getContainerStyles(): string {
    const { position = 'right', width = 500, height = '100vh' } = this.config;
    const widthStr = typeof width === 'number' ? `${width}px` : width;

    const baseStyles = `
      position: fixed;
      z-index: 999999;
      background: white;
      box-shadow: -2px 0 20px rgba(0, 0, 0, 0.15);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      will-change: transform;
      overflow: hidden;
    `;

    const positionStyles = {
      right: `
        top: 0;
        right: 0;
        bottom: 0;
        width: ${widthStr};
        max-width: 100vw;
        transform: translateX(100%);
      `,
      left: `
        top: 0;
        left: 0;
        bottom: 0;
        width: ${widthStr};
        max-width: 100vw;
        transform: translateX(-100%);
      `,
      bottom: `
        bottom: 0;
        left: 0;
        right: 0;
        height: ${height};
        max-height: 90vh;
        transform: translateY(100%);
      `,
    };

    return baseStyles + positionStyles[position];
  }

  private setupEventListeners() {
    // Keyboard shortcuts
    const handleKeydown = (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === 'Escape' && this.isOpenState && this.config.closeOnEscape !== false) {
        this.close();
      }
    };

    document.addEventListener('keydown', handleKeydown);

    // Store cleanup function
    (this.container as any).__cleanup = () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }

  async open(path?: string) {
    if (this.isOpenState) {
      if (path) this.navigate(path);
      return;
    }

    this.isOpenState = true;

    // Show overlay
    if (this.overlay) {
      this.overlay.style.opacity = '1';
      this.overlay.style.pointerEvents = 'auto';
    }

    // Slide in container
    if (this.container) {
      this.container.style.transform = 'translate(0, 0)';
    }

    // Update iframe URL if path is specified
    if (path && this.iframe) {
      const url = new URL(this.iframe.src);
      url.pathname = path;
      this.iframe.src = url.toString();
    }

    // Focus management
    this.container?.focus();

    // Disable body scroll
    document.body.style.overflow = 'hidden';

    // Emit event
    this.emit('open');
  }

  close() {
    if (!this.isOpenState) return;

    this.isOpenState = false;

    // Hide overlay
    if (this.overlay) {
      this.overlay.style.opacity = '0';
      this.overlay.style.pointerEvents = 'none';
    }

    // Slide out container
    if (this.container) {
      const { position = 'right' } = this.config;
      const transforms: Record<string, string> = {
        right: 'translateX(100%)',
        left: 'translateX(-100%)',
        bottom: 'translateY(100%)',
      };
      this.container.style.transform = transforms[position];
    }

    // Re-enable body scroll
    document.body.style.overflow = '';

    // Emit event
    this.emit('close');
  }

  toggle() {
    this.isOpenState ? this.close() : this.open();
  }

  navigate(path: string) {
    if (this.iframe) {
      const url = new URL(this.iframe.src);
      url.pathname = path;
      this.iframe.src = url.toString();
      this.emit('navigate', path);
    }
  }

  setTheme(theme: 'light' | 'dark') {
    if (this.iframe) {
      const url = new URL(this.iframe.src);
      url.searchParams.set('theme', theme);
      this.iframe.src = url.toString();
    }
  }

  isOpen() {
    return this.isOpenState;
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`[DoryDocs] Error in ${event} handler:`, error);
        }
      });
    }
  }

  destroy() {
    // Cleanup event listeners
    if (this.container && (this.container as any).__cleanup) {
      (this.container as any).__cleanup();
    }

    // Remove DOM elements
    this.container?.remove();
    this.overlay?.remove();

    // Clear references
    this.container = null;
    this.iframe = null;
    this.overlay = null;
    this.eventHandlers.clear();
  }
}

// Expose widget globally for loader script
if (typeof window !== 'undefined') {
  window.__DoryWidget__ = DoryWidget;
}

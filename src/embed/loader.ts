/**
 * Dory Embed Loader Script (Stage 1)
 * This is the minimal initial script that sets up the global API
 * and lazy-loads the widget on demand.
 * Target size: ~3-5KB gzipped
 */

import type { DoryEmbedConfig, DoryDocsAPI } from './types';

// Prevent double-loading
if (typeof window !== 'undefined' && window.DoryDocs) {
  console.warn('[DoryDocs] Already loaded');
} else {
  // Main initialization
  (function() {
    'use strict';

  // Extract base URL from script tag
  const currentScript = document.currentScript as HTMLScriptElement;
  const scriptSrc = currentScript?.src || '';
  const baseUrl = scriptSrc.replace(/\/embed\.js.*$/, '');

  // Configuration storage
  let config: DoryEmbedConfig = {
    baseUrl,
    position: 'right',
    width: 500,
    height: '100vh',
    theme: 'inherit',
    initialPath: '/',
    autoInit: true,
    showOverlay: true,
    closeOnEscape: true,
    closeOnOverlayClick: true,
  };

  // Widget instance (loaded lazily)
  let widgetInstance: any = null;
  let widgetLoading = false;
  let widgetLoadPromise: Promise<any> | null = null;

  // Load the widget script
  async function loadWidget(): Promise<any> {
    if (widgetInstance) return widgetInstance;
    if (widgetLoading) return widgetLoadPromise;

    widgetLoading = true;
    widgetLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${baseUrl}/embed-widget.js`;
      script.async = true;
      script.type = 'module';

      script.onload = () => {
        // Widget script exposes window.__DoryWidget__
        if (window.__DoryWidget__) {
          widgetInstance = new window.__DoryWidget__(config);
          resolve(widgetInstance);
        } else {
          reject(new Error('[DoryDocs] Widget failed to load'));
        }
      };

      script.onerror = () => {
        widgetLoading = false;
        widgetLoadPromise = null;
        reject(new Error('[DoryDocs] Failed to load widget script'));
      };

      document.head.appendChild(script);
    });

    return widgetLoadPromise;
  }

  // Public API
  const DoryDocs: DoryDocsAPI = {
    // Configuration
    init(userConfig: Partial<DoryEmbedConfig>) {
      config = { ...config, ...userConfig };

      // Auto-attach trigger if specified
      if (config.trigger) {
        const attachTrigger = () => {
          const element = typeof config.trigger === 'string'
            ? document.querySelector(config.trigger)
            : config.trigger;

          if (element) {
            element.addEventListener('click', () => this.open());
          } else if (typeof config.trigger === 'string') {
            console.warn(`[DoryDocs] Trigger element not found: ${config.trigger}`);
          }
        };

        // Try immediately, or wait for DOM ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', attachTrigger);
        } else {
          attachTrigger();
        }
      }

      return this;
    },

    // Open documentation
    async open(path?: string) {
      try {
        const widget = await loadWidget();
        await widget.open(path || config.initialPath);
        config.onOpen?.();
      } catch (error) {
        console.error('[DoryDocs] Failed to open:', error);
      }
    },

    // Close documentation
    async close() {
      if (!widgetInstance) return;
      widgetInstance.close();
      config.onClose?.();
    },

    // Toggle documentation
    async toggle() {
      try {
        const widget = await loadWidget();
        widget.toggle();
      } catch (error) {
        console.error('[DoryDocs] Failed to toggle:', error);
      }
    },

    // Navigate to path
    async navigate(path: string) {
      try {
        const widget = await loadWidget();
        widget.navigate(path);
      } catch (error) {
        console.error('[DoryDocs] Failed to navigate:', error);
      }
    },

    // Set theme
    async setTheme(theme: 'light' | 'dark') {
      try {
        const widget = await loadWidget();
        widget.setTheme(theme);
      } catch (error) {
        console.error('[DoryDocs] Failed to set theme:', error);
      }
    },

    // Get current state
    isOpen() {
      return widgetInstance?.isOpen() || false;
    },

    // Destroy widget
    async destroy() {
      if (widgetInstance) {
        widgetInstance.destroy();
        widgetInstance = null;
        widgetLoading = false;
        widgetLoadPromise = null;
      }
    },

    // Event listeners
    on(event: string, handler: Function) {
      const eventKey = `on${event.charAt(0).toUpperCase()}${event.slice(1)}` as keyof DoryEmbedConfig;
      (config as any)[eventKey] = handler;
      if (widgetInstance) {
        widgetInstance.on(event, handler);
      }
      return this;
    },
  };

  // Expose global API
  window.DoryDocs = DoryDocs;

  // Auto-initialize if configured
  if (config.autoInit) {
    // Check for URL hash deep linking
    if (window.location.hash.startsWith('#docs=')) {
      const path = decodeURIComponent(window.location.hash.replace('#docs=', ''));
      DoryDocs.open(path);
    }
  }

  // Dispatch ready event
  window.dispatchEvent(new CustomEvent('dory:ready', { detail: { api: DoryDocs } }));

  // Call onReady callback
  config.onReady?.();

  })();
}

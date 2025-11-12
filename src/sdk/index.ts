/**
 * Dory Embedded Documentation SDK
 * Export all framework integrations
 */

// Re-export React SDK
export { useDoryDocs as useReactDoryDocs, DoryDocsTrigger, DoryDocsProvider } from './react';

// Re-export Vue SDK
export { useDoryDocs as useVueDoryDocs } from './vue';

// Export types
export type { DoryEmbedConfig } from '../embed/types';

// Export vanilla JS API reference
export interface DoryDocsAPI {
  init(config: Partial<any>): DoryDocsAPI;
  open(path?: string): Promise<void>;
  close(): Promise<void>;
  toggle(): Promise<void>;
  navigate(path: string): Promise<void>;
  setTheme(theme: 'light' | 'dark'): Promise<void>;
  isOpen(): boolean;
  destroy(): Promise<void>;
  on(event: string, handler: Function): DoryDocsAPI;
}

/**
 * Check if DoryDocs is loaded
 */
export function isDoryDocsLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.DoryDocs;
}

/**
 * Wait for DoryDocs to be loaded
 */
export function waitForDoryDocs(timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isDoryDocsLoaded()) {
      resolve(true);
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('dory:ready', handleReady);
      resolve(false);
    }, timeout);

    const handleReady = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };

    window.addEventListener('dory:ready', handleReady, { once: true });
  });
}

/**
 * Load Dory embed script dynamically
 */
export function loadDoryScript(docsUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isDoryDocsLoaded()) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `${docsUrl}/embed.js`;
    script.async = true;

    script.onload = () => {
      waitForDoryDocs().then((loaded) => {
        if (loaded) {
          resolve();
        } else {
          reject(new Error('DoryDocs failed to initialize'));
        }
      });
    };

    script.onerror = () => {
      reject(new Error('Failed to load DoryDocs script'));
    };

    document.head.appendChild(script);
  });
}

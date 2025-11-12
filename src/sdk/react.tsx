/**
 * React SDK for Dory Embedded Documentation
 * Usage: npm install @clidey/dory-embedded
 */

import { useEffect, useRef, useCallback } from 'react';
import type { DoryDocsAPI } from '../embed/types';

interface DoryDocsConfig {
  docsUrl: string;
  position?: 'left' | 'right' | 'bottom';
  width?: number | string;
  height?: string;
  theme?: 'light' | 'dark' | 'inherit';
  initialPath?: string;
  showOverlay?: boolean;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onNavigate?: (path: string) => void;
  onReady?: () => void;
}

/**
 * Hook to use Dory Documentation in React components
 */
export function useDoryDocs(config: DoryDocsConfig) {
  const docsRef = useRef<any>(null);
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    // Wait for DoryDocs to be available
    const checkDoryDocs = () => {
      if (window.DoryDocs) {
        docsRef.current = window.DoryDocs.init(configRef.current);
      } else {
        console.warn('[useDoryDocs] DoryDocs not loaded. Make sure to include the embed script.');
      }
    };

    if (document.readyState === 'loading') {
      window.addEventListener('dory:ready', checkDoryDocs);
    } else {
      checkDoryDocs();
    }

    return () => {
      window.removeEventListener('dory:ready', checkDoryDocs);
      docsRef.current?.destroy();
    };
  }, []);

  const open = useCallback((path?: string) => {
    return docsRef.current?.open(path);
  }, []);

  const close = useCallback(() => {
    return docsRef.current?.close();
  }, []);

  const toggle = useCallback(() => {
    return docsRef.current?.toggle();
  }, []);

  const navigate = useCallback((path: string) => {
    return docsRef.current?.navigate(path);
  }, []);

  const setTheme = useCallback((theme: 'light' | 'dark') => {
    return docsRef.current?.setTheme(theme);
  }, []);

  const isOpen = useCallback(() => {
    return docsRef.current?.isOpen() || false;
  }, []);

  return {
    open,
    close,
    toggle,
    navigate,
    setTheme,
    isOpen,
  };
}

/**
 * Component that renders a trigger button for Dory Documentation
 */
export function DoryDocsTrigger({
  children,
  config,
  className,
  path,
}: {
  children: React.ReactNode;
  config: DoryDocsConfig;
  className?: string;
  path?: string;
}) {
  const docs = useDoryDocs(config);

  const handleClick = () => {
    docs.open(path);
  };

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
}

/**
 * Component that initializes Dory Documentation without rendering anything
 */
export function DoryDocsProvider({
  config,
  children,
}: {
  config: DoryDocsConfig;
  children: React.ReactNode;
}) {
  useDoryDocs(config);

  return <>{children}</>;
}

// Type declarations
declare global {
  interface Window {
    DoryDocs: DoryDocsAPI;
  }
}

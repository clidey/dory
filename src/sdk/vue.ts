/**
 * Vue SDK for Dory Embedded Documentation
 * Usage: npm install @clidey/dory-embedded
 */

// @ts-ignore - Vue is an optional peer dependency
import { ref, onMounted, onUnmounted, computed } from 'vue';
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
 * Composable to use Dory Documentation in Vue components
 */
export function useDoryDocs(config: DoryDocsConfig) {
  const docsInstance = ref<any>(null);
  const isReady = ref(false);

  const initDocs = () => {
    if (window.DoryDocs) {
      docsInstance.value = window.DoryDocs.init(config);
      isReady.value = true;
    } else {
      console.warn('[useDoryDocs] DoryDocs not loaded. Make sure to include the embed script.');
    }
  };

  onMounted(() => {
    if (document.readyState === 'loading') {
      window.addEventListener('dory:ready', initDocs);
    } else {
      initDocs();
    }
  });

  onUnmounted(() => {
    window.removeEventListener('dory:ready', initDocs);
    if (docsInstance.value) {
      docsInstance.value.destroy();
    }
  });

  const open = async (path?: string) => {
    if (docsInstance.value) {
      await docsInstance.value.open(path);
    }
  };

  const close = async () => {
    if (docsInstance.value) {
      await docsInstance.value.close();
    }
  };

  const toggle = async () => {
    if (docsInstance.value) {
      await docsInstance.value.toggle();
    }
  };

  const navigate = async (path: string) => {
    if (docsInstance.value) {
      await docsInstance.value.navigate(path);
    }
  };

  const setTheme = async (theme: 'light' | 'dark') => {
    if (docsInstance.value) {
      await docsInstance.value.setTheme(theme);
    }
  };

  const isOpen = computed(() => {
    return docsInstance.value?.isOpen() || false;
  });

  return {
    open,
    close,
    toggle,
    navigate,
    setTheme,
    isOpen: isOpen.value,
    isReady,
  };
}

// Type declarations
declare global {
  interface Window {
    DoryDocs: DoryDocsAPI;
  }
}

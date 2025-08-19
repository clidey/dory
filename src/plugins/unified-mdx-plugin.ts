import type { Plugin } from 'vite';
import { preprocessMdxContent } from '../mdx/processor';

/**
 * Unified MDX preprocessing plugin for Vite.
 * This plugin ensures that ALL MDX preprocessing goes through the same pipeline
 * as the CLI verify:content command.
 * 
 * This is the SINGLE SOURCE OF TRUTH for MDX preprocessing.
 * Any changes to MDX processing should be made in src/mdx/processor.ts
 */
export function unifiedMdxPreprocessor(): Plugin {
  return {
    name: 'unified-mdx-preprocessor',
    enforce: 'pre', // Must run before the MDX plugin
    async transform(code: string, id: string) {
      if (!id.endsWith('.mdx')) return;
      
      // Process through the unified preprocessing pipeline
      const result = await preprocessMdxContent(code, id);

      if (!result.success) {
        // Throw the error to stop the build
        throw result.error;
      }

      // Return the preprocessed content
      // The actual MDX compilation will be handled by @mdx-js/rollup plugin
      return {
        code: result.processedContent || code,
        map: null
      };
    }
  };
}
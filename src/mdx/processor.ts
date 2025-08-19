import { compile } from '@mdx-js/mdx';
import { preprocessMdxTags } from '../plugins/sanitize';
import { getMdxConfig } from '../config/mdx';

export interface ProcessMdxOptions {
  isDevelopment?: boolean;
  fileName?: string;
}

/**
 * SINGLE SOURCE OF TRUTH for MDX preprocessing.
 * 
 * This processor is used by:
 * - CLI verify:content command (bin/dory.ts) - full processing + compilation
 * - Vite build via unified-mdx-plugin.ts - preprocessing only
 * 
 * ALL MDX processing steps should be added here to ensure consistency.
 */
export async function preprocessMdxContent(
  content: string,
  fileName: string = 'content.mdx'
): Promise<{
  success: boolean;
  processedContent?: string;
  error?: Error;
}> {
  try {
    // Step 1: Apply preprocessor (handles MDX tags, code blocks, etc.)
    const preprocessor = preprocessMdxTags();
    let processedContent = content;
    
    if (preprocessor.transform) {
      const result = preprocessor.transform(content, fileName);
      if (result && typeof result === 'object' && result.code) {
        processedContent = result.code;
      } else if (typeof result === 'string') {
        processedContent = result;
      }
    }
    
    // Step 2: Convert URLs in angle brackets to markdown links
    // Handles cases like <https://example.com> which MDX would interpret as JSX
    // But preserves them inside code blocks
    
    // Simple approach: process line by line to avoid complex regex issues
    const lines = processedContent.split('\n');
    let inCodeBlock = false;
    
    processedContent = lines.map(line => {
      // Check if we're entering or leaving a code block
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return line;
      }
      
      // Don't process lines inside code blocks
      if (inCodeBlock) {
        return line;
      }
      
      // For lines outside code blocks, preserve inline code
      // Split by backticks to handle inline code
      const parts = line.split(/(`[^`]*`)/g);
      
      return parts.map((part, index) => {
        // Odd indices are inline code (captured groups)
        if (index % 2 === 1) {
          return part; // Keep inline code as-is
        }
        // Even indices are regular text - convert URLs
        return part.replace(/<(https?:\/\/[^\s>]+)>/g, '[$1]($1)');
      }).join('');
    }).join('\n');
    
    // Step 3: Add any future preprocessing steps here
    // Example: processedContent = await yourNewPreprocessor(processedContent);
    // Example: processedContent = removeHTMLComments(processedContent);
    // Example: processedContent = expandCustomShortcodes(processedContent);
    // ALL preprocessing added here will automatically apply to:
    // - CLI commands (verify:content)
    // - Vite build (pnpm run build)
    // - Vite dev server (pnpm run dev)
    
    return {
      success: true,
      processedContent
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error
    };
  }
}

/**
 * Process and compile MDX content through the full pipeline.
 * Used by CLI commands that need the compiled output.
 */
export async function processMdxContent(
  content: string, 
  options: ProcessMdxOptions = {}
): Promise<{ 
  success: boolean; 
  compiled?: any; 
  error?: Error;
  processedContent?: string;
}> {
  const { isDevelopment = false, fileName = 'content.mdx' } = options;
  
  try {
    // Step 1: Preprocess
    const preprocessResult = await preprocessMdxContent(content, fileName);
    if (!preprocessResult.success) {
      return {
        success: false,
        error: preprocessResult.error
      };
    }
    
    const processedContent = preprocessResult.processedContent || content;
    
    // Step 2: Compile MDX with the same config as main build
    const mdxConfig = getMdxConfig(isDevelopment);
    const compiled = await compile(processedContent, {
      ...mdxConfig,
    });
    
    return {
      success: true,
      compiled,
      processedContent
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error
    };
  }
}

/**
 * Verify MDX content can be compiled without errors.
 * Uses the same processing pipeline as processMdxContent.
 */
export async function verifyMdxContent(
  content: string,
  fileName?: string
): Promise<{ valid: boolean; error?: Error }> {
  const result = await processMdxContent(content, { fileName });
  
  if (result.success) {
    return { valid: true };
  } else {
    return { 
      valid: false, 
      error: result.error 
    };
  }
}
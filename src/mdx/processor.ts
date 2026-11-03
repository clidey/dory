import { compile } from '@mdx-js/mdx';
import { preprocessMdxSource } from './preprocess.ts';
import { getMdxConfig } from '../config/mdx.ts';

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
    return { success: true, processedContent: preprocessMdxSource(content, fileName) };
  } catch (error) {
    return { success: false, error: error as Error };
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
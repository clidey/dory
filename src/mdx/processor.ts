import { compile, createProcessor } from '@mdx-js/mdx';
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
    const processed = preprocessMdxSource(content, fileName);
    // Only real top-level ESM declarations register static JSX components.
    // The browser's embedded runtime does not call this trusted build processor.
    const importedNames = (source: string) => {
      const names: string[] = [];
      let declarations = 0;
      for (const node of createProcessor().parse(source).children) {
        if (node.type !== 'mdxjsEsm') continue;
        for (const statement of node.data?.estree?.body ?? []) {
          if (statement.type !== 'ImportDeclaration') continue;
          declarations++;
          for (const specifier of statement.specifiers) names.push(specifier.local.name);
        }
      }
      return { names, declarations };
    };
    let importedComponents: string[] = [];
    if (/^import(?:\s|$)/m.test(processed)) {
      try {
        importedComponents = importedNames(processed).names;
      } catch {
        // Escaped closing tags can temporarily make imported JSX with props
        // malformed. Gather provisional names from isolated import declarations.
        // They are never trusted until the complete document's AST verifies them.
        const candidates = new Set<string>();
        const lines = processed.split('\n');
        let fence = '';
        for (let index = 0; index < lines.length; index++) {
          const marker = lines[index].match(/^\s*(`{3,}|~{3,})(.*)$/);
          if (marker) {
            if (!fence) fence = marker[1];
            else if (marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = '';
            continue;
          }
          if (fence || !/^import(?:\s|$)/.test(lines[index])) continue;
          for (let end = index; end < lines.length; end++) {
            try {
              const result = importedNames(lines.slice(index, end + 1).join('\n'));
              if (!result.declarations) continue;
              for (const name of result.names) candidates.add(name);
              index = end;
              break;
            } catch { /* The declaration may span more lines. */ }
          }
        }
        const provisional = preprocessMdxSource(content, fileName, [...candidates]);
        importedComponents = importedNames(provisional).names;
      }
    }
    return {
      success: true,
      processedContent: importedComponents.length
        ? preprocessMdxSource(content, fileName, importedComponents)
        : processed,
    };
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
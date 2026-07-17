import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import {
  readDoryConfig,
  getNavigationOrder,
  parseFrontmatter,
  findMdxFilesMap,
  pathFromFilename,
} from './shared';

interface LlmTxtGeneratorOptions {
  docsDir?: string;
}

/** Cleans MDX content for LLM consumption (keeps code-fence languages). */
function cleanMdxContent(content: string): string {
  return content
    // Remove JSX opening/closing tags but keep content
    .replace(/<(\w+)([^>]*?)>/g, '')
    .replace(/<\/\w+>/g, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove excessive whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/** Resolves a navigation page key to its MDX file key, or null when missing. */
function resolveFileKey(navKey: string, mdxFilesMap: Record<string, string>): string | null {
  if (mdxFilesMap[navKey]) return navKey;
  if (mdxFilesMap[`${navKey}/index`]) return `${navKey}/index`;
  return null;
}

/**
 * Generates a spec-shaped llms.txt (https://llmstxt.org): H1 site name,
 * blockquote summary, then per-tab sections with link lists to the .mdx
 * source files.
 */
export function generateLlmsIndex(docsDir: string): string {
  const config = readDoryConfig(docsDir) || {};
  const siteName: string = config.name || 'Documentation';
  const baseUrl: string = config.url || '';
  const mdxFilesMap = findMdxFilesMap(docsDir, docsDir);

  let output = `# ${siteName}\n`;
  if (config.description) {
    output += `\n> ${config.description}\n`;
  }

  const tabs: any[] = config.navigation?.tabs || [];
  for (const tab of tabs) {
    const links: string[] = [];
    const walkPages = (pages: any[]) => {
      for (const page of pages) {
        if (typeof page === 'string') {
          const fileKey = resolveFileKey(page, mdxFilesMap);
          if (!fileKey) continue;
          const raw = fs.readFileSync(mdxFilesMap[fileKey], 'utf-8');
          const { data } = parseFrontmatter(raw);
          const routePath = pathFromFilename(mdxFilesMap[fileKey], docsDir);
          const url = `${baseUrl}${routePath}.mdx`;
          const title = data.title || page;
          links.push(data.description ? `- [${title}](${url}): ${data.description}` : `- [${title}](${url})`);
        } else if (typeof page === 'object' && page.pages) {
          walkPages(page.pages);
        }
      }
    };
    for (const group of tab.groups || []) {
      if (Array.isArray(group.pages)) walkPages(group.pages);
    }
    if (links.length > 0) {
      output += `\n## ${tab.tab || 'Documentation'}\n\n${links.join('\n')}\n`;
    }
  }

  return output.trim() + '\n';
}

/**
 * Generates the full concatenated documentation content (llms-full.txt),
 * in dory.json navigation order with extra files appended.
 */
export function generateLlmContent(docsDir: string): string {
  const navOrder = getNavigationOrder(docsDir);
  const mdxFilesMap = findMdxFilesMap(docsDir, docsDir);
  const usedKeys = new Set<string>();
  let aggregatedContent = '';

  const appendFile = (fileKey: string) => {
    const rawContent = fs.readFileSync(mdxFilesMap[fileKey], 'utf-8');
    const { data, content } = parseFrontmatter(rawContent);

    aggregatedContent += `\n# ${fileKey}.mdx\n`;
    if (data.title) {
      aggregatedContent += `## ${data.title}\n\n`;
    }
    if (data.description) {
      aggregatedContent += `${data.description}\n\n`;
    }
    aggregatedContent += cleanMdxContent(content) + '\n\n';
    aggregatedContent += '---\n\n';
  };

  // Output files in navigation order, in order as in dory.json
  for (const navKey of navOrder) {
    const fileKey = resolveFileKey(navKey, mdxFilesMap);
    if (!fileKey) continue;
    usedKeys.add(fileKey);
    appendFile(fileKey);
  }

  // Output any extra files not in navigation order, sorted
  const extraKeys = Object.keys(mdxFilesMap).filter(k => !usedKeys.has(k)).sort();
  for (const fileKey of extraKeys) {
    appendFile(fileKey);
  }

  return aggregatedContent.replace(/^\n+/, '').trim();
}

/**
 * Build plugin that emits llms.txt (spec-shaped index) and llms-full.txt
 * (full concatenated documentation).
 */
export function llmTxtGenerator(options: LlmTxtGeneratorOptions = {}): Plugin {
  return {
    name: 'llm-txt-generator',
    generateBundle() {
      const docsDir = options.docsDir || path.join(process.cwd(), 'docs');
      const indexContent = generateLlmsIndex(docsDir);
      const fullContent = generateLlmContent(docsDir);

      this.emitFile({
        type: 'asset',
        fileName: 'llms.txt',
        source: indexContent
      });

      this.emitFile({
        type: 'asset',
        fileName: 'llms-full.txt',
        source: fullContent
      });

      const mdxFilesCount = Object.keys(findMdxFilesMap(docsDir, docsDir)).length;
      console.log(`✅ Generated llms.txt and llms-full.txt`);
      console.log(`📄 Processed ${mdxFilesCount} MDX files`);
      console.log(`📝 Full content size: ${fullContent.length} characters`);
    }
  };
}

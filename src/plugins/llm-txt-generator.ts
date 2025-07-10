import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

interface LlmTxtGeneratorOptions {
  docsDir?: string;
  outputPath?: string;
}

// Read dory.json to get navigation order (flat list, in order)
function getNavigationOrder(docsDir: string): string[] {
  const doryJsonPath = path.join(docsDir, 'dory.json');
  if (!fs.existsSync(doryJsonPath)) return [];
  const doryJson = JSON.parse(fs.readFileSync(doryJsonPath, 'utf-8'));
  const order: string[] = [];

  function walkPages(pages: any[]) {
    for (const page of pages) {
      if (typeof page === 'string') {
        order.push(page);
      } else if (typeof page === 'object' && page.pages) {
        walkPages(page.pages);
      }
    }
  }

  if (doryJson.navigation && Array.isArray(doryJson.navigation.tabs)) {
    for (const tab of doryJson.navigation.tabs) {
      if (tab.groups && Array.isArray(tab.groups)) {
        for (const group of tab.groups) {
          if (group.pages && Array.isArray(group.pages)) {
            walkPages(group.pages);
          }
        }
      }
    }
  }
  return order;
}

// Function to parse frontmatter from MDX content
function parseFrontmatter(content: string) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) return { data: {}, content };

  const frontmatter = frontmatterMatch[1];
  const data: Record<string, string> = {};

  frontmatter.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      const value = valueParts.join(':').trim();
      data[key.trim()] = value.replace(/^["']|["']$/g, '');
    }
  });

  return { data, content: content.slice(frontmatterMatch[0].length) };
}

// Function to recursively find all MDX files and map by relative path (without .mdx)
function findMdxFilesMap(dir: string, baseDir: string): Record<string, string> {
  const files: Record<string, string> = {};
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      Object.assign(files, findMdxFilesMap(fullPath, baseDir));
    } else if (item.isFile() && item.name.endsWith('.mdx')) {
      // Key: relative path without .mdx, with forward slashes
      let rel = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      if (rel.endsWith('.mdx')) rel = rel.slice(0, -4);
      files[rel] = fullPath;
    }
  }

  return files;
}

// Function to clean MDX content for LLM consumption
function cleanMdxContent(content: string): string {
  // Remove JSX components but keep their content
  let cleaned = content
    // Remove JSX opening/closing tags but keep content
    .replace(/<(\w+)([^>]*?)>/g, '')
    .replace(/<\/\w+>/g, '')
    // Remove code block language specifiers
    .replace(/```(\w+)/g, '```')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove excessive whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Remove leading/trailing whitespace
    .trim();

  return cleaned;
}

// Function to generate LLM text content in dory.json order, then append any extra files
function generateLlmContent(docsDir: string): string {
  const navOrder = getNavigationOrder(docsDir);
  const mdxFilesMap = findMdxFilesMap(docsDir, docsDir);
  const usedKeys = new Set<string>();
  let aggregatedContent = '';

  // Output files in navigation order, in order as in dory.json
  for (const navKey of navOrder) {
    // Try both with and without "index"
    let fileKey = navKey;
    if (mdxFilesMap[fileKey]) {
      usedKeys.add(fileKey);
    } else if (mdxFilesMap[`${fileKey}/index`]) {
      fileKey = `${fileKey}/index`;
      usedKeys.add(fileKey);
    } else {
      continue;
    }
    const filePath = mdxFilesMap[fileKey];
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = parseFrontmatter(rawContent);
    const cleanedContent = cleanMdxContent(content);

    // Add file header
    aggregatedContent += `\n# ${fileKey}.mdx\n`;

    // Add title if available
    if (data.title) {
      aggregatedContent += `## ${data.title}\n\n`;
    }

    // Add description if available
    if (data.description) {
      aggregatedContent += `${data.description}\n\n`;
    }

    // Add cleaned content
    aggregatedContent += cleanedContent + '\n\n';
    aggregatedContent += '---\n\n';
  }

  // Output any extra files not in navigation order, sorted
  const extraKeys = Object.keys(mdxFilesMap).filter(k => !usedKeys.has(k)).sort();
  for (const fileKey of extraKeys) {
    const filePath = mdxFilesMap[fileKey];
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = parseFrontmatter(rawContent);
    const cleanedContent = cleanMdxContent(content);

    aggregatedContent += `\n# ${fileKey}.mdx\n`;
    if (data.title) {
      aggregatedContent += `## ${data.title}\n\n`;
    }
    if (data.description) {
      aggregatedContent += `${data.description}\n\n`;
    }
    aggregatedContent += cleanedContent + '\n\n';
    aggregatedContent += '---\n\n';
  }

  // Remove leading newlines for the very first file, so the first file is at the very top
  return aggregatedContent.replace(/^\n+/, '').trim();
}

export function llmTxtGenerator(options: LlmTxtGeneratorOptions = {}): Plugin {
  return {
    name: 'llm-txt-generator',
    generateBundle() {
      const docsDir = options.docsDir || path.join(process.cwd(), 'docs');
      const aggregatedContent = generateLlmContent(docsDir);

      this.emitFile({
        type: 'asset',
        fileName: 'llms.txt',
        source: aggregatedContent
      });

      // For logging, count the number of MDX files processed
      const mdxFilesMap = findMdxFilesMap(docsDir, docsDir);
      const mdxFilesCount = Object.keys(mdxFilesMap).length;

      console.log(`✅ Generated LLM text file`);
      console.log(`📄 Processed ${mdxFilesCount} MDX files`);
      console.log(`📝 Total content size: ${aggregatedContent.length} characters`);
    }
  };
}
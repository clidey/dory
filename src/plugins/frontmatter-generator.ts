import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import {
  getNavigationOrder,
  parseFrontmatter,
  pathFromFilename,
  findMdxFilesMap,
  stripMdxToText,
} from './shared';

interface FrontmatterGeneratorOptions {
  docsDir?: string;
}

/**
 * Generates the frontmatter array for all MDX files in dory.json navigation
 * order, then appends any extra files (sorted).
 */
export function generateFrontmatterJson(docsDir: string): Array<Record<string, any>> {
  const navOrder = getNavigationOrder(docsDir);
  const mdxFilesMap = findMdxFilesMap(docsDir, docsDir);
  const usedKeys = new Set<string>();
  const frontmatterArray: Array<Record<string, any>> = [];

  const pushEntry = (fileKey: string) => {
    const filePath = mdxFilesMap[fileKey];
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const { data } = parseFrontmatter(rawContent);
    frontmatterArray.push({
      ...data,
      path: pathFromFilename(filePath, docsDir),
    });
  };

  // Process files in navigation order first
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
    pushEntry(fileKey);
  }

  // Process any extra files not in navigation order, sorted
  const extraKeys = Object.keys(mdxFilesMap).filter(k => !usedKeys.has(k)).sort();
  for (const fileKey of extraKeys) {
    pushEntry(fileKey);
  }

  return frontmatterArray;
}

/**
 * Generates search content entries: [{ path, title, content }] with MDX
 * stripped to plain text for client-side indexing.
 */
export function generateSearchContentJson(
  docsDir: string,
  frontmatterArray: Array<Record<string, any>>
): Array<Record<string, any>> {
  const mdxFilesMap = findMdxFilesMap(docsDir, docsDir);
  const searchContent: Array<Record<string, any>> = [];

  for (const fm of frontmatterArray) {
    const fileEntry = Object.entries(mdxFilesMap).find(([, filePath]) =>
      pathFromFilename(filePath, docsDir) === fm.path
    );
    if (!fileEntry) continue;

    const rawContent = fs.readFileSync(fileEntry[1], 'utf-8');
    const { content } = parseFrontmatter(rawContent);
    searchContent.push({ path: fm.path, title: fm.title || '', content: stripMdxToText(content) });
  }

  return searchContent;
}

/**
 * Build plugin that emits frontmatter.json and search-content.json.
 */
export function frontmatterGenerator(options: FrontmatterGeneratorOptions = {}): Plugin {
  return {
    name: 'frontmatter-generator',
    generateBundle() {
      const docsDir = options.docsDir || path.join(process.cwd(), 'docs');
      const frontmatterArray = generateFrontmatterJson(docsDir);
      const jsonContent = JSON.stringify(frontmatterArray, null, 2);

      this.emitFile({
        type: 'asset',
        fileName: 'frontmatter.json',
        source: jsonContent
      });

      // Also generate search content for client-side indexing
      const searchContent = generateSearchContentJson(docsDir, frontmatterArray);
      const searchJson = JSON.stringify(searchContent);

      this.emitFile({
        type: 'asset',
        fileName: 'search-content.json',
        source: searchJson
      });

      console.log(`✅ Generated frontmatter JSON file`);
      console.log(`📄 Processed ${frontmatterArray.length} MDX files`);
      console.log(`🔍 Generated search content (${searchContent.length} pages, ${(searchJson.length / 1024).toFixed(0)} KB)`);
    }
  };
}

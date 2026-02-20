import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

// Read dory.json to get navigation order (flat list, in order)
function getNavigationOrder(docsDir: string): string[] {
  const doryJsonPath = path.join(docsDir, 'dory.json');
  if (!fs.existsSync(doryJsonPath)) return [];
  let doryJson;
  try {
    doryJson = JSON.parse(fs.readFileSync(doryJsonPath, 'utf-8'));
  } catch (error) {
    const detail = error instanceof SyntaxError ? error.message : String(error);
    console.error(`Failed to parse ${doryJsonPath}: ${detail}`);
    return [];
  }
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
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return { data: {}, content };

  const frontmatter = frontmatterMatch[1];
  const data: Record<string, any> = {};

  frontmatter.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      const value = valueParts.join(':').trim();
      data[key.trim()] = value.replace(/^["']|["']$/g, '');
    }
  });

  return { data, content: content.slice(frontmatterMatch[0].length) };
}

// Convert filename to path format used by the store
function pathFromFilename(filename: string, docsDir: string): string {
  return filename
    .replace(docsDir, '')
    .replace(/\/?index\.mdx$/, '/')
    .replace(/\.mdx$/, '')
    .replace(/\\/g, '/')
    .toLowerCase();
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

// Function to generate frontmatter JSON in dory.json order, then append any extra files
function generateFrontmatterJson(docsDir: string): Array<Record<string, any>> {
  const navOrder = getNavigationOrder(docsDir);
  const mdxFilesMap = findMdxFilesMap(docsDir, docsDir);
  const usedKeys = new Set<string>();
  const frontmatterArray: Array<Record<string, any>> = [];

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

    const filePath = mdxFilesMap[fileKey];
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const { data } = parseFrontmatter(rawContent);
    const pathname = pathFromFilename(filePath, docsDir);

    frontmatterArray.push({
      ...data,
      path: pathname
    });
  }

  // Process any extra files not in navigation order, sorted
  const extraKeys = Object.keys(mdxFilesMap).filter(k => !usedKeys.has(k)).sort();
  for (const fileKey of extraKeys) {
    const filePath = mdxFilesMap[fileKey];
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const { data } = parseFrontmatter(rawContent);
    const pathname = pathFromFilename(filePath, docsDir);

    frontmatterArray.push({
      ...data,
      path: pathname
    });
  }

  return frontmatterArray;
}

// Strip MDX/JSX syntax to extract plain text for search indexing
function stripMdxToText(content: string): string {
  return content
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export\s+.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_~`>|]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function frontmatterDevServer(): Plugin {
  return {
    name: 'frontmatter-dev-server',
    configureServer(server) {
      // Serve search content for client-side indexing
      server.middlewares.use('/search-content.json', (req, res, next) => {
        if (req.method !== 'GET') return next();
        try {
          const docsDir = path.join(process.cwd(), 'docs');
          const fmArray = generateFrontmatterJson(docsDir);
          const mdxFilesMap = findMdxFilesMap(docsDir, docsDir);
          const searchContent = fmArray.map(fm => {
            const entry = Object.entries(mdxFilesMap).find(([, fp]) => pathFromFilename(fp, docsDir) === fm.path);
            if (!entry) return { path: fm.path, title: fm.title || '', content: '' };
            const raw = fs.readFileSync(entry[1], 'utf-8');
            const { content } = parseFrontmatter(raw);
            return { path: fm.path, title: fm.title || '', content: stripMdxToText(content) };
          });
          const json = JSON.stringify(searchContent);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(json);
        } catch (error) {
          console.error('Error generating search content:', error);
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      });

      server.middlewares.use('/frontmatter.json', (req, res, next) => {
        if (req.method !== 'GET') {
          return next();
        }

        try {
          const docsDir = path.join(process.cwd(), 'docs');
          const frontmatterArray = generateFrontmatterJson(docsDir);
          const jsonContent = JSON.stringify(frontmatterArray, null, 2);

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Content-Length', Buffer.byteLength(jsonContent));
          res.end(jsonContent);
        } catch (error) {
          console.error('Error generating frontmatter JSON:', error);
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      });
    }
  };
}
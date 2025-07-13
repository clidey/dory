#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read dory.json to get navigation order (flat list, in order)
function getNavigationOrder(docsDir) {
  const doryJsonPath = path.join(docsDir, 'dory.json');
  if (!fs.existsSync(doryJsonPath)) return [];
  const doryJson = JSON.parse(fs.readFileSync(doryJsonPath, 'utf-8'));
  const order = [];

  function walkPages(pages) {
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
function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return { data: {}, content };
  
  const frontmatter = frontmatterMatch[1];
  const data = {};
  
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
function pathFromFilename(filename, docsDir) {
  return filename
    .replace(docsDir, '')
    .replace(/\/?index\.mdx$/, '/')
    .replace(/\.mdx$/, '')
    .replace(/\\/g, '/')
    .toLowerCase();
}

// Function to recursively find all MDX files and map by relative path (without .mdx)
function findMdxFilesMap(dir, baseDir) {
  const files = {};
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

// Main function to generate frontmatter JSON
async function generateFrontmatterJson() {
  const docsDir = path.join(__dirname, '..', 'docs');
  const outputDir = path.join(__dirname, '..', 'dist');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const navOrder = getNavigationOrder(docsDir);
  const mdxFilesMap = findMdxFilesMap(docsDir, docsDir);
  const usedKeys = new Set();
  const frontmatterArray = [];

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

  // Write to output file
  const jsonContent = JSON.stringify(frontmatterArray, null, 2);
  const outputPath = path.join(outputDir, 'frontmatter.json');
  fs.writeFileSync(outputPath, jsonContent);
  
  console.log(`✅ Generated frontmatter JSON file: ${outputPath}`);
  console.log(`📄 Processed ${frontmatterArray.length} MDX files`);
  console.log(`📝 Total JSON size: ${jsonContent.length} characters`);
}

// Run the script
generateFrontmatterJson().catch(console.error);
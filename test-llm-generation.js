#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to parse frontmatter from MDX content
function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
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

// Function to recursively find all MDX files
function findMdxFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...findMdxFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to clean MDX content for LLM consumption
function cleanMdxContent(content) {
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

// Test function
function testGeneration() {
  const docsDir = path.join(__dirname, 'docs');
  const mdxFiles = findMdxFiles(docsDir);
  let aggregatedContent = '';
  
  console.log(`Found ${mdxFiles.length} MDX files:`);
  mdxFiles.sort();
  
  for (const filePath of mdxFiles) {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = parseFrontmatter(rawContent);
    const cleanedContent = cleanMdxContent(content);
    
    // Add file header
    const relativePath = path.relative(docsDir, filePath);
    console.log(`- ${relativePath} (${data.title || 'No title'})`);
    
    aggregatedContent += `\n# ${relativePath}\n`;
    
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
  
  // Preview first 1000 characters
  console.log('\nFirst 1000 characters of generated content:');
  console.log(aggregatedContent.substring(0, 1000));
  console.log('\n...\n');
  
  console.log(`✅ Generated LLM text content`);
  console.log(`📄 Processed ${mdxFiles.length} MDX files`);
  console.log(`📝 Total content size: ${aggregatedContent.length} characters`);
  
  // Write to test file
  const testOutputPath = path.join(__dirname, 'test-llm.txt');
  fs.writeFileSync(testOutputPath, aggregatedContent.trim());
  console.log(`💾 Test file saved to: ${testOutputPath}`);
}

// Run the test
testGeneration();
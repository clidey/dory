import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

interface LlmTxtGeneratorOptions {
  docsDir?: string;
  outputPath?: string;
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

// Function to recursively find all MDX files
function findMdxFiles(dir: string): string[] {
  const files: string[] = [];
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

export function llmTxtGenerator(options: LlmTxtGeneratorOptions = {}): Plugin {
  return {
    name: 'llm-txt-generator',
    generateBundle(outputOptions) {
      const docsDir = options.docsDir || path.join(process.cwd(), 'docs');
      const outputDir = outputOptions.dir || 'dist';
      
      const mdxFiles = findMdxFiles(docsDir);
      let aggregatedContent = '';
      
      // Sort files for consistent output
      mdxFiles.sort();
      
      for (const filePath of mdxFiles) {
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = parseFrontmatter(rawContent);
        const cleanedContent = cleanMdxContent(content);
        
        // Add file header
        const relativePath = path.relative(docsDir, filePath);
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
      
      // Emit the LLM text file
      this.emitFile({
        type: 'asset',
        fileName: 'llm.txt',
        source: aggregatedContent.trim()
      });
      
      console.log(`✅ Generated LLM text file`);
      console.log(`📄 Processed ${mdxFiles.length} MDX files`);
      console.log(`📝 Total content size: ${aggregatedContent.length} characters`);
    }
  };
}
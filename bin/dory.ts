#!/usr/bin/env -S npx tsx

// @ts-nocheck - gang
import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, cpSync, readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import sirv from 'sirv';
import { compile } from '@mdx-js/mdx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = {
  build: () => {
    console.log('🐟 Dory is ready to build your docs!');
    
    // Clear the docs folder if it exists
    const docsDir = resolve(__dirname, '..', 'docs');
    if (existsSync(docsDir)) {
      console.log('🧹 Tidying up the workspace...');
      rmSync(docsDir, { recursive: true, force: true });
    }
    
    // Check if dory.json exists in current directory
    const currentDir = process.cwd();
    const doryConfigPath = resolve(currentDir, 'dory.json');
    
    if (!existsSync(doryConfigPath)) {
      console.error('❌ Oops! dory.json is missing from your project');
      process.exit(1);
    }
    
    // Read and validate dory.json
    try {
      const config = JSON.parse(readFileSync(doryConfigPath, 'utf8'));
      console.log(`📋 Building: ${config.name || 'Your awesome project'}`);
    } catch (error) {
      console.error('❌ Your dory.json seems to have some issues:', error.message);
      process.exit(1);
    }
    
    mkdirSync(docsDir, { recursive: true });
    
    console.log('📁 Gathering your project files...');
    cpSync(doryConfigPath, resolve(docsDir, 'dory.json'));
    
    const copyFiles = (src, dest) => {
      if (existsSync(src)) {
        if (existsSync(dest)) {
          rmSync(dest, { recursive: true, force: true });
        }
        cpSync(src, dest, { recursive: true });
      }
    };
    
    // Copy all files and directories except node_modules, dist, and .git
    const excludeDirs = ['node_modules', 'dist', '.git', 'docs', 'pnpm-lock.yaml'];
    
    const items = readdirSync(currentDir);
    for (const item of items) {
      if (!excludeDirs.includes(item)) {
        const srcPath = resolve(currentDir, item);
        const destPath = resolve(docsDir, item);
        copyFiles(srcPath, destPath);
      }
    }
    
    console.log('✅ All files gathered successfully!');
    
    // Run the build command
    console.log('⚡ Magic is happening...');
    try {
      execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
    
    // Check if dist folder was created
    const distDir = resolve(__dirname, '..', 'dist');
    if (existsSync(distDir)) {
      console.log('🎉 Build completed successfully!');
      console.log('📦 Moving your docs to the right place...');
      cpSync(distDir, resolve(currentDir, 'dist'), { recursive: true });
      console.log('✨ Your docs are ready in the dist folder!');
    } else {
      console.log('⚠️  Build completed but no output found');
    }
    rmSync(distDir, { recursive: true, force: true });
    
    // Revert docs folder back to original state
    console.log('🧹 Cleaning up...');
    rmSync(docsDir, { recursive: true, force: true });
    console.log('✅ All done!');
  },

  preview: () => {
    console.log('👀 Starting your docs preview...');
    const currentDir = process.cwd();
    const distDir = resolve(currentDir, 'dist');
    const port = process.env.PORT || 3000;

    const serve = sirv(distDir, {
      dev: false,
      single: true,
      etag: true,
      gzip: true,
      brotli: true,
    });

    const server = createServer((req, res) => {
      serve(req, res);
    });

    server.listen(port, () => {
      console.log(`🚀 Your docs are live at http://localhost:${port}`);
    });
  },

  'verify:content': async () => {
    const args = process.argv.slice(3);
    let content = '';
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--content' && i + 1 < args.length) {
        content = args[i + 1];
        break;
      } else if (args[i] === '--file' && i + 1 < args.length) {
        const filePath = args[i + 1];
        if (!existsSync(filePath)) {
          console.error(`❌ Error: File not found: ${filePath}`);
          process.exit(1);
        }
        content = readFileSync(filePath, 'utf8');
        break;
      }
    }
    
    if (!content) {
      console.error('❌ Error: --content or --file argument is required');
      console.log('Usage: dory verify:content --content "<mdx-content>" | --file <path-to-mdx-file>');
      process.exit(1);
    }
    
    try {
      // Apply the same preprocessor that the main build uses
      const { preprocessMdxTags } = await import('../src/plugins/sanitize.ts');
      const { getMdxConfig } = await import('../src/config/mdx.js');
      const preprocessor = preprocessMdxTags();
      
      // Preprocess the content to handle MDX tags properly
      let processedContent = content;
      if (preprocessor.transform) {
        const result = preprocessor.transform(processedContent, 'test.mdx');
        if (result && typeof result === 'object' && result.code) {
          processedContent = result.code;
        }
      }
      
      // Compile MDX content using the same configuration as the main build
      const compiled = await compile(processedContent, getMdxConfig(false));
      
      // Silent success - no output means no errors
      
    } catch (error) {
      console.error('❌ MDX compilation failed:');
      console.error(error.message);
      
      // Provide more detailed error information if available
      if (error.line !== undefined && error.column !== undefined) {
        console.error(`   at line ${error.line}, column ${error.column}`);
      }
      if (error.source) {
        console.error('   Source:', error.source);
      }
      
      process.exit(1);
    }
  },

  help: () => {
    console.log(`
🐟 Dory CLI - Your Friendly Documentation Builder

Usage:
  dory <command>

Commands:
  build         Build your documentation site
                - Needs dory.json in your project
                - Creates a beautiful dist folder
                
  verify:content  Verify that MDX content compiles without errors
                  - Silent on success, shows errors on failure
                  - Uses the same preprocessing as the main build
                  - Accepts --content or --file arguments
                
  preview       Preview your built documentation
                - Shows your docs in the browser
                - Run build first!
                
  help          Show this help message

Examples:
  dory build                                      # Build your docs
  dory verify:content --content "# Hello World"  # Verify MDX content
  dory verify:content --file content.mdx         # Verify MDX from file
  dory preview                                    # Preview your docs
`);
  }
};

// Parse command line arguments
const command = process.argv[2];

async function runCommand() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    commands.help();
  } else if (commands[command]) {
    await commands[command]();
  } else {
    console.error(`❌ Unknown command: ${command}`);
    console.log('Run "dory help" for usage information');
    process.exit(1);
  }
}

runCommand().catch((error) => {
  console.error('❌ Command failed:', error.message);
  process.exit(1);
});
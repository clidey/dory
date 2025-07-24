#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, cpSync, readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url'
import http from 'http';
import sirv from 'sirv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = {
  build: () => {
    console.log('🐟 Dory is ready to build your docs!');
    
    const currentDir = process.cwd();
    const userDocsDir = resolve(currentDir, 'docs');
    const hasUserDocs = existsSync(userDocsDir);
    
    // Use different temp directory if user has their own docs folder
    const tempDirName = hasUserDocs ? '.dory-build-temp' : 'docs';
    const docsDir = resolve(__dirname, '..', tempDirName);
    
    // Clear the temp build folder if it exists
    if (existsSync(docsDir)) {
      console.log('🧹 Tidying up the workspace...');
      rmSync(docsDir, { recursive: true, force: true });
    }
    
    // Check if dory.json exists in current directory
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
    
    // Copy all files and directories except node_modules, dist, .git, and temp build dir
    // Don't exclude 'docs' if user has their own docs folder - we need to copy it
    const excludeDirs = ['node_modules', 'dist', '.git', 'pnpm-lock.yaml', tempDirName];
    
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
    
    // Clean up temp build folder (but preserve user's docs folder if it exists)
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

    const server = http.createServer((req, res) => {
      serve(req, res);
    });

    server.listen(port, () => {
      console.log(`🚀 Your docs are live at http://localhost:${port}`);
    });
  },

  help: () => {
    console.log(`
🐟 Dory CLI - Your Friendly Documentation Builder

Usage:
  dory <command>

Commands:
  build     Build your documentation site
            - Needs dory.json in your project
            - Creates a beautiful dist folder
            
  preview   Preview your built documentation
            - Shows your docs in the browser
            - Run build first!
            
  help      Show this help message

Examples:
  dory build    # Build your docs
  dory preview  # Preview your docs
`);
  }
};

// Parse command line arguments
const command = process.argv[2];

if (!command || command === 'help' || command === '--help' || command === '-h') {
  commands.help();
} else if (commands[command]) {
  commands[command]();
} else {
  console.error(`❌ Unknown command: ${command}`);
  console.log('Run "dory help" for usage information');
  process.exit(1);
}
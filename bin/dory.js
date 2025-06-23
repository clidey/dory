#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, cpSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = {
  build: () => {
    console.log('🏗️  Starting Dory build...');
    
    // Check if dory.json exists in current directory
    const currentDir = process.cwd();
    const doryConfigPath = resolve(currentDir, 'dory.json');
    
    if (!existsSync(doryConfigPath)) {
      console.error('❌ dory.json not found in current directory');
      process.exit(1);
    }
    
    // Read and validate dory.json
    try {
      const config = JSON.parse(readFileSync(doryConfigPath, 'utf8'));
      console.log(`📋 Using config: ${config.name || 'Unnamed project'}`);
    } catch (error) {
      console.error('❌ Invalid dory.json file:', error.message);
      process.exit(1);
    }
    
    // Clear and prepare docs folder
    const docsDir = resolve(currentDir, 'docs');
    if (existsSync(docsDir)) {
      console.log('🧹 Clearing docs folder...');
      rmSync(docsDir, { recursive: true, force: true });
    }
    mkdirSync(docsDir, { recursive: true });
    
    // Copy dory.json to docs folder
    cpSync(doryConfigPath, resolve(docsDir, 'dory.json'));
    console.log('📄 Copied dory.json to docs folder');
    
    // Run the build command
    console.log('⚡ Running build command...');
    try {
      execSync('npm run build', { stdio: 'inherit', cwd: currentDir });
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
    
    // Check if dist folder was created
    const distDir = resolve(currentDir, 'dist');
    if (existsSync(distDir)) {
      console.log('✅ Build completed successfully!');
      console.log(`📦 Build output available in: ${distDir}`);
    } else {
      console.log('⚠️  Build completed but no dist folder found');
    }
  },

  preview: () => {
    console.log('👀 Starting Dory preview...');
    
    const currentDir = process.cwd();
    const distDir = resolve(currentDir, 'dist');
    
    if (!existsSync(distDir)) {
      console.error('❌ No dist folder found. Run "dory build" first.');
      process.exit(1);
    }
    
    console.log('🚀 Starting preview server...');
    try {
      execSync('npm run preview', { stdio: 'inherit', cwd: currentDir });
    } catch (error) {
      console.error('❌ Preview failed:', error.message);
      process.exit(1);
    }
  },

  help: () => {
    console.log(`
🐟 Dory CLI - Documentation Build Tool

Usage:
  dory <command>

Commands:
  build     Build the documentation site
            - Requires dory.json in current directory
            - Clears and copies to docs folder
            - Runs build command
            - Creates dist folder with build output
            
  preview   Preview the built documentation site
            - Requires dist folder (run build first)
            - Starts preview server
            
  help      Show this help message

Examples:
  dory build    # Build the documentation
  dory preview  # Preview the built site
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
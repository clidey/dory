#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, cpSync, readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import sirv from 'sirv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the root directory of the Dory package
const getDoryRoot = (): string => {
  // In development: bin/dory.ts -> root is parent
  // In production (local): bin/dist/dory.js -> root is parent of parent
  // In production (installed): node_modules/@clidey/dory/bin/dist/dory.js -> root is parent of parent
  const isDevelopment = __dirname.endsWith('bin');
  const isLocalDist = __dirname.endsWith(resolve('bin', 'dist'));

  if (isDevelopment) {
    return resolve(__dirname, '..');
  } else if (isLocalDist) {
    return resolve(__dirname, '..', '..');
  } else {
    // Installed package: node_modules/@clidey/dory/bin/dist/dory.js
    return resolve(__dirname, '..', '..');
  }
};

// Get the user's current working directory
const getUserRoot = (): string => process.cwd();

// Detect which package manager is available (prefer pnpm for speed, fallback to npm)
const getPackageManager = (): { run: string; exec: string } => {
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    return { run: 'pnpm run', exec: 'pnpm exec' };
  } catch {
    try {
      execSync('npm --version', { stdio: 'ignore' });
      return { run: 'npm run', exec: 'npx' };
    } catch {
      console.error('❌ No package manager found');
      console.error('   Install npm or pnpm to use Dory');
      console.error('   npm: https://nodejs.org/');
      console.error('   pnpm: npm install -g pnpm');
      process.exit(1);
    }
  }
};

interface DoryConfig {
  name?: string;
  description?: string;
  navigation?: unknown;
  [key: string]: unknown;
}

const validateDoryConfig = (config: DoryConfig): void => {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be a valid object');
  }
  // Add more validation as needed
};

const commands = {
  build: () => {
    console.log('🐟 Dory is ready to build your docs!');

    const userRoot = getUserRoot();
    const doryRoot = getDoryRoot();
    const doryConfigPath = resolve(userRoot, 'dory.json');
    const tempDocsDir = resolve(doryRoot, 'docs');
    const docsBackupDir = resolve(doryRoot, '.docs-backup');
    const doryDistDir = resolve(doryRoot, 'dist');
    const userDistDir = resolve(userRoot, 'dist');

    // Step 1: Validate prerequisites before making any changes
    console.log('🔍 Validating project structure...');

    if (!existsSync(doryConfigPath)) {
      console.error('❌ dory.json not found in current directory');
      console.error(`   Looking for: ${doryConfigPath}`);
      console.error('   Create a dory.json file to configure your documentation site');
      process.exit(1);
    }

    // Read and validate dory.json
    let config: DoryConfig;
    try {
      const configContent = readFileSync(doryConfigPath, 'utf8');
      config = JSON.parse(configContent) as DoryConfig;
      validateDoryConfig(config);
      console.log(`📋 Building: ${config.name || 'Documentation'}`);
    } catch (error) {
      console.error('❌ Failed to parse dory.json:');
      if (error instanceof Error) {
        console.error(`   ${error.message}`);
      }
      process.exit(1);
    }

    // Detect package manager
    const pm = getPackageManager();

    // Step 2: Backup existing docs directory if it exists
    console.log('🧹 Preparing workspace...');
    const docsExistedBefore = existsSync(tempDocsDir);

    if (docsExistedBefore) {
      console.log('💾 Backing up existing docs directory...');
      if (existsSync(docsBackupDir)) {
        rmSync(docsBackupDir, { recursive: true, force: true });
      }
      cpSync(tempDocsDir, docsBackupDir, { recursive: true, force: true });
      rmSync(tempDocsDir, { recursive: true, force: true });
    }

    try {
      // Step 3: Copy user files to temp docs directory
      mkdirSync(tempDocsDir, { recursive: true });

      console.log('📁 Gathering project files...');

      // Define files/dirs to exclude
      const excludeItems = new Set([
        'node_modules',
        'dist',
        '.git',
        '.github',
        'docs',
        '.DS_Store',
        '.env',
        '.env.local',
        'pnpm-lock.yaml',
        'package-lock.json',
        'yarn.lock'
      ]);

      const items = readdirSync(userRoot);
      let copiedCount = 0;

      for (const item of items) {
        if (excludeItems.has(item)) {
          continue;
        }

        const srcPath = resolve(userRoot, item);
        const destPath = resolve(tempDocsDir, item);

        try {
          cpSync(srcPath, destPath, { recursive: true, force: true });
          copiedCount++;
        } catch (error) {
          console.warn(`⚠️  Could not copy ${item}: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }

      console.log(`✅ Copied ${copiedCount} items`);

      // Verify critical files exist
      const doryJsonPath = resolve(tempDocsDir, 'dory.json');
      if (!existsSync(doryJsonPath)) {
        console.error('❌ dory.json was not copied to docs directory');
        console.error(`   Expected: ${doryJsonPath}`);
        console.error('   This file is required for the build');
        process.exit(1);
      }

      // Step 4: Run the build
      console.log('⚡ Building documentation...');

      try {
        execSync(`${pm.run} build:docs`, {
          stdio: 'inherit',
          cwd: doryRoot,
          env: { ...process.env }
        });
      } catch (error) {
        console.error('❌ Build failed');
        console.error('   Check the error messages above for details');
        throw error;
      }

      // Step 5: Verify build output
      console.log('🔍 Verifying build output...');

      if (!existsSync(doryDistDir)) {
        console.error('❌ Build completed but dist folder was not created');
        console.error(`   Expected: ${doryDistDir}`);
        process.exit(1);
      }

      const indexHtml = resolve(doryDistDir, 'index.html');
      if (!existsSync(indexHtml)) {
        console.error('❌ Build incomplete: index.html not found');
        console.error('   The build may have failed silently');
        process.exit(1);
      }

      // Check if dist has content
      const distFiles = readdirSync(doryDistDir);
      if (distFiles.length === 0) {
        console.error('❌ Build completed but dist folder is empty');
        process.exit(1);
      }

      console.log('🎉 Build completed successfully!');

      // Step 6: Copy dist to user's directory
      console.log('📦 Copying build output...');

      // Only copy if they're different directories
      if (doryDistDir !== userDistDir) {
        if (existsSync(userDistDir)) {
          rmSync(userDistDir, { recursive: true, force: true });
        }
        cpSync(doryDistDir, userDistDir, { recursive: true, force: true });
      }

      console.log('✨ Documentation ready in dist/');

      // Step 6.5: Build embed files
      console.log('📦 Building embed files...');

      try {
        // Build embed loader
        console.log('   Building embed loader...');
        execSync(`${pm.exec} vite build -c vite.config.embed-loader.ts`, {
          stdio: 'inherit',
          cwd: doryRoot,
          env: { ...process.env }
        });

        // Build embed widget
        console.log('   Building embed widget...');
        execSync(`${pm.exec} vite build -c vite.config.embed-widget.ts`, {
          stdio: 'inherit',
          cwd: doryRoot,
          env: { ...process.env }
        });

        // Copy embed files to user's dist if different
        if (doryDistDir !== userDistDir) {
          const embedFiles = ['embed.js', 'embed-widget.js', 'embed.css'];
          embedFiles.forEach(file => {
            const srcPath = resolve(doryDistDir, file);
            const destPath = resolve(userDistDir, file);
            if (existsSync(srcPath)) {
              cpSync(srcPath, destPath, { force: true });
            }
          });

          // Copy any chunk files (embed-*.js)
          const files = readdirSync(doryDistDir);
          files.forEach(file => {
            if (file.startsWith('embed-') && file.endsWith('.js')) {
              const srcPath = resolve(doryDistDir, file);
              const destPath = resolve(userDistDir, file);
              cpSync(srcPath, destPath, { force: true });
            }
          });
        }

        console.log('✨ Embed files built successfully!');
        console.log('');
        console.log('   📝 Add to your site:');
        console.log('   <script src="https://your-docs.com/embed.js"></script>');
        console.log('   <button onclick="DoryDocs.open()">Help</button>');
        console.log('');

      } catch (error) {
        console.warn('⚠️  Embed build failed, but main build succeeded');
        console.warn('   Your documentation site is still available at dist/');
        if (error instanceof Error) {
          console.warn(`   Error: ${error.message}`);
        }
      }

    } finally {
      // Step 7: Always clean up temp directories and restore backup
      console.log('🧹 Cleaning up...');

      // First priority: Restore the original docs directory if it existed
      if (docsExistedBefore && existsSync(docsBackupDir)) {
        console.log('📦 Restoring original docs directory...');

        let restoredSuccessfully = false;
        try {
          // Remove the temporary docs directory
          if (existsSync(tempDocsDir)) {
            rmSync(tempDocsDir, { recursive: true, force: true });
          }

          // Restore from backup
          cpSync(docsBackupDir, tempDocsDir, { recursive: true, force: true });
          restoredSuccessfully = true;

          // Only delete the backup after successful restoration
          rmSync(docsBackupDir, { recursive: true, force: true });
        } catch (error) {
          console.error('❌ Failed to restore docs directory!');
          console.error(`   Backup is preserved at: ${docsBackupDir}`);
          console.error('   You can manually restore by running:');
          console.error(`   cp -r "${docsBackupDir}" "${tempDocsDir}"`);

          if (error instanceof Error) {
            console.error(`   Error: ${error.message}`);
          }

          // Critical: Don't delete the backup if restoration failed
          if (!restoredSuccessfully) {
            console.error('   ⚠️  Your original docs are safe in the backup directory');
          }
        }
      } else if (docsExistedBefore && !existsSync(docsBackupDir)) {
        console.warn('⚠️  Warning: Original docs directory existed but backup not found');
        console.warn(`   Expected backup at: ${docsBackupDir}`);
      } else {
        // No docs existed before, just clean up the temporary directory
        try {
          if (existsSync(tempDocsDir)) {
            rmSync(tempDocsDir, { recursive: true, force: true });
          }
        } catch (error) {
          console.warn('⚠️  Could not remove temporary docs directory');
        }
      }

      // Clean up doryDistDir if it's different from userDistDir
      try {
        if (doryDistDir !== userDistDir && existsSync(doryDistDir)) {
          rmSync(doryDistDir, { recursive: true, force: true });
        }
      } catch (error) {
        console.warn('⚠️  Could not clean up dory dist directory');
      }

      console.log('✅ Done!');
    }
  },

  preview: () => {
    console.log('👀 Starting docs preview...');

    const userRoot = getUserRoot();
    const distDir = resolve(userRoot, 'dist');
    let port = parseInt(process.env.PORT || '3000', 10);

    // Validate dist folder exists
    if (!existsSync(distDir)) {
      console.error('❌ dist folder not found');
      console.error(`   Looking for: ${distDir}`);
      console.error('   Run "dory build" first to generate the documentation');
      process.exit(1);
    }

    // Check if dist has content
    const distFiles = readdirSync(distDir);
    if (distFiles.length === 0) {
      console.error('❌ dist folder is empty');
      console.error('   Run "dory build" to generate documentation');
      process.exit(1);
    }

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

    const tryPort = (currentPort: number): void => {
      server.listen(currentPort)
        .on('listening', () => {
          console.log(`🚀 Documentation live at http://localhost:${currentPort}`);
          console.log('   Press Ctrl+C to stop the server');
        })
        .on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`⚠️  Port ${currentPort} in use, trying ${currentPort + 1}...`);
            tryPort(currentPort + 1);
          } else {
            console.error('❌ Failed to start server:', err.message);
            process.exit(1);
          }
        });
    };

    tryPort(port);
  },

  'verify:content': async () => {
    const args = process.argv.slice(3);
    let content = '';
    let fileName = '';

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--content' && i + 1 < args.length) {
        content = args[i + 1];
        break;
      } else if (args[i] === '--file' && i + 1 < args.length) {
        const filePath = resolve(getUserRoot(), args[i + 1]);
        if (!existsSync(filePath)) {
          console.error(`❌ File not found: ${filePath}`);
          process.exit(1);
        }
        content = readFileSync(filePath, 'utf8');
        fileName = filePath;
        break;
      }
    }

    if (!content) {
      console.error('❌ --content or --file argument is required');
      console.log('Usage:');
      console.log('  dory verify:content --content "<mdx-content>"');
      console.log('  dory verify:content --file <path-to-mdx-file>');
      process.exit(1);
    }

    try {
      const doryRoot = getDoryRoot();
      const processorPath = resolve(doryRoot, 'src', 'mdx', 'processor.ts');

      if (!existsSync(processorPath)) {
        console.error('❌ MDX processor not found');
        console.error('   This feature requires Dory source files');
        process.exit(1);
      }

      // Use the shared MDX processor that matches the main build exactly
      const { verifyMdxContent } = await import(processorPath);
      const result = await verifyMdxContent(content, fileName);

      if (!result.valid) {
        throw result.error;
      }

      // Silent success - no output means no errors

    } catch (error) {
      console.error('❌ MDX compilation failed:');
      if (error instanceof Error) {
        console.error(`   ${error.message}`);

        // Provide more detailed error information if available
        const errorWithPosition = error as Error & { line?: number; column?: number; source?: string };
        if (errorWithPosition.line !== undefined && errorWithPosition.column !== undefined) {
          console.error(`   at line ${errorWithPosition.line}, column ${errorWithPosition.column}`);
        }
        if (errorWithPosition.source) {
          console.error('   Source:', errorWithPosition.source);
        }
      }

      process.exit(1);
    }
  },

  version: () => {
    const doryRoot = getDoryRoot();
    const packageJsonPath = resolve(doryRoot, 'package.json');

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      console.log(`🐟 Dory v${packageJson.version}`);
    } catch (error) {
      console.error('❌ Failed to read version information');
      if (error instanceof Error) {
        console.error(`   ${error.message}`);
      }
      process.exit(1);
    }
  },

  help: () => {
    console.log(`
🐟 Dory CLI - Documentation Builder

Usage:
  dory <command> [options]

Commands:
  build            Build your documentation site
                   Requirements: dory.json in current directory
                   Output: dist/ folder with static site

  preview          Preview built documentation
                   Requirements: dist/ folder (run build first)
                   Starts local server on port 3000

  verify:content   Verify MDX content compilation
                   Options: --content "<mdx>" or --file <path>
                   Silent on success, shows errors on failure

  version          Show Dory version

  help             Show this help message

Examples:
  dory build
  dory preview
  dory verify:content --content "# Hello World"
  dory verify:content --file docs/intro.mdx
  dory version

For more information, visit: https://github.com/clidey/dory
`);
  }
};

type CommandName = keyof typeof commands;

// Parse command line arguments
const command = process.argv[2];

async function runCommand(): Promise<void> {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    commands.help();
    return;
  }

  if (command in commands) {
    await commands[command as CommandName]();
  } else {
    console.error(`❌ Unknown command: ${command}`);
    console.log('   Run "dory help" for available commands');
    process.exit(1);
  }
}

runCommand().catch((error: unknown) => {
  console.error('❌ Command failed');
  if (error instanceof Error) {
    console.error(`   ${error.message}`);
    if (error.stack && process.env.DEBUG) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
  process.exit(1);
});
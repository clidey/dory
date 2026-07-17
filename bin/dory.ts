#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, cpSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath, pathToFileURL } from 'url';
import { createServer } from 'http';
import sirv from 'sirv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the root directory of the Dory package
const getDoryRoot = (): string => {
  // In development: bin/dory.ts -> root is parent
  // Compiled (local or installed): bin/dist/dory.js -> root is parent of parent
  return basename(__dirname) === 'bin'
    ? resolve(__dirname, '..')
    : resolve(__dirname, '..', '..');
};

// Get the user's current working directory
const getUserRoot = (): string => process.cwd();

// Count files recursively in a directory (for backup verification)
const countFiles = (dir: string): number => {
  let count = 0;
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (item.isDirectory()) {
      count += countFiles(resolve(dir, item.name));
    } else {
      count++;
    }
  }
  return count;
};

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

    // The build stages user files into the package's own docs/ directory, so a
    // docs/ folder in the user's project cannot be included. Fail loudly
    // instead of silently dropping it.
    const userDocsDir = resolve(userRoot, 'docs');
    if (existsSync(userDocsDir) && userDocsDir !== tempDocsDir) {
      console.error('❌ Your project contains a docs/ directory');
      console.error('   Dory currently cannot include a top-level docs/ folder in the build');
      console.error('   Rename it (e.g. to guides/) and update dory.json navigation paths');
      process.exit(1);
    }

    // Detect package manager
    const pm = getPackageManager();

    // Guard against concurrent builds mutating the package's docs/ directory
    const lockPath = resolve(doryRoot, '.dory-build-lock');
    if (existsSync(lockPath)) {
      console.error('❌ Another dory build appears to be in progress');
      console.error(`   Lock file: ${lockPath}`);
      console.error('   If no other build is running, delete the lock file and retry');
      process.exit(1);
    }
    writeFileSync(lockPath, String(process.pid), 'utf8');

    // Step 2: Backup existing docs directory to a safe temp location
    console.log('🧹 Preparing workspace...');
    const docsExistedBefore = existsSync(tempDocsDir);
    const safeBackupDir = docsExistedBefore
      ? resolve(tmpdir(), `dory-backup-${Date.now()}`)
      : null;

    if (docsExistedBefore && safeBackupDir) {
      console.log('💾 Backing up existing docs directory...');
      cpSync(tempDocsDir, safeBackupDir, { recursive: true, force: true });

      // Verify backup integrity by comparing file counts
      const origCount = countFiles(tempDocsDir);
      const backupCount = countFiles(safeBackupDir);
      if (origCount !== backupCount) {
        console.error(`❌ Backup verification failed (expected ${origCount} files, got ${backupCount})`);
        console.error(`   Backup location: ${safeBackupDir}`);
        rmSync(lockPath, { force: true });
        process.exit(1);
      }

      rmSync(tempDocsDir, { recursive: true, force: true });
    }

    // If the process is interrupted while the package's docs/ is mutated,
    // restore the backup before exiting so no data is lost.
    const restoreOnSignal = (): void => {
      console.error('\n⚠️  Build interrupted — restoring docs directory...');
      try {
        if (docsExistedBefore && safeBackupDir && existsSync(safeBackupDir)) {
          rmSync(tempDocsDir, { recursive: true, force: true });
          cpSync(safeBackupDir, tempDocsDir, { recursive: true, force: true });
          rmSync(safeBackupDir, { recursive: true, force: true });
        } else if (!docsExistedBefore && existsSync(tempDocsDir)) {
          rmSync(tempDocsDir, { recursive: true, force: true });
        }
      } catch {
        if (safeBackupDir) {
          console.error(`   Restore failed — backup preserved at: ${safeBackupDir}`);
        }
      }
      rmSync(lockPath, { force: true });
      process.exit(1);
    };
    process.on('SIGINT', restoreOnSignal);
    process.on('SIGTERM', restoreOnSignal);

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
        throw new Error(`dory.json was not copied to docs directory (expected: ${doryJsonPath})`);
      }

      // Step 4: Run the build
      console.log('⚡ Building documentation...');

      try {
        execSync(`${pm.run} build:docs`, {
          stdio: 'inherit',
          cwd: doryRoot,
          // Don't let corepack's strict packageManager pin fail the build for
          // users running a different pnpm version.
          env: { ...process.env, COREPACK_ENABLE_STRICT: '0' }
        });
      } catch (error) {
        console.error('❌ Build failed');
        console.error('   Check the error messages above for details');
        throw error;
      }

      // Step 5: Verify build output
      console.log('🔍 Verifying build output...');

      if (!existsSync(doryDistDir)) {
        throw new Error(`Build completed but dist folder was not created (expected: ${doryDistDir})`);
      }

      const indexHtml = resolve(doryDistDir, 'index.html');
      if (!existsSync(indexHtml)) {
        throw new Error('Build incomplete: index.html not found — the build may have failed silently');
      }

      // Check if dist has content
      const distFiles = readdirSync(doryDistDir);
      if (distFiles.length === 0) {
        throw new Error('Build completed but dist folder is empty');
      }

      // Verify SSR actually rendered content into at least one route
      const hasSsrContent = (dir: string): boolean => {
        for (const item of readdirSync(dir, { withFileTypes: true })) {
          const itemPath = resolve(dir, item.name);
          if (item.isDirectory()) {
            if (hasSsrContent(itemPath)) return true;
          } else if (item.name.endsWith('.html')) {
            if (/<div id="app">\s*<\w/.test(readFileSync(itemPath, 'utf8'))) return true;
          }
        }
        return false;
      };
      if (!hasSsrContent(doryDistDir)) {
        throw new Error('Build verification failed: no route HTML contains server-rendered content in <div id="app">');
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
          env: { ...process.env, COREPACK_ENABLE_STRICT: '0' }
        });

        // Build embed widget
        console.log('   Building embed widget...');
        execSync(`${pm.exec} vite build -c vite.config.embed-widget.ts`, {
          stdio: 'inherit',
          cwd: doryRoot,
          env: { ...process.env, COREPACK_ENABLE_STRICT: '0' }
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
      // Step 7: Always clean up and restore backup
      console.log('🧹 Cleaning up...');

      process.removeListener('SIGINT', restoreOnSignal);
      process.removeListener('SIGTERM', restoreOnSignal);

      if (docsExistedBefore && safeBackupDir && existsSync(safeBackupDir)) {
        console.log('📦 Restoring original docs directory...');

        try {
          if (existsSync(tempDocsDir)) {
            rmSync(tempDocsDir, { recursive: true, force: true });
          }

          cpSync(safeBackupDir, tempDocsDir, { recursive: true, force: true });

          // Verify restoration succeeded before deleting backup
          const restoredCount = countFiles(tempDocsDir);
          const backupCount = countFiles(safeBackupDir);
          if (restoredCount === backupCount) {
            rmSync(safeBackupDir, { recursive: true, force: true });
          } else {
            console.warn(`⚠️  Restore verification mismatch — backup preserved at: ${safeBackupDir}`);
          }
        } catch (error) {
          console.error('❌ Failed to restore docs directory!');
          console.error(`   Backup is preserved at: ${safeBackupDir}`);
          console.error('   You can manually restore by running:');
          console.error(`   cp -r "${safeBackupDir}" "${tempDocsDir}"`);
          if (error instanceof Error) {
            console.error(`   Error: ${error.message}`);
          }
        }
      } else if (!docsExistedBefore) {
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

      rmSync(lockPath, { force: true });

      console.log('✅ Done!');
    }
  },

  preview: () => {
    console.log('👀 Starting docs preview...');

    const userRoot = getUserRoot();
    const distDir = resolve(userRoot, 'dist');
    const port = parseInt(process.env.PORT || '3000', 10);

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

    const maxAttempts = 20;

    const tryPort = (currentPort: number, attempt: number): void => {
      // Fresh server per attempt — reusing one server object stacks listeners
      // and produces duplicate servers on retry.
      const server = createServer((req, res) => {
        serve(req, res);
      });

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && attempt + 1 < maxAttempts) {
          console.log(`⚠️  Port ${currentPort} in use, trying ${currentPort + 1}...`);
          tryPort(currentPort + 1, attempt + 1);
        } else if (err.code === 'EADDRINUSE') {
          console.error(`❌ No free port found in range ${port}-${currentPort}`);
          process.exit(1);
        } else {
          console.error('❌ Failed to start server:', err.message);
          process.exit(1);
        }
      });

      server.once('listening', () => {
        console.log(`🚀 Documentation live at http://localhost:${currentPort}`);
        console.log('   Press Ctrl+C to stop the server');
      });

      server.listen(currentPort);
    };

    tryPort(port, 0);
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

      // Use the shared MDX processor that matches the main build exactly.
      // The processor uses extensionless .ts imports, so it must be loaded
      // through tsx (a runtime dependency) rather than plain import().
      const { tsImport } = await import('tsx/esm/api');
      const { verifyMdxContent } = await tsImport(pathToFileURL(processorPath).href, import.meta.url);
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
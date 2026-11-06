#!/usr/bin/env node

import { execFileSync, spawn } from 'child_process';
import { existsSync, rmSync, mkdirSync, mkdtempSync, cpSync, readFileSync, readdirSync, lstatSync, writeFileSync, watch } from 'fs';
import { resolve, dirname, basename } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath, pathToFileURL } from 'url';
import { discoverSite, listPages, projectInfo, readPage, screenshot } from './automation.js';
import { serveMcp } from './mcp.js';
import { checkProject, formatCheckResult } from './check.js';
import { initLocale } from './i18n-init.js';
import { startPreview } from './preview-server.js';
import { validateDoryConfig, type DoryConfig } from './project-config.js';
import { createDependencyOverlay } from './dependency-overlay.js';

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

const workspaceFiles = [
  'src', 'bin', 'scripts', 'index.html', 'package.json', 'vite.config.ts',
  'vite.config.ssr.ts', 'vite.config.embed-loader.ts', 'vite.config.embed-widget.ts',
];

const projectDocsDir = (userRoot: string): string => {
  const docsDir = resolve(userRoot, 'docs');
  return existsSync(docsDir) ? docsDir : userRoot;
};

const findDependencyDir = (doryRoot: string): string => {
  let current = doryRoot;
  while (true) {
    const candidate = resolve(current, 'node_modules');
    if (existsSync(resolve(candidate, 'vite', 'bin', 'vite.js')) && existsSync(resolve(candidate, 'preact', 'package.json'))) return candidate;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error('Dory dependencies were not found. Install @clidey/dory in this project first.');
};

const loadProjectEnv = (userRoot: string): void => {
  for (const name of ['.env', '.env.local']) {
    const file = resolve(userRoot, name);
    if (existsSync(file)) process.loadEnvFile(file);
  }
};

const stageDocs = (userRoot: string, workspace: string): void => {
  const source = projectDocsDir(userRoot);
  const destination = resolve(workspace, 'docs');
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });
  const excluded = new Set(['node_modules', 'dist', 'dist-ssr', '.git', '.github', '.DS_Store', '.env', '.env.local', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock']);
  for (const item of readdirSync(source)) {
    if (excluded.has(item) || item.startsWith('.env.') || (source === userRoot && item === 'docs')) continue;
    cpSync(resolve(source, item), resolve(destination, item), {
      recursive: true,
      force: true,
      filter: (path) => {
        const name = basename(path);
        if (excluded.has(name) || name.startsWith('.env.')) return false;
        if (!lstatSync(path).isSymbolicLink()) return true;
        console.warn(`Skipping symbolic link in docs: ${path}`);
        return false;
      },
    });
  }
  cpSync(resolve(userRoot, 'dory.json'), resolve(destination, 'dory.json'), { force: true });
};

const createWorkspace = (userRoot: string): string => {
  const doryRoot = getDoryRoot();
  const workspace = mkdtempSync(resolve(tmpdir(), 'dory-workspace-'));
  try {
    for (const item of workspaceFiles) {
      const source = resolve(doryRoot, item);
      if (!existsSync(source)) throw new Error(`Installed Dory package is missing ${item}`);
      cpSync(source, resolve(workspace, item), { recursive: true, force: true });
    }
    createDependencyOverlay(resolve(workspace, 'node_modules'), findDependencyDir(doryRoot), userRoot, process.env.DORY_PACKAGE_OVERRIDES);
    stageDocs(userRoot, workspace);
    return workspace;
  } catch (error) {
    rmSync(workspace, { recursive: true, force: true });
    throw error;
  }
};

const viteCli = (workspace: string): string => resolve(workspace, 'node_modules', 'vite', 'bin', 'vite.js');


const commands = {
  capabilities: () => console.log(JSON.stringify({customComponents: true, packageOverrides: true, specimenSourceLanguages: ['mdx', 'tsx', 'jsx']})),
  reference: () => {
    const root = resolve(getDoryRoot(), 'docs');
    const page = process.argv[3];
    console.log(page ? readPage(root, page) : listPages(root).join('\n'));
  },

  init: () => {
    const userRoot = getUserRoot();
    const configPath = resolve(userRoot, 'dory.json');
    if (existsSync(configPath)) throw new Error('dory.json already exists in this directory');
    const docsDir = resolve(userRoot, 'docs');
    const introduction = resolve(docsDir, 'introduction.mdx');
    if (existsSync(introduction)) throw new Error('docs/introduction.mdx already exists; initialization would overwrite it');
    mkdirSync(docsDir, { recursive: true });
    const name = basename(userRoot).replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
    const config = {
      name,
      description: `Documentation for ${name}`,
      favicon: './logo.svg',
      logo: { light: './logo.svg', dark: './logo.svg' },
      navigation: { tabs: [{ tab: 'Guides', groups: [{ group: 'Getting started', pages: ['introduction'] }] }] },
    };
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    writeFileSync(introduction, `---\ntitle: Introduction\ndescription: Get started with ${name}.\n---\n\n# Welcome to ${name}\n\nStart writing your documentation here.\n`);
    const logoPath = resolve(docsDir, 'logo.svg');
    if (!existsSync(logoPath)) writeFileSync(logoPath, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2C6BD4"/><text x="32" y="43" text-anchor="middle" fill="white" font-family="sans-serif" font-size="36" font-weight="700">D</text></svg>\n');
    console.log('Created dory.json and docs/introduction.mdx. Run `dory dev` to start writing.');
  },

  dev: () => {
    const userRoot = getUserRoot();
    const configPath = resolve(userRoot, 'dory.json');
    if (!existsSync(configPath)) throw new Error('dory.json not found; run `dory init` first');
    loadProjectEnv(userRoot);
    const workspace = createWorkspace(userRoot);
    const server = spawn(process.execPath, [viteCli(workspace)], {
      cwd: workspace,
      stdio: 'inherit',
      env: { ...process.env, DORY_PROJECT_ROOT: userRoot },
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try { stageDocs(userRoot, workspace); }
        catch (error) { console.error('Could not sync documentation:', error); }
      }, 100);
    };
    const watchers = [watch(userRoot, (_event, file) => { if (file === 'dory.json') sync(); })];
    const docsDir = resolve(userRoot, 'docs');
    if (existsSync(docsDir)) watchers.push(watch(docsDir, { recursive: true }, sync));
    else watchers.push(watch(userRoot, { recursive: true }, (_event, file) => {
      if (file && !file.startsWith('dist/') && !file.startsWith('node_modules/')) sync();
    }));
    const cleanup = () => {
      clearTimeout(timer);
      watchers.forEach(watcher => watcher.close());
      if (!server.killed) server.kill('SIGTERM');
      rmSync(workspace, { recursive: true, force: true });
    };
    server.once('exit', code => { cleanup(); process.exitCode = code || 0; });
    process.once('SIGINT', () => { cleanup(); process.exit(130); });
    process.once('SIGTERM', () => { cleanup(); process.exit(143); });
  },

  check: () => {
    const result = checkProject(getUserRoot());
    console.log(formatCheckResult(result));
    if (result.errors > 0) process.exitCode = 1;
  },

  'i18n:init': () => {
    const locale = process.argv[3];
    if (!locale) throw new Error('Usage: dory i18n:init <locale>');
    const result = initLocale(getUserRoot(), locale);
    console.log(`Created ${result.templatesCreated} translation template(s) in ${result.directory}.`);
    console.log('Translate each .mdx.template file, then rename it to .mdx to publish.');
  },

  inspect: () => {
    console.log(JSON.stringify(projectInfo(getUserRoot()), null, 2));
  },

  discover: async () => {
    const url = process.argv[3];
    if (!url) throw new Error('Usage: dory discover <site-url>');
    console.log(JSON.stringify(await discoverSite(url), null, 2));
  },

  screenshot: async () => {
    const args = process.argv.slice(3);
    const value = (flag: string) => {
      const index = args.indexOf(flag);
      return index < 0 ? undefined : args[index + 1];
    };
    const width = value('--width');
    const height = value('--height');
    const theme = value('--theme');
    if (theme && theme !== 'light' && theme !== 'dark') throw new Error('--theme must be light or dark');
    const result = await screenshot(getUserRoot(), {
      route: value('--route'), output: value('--output'),
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      theme: theme as 'light' | 'dark' | undefined,
    });
    console.log(`Screenshot saved: ${result.output}`);
  },

  mcp: () => {
    const action = process.argv[3];
    if (action === 'serve') {
      const projectIndex = process.argv.indexOf('--project', 4);
      if (projectIndex >= 0) process.env.DORY_PROJECT_ROOT = resolve(process.argv[projectIndex + 1]);
      const version = JSON.parse(readFileSync(resolve(getDoryRoot(), 'package.json'), 'utf8')).version as string;
      return serveMcp(__filename, version);
    }
    if (action === 'config') {
      console.log(JSON.stringify({ mcpServers: { dory: { command: process.execPath, args: [__filename, 'mcp', 'serve'], env: { DORY_PROJECT_ROOT: getUserRoot() } } } }, null, 2));
      return;
    }
    throw new Error('Usage: dory mcp serve | dory mcp config');
  },

  build: () => {
    const userRoot = getUserRoot();
    const configPath = resolve(userRoot, 'dory.json');
    if (!existsSync(configPath)) throw new Error(`dory.json not found: ${configPath}`);
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as DoryConfig;
    validateDoryConfig(config);

    const workspace = createWorkspace(userRoot);
    try {
      console.log(`Building ${config.name || 'Documentation'} from an isolated workspace...`);
      const runVite = (...args: string[]) => execFileSync(process.execPath, [viteCli(workspace), ...args], { cwd: workspace, stdio: 'inherit', env: process.env });
      runVite('build');
      runVite('build', '--config', 'vite.config.ssr.ts');
      execFileSync(process.execPath, [resolve(workspace, 'scripts', 'render-routes.mjs')], { cwd: workspace, stdio: 'inherit' });

      const distDir = resolve(workspace, 'dist');
      if (!existsSync(resolve(distDir, 'index.html'))) {
        throw new Error('Build did not produce dist/index.html');
      }
      const hasSsrContent = (dir: string): boolean => {
        for (const item of readdirSync(dir, { withFileTypes: true })) {
          const itemPath = resolve(dir, item.name);
          if (item.isDirectory() && hasSsrContent(itemPath)) return true;
          if (item.name.endsWith('.html') && /<div id="app">\s*<\w/.test(readFileSync(itemPath, 'utf8'))) return true;
        }
        return false;
      };
      if (!hasSsrContent(distDir)) {
        throw new Error('Build verification failed: no server-rendered route content was found');
      }

      try {
        runVite('build', '-c', 'vite.config.embed-loader.ts');
        runVite('build', '-c', 'vite.config.embed-widget.ts');
      } catch (error) {
        console.warn(`Embed build failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      const userDistDir = resolve(userRoot, 'dist');
      rmSync(userDistDir, { recursive: true, force: true });
      cpSync(distDir, userDistDir, { recursive: true });
      console.log(`Documentation ready in ${userDistDir}`);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  },

  preview: () => startPreview({ version: JSON.parse(readFileSync(resolve(getDoryRoot(), 'package.json'), 'utf8')).version as string }),

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
  init             Create dory.json and starter docs in the current directory
  dev              Start a live development server for this project
  check            Check navigation, links, and content before publishing
  i18n:init <code>  Create translation templates for a locale
  reference [page]  List or read packaged Dory MDX reference pages
  inspect          Show dory.json and local MDX pages as JSON
  discover <url>   Find llms.txt and MDX source links from one hosted docs URL
  screenshot       Capture a built route as a full-page PNG
                   Options: --route <path> --output <file> --theme light|dark
                            --width <pixels> --height <pixels>
  mcp serve        Run the local MCP server over stdio
                   Option: --project <directory>
  mcp config       Print an MCP client config for this project

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
  dory init
  dory dev
  dory check
  dory i18n:init es
  dory reference components/cards.mdx
  dory inspect
  dory discover https://docs.example.com
  dory build && dory screenshot --route /getting-started --theme dark
  dory mcp config
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

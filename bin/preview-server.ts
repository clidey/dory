import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sirv from 'sirv';
import { hostHeaderValidation, originValidation } from '@modelcontextprotocol/node';
import { handleChatRequest } from './chat-server.js';
import { createDocsMcp } from './mcp-http.js';
import { createAnalytics } from './analytics-server.js';
import { readOptionalDoryConfig, validateDoryConfig, normalizeBasePath } from './project-config.js';

export function startPreview({ projectRoot = process.cwd(), version }: { projectRoot?: string; version: string }): void {
  console.log('👀 Starting docs preview...');

  const userRoot = projectRoot;
  for (const name of ['.env', '.env.local']) {
    const file = resolve(userRoot, name);
    if (existsSync(file)) process.loadEnvFile(file);
  }
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
    single: false,
    etag: true,
    gzip: true,
    brotli: true,
  });

  // Mirror the production layout: a `basePath` build is served under that
  // prefix, so strip it before handing the request to sirv.
  const config = readOptionalDoryConfig(resolve(userRoot, 'dory.json'));
  if (config) validateDoryConfig(config);
  const basePath = normalizeBasePath(config?.basePath);
  const analytics = createAnalytics({ projectRoot: userRoot, basePath });
  const embedOrigins = config?.embed?.security?.allowedOrigins ?? [];
  const frameAncestors = ['\'self\'', ...embedOrigins].join(' ');
  const docsMcp = createDocsMcp(distDir, version);
  const allowedMcpHosts = ['localhost', '127.0.0.1', '[::1]'];
  if (config?.url) {
    try { allowedMcpHosts.push(new URL(config.url).hostname); } catch { /* Invalid site URL cannot authorize an MCP host. */ }
  }
  for (const host of (process.env.DORY_MCP_ALLOWED_HOSTS ?? '').split(',')) {
    if (/^[a-z0-9.-]+$/i.test(host.trim())) allowedMcpHosts.push(host.trim());
  }
  const validateMcpHost = hostHeaderValidation(allowedMcpHosts);
  const validateMcpOrigin = originValidation(allowedMcpHosts);
  const posthogIngestOrigins = new Set(['https://us.i.posthog.com', 'https://eu.i.posthog.com']);
  const posthogScriptOrigins = new Set(['https://us-assets.i.posthog.com', 'https://eu-assets.i.posthog.com']);
  if (config?.analytics?.posthog?.apiHost) {
    try {
      const host = new URL(config.analytics.posthog.apiHost);
      if (host.protocol === 'https:') {
        posthogIngestOrigins.add(host.origin);
        posthogScriptOrigins.add(new URL(host.href.replace('.i.posthog.com', '-assets.i.posthog.com')).origin);
      }
    } catch { /* Ignore invalid optional analytics hosts. */ }
  }
  const ingestHosts = [...posthogIngestOrigins].join(' ');
  const scriptHosts = [...posthogScriptOrigins].join(' ');

  const maxAttempts = 20;

  const tryPort = (currentPort: number, attempt: number): void => {
    // Fresh server per attempt — reusing one server object stacks listeners
    // and produces duplicate servers on retry.
    const server = createServer(async (req, res) => {
      if (!embedOrigins.length) res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${ingestHosts} ${scriptHosts}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' ${ingestHosts}; frame-ancestors ${frameAncestors}`);
      res.once('finish', () => analytics.recordRequest(req, res.statusCode));
      if (basePath && req.url) {
        if (req.url === basePath || req.url.startsWith(`${basePath}/`) || req.url.startsWith(`${basePath}?`)) {
          req.url = req.url.slice(basePath.length) || '/';
        } else {
          res.statusCode = 302;
          res.setHeader('Location', `${basePath}/`);
          res.end();
          return;
        }
      }
      try {
        if (req.url && new URL(req.url, 'http://localhost').pathname === '/mcp') {
          if (!validateMcpHost(req, res) || !validateMcpOrigin(req, res)) return;
          await docsMcp.serve(req, res);
          return;
        }
        const handled = await handleChatRequest(req, res, {
          docsDir: existsSync(resolve(userRoot, 'docs')) ? resolve(userRoot, 'docs') : userRoot,
        });
          if (!handled) serve(req, res, () => {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            const notFound = resolve(distDir, '404.html');
            const body = existsSync(notFound) ? readFileSync(notFound) : 'Page not found';
            res.end(req.method === 'HEAD' ? undefined : body);
          });
      } catch {
        console.error('Request handling failed');
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
        }
        if (!res.writableEnded) res.end(JSON.stringify({ error: 'Chat is temporarily unavailable' }));
      }
    });
    server.headersTimeout = 10_000;
    server.requestTimeout = 15_000;
    server.keepAliveTimeout = 5_000;
    server.maxRequestsPerSocket = 20;
    server.once('close', () => { void docsMcp.close(); });

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
      console.log(`🚀 Documentation live at http://localhost:${currentPort}${basePath}`);
      console.log('   Press Ctrl+C to stop the server');
    });

    server.listen(currentPort);
  };

  tryPort(port, 0);
}

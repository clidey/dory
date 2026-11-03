import { loadEnv, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { handleChatRequest } from '../../bin/chat-server.ts';

/** Development-only same-origin chat endpoint. Production uses `dory preview`. */
export function chatDevServer(): Plugin {
  return {
    name: 'dory-chat-dev-server',
    configResolved(config) {
      if (config.command !== 'serve') return;
      // Vite parses .env for its own client env, but does not populate process.env.
      // The chat handler reads these values only on the dev server.
      const env = loadEnv(config.mode, config.root, '');
      for (const name of [
        'DORY_CHAT_API_KEY', 'OPENAI_API_KEY', 'DORY_CHAT_MODEL', 'DORY_CHAT_BASE_URL',
        'DORY_CHAT_PER_MINUTE', 'DORY_CHAT_PER_IP_DAY', 'DORY_CHAT_GLOBAL_DAY',
        'DORY_CHAT_MAX_CONCURRENT', 'DORY_CHAT_MAX_OUTPUT_TOKENS',
      ]) {
        if (!process.env[name] && env[name]) process.env[name] = env[name];
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const root = resolve(process.cwd(), 'docs');
        handleChatRequest(req, res, { docsDir: existsSync(root) ? root : process.cwd(), localDevelopment: true })
          .then(handled => { if (!handled) next(); })
          .catch(next);
      });
    },
  };
}

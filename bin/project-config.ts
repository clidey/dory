import { existsSync, readFileSync } from 'node:fs';

export interface DoryConfig {
  name?: string;
  description?: string;
  url?: string;
  navigation?: unknown;
  analytics?: { posthog?: { token?: string; apiHost?: string } };
  embed?: { security?: { allowedOrigins?: string[] } };
  [key: string]: unknown;
}

export const validateDoryConfig = (config: DoryConfig): void => {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be a valid object');
  }
  if (config.basePath !== undefined && typeof config.basePath !== 'string') {
    throw new Error('"basePath" must be a string such as "/docs"');
  }
  if (config.embed?.security?.allowedOrigins !== undefined) {
    if (!Array.isArray(config.embed.security.allowedOrigins) || config.embed.security.allowedOrigins.some(origin => !validEmbedOrigin(origin))) {
      throw new Error('"embed.security.allowedOrigins" must contain exact HTTPS origins (HTTP localhost is allowed for development)');
    }
  }
};

const validEmbedOrigin = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.origin === value && !url.username && !url.password && (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)));
  } catch { return false; }
};

// Reads dory.json when present; preview must not fail without one.
export const readOptionalDoryConfig = (configPath: string): DoryConfig | null => {
  if (!existsSync(configPath)) return null;
  try {
    return JSON.parse(readFileSync(configPath, 'utf8')) as DoryConfig;
  } catch {
    return null;
  }
};

// Same normalization as src/utils/base-path.ts (the CLI is compiled separately).
export const normalizeBasePath = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : '';
};


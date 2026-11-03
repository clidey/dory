import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startPreview } from './preview-server.js';

const { version } = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string };
startPreview({ version });

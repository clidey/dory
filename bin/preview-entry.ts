import { startPreview } from './preview-server.js';

declare const __DORY_VERSION__: string;
startPreview({ version: __DORY_VERSION__ });

import { readdir, readFile, writeFile, realpath } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { gzip, brotliCompress, constants } from 'node:zlib';

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);
const textTypes = new Set(['.html', '.js', '.css', '.json', '.svg', '.xml', '.txt', '.md']);

/** Precompress public text assets for Dory's server and compatible static hosts. */
export async function compressStaticFiles(directory) {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) { count += await compressStaticFiles(file); continue; }
    // Do not follow symlinks or compress already compressed media and archives.
    if (!entry.isFile() || !textTypes.has(extname(file))) continue;
    const input = await readFile(file);
    if (input.length < 1024) continue;
    const variants = await Promise.all([
      gzipAsync(input, { level: 9 }),
      brotliAsync(input, { params: { [constants.BROTLI_PARAM_QUALITY]: 6 } }),
    ]);
    for (const [index, suffix] of ['.gz', '.br'].entries()) {
      if (variants[index].length < input.length) await writeFile(file + suffix, variants[index]);
    }
    count++;
  }
  return count;
}

if (process.argv[1] && await realpath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const count = await compressStaticFiles(resolve(process.argv[2] || 'dist'));
  console.log(`Precompressed ${count} static text files (gzip and Brotli)`);
}

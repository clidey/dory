/** Extracts the searchable prose from MDX in both builds and the runtime. */
export function stripMdxToText(content: string): string {
  return content
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export\s+.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_~`>|]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

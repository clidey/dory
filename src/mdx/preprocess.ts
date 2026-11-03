import { preprocessMdxTags } from '../plugins/sanitize.ts';

/** Browser-safe preprocessing shared by the static build and embedded runtime. */
export function preprocessMdxSource(content: string, fileName = 'content.mdx'): string {
  let processed = content;
  const frontmatter = processed.match(/^---\n([\s\S]*?)\n---\n?/);
  if (frontmatter) processed = processed.slice(frontmatter[0].length);

  // The page frame already renders the frontmatter title. Remove only its
  // matching Markdown heading; headings in examples and other titles survive.
  const rawTitle = frontmatter?.[1].match(/^title:\s*(.+?)\s*$/m)?.[1];
  let title = rawTitle;
  if (rawTitle?.startsWith('"')) {
    try { title = JSON.parse(rawTitle) as string; } catch { /* Keep unfamiliar YAML unchanged. */ }
  } else if (rawTitle?.startsWith("'") && rawTitle.endsWith("'")) {
    title = rawTitle.slice(1, -1).replace(/''/g, "'");
  }
  if (title) {
    let fence = '';
    let removed = false;
    processed = processed.split('\n').filter(line => {
      const delimiter = line.trim().match(/^(`{3,}|~{3,})/);
      if (delimiter) {
        if (!fence) fence = delimiter[1];
        else if (delimiter[1][0] === fence[0] && delimiter[1].length >= fence.length) fence = '';
        return true;
      }
      if (fence || removed) return true;
      const heading = line.match(/^#\s+(.+?)\s*#*\s*$/);
      if (heading?.[1] !== title) return true;
      removed = true;
      return false;
    }).join('\n');
  }

  const strayYaml = processed.match(/^```yaml\n([\s\S]*?)\n---\n?/);
  if (strayYaml) processed = processed.slice(strayYaml[0].length);

  const transformed = preprocessMdxTags().transform(processed, fileName);
  processed = typeof transformed === 'string' ? transformed : transformed?.code ?? processed;

  let inCodeBlock = false;
  return processed.split('\n').map(line => {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return line;
    }
    if (inCodeBlock) return line;

    let output = '';
    let lastIndex = 0;
    const inlineCode = /`([^`]+)`/g;
    let match: RegExpExecArray | null;
    while ((match = inlineCode.exec(line)) !== null) {
      output += line.slice(lastIndex, match.index).replace(/<(https?:\/\/[^\s>]+)>/g, '[$1]($1)');
      output += match[0];
      lastIndex = match.index + match[0].length;
    }
    return output + line.slice(lastIndex).replace(/<(https?:\/\/[^\s>]+)>/g, '[$1]($1)');
  }).join('\n');
}

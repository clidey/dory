import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { remarkSafeVars } from '../plugins/sanitize.ts';
import { rehypeCodeMeta } from '../plugins/code-meta.ts';

/** MDX plugins that work in both the static builder and the sandboxed runtime. */
export const getCommonMdxConfig = (development = false) => ({
  remarkPlugins: [remarkGfm, remarkSafeVars],
  rehypePlugins: [rehypeSlug, rehypeCodeMeta],
  development,
});

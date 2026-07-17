/**
 * Window globals injected by the SSR build (see scripts/prerender).
 */
interface Window {
  __DORY_FRONTMATTER__?: Array<Record<string, any>>;
  __DORY_ROUTE__?: string;
}

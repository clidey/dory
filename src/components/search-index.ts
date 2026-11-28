/** A separate index lets the embedded viewer search only its authorized docs. */
export function createSearchIndex() {
    let searchIndex: any = null;

    async function getSearchIndex() {
        if (!searchIndex) {
            const { Document } = await import('flexsearch');
            searchIndex = new Document({
                tokenize: 'full',
                document: {
                    id: 'url',
                    // The title is its own field so a page is found by its title
                    // even when the body never repeats it.
                    index: ['title', 'content'],
                    store: ['title', 'pageTitle'],
                },
                context: {
                    resolution: 9,
                    depth: 2,
                    bidirectional: true
                }
            });
        }
        return searchIndex;
    }

    return {
        async add(filename: string, data: { title?: string }, content: string) {
            try {
                const index = await getSearchIndex();
                index.add({
                    url: filename,
                    title: data.title || '',
                    content,
                    pageTitle: data.title,
                });
            } catch (error) {
                console.warn(`Failed to index ${filename}:`, error);
            }
        },
        search(query: string, options = {}): Array<{ url: string; title: string; pageTitle: string }> {
            if (!searchIndex) return [];
            const fields = searchIndex.search(query, { ...options, enrich: true }) as any[];
            const limit = (options as { limit?: number }).limit;
            const pages = new Map<string, { url: string; title: string; pageTitle: string }>();
            // Pages whose title matches come first, then pages whose body matches.
            for (const field of ['title', 'content']) {
                for (const item of fields.find(entry => entry.field === field)?.result ?? []) {
                    if (pages.has(item.id)) continue;
                    pages.set(item.id, {
                        url: item.id as string,
                        title: item.doc?.title || '',
                        pageTitle: item.doc?.pageTitle || '',
                    });
                }
            }
            const results = [...pages.values()];
            return limit === undefined ? results : results.slice(0, limit);
        },
    };
}

const defaultIndex = createSearchIndex();

export const addToSearchIndex = defaultIndex.add;
export const search = defaultIndex.search;

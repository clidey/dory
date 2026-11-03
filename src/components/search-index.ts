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
                    index: 'content',
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
            const result = searchIndex.search(query, { ...options, enrich: true }) as any[];
            if (result.length === 0) return [];
            return result[0].result.map((item: any) => ({
                url: item.id as string,
                title: item.doc?.title || '',
                pageTitle: item.doc?.pageTitle || '',
            }));
        },
    };
}

const defaultIndex = createSearchIndex();

export const addToSearchIndex = defaultIndex.add;
export const search = defaultIndex.search;

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

export async function addToSearchIndex(filename: string, data: any, content: string) {
    try {
        const index = await getSearchIndex();
        index.add({
            url: filename,
            title: data.title || '',
            content: content,
            pageTitle: data.title
        });
    } catch (error) {
        console.warn(`Failed to index ${filename}:`, error);
    }
}

export function search(query: string, options = {}) {
    if (!searchIndex) return [];

    const result = searchIndex.search(query, {
        ...options,
        enrich: true,
    }) as any[];

    if (result.length === 0) {
        return [];
    }

    return result[0].result.map((item: any) => ({
        url: item.id,
        title: item.doc?.title || '',
        pageTitle: item.doc?.pageTitle || '',
    }));
}

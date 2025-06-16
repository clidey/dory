import { Document } from "flexsearch";

export const searchIndex = new Document({
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

export function addToSearchIndex(filename: string, data: any, content: string) {
    searchIndex.add({
        url: filename,
        title: data.title || '',
        content: content,
        pageTitle: data.title
    });
}

export function search(query: string, options = {}) {
    if (!searchIndex) return [];
    
    const result = searchIndex.search(query, {
        ...options,
        enrich: true,
    });

    if (result.length === 0) {
        return [];
    }

    return result[0].result.map((item) => ({
        url: item.id,
        title: item.doc?.title || '',
        pageTitle: item.doc?.pageTitle || '',
    }));
}

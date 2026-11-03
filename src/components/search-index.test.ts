import { describe, expect, it } from 'vitest';
import { createSearchIndex } from './search-index';

describe('createSearchIndex', () => {
  it('keeps runtime locale indexes separate', async () => {
    const english = createSearchIndex();
    const french = createSearchIndex();
    await english.add('docs/index.mdx', { title: 'Inventory' }, 'publish the app');
    await french.add('docs/fr/index.mdx', { title: 'Inventaire' }, 'publier l’application');

    expect(english.search('publish').map(item => item.url)).toEqual(['docs/index.mdx']);
    expect(french.search('publish')).toEqual([]);
    expect(french.search('publier').map(item => item.url)).toEqual(['docs/fr/index.mdx']);
  });
});

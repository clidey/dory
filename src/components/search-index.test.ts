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

  it('finds a page by its title when the body never repeats it', async () => {
    const index = createSearchIndex();
    await index.add('/learning/take-a-course', { title: 'Take a course' }, 'Open your module from Home and submit the assignment.');
    await index.add('/learning/teach', { title: 'Teach' }, 'Build modules and grade each assignment.');

    expect(index.search('Take a course').map(item => item.url)).toEqual(['/learning/take-a-course']);
    expect(index.search('take a cou').map(item => item.url)).toEqual(['/learning/take-a-course']);
  });

  it('lists title matches before body matches, each page once, within the limit', async () => {
    const index = createSearchIndex();
    await index.add('/body-only', { title: 'Receiving' }, 'Scan the sensor label at the dock.');
    await index.add('/both', { title: 'Sensor readings' }, 'Each sensor reports every minute.');
    await index.add('/title-only', { title: 'Sensors' }, 'Manual readings are entered by hand.');

    expect(index.search('sensor').map(item => item.url)).toEqual(['/both', '/title-only', '/body-only']);
    expect(index.search('sensor', { limit: 2 }).map(item => item.url)).toEqual(['/both', '/title-only']);
    expect(index.search('pallet')).toEqual([]);
  });
});

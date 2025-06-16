import { MDXProvider } from '@mdx-js/preact';
import Layout from '../ui/layout';
import * as mdx from '../mdx/mdx';

export const withMDX = (Content: preact.ComponentType) => () => {
  return (
    <MDXProvider components={mdx}>
      <Layout>
        <Content />
      </Layout>
    </MDXProvider>
  );
};
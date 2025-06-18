import { visit } from 'unist-util-visit';

export const remarkSafeVars = () => {
  return (tree: any) => {
    visit(tree, 'mdxTextExpression', (node: any, index: number | undefined, parent: any) => {
      if (parent && typeof index === 'number') {
        // Replace mdxTextExpression with inlineCode node for code formatting
        parent.children[index] = {
          type: 'inlineCode',
          value: node.value
        };
      }
    });
  };
};

import { visit } from 'unist-util-visit';

export const remarkJsxWhitespaceFix = () => {
  return (tree: any) => {
    visit(tree, 'paragraph', (node: any) => {
      // Check if this paragraph contains JSX elements
      const hasJsxElements = node.children.some((child: any) => 
        child.type === 'mdxJsxTextElement' || child.type === 'mdxJsxFlowElement'
      );
      
      if (!hasJsxElements) {
        return;
      }

      // Process text nodes that are adjacent to JSX elements
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        
        if (child.type === 'text') {
          // Check if this text node is between JSX elements or adjacent to them
          const prevChild = node.children[i - 1];
          const nextChild = node.children[i + 1];
          
          const isAdjacentToJsx = 
            (prevChild && (prevChild.type === 'mdxJsxTextElement' || prevChild.type === 'mdxJsxFlowElement')) ||
            (nextChild && (nextChild.type === 'mdxJsxTextElement' || nextChild.type === 'mdxJsxFlowElement'));
          
          if (isAdjacentToJsx) {
            // Normalize whitespace: preserve meaningful whitespace but clean up formatting
            const originalValue = child.value;
            
            // If the text is just whitespace (spaces, newlines, etc.), preserve it as a single space
            if (/^\s*$/.test(originalValue)) {
              child.value = ' ';
            } else {
              // For non-whitespace text, trim leading/trailing whitespace but preserve internal structure
              child.value = originalValue.trim();
            }
          }
        }
      }
    });
  };
};
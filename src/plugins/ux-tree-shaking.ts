import { parseSync, type Plugin } from 'vite';

/** Remove unused UX component factories while preserving their asChild registration. */
export function uxPureFactories(): Plugin {
  return {
    name: 'ux-pure-factories',
    apply: 'build',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/@clidey/ux/dist/index.js')) return;
      const { program }: any = parseSync(id, code);
      const react = new Set<string>();
      const factoryNames = new Set<string>();
      const variables = new Map<string, any>();
      const registrations = new Set<string>();
      const edits: [number, number, string][] = [];
      const reactFactories = ['forwardRef', 'memo', 'createContext'];

      for (const statement of program.body) {
        if (statement.type === 'ImportDeclaration') {
          for (const specifier of statement.specifiers) {
            if (statement.source.value === 'react') {
              if (['ImportNamespaceSpecifier', 'ImportDefaultSpecifier'].includes(specifier.type)) {
                react.add(specifier.local.name);
              } else if (reactFactories.includes(specifier.imported.name)) {
                factoryNames.add(specifier.local.name);
              }
            }
            if (statement.source.value === 'class-variance-authority'
              && specifier.type === 'ImportSpecifier' && specifier.imported.name === 'cva') {
              factoryNames.add(specifier.local.name);
            }
          }
        }
        if (statement.type === 'VariableDeclaration') {
          for (const declaration of statement.declarations) {
            if (declaration.id.type === 'Identifier' && declaration.init) {
              variables.set(declaration.id.name, declaration.init);
            }
          }
        }
        if (statement.type !== 'FunctionDeclaration' || statement.params.length !== 1
          || statement.params[0].type !== 'Identifier') continue;
        const result = statement.body.body[0];
        const expressions = result?.argument?.expressions;
        const assignment = expressions?.[0];
        // Recognize only the UX marker that sets one flag and returns its component.
        if (statement.body.body.length === 1 && result.type === 'ReturnStatement'
          && expressions?.length === 2 && assignment?.type === 'AssignmentExpression'
          && assignment.left.type === 'MemberExpression'
          && assignment.left.object.name === statement.params[0].name
          && assignment.right.value === true && expressions[1].name === statement.params[0].name) {
          registrations.add(statement.id.name);
        }
      }

      const isFactory = (call: any) => call?.type === 'CallExpression'
        && (call.callee.type === 'Identifier' ? factoryNames.has(call.callee.name)
          : call.callee.type === 'MemberExpression' && react.has(call.callee.object.name)
            && reactFactories.includes(call.callee.property.name));
      const wrapped = new Set<string>();
      for (const statement of program.body) {
        if (statement.type !== 'ExpressionStatement') continue;
        const calls = statement.expression.type === 'SequenceExpression'
          ? statement.expression.expressions : [statement.expression];
        for (const call of calls) {
          if (call.type !== 'CallExpression' || !registrations.has(call.callee.name)
            || call.arguments.length !== 1 || call.arguments[0].type !== 'Identifier') continue;
          const key = call.arguments[0].name;
          const initializer = variables.get(key);
          if (!isFactory(initializer) || wrapped.has(key)) continue;
          wrapped.add(key);
          // Keep the marker attached to retained components and remove it with unused ones.
          edits.push(
            [initializer.start, initializer.start, `/* @__PURE__ */ ${call.callee.name}(`],
            [initializer.end, initializer.end, ')'],
            [call.start, call.end, 'void 0'],
          );
        }
      }
      for (const initializer of variables.values()) {
        if (isFactory(initializer)) edits.push([initializer.start, initializer.start, '/* @__PURE__ */ ']);
      }
      edits.sort((a, b) => b[0] - a[0]);
      for (const [start, end, replacement] of edits) {
        code = code.slice(0, start) + replacement + code.slice(end);
      }
      return { code, map: null };
    },
  };
}

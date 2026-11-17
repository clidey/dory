/** Cache resolved modules for synchronous hydration, without importing other pages. */
export function createPageLoader<T>(loaders: Record<string, () => Promise<T>>) {
  const modules = new Map<string, T>();
  const pending = new Map<string, Promise<T | undefined>>();
  return {
    get: (path: string) => modules.get(path),
    load(path: string): Promise<T | undefined> {
      if (modules.has(path)) return Promise.resolve(modules.get(path));
      if (!loaders[path]) return Promise.resolve(undefined);
      let request = pending.get(path);
      if (!request) {
        request = loaders[path]().then(module => {
          modules.set(path, module);
          pending.delete(path);
          return module;
        }, error => {
          pending.delete(path);
          throw error;
        });
        pending.set(path, request);
      }
      return request;
    },
  };
}

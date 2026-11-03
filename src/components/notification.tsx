import { CatalogIcon, toast } from '@clidey/ux';

export function useNotification() {
  return {
    showNotification: (message: string, description?: string) => {
      toast(message, {
        icon: <CatalogIcon name="info" className="h-4 w-4" />,
        description: description,
      });
    }
  };
}

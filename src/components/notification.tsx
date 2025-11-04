import { toast } from '@clidey/ux';
import { InfoIcon } from 'lucide-react';

export function useNotification() {
  return {
    showNotification: (message: string, description?: string) => {
      toast(message, {
        icon: <InfoIcon className="h-4 w-4" />,
        description: description,
      });
    }
  };
}

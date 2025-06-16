import { Transition } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { createContext, type ComponentChildren } from 'preact';
import { useContext, useState } from 'preact/hooks';

interface Notification {
  id: number;
  message: string;
  description?: string;
}

interface NotificationContextType {
  showNotification: (message: string, description?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ComponentChildren;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (message: string, description?: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, description }]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, 5000);
  };

//   const dismissNotification = (id: number) => {
//     setNotifications(prev => prev.filter(notif => notif.id !== id));
//   };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 flex items-start justify-end px-8 py-6 sm:p-6 z-[100]"
      >
        <div className="flex w-full flex-col items-end space-y-4">
          {notifications.map((notif) => (
            <Transition
              key={notif.id}
              show={true}
              enter="transform ease-out duration-300 transition"
              enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
              enterTo="translate-y-0 opacity-100 sm:translate-x-0"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-[#222222] shadow-lg ring-1 ring-[#444444]/5">
                <div className="p-4">
                  <div className="flex items-start">
                    <div className="shrink-0">
                      <CheckCircleIcon aria-hidden="true" className="size-6 text-green-400" />
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                      <p className="text-sm font-medium text-[#ffffff]">{notif.message}</p>
                      {notif.description && (
                        <p className="mt-1 text-sm text-[#aaaaaa]">{notif.description}</p>
                      )}
                    </div>
                    {/* <div className="ml-4 flex shrink-0">
                      <button
                        type="button"
                        onClick={() => dismissNotification(notif.id)}
                        className="inline-flex rounded-md bg-transparent text-[#aaaaaa] hover:text-[#ffffff] focus:ring-2 focus:ring-[#444444] focus:ring-offset-2 focus:outline-hidden"
                      >
                        <span className="sr-only">Close</span>
                        <XMarkIcon aria-hidden="true" className="size-5" />
                      </button>
                    </div> */}
                  </div>
                </div>
              </div>
            </Transition>
          ))}
        </div>
      </div>
      {children}
    </NotificationContext.Provider>
  );
}

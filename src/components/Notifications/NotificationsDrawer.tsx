// NotificationsDrawer.tsx
import React from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, TransitionChild } from '@headlessui/react';
import { XMarkIcon, BellIcon, CheckCircleIcon, UserIcon, TrashIcon } from '@heroicons/react/24/outline';

export interface Notification {
  id: number;
  message: string;
  read: boolean;
  created_at: string;
  actor_username?: string;
}

interface NotificationsDrawerProps {
  isOpen: boolean;
  notifications: Notification[];
  markAllRead: () => void;
  clearAll: () => void;
  onClose: () => void;
}

const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  notifications,
  markAllRead,
  clearAll,
  onClose,
}) => {
  const unreadCount = notifications.filter(notification => !notification.read).length;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/75 transition-opacity duration-500 ease-in-out data-closed:opacity-0"
      />

      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <DialogPanel
              transition
              className="pointer-events-auto relative w-screen max-w-md transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700"
            >
              <TransitionChild>
                <div className="absolute top-0 left-0 -ml-8 flex pt-4 pr-2 duration-500 ease-in-out data-closed:opacity-0 sm:-ml-10 sm:pr-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="relative rounded-md text-gray-300 hover:text-white focus:ring-2 focus:ring-white focus:outline-none"
                  >
                    <span className="absolute -inset-2.5" />
                    <span className="sr-only">Close panel</span>
                    <XMarkIcon aria-hidden="true" className="size-6" />
                  </button>
                </div>
              </TransitionChild>
              
              <div className="flex h-full flex-col overflow-y-scroll bg-white py-6 shadow-xl">
                <div className="px-4 sm:px-6 flex justify-between items-center">
                  <DialogTitle className="text-xl font-semibold text-gray-900">
                    Notifications 
                    {unreadCount > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {unreadCount} new
                      </span>
                    )}
                  </DialogTitle>
                </div>
                
                <div className="border-t border-gray-200 mt-4"></div>

                <div className="mt-2 px-4 sm:px-6">
                  <div className="flex space-x-2 text-sm">
                  <div className="flex space-x-2">
                    <button
                      onClick={markAllRead}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      <CheckCircleIcon className="size-4 mr-1" />
                      Mark all as read
                    </button>
                    <button
                      onClick={clearAll}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800"
                      title="Clear all notifications"
                    >
                      <TrashIcon className="size-4 mr-1" />
                      Clear all
                    </button>
                  </div>
                  </div>
                </div>
                
                <div className="relative mt-4 flex-1 px-4 sm:px-6">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <BellIcon className="size-12 text-gray-300 mb-2" />
                      <p className="text-gray-500">No notifications yet.</p>
                      <p className="text-sm text-gray-400">We'll notify you when something happens.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border ${
                            notification.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-100'
                          } hover:bg-gray-50 transition-colors duration-150`}
                        >
                          <div className="flex items-start">
                            <div className="flex-shrink-0 mr-3 mt-1">
                              <UserIcon className="size-7 text-green-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${notification.read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                                {notification.message}
                              </p>
                              <div className="mt-1 flex items-center text-xs text-gray-500">
                                <time dateTime={notification.created_at}>
                                  {new Date(notification.created_at).toLocaleString(undefined, { 
                                    weekday: 'short',
                                    hour: 'numeric',
                                    minute: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </time>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default NotificationsDrawer;
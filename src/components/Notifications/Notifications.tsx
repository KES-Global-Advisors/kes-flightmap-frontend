// Notifications.tsx
import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import axiosInstance from '@/hooks/axiosInstance';
import NotificationsDrawer, { Notification } from './NotificationsDrawer';

const Notifications: React.FC = () => {
  const API = process.env.REACT_APP_API_BASE_URL;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mark all notifications as read.
  const markAllAsRead = async () => {
    try {
      await axiosInstance.post(`${API}/notifications/mark-all-read/`);
      // Update local notifications state after marking as read.
      const updated = notifications.map((n) => ({ ...n, read: true }));
      setNotifications(updated);
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  // Function to clear notifications
  const clearNotifications = async () => {
    try {
      await axiosInstance.delete(`${API}/notifications/clear/`);
      // Optionally, clear your local notifications state
      setNotifications([]);
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  };

  // Use SSE to listen for new notifications.
  useEffect(() => {
    const accessToken = sessionStorage.getItem('accessToken');
    if (!accessToken) {
      return;
    }
    const eventSource = new EventSource(`${API}/notifications/sse/?token=${accessToken}`);
    eventSource.onmessage = (event) => {
      const newNotification = JSON.parse(event.data);
      setNotifications((prev) => [newNotification, ...prev]);
    };
  
    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();
    };
  
    return () => {
      eventSource.close();
    };
  }, []);
  

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="relative rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none"
      >
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
            {unreadCount}
          </span>
        )}
        <Bell className="h-6 w-6" />
      </button>
      <NotificationsDrawer
        isOpen={isModalOpen}
        notifications={notifications}
        markAllRead={markAllAsRead}
        clearAll={clearNotifications}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default Notifications;

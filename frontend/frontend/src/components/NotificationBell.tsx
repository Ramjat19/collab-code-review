import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { notificationAPI } from '../api';
import NotificationDrawer from './NotificationDrawer';

const NotificationBell: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch initial unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await notificationAPI.getNotifications(1, 1);
        setUnreadCount(response.data.data.unreadCount);
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchUnreadCount();
  }, []);

  // Listen for new notifications
  useEffect(() => {
    const handleNewNotification = () => {
      setUnreadCount(prev => prev + 1);
    };

    window.addEventListener('newNotification', handleNewNotification);
    
    return () => {
      window.removeEventListener('newNotification', handleNewNotification);
    };
  }, []);

  return (
    <>
      <button
        onClick={() => setIsDrawerOpen(true)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUnreadCountChange={(count: number) => setUnreadCount(count)}
      />
    </>
  );
};

export default NotificationBell;
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, BellOff, User, Heart, UserPlus, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  type: 'new_post' | 'follow' | 'mention';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_user_id?: string;
  related_post_id?: string;
  related_user?: {
    id: string;
    name: string;
    profile_pic_url?: string;
  };
}

interface NotificationsProps {
  onBack: () => void;
}

const Notifications: React.FC<NotificationsProps> = ({ onBack }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [_currentUserId, _setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
    loadNotificationSettings();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      _setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          related_user:profiles!notifications_related_user_id_fkey (
            id,
            name,
            profile_pic_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      console.log('📬 Loaded notifications:', data?.length || 0);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error in loadNotifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('notifications_enabled')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading notification settings:', error);
        return;
      }

      setNotificationsEnabled(data?.notifications_enabled ?? true);
    } catch (error) {
      console.error('Error in loadNotificationSettings:', error);
    }
  };

  const toggleNotifications = async () => {
    try {
      setIsUpdating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newValue = !notificationsEnabled;

      const { error } = await supabase
        .from('profiles')
        .update({ notifications_enabled: newValue })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating notification settings:', error);
        return;
      }

      setNotificationsEnabled(newValue);
    } catch (error) {
      console.error('Error in toggleNotifications:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_post':
        return <Heart className="w-5 h-5 text-blue-400" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-green-400" />;
      case 'mention':
        return <User className="w-5 h-5 text-purple-400" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all duration-300"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-100">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-slate-400">{unreadCount} unread</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors duration-300"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Notification Settings */}
        <div className="mb-8">
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Settings className="w-6 h-6 text-slate-400" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">Notification Settings</h3>
                  <p className="text-slate-400 text-sm">
                    Get notified when people you follow post new content
                  </p>
                </div>
              </div>
              
              <button
                onClick={toggleNotifications}
                disabled={isUpdating}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                  notificationsEnabled ? 'bg-blue-500' : 'bg-slate-600'
                } ${isUpdating ? 'opacity-50' : ''}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                  notificationsEnabled ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-slate-800/30 rounded-3xl p-6 animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                  className={`bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 transition-all duration-300 cursor-pointer hover:bg-slate-800/40 ${
                    !notification.is_read ? 'ring-2 ring-blue-500/20' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Notification Icon */}
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                      {notification.related_user?.profile_pic_url ? (
                        <img
                          src={notification.related_user.profile_pic_url}
                          alt={notification.related_user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                          <User className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-slate-200 truncate">
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      
                      <p className="text-slate-300 text-sm mb-2">
                        {notification.message}
                      </p>
                      
                      <p className="text-slate-500 text-xs">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
                {notificationsEnabled ? (
                  <Bell className="w-10 h-10 text-slate-100" />
                ) : (
                  <BellOff className="w-10 h-10 text-slate-100" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-slate-100 mb-2">
                {notificationsEnabled ? 'No notifications yet' : 'Notifications disabled'}
              </h3>
              <p className="text-slate-400 text-lg">
                {notificationsEnabled 
                  ? 'Follow people to get notified about their posts'
                  : 'Enable notifications to stay updated'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating elements */}
      <div className="fixed top-20 left-10 w-2 h-2 bg-slate-500 rounded-full opacity-60 animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-32 right-16 w-3 h-3 bg-slate-400 rounded-full opacity-40 animate-pulse delay-1000 pointer-events-none"></div>
      <div className="fixed top-1/3 right-8 w-1 h-1 bg-slate-600 rounded-full opacity-80 animate-pulse delay-500 pointer-events-none"></div>
    </div>
  );
};

export default Notifications;
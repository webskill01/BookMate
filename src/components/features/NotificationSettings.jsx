// src/components/features/NotificationSettings.jsx
import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, AlertTriangle, Settings, Smartphone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';

const NotificationSettings = ({ onClose }) => {
  const { currentUser } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userToken, setUserToken] = useState(null);

  useEffect(() => {
    loadNotificationSettings();
  }, [currentUser]);

  const loadNotificationSettings = async () => {
    if (!currentUser) return;
    
    try {
      // Check browser permission
      setPermission(notificationService.getPermissionStatus());
      
      // Load user settings from Firestore
      const settings = await notificationService.getUserNotificationSettings(currentUser.uid);
      setNotificationsEnabled(settings.enabled);
      setUserToken(settings.token);
      
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const result = await notificationService.requestPermission(currentUser.uid);
      
      if (result.success) {
        setNotificationsEnabled(true);
        setPermission('granted');
        setUserToken(result.token);
        setSuccess('Notifications enabled successfully! You\'ll receive reminders about due dates and fines.');
        
        // Setup foreground listener
        notificationService.setupForegroundListener((payload) => {
          console.log('Notification received in app:', payload);
        });
        
      } else {
        setError(result.error || 'Failed to enable notifications');
      }
    } catch (error) {
      setError('Failed to enable notifications. Please check your browser settings.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const result = await notificationService.disableNotifications(currentUser.uid);
      
      if (result.success) {
        setNotificationsEnabled(false);
        setSuccess('Notifications disabled successfully.');
      } else {
        setError(result.error || 'Failed to disable notifications');
      }
    } catch (error) {
      setError('Failed to disable notifications');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!userToken) {
      setError('No notification token available');
      return;
    }

    try {
      // This would typically be done through your backend
      // For now, we'll show a local notification
      if ('serviceWorker' in navigator && 'Notification' in window) {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification('BookMate Test', {
          body: 'This is a test notification from BookMate! 📚',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'test',
          actions: [
            { action: 'view', title: 'View Dashboard' },
            { action: 'dismiss', title: 'Dismiss' }
          ]
        });
        setSuccess('Test notification sent!');
      }
    } catch (error) {
      setError('Failed to send test notification');
      console.error(error);
    }
  };

  if (!notificationService.isSupported()) {
    return (
      <div className="card bg-status-warning/10 border-status-warning/20">
        <div className="flex items-start">
          <AlertTriangle className="w-6 h-6 text-status-warning mt-1 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-heading font-semibold text-theme-primary mb-2">
              Notifications Not Supported
            </h3>
            <p className="text-theme-secondary text-mobile-sm mb-3">
              Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Safari.
            </p>
            <button 
              onClick={onClose}
              className="btn-secondary text-mobile-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`p-3 rounded-xl mr-4 ${
            notificationsEnabled ? 'bg-accent-primary/20' : 'bg-theme-card/50'
          }`}>
            {notificationsEnabled ? (
              <Bell className="w-6 h-6 text-accent-primary" />
            ) : (
              <BellOff className="w-6 h-6 text-theme-muted" />
            )}
          </div>
          <div>
            <h3 className="font-heading font-semibold text-theme-primary">
              Push Notifications
            </h3>
            <p className="text-theme-secondary text-mobile-sm">
              Get reminded about due dates and fines
            </p>
          </div>
        </div>
        
        {onClose && (
          <button 
            onClick={onClose}
            className="text-theme-muted hover:text-theme-secondary transition-colors p-2"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-status-danger/20 border border-status-danger/30 text-status-danger px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-accent-primary/20 border border-accent-primary/30 text-accent-primary px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Permission Status */}
      {permission === 'denied' && (
        <div className="bg-status-warning/20 border border-status-warning/30 text-status-warning px-4 py-3 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-mobile-sm font-medium mb-1">Notifications Blocked</p>
              <p className="text-mobile-xs">
                Please enable notifications in your browser settings:
              </p>
              <ol className="text-mobile-xs mt-2 space-y-1 list-decimal list-inside">
                <li>Click the lock icon in your address bar</li>
                <li>Change notifications to "Allow"</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Main Controls */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Smartphone className="w-5 h-5 text-theme-muted mr-3" />
            <div>
              <p className="text-theme-primary font-medium">
                Enable Notifications
              </p>
              <p className="text-theme-secondary text-mobile-sm">
                Status: {permission === 'granted' ? 'Allowed' : permission === 'denied' ? 'Blocked' : 'Not requested'}
              </p>
            </div>
          </div>
          
          <button
            onClick={notificationsEnabled ? handleDisableNotifications : handleEnableNotifications}
            disabled={loading || permission === 'denied'}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 ${
              notificationsEnabled ? 'bg-accent-primary' : 'bg-theme-card border border-theme-border'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Notification Types */}
      <div className="card">
        <h4 className="font-heading font-medium text-theme-primary mb-4">
          You'll receive notifications for:
        </h4>
        
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-accent-primary rounded-full mr-3"></div>
            <span className="text-theme-secondary text-mobile-sm">
              3 days before books are due
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-status-warning rounded-full mr-3"></div>
            <span className="text-theme-secondary text-mobile-sm">
              On the day books are due
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-status-danger rounded-full mr-3"></div>
            <span className="text-theme-secondary text-mobile-sm">
              Daily reminders for overdue books
            </span>
          </div>
        </div>
      </div>

      {/* Test Notification */}
      {notificationsEnabled && userToken && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-primary font-medium">Test Notification</p>
              <p className="text-theme-secondary text-mobile-sm">
                Send a test notification to verify it's working
              </p>
            </div>
            <button 
              onClick={sendTestNotification}
              className="btn-secondary text-mobile-sm"
            >
              Send Test
            </button>
          </div>
        </div>
      )}

      {/* Token Info (for debugging) */}
      {userToken && (
        <div className="card bg-theme-card/30">
          <details>
            <summary className="cursor-pointer text-theme-muted text-mobile-sm">
              Technical Details
            </summary>
            <div className="mt-2 text-mobile-xs text-theme-muted font-mono">
              <p>FCM Token: {userToken.substring(0, 20)}...</p>
              <p>Permission: {permission}</p>
              <p>Enabled: {notificationsEnabled ? 'Yes' : 'No'}</p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;

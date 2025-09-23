// src/services/productionNotificationService.js
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { messaging, db } from '../config/firebase';
import { bookUtils } from '../utils/bookUtils'; 
import { bookService } from '../services/bookService'; 

class ProductionNotificationService {
  constructor() {
    this.foregroundUnsubscribe = null;
    this.isInitialized = false;
  }

  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Request notification permission and setup FCM
  async requestPermission(userId) {
    try {
      // Request browser permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return {
          success: false,
          error: 'Please enable notifications in app or browser settings.'
        };
      }
      // Development: Skip service worker registration since file doesn't exist
    if (import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.log('🔧 Development mode: Skipping FCM service worker registration');
      }
    } 
      // Mobile-specific FCM setup
      else if (this.isMobile() && 'serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        } catch (swError) {
          // Continue without FCM - use browser notifications
          if (import.meta.env.DEV) {
            console.warn('FCM SW registration failed:', swError);
          }
        }
      }

      // Ensure user books are accessible
      try {
        await bookService.getUserBooks(userId);
      } catch (error) {
        if (error.code === 'unavailable' || error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
          await bookService.getCachedUserBooks(userId);
        } else {
          throw error;
        }
      }

      // Wait for Firebase messaging to be ready
      let retryCount = 0;
      while (!messaging && retryCount < 8) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retryCount++;
      }

      if (!messaging) {
        await this.saveBrowserNotificationSettings(userId);
        return {
          success: true,
          method: 'browser-fallback',
          message: 'Browser notifications enabled! Works when app is open.'
        };
      }

      // Try to get FCM token
      try {
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) throw new Error('VAPID key not configured');

        const fcmToken = await getToken(messaging, { vapidKey });
        if (fcmToken) {
          await this.saveFCMSettings(userId, fcmToken);
          this.setupForegroundListener();
          return {
            success: true,
            method: 'fcm-production',
            message: 'FCM notifications enabled! Works even when app is closed.'
          };
        }
      } catch (fcmError) {
        if (import.meta.env.DEV) {
          console.warn('FCM failed, using browser fallback:', fcmError.message);
        }
      }

      // Final fallback
      await this.saveBrowserNotificationSettings(userId);
      return {
        success: true,
        method: 'browser-fallback',
        message: 'Browser notifications enabled! Works when app is open.'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to enable notifications'
      };
    }
  }

  // Save FCM settings
  async saveFCMSettings(userId, fcmToken) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        fcmToken,
        notificationsEnabled: true,
        notificationMethod: 'fcm-production',
        tokenUpdatedAt: serverTimestamp(),
        platform: this.getPlatformInfo()
      }, { merge: true });

      localStorage.setItem(`production_notifications_${userId}`, JSON.stringify({
        enabled: true,
        method: 'fcm-production',
        token: fcmToken,
        timestamp: Date.now()
      }));
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to save FCM settings:', error);
      throw error;
    }
  }

  // Save browser fallback settings
  async saveBrowserNotificationSettings(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        notificationsEnabled: true,
        notificationMethod: 'browser-fallback',
        tokenUpdatedAt: serverTimestamp(),
        platform: this.getPlatformInfo()
      }, { merge: true });

      localStorage.setItem(`production_notifications_${userId}`, JSON.stringify({
        enabled: true,
        method: 'browser-fallback',
        timestamp: Date.now()
      }));
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to save browser settings:', error);
    }
  }

  // Foreground listener
  setupForegroundListener() {
    if (!messaging || this.foregroundUnsubscribe) return;

    try {
      this.foregroundUnsubscribe = onMessage(messaging, (payload) => {
        if (payload.notification) this.showForegroundNotification(payload);
      });
      this.isInitialized = true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Foreground listener setup failed:', error);
    }
  }

  // Foreground notification display
  async showForegroundNotification(payload) {
    try {
      const notification = new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/icons/icon-192x192.png',
        tag: `fcm-${payload.data?.bookId || Date.now()}`,
        data: payload.data
      });

      notification.onclick = () => {
        window.focus();
        if (payload.data?.bookId) window.location.href = '/dashboard';
        notification.close();
      };

      setTimeout(() => notification.close(), 8000);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Foreground notification display failed:', error);
    }
  }

  // Get user books with notification data
  async getUserBooksWithDueDates(userId) {
    try {
      const books = await bookService.getUserBooks(userId);
      
      return books.map(book => {
        const daysRemaining = bookUtils.calculateDaysRemaining(book.dueDate);
        const currentFine = bookUtils.calculateFineSync(book.dueDate, book.finePerDay || 1);
        const statusInfo = bookUtils.getStatusInfo(daysRemaining, currentFine);
        const needsNotification = this.shouldSendNotification(daysRemaining);
        
        return {
          ...book,
          daysRemaining,
          needsNotification,
          dueDateFormatted: bookUtils.formatDate(book.dueDate),
          fine: currentFine,
          status: statusInfo
        };
      });
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error getting user books with due dates:', error);
      return [];
    }
  }

  // Determine if book needs notification
  shouldSendNotification(daysRemaining) {
    return daysRemaining === 3 || daysRemaining === 1 || daysRemaining === 0 || daysRemaining < 0;
  }

  // Main notification check function
  async checkAndSendNotifications(userId) {
    try {
      const isEnabled = await this.isEnabled(userId);
      const permission = Notification.permission;

      if (!isEnabled) {
        return { 
          success: false, 
          error: 'Notifications not enabled'
        };
      }
      
      if (permission !== 'granted') {
        return { 
          success: false, 
          error: 'Permission not granted'
        };
      }

      const books = await this.getUserBooksWithDueDates(userId);
      const booksNeedingNotification = books.filter(b => b.needsNotification);

      // Development logging
      if (import.meta.env.DEV) {
        console.log('Notification check:', {
          totalBooks: books.length,
          booksNeedingNotification: booksNeedingNotification.length,
          books: books.map(b => ({ 
            title: b.title, 
            daysRemaining: b.daysRemaining, 
            needsNotification: b.needsNotification 
          }))
        });
      }

      let sentCount = 0;
      for (const book of booksNeedingNotification) {
        try {
          const sent = await this.sendImmediateBookNotification(book);
          if (sent) sentCount++;
          
          // Add delay between notifications to prevent spam
          if (booksNeedingNotification.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error(`Failed to send notification for ${book.title}:`, error);
          }
        }
      }

      await this.updateLastCheckTime(userId);

      return {
        success: true,
        totalBooks: books.length,
        notificationsNeeded: booksNeedingNotification.length,
        notificationsSent: sentCount,
        books: booksNeedingNotification
      };
    } catch (error) {
      if (import.meta.env.DEV) console.error('Notification check failed:', error);
      return { 
        success: false, 
        error: error.message || 'Notification check failed' 
      };
    }
  }

  // Send immediate notification for a book
  async sendImmediateBookNotification(book) {
    try {
      if (!book || !book.title) {
        if (import.meta.env.DEV) console.error('Invalid book data:', book);
        return false;
      }

      const title = `📚 BookMate: ${book.title}`;
      let body = '';
      
      // Create notification message based on status
      if (book.daysRemaining < 0) {
        const daysOverdue = Math.abs(book.daysRemaining);
        body = `Overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}! Fine: ₹${book.fine || 0}`;
      } else if (book.daysRemaining === 0) {
        body = `Due today! Return to avoid fine.`;
      } else if (book.daysRemaining === 1) {
        body = `Due tomorrow! Don't forget to return.`;
      } else {
        body = `Due in ${book.daysRemaining} days. Plan your return!`;
      }

      // Mobile-first approach: Try service worker notifications first
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, {
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: `book-${book.id || 'unknown'}`,
            data: {
              bookId: book.id || null,
              bookTitle: book.title || 'Unknown Book',
              dueDate: book.dueDateFormatted || book.dueDate,
              daysRemaining: book.daysRemaining,
              fine: book.fine || 0
            },
            requireInteraction: true,
            vibrate: [200, 100, 200],
            actions: [
              {
                action: 'view',
                title: 'View Book'
              }
            ]
          });
          return true;
        } catch (swError) {
          if (import.meta.env.DEV) {
            console.error('Service worker notification failed:', swError);
          }
        }
      }

      // Fallback: Browser notification (desktop)
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          tag: `book-${book.id || 'unknown'}`
        });
        
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
        
        setTimeout(() => notification.close(), 8000);
        return true;
      }

      return false;

    } catch (error) {
      if (import.meta.env.DEV) console.error('Error sending notification:', error);
      return false;
    }
  }

  // Update last notification check time
  async updateLastCheckTime(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { lastNotificationCheck: serverTimestamp() });
    } catch {
      // Fallback to localStorage
      localStorage.setItem(`lastCheck_${userId}`, Date.now().toString());
    }
  }

  // Send test notification
  async sendTestNotification() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('📱 BookMate Test', {
          body: 'Test notification - your notifications are working!',
          icon: '/icons/icon-192x192.png',
          tag: 'test-notification'
        });
      } else {
        const notification = new Notification('📱 BookMate Test', {
          body: 'Test notification - your notifications are working!',
          icon: '/icons/icon-192x192.png',
          tag: 'test-notification'
        });
        setTimeout(() => notification.close(), 5000);
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Disable notifications
  async disableNotifications(userId) {
    try {
      // Update Firestore
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          notificationsEnabled: false,
          fcmToken: null,
          disabledAt: serverTimestamp()
        });
      } catch (firestoreError) {
        if (import.meta.env.DEV) console.warn('Firestore disable failed:', firestoreError);
      }

      // Clean up local storage
      localStorage.removeItem(`production_notifications_${userId}`);

      // Clean up listeners
      if (this.foregroundUnsubscribe) {
        this.foregroundUnsubscribe();
        this.foregroundUnsubscribe = null;
      }

      this.isInitialized = false;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get platform information
  getPlatformInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      mobile: /Mobi|Android/i.test(navigator.userAgent),
      timestamp: new Date().toISOString()
    };
  }

  // Check if notifications are supported
  isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  // Get current permission status
  getPermissionStatus() {
    return Notification.permission;
  }

  // Check if notifications are enabled for user
  async isEnabled(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data().notificationsEnabled || false;
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Firestore check failed:', error);
    }

    // Fallback to localStorage
    const settings = localStorage.getItem(`production_notifications_${userId}`);
    return settings ? JSON.parse(settings).enabled : false;
  }
}

export const productionNotificationService = new ProductionNotificationService();
export default productionNotificationService;

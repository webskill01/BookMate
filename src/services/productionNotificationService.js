// src/services/productionNotificationService.js
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
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
        // Mobile-specific FCM setup
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile && 'serviceWorker' in navigator) {
      // Register Firebase messaging service worker for mobile
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Mobile FCM SW registered:', registration);
      } catch (swError) {
        console.warn('FCM SW registration failed:', swError);
        // Continue without FCM - use browser notifications
      }
    }

      // Ensure user books are fetched (used elsewhere in notifications)
      try {
        await bookService.getUserBooks(userId);
      } catch (error) {
        if (error.code === 'unavailable' || error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
          console.warn('Firebase blocked by adblocker - using cached data');
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
        data: payload.data,
        requireInteraction: true
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

  // REPLACE getUserBooksWithDueDates in productionNotificationService.js
async getUserBooksWithDueDates(userId) {
  try {
    // Use the SAME method that works in your dashboard
    const books = await bookService.getUserBooks(userId);
    
    return books.map(book => {
      // Use IDENTICAL logic to what your UI uses - no timestamp processing!
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
    console.error('Error getting user books with due dates:', error);
    return [];
  }
}


  shouldSendNotification(daysRemaining) {
    return daysRemaining === 3 || daysRemaining === 1 || daysRemaining === 0 || daysRemaining < 0;
  }
  

  // Manual notification check
  async checkAndSendNotifications(userId) {
    try {
      const isEnabled = await this.isEnabled(userId);
      const permission = Notification.permission;
      const isMobile = this.isMobile();

      console.log('Notification Debug:', { isEnabled, permission, isMobile, userAgent: navigator.userAgent });

      if (!isEnabled) {
        return { success: false, error: 'Notifications not enabled', debug: { isEnabled, permission, isMobile } };
      }
      if (permission !== 'granted') {
        return { success: false, error: 'Permission not granted', debug: { isEnabled, permission, isMobile } };
      }

      const books = await this.getUserBooksWithDueDates(userId);
      const booksNeedingNotification = books.filter(b => b.needsNotification);
      console.log('🔍 MOBILE DEBUG:', {
  totalBooks: books.length,
  booksNeedingNotification: booksNeedingNotification.length,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  userAgent: navigator.userAgent,
  isMobile: this.isMobile(),
  books: books.map(b => ({
    title: b.title,
    dueDate: b.dueDateFormatted,
    daysRemaining: b.daysRemaining,
    needsNotification: b.needsNotification
  }))
});

      if (import.meta.env.DEV) {
        console.log('🔍 Books analysis:', {
          totalBooks: books.length,
          booksNeedingNotification: booksNeedingNotification.length,
          books: books.map(b => ({ title: b.title, daysRemaining: b.daysRemaining, needsNotification: b.needsNotification, dueDate: b.dueDateFormatted }))
        });
      }

      let sentCount = 0;
      for (const book of booksNeedingNotification) {
        try {
          await this.sendImmediateBookNotification(book);
          sentCount++;
          if (booksNeedingNotification.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        } catch (error) {
          if (import.meta.env.DEV) console.error(`Failed to send notification for ${book.title}:`, error);
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
      return { success: false, error: error.message || 'Manual check failed' };
    }
  }

  
async sendImmediateBookNotification(book) {
  try {
    if (!book || !book.title) {
      console.error('Invalid book data:', book);
      return false;
    }

    const title = `📚 BookMate: ${book.title}`;
    let body = '';
    
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

    // DESKTOP: Browser notification (limited features)
    if ('Notification' in window && Notification.permission === 'granted') {
      console.log('Creating browser notification:', title);
      const notification = new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        tag: `book-${book.id || 'unknown'}`
        // NO actions, requireInteraction, or badge for browser notifications!
      });
      
      // Manual click handler for desktop
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      // Auto close after 8 seconds
      setTimeout(() => notification.close(), 8000);
      return true;
    }

    // MOBILE: Service Worker notification (full features)
    if ('serviceWorker' in navigator) {
      console.log('Creating service worker notification:', title);
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
        actions: [
          {
            action: 'view',
            title: 'View Book'
          }
        ]
      });
      return true;
    }

    console.warn('No notification method available');
    return false;

  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}


  async updateLastCheckTime(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { lastNotificationCheck: serverTimestamp() });
    } catch {
      localStorage.setItem(`lastCheck_${userId}`, Date.now().toString());
    }
  }

  async sendTestNotification() {
    try {
      const notification = new Notification('🏭 BookMate Production', {
        body: "Production notifications are active! You'll get reminders for due books.",
        icon: '/icons/icon-192x192.png',
        tag: 'production-test'
      });
      setTimeout(() => notification.close(), 5000);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async disableNotifications(userId) {
    try {
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

      localStorage.removeItem(`production_notifications_${userId}`);

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

  isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  getPermissionStatus() {
    return Notification.permission;
  }

  async isEnabled(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        return userDoc.data().notificationsEnabled || false;
      }
    } catch {
      if (import.meta.env.DEV) console.warn('Firestore check failed, using localStorage');
    }

    const settings = localStorage.getItem(`production_notifications_${userId}`);
    return settings ? JSON.parse(settings).enabled : false;
  }
}

export const productionNotificationService = new ProductionNotificationService();
export default productionNotificationService;

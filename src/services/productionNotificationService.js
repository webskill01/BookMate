// src/services/productionNotificationService.js
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { messaging, db } from '../config/firebase';
import { bookUtils } from '../utils/bookUtils'; // Import your fixed bookUtils

class ProductionNotificationService {
  constructor() {
    this.foregroundUnsubscribe = null;
    this.isInitialized = false;
  }

  // Request notification permission and setup FCM
  async requestPermission(userId) {
    try {
      // Request browser permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return {
          success: false,
          error: 'Please enable notifications in browser settings.'
        };
      }

      // Wait for Firebase messaging to be ready
      let retryCount = 0;
      while (!messaging && retryCount < 8) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retryCount++;
      }

      if (!messaging) {
        // Fallback to browser notifications
        await this.saveBrowserNotificationSettings(userId);
        return {
          success: true,
          method: 'browser-fallback',
          message: 'Browser notifications enabled! Works when app is open.'
        };
      }

      // Get FCM token
      try {
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          throw new Error('VAPID key not configured');
        }

        const fcmToken = await getToken(messaging, { vapidKey });
        
        if (fcmToken) {
          // Save FCM settings
          await this.saveFCMSettings(userId, fcmToken);
          this.setupForegroundListener();
          
          return {
            success: true,
            method: 'fcm-production',
            message: 'FCM notifications enabled! Works even when app is closed.'
          };
        }
      } catch (fcmError) {
        // Fallback to browser notifications
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

  // Save FCM settings to Firestore
  async saveFCMSettings(userId, fcmToken) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        fcmToken: fcmToken,
        notificationsEnabled: true,
        notificationMethod: 'fcm-production',
        tokenUpdatedAt: serverTimestamp(),
        platform: this.getPlatformInfo()
      }, { merge: true });

      // Store in localStorage for quick access
      localStorage.setItem(`production_notifications_${userId}`, JSON.stringify({
        enabled: true,
        method: 'fcm-production',
        token: fcmToken,
        timestamp: Date.now()
      }));

    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to save FCM settings:', error);
      }
      throw error;
    }
  }

  // Save browser notification settings
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
      if (import.meta.env.DEV) {
        console.error('Failed to save browser settings:', error);
      }
      // Continue anyway - localStorage backup
    }
  }

  // Setup foreground message listener
  setupForegroundListener() {
    if (!messaging || this.foregroundUnsubscribe) return;

    try {
      this.foregroundUnsubscribe = onMessage(messaging, (payload) => {
        if (payload.notification) {
          this.showForegroundNotification(payload);
        }
      });
      this.isInitialized = true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Foreground listener setup failed:', error);
      }
    }
  }

  // Show notification when app is in foreground
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
        if (payload.data?.bookId) {
          window.location.href = '/dashboard';
        }
        notification.close();
      };

      // Auto-close after 8 seconds
      setTimeout(() => notification.close(), 8000);

    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Foreground notification display failed:', error);
      }
    }
  }

  // FIXED: Get user's books for notifications using correct date calculation
  async getUserBooksWithDueDates(userId) {
    try {
      const booksRef = collection(db, 'books');
      const q = query(booksRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const books = [];

      querySnapshot.forEach((doc) => {
        const bookData = doc.data();
        
        if (bookData.dueDate && (!bookData.status || bookData.status !== 'returned')) {
          let dueDate;
          
          // Handle different date formats
          if (bookData.dueDate.toDate) {
            dueDate = bookData.dueDate.toDate();
          } else {
            dueDate = new Date(bookData.dueDate);
          }

          // USE YOUR FIXED DATE CALCULATION FROM BOOKUTILS
          const daysRemaining = bookUtils.calculateDaysRemaining(dueDate.toISOString());
          const currentFine = bookUtils.calculateFineSync(dueDate.toISOString(), bookData.finePerDay || 1);

          books.push({
            id: doc.id,
            ...bookData,
            dueDate: dueDate.toISOString(),
            dueDateFormatted: bookUtils.formatDate(dueDate.toISOString()),
            daysRemaining,
            currentFine,
            needsNotification: this.shouldSendNotification(daysRemaining)
          });
        }
      });

      return books.sort((a, b) => a.daysRemaining - b.daysRemaining);

    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching books:', error);
      }
      return [];
    }
  }

  // FIXED: Check if notification should be sent (more comprehensive)
  shouldSendNotification(daysRemaining) {
    // Send notifications for:
    // - 3 days before due
    // - 1 day before due  
    // - Day of due date (0 days)
    // - Every day when overdue (negative days)
    return daysRemaining === 3 || daysRemaining === 1 || daysRemaining === 0 || daysRemaining < 0;
  }

  // Manual check for immediate testing
  async checkAndSendNotifications(userId) {
    try {
      const books = await this.getUserBooksWithDueDates(userId);
      const booksNeedingNotification = books.filter(book => book.needsNotification);

      if (import.meta.env.DEV) {
        console.log('🔍 Books analysis:', {
          totalBooks: books.length,
          booksNeedingNotification: booksNeedingNotification.length,
          books: books.map(b => ({
            title: b.title,
            daysRemaining: b.daysRemaining,
            needsNotification: b.needsNotification,
            dueDate: b.dueDateFormatted
          }))
        });
      }

      let sentCount = 0;

      // Send notifications
      for (const book of booksNeedingNotification) {
        try {
          await this.sendImmediateBookNotification(book);
          sentCount++;
          
          // Delay between notifications
          if (booksNeedingNotification.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error(`Failed to send notification for ${book.title}:`, error);
          }
        }
      }

      // Update last check time
      await this.updateLastCheckTime(userId);

      return {
        success: true,
        totalBooks: books.length,
        notificationsNeeded: booksNeedingNotification.length,
        notificationsSent: sentCount,
        books: booksNeedingNotification
      };

    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Manual check failed' 
      };
    }
  }

  // IMPROVED: Send immediate notification for a book with better messages
  async sendImmediateBookNotification(book) {
    const daysRemaining = book.daysRemaining;
    let title, body;

    if (daysRemaining === 0) {
      title = '⏰ BookMate - Due Today!';
      body = `"${book.title}" is due TODAY (${book.dueDateFormatted}). Return now to avoid fines!`;
    } else if (daysRemaining === 1) {
      title = '📚 BookMate - Due Tomorrow';
      body = `"${book.title}" is due TOMORROW (${book.dueDateFormatted}). Don't forget to return it!`;
    } else if (daysRemaining > 1) {
      title = '📚 BookMate - Due Soon';
      body = `"${book.title}" is due in ${daysRemaining} days (${book.dueDateFormatted})`;
    } else {
      const daysOverdue = Math.abs(daysRemaining);
      title = '🚨 BookMate - OVERDUE!';
      body = `"${book.title}" is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue! Fine: ₹${book.currentFine}. Return immediately!`;
    }

    // Send notification
    const notification = new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      tag: `production-${book.id}`,
      data: { bookId: book.id },
      requireInteraction: daysRemaining <= 0,
      silent: false
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = '/dashboard';
      notification.close();
    };

    // Auto-close based on urgency
    const autoCloseTime = daysRemaining < 0 ? 15000 : 10000;
    setTimeout(() => notification.close(), autoCloseTime);
  }

  // Update last check time
  async updateLastCheckTime(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        lastNotificationCheck: serverTimestamp()
      });
    } catch (error) {
      // Use localStorage as fallback
      localStorage.setItem(`lastCheck_${userId}`, Date.now().toString());
    }
  }

  // Send test notification
  async sendTestNotification() {
    try {
      const notification = new Notification('🏭 BookMate Production', {
        body: 'Production notifications are active! You\'ll get reminders for due books.',
        icon: '/icons/icon-192x192.png',
        tag: 'production-test'
      });

      setTimeout(() => notification.close(), 5000);
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
        if (import.meta.env.DEV) {
          console.warn('Firestore disable failed:', firestoreError);
        }
      }

      // Remove from localStorage
      localStorage.removeItem(`production_notifications_${userId}`);

      // Remove foreground listener
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

  // Get platform info for analytics
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

  // Utility methods
  isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  getPermissionStatus() {
    return Notification.permission;
  }

  // Check if user has notifications enabled
  async isEnabled(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data().notificationsEnabled || false;
      }
    } catch (error) {
      // Silent fallback to localStorage
      if (import.meta.env.DEV) {
        console.warn('Firestore check failed, using localStorage');
      }
    }

    // Fallback to localStorage
    const settings = localStorage.getItem(`production_notifications_${userId}`);
    return settings ? JSON.parse(settings).enabled : false;
  }
}

export const productionNotificationService = new ProductionNotificationService();
export default productionNotificationService;

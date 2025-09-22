// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Messaging
export let messaging = null;

const initializeMessaging = async () => {
  try {
    const supported = await isSupported();
    
    if (supported && 'serviceWorker' in navigator) {
      // Register the FCM service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope'
      });
      
      if (import.meta.env.DEV) {
        console.log('Firebase messaging service worker registered:', registration.scope);
      }
      
      // Initialize messaging
      messaging = getMessaging(app);
      
      if (import.meta.env.DEV) {
        console.log('Firebase messaging initialized successfully');
      }
    }
  } catch (error) {
    // Silent fail in production
    if (import.meta.env.DEV) {
      console.error('Firebase messaging initialization failed:', error);
    }
  }
};

// Initialize messaging
initializeMessaging();

export default app;

// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

// Firebase configuration with validation
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate configuration
const validateConfig = () => {
  const requiredFields = [
    'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'
  ];
  
  const missingFields = requiredFields.filter(field => !firebaseConfig[field]);
  
  if (missingFields.length > 0) {
    console.error('❌ Missing Firebase configuration:', missingFields);
    console.error('🔧 Make sure your .env file contains all required VITE_FIREBASE_* variables');
    throw new Error(`Missing Firebase config: ${missingFields.join(', ')}`);
  }
  
  console.log('✅ Firebase configuration loaded successfully');
};

// Validate and initialize
validateConfig();

let app;
let auth;
let db;
let messaging = null;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase Authentication
  auth = getAuth(app);
  
  // Initialize Firestore
  db = getFirestore(app);
  
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw error;
}

// Initialize Firebase Messaging (optional)
const initializeMessaging = async () => {
  try {
    const supported = await isSupported();
    if (supported && 'serviceWorker' in navigator) {
      // Register the FCM service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope'
      });
      
      if (import.meta.env.DEV) {
        console.log('✅ Firebase messaging service worker registered:', registration.scope);
      }
      
      // Initialize messaging
      messaging = getMessaging(app);
      
      if (import.meta.env.DEV) {
        console.log('✅ Firebase messaging initialized successfully');
      }
    }
  } catch (error) {
    // Silent fail in production
    if (import.meta.env.DEV) {
      console.warn('⚠️ Firebase messaging initialization failed:', error.message);
    }
  }
};

// Initialize messaging
initializeMessaging();

// Export initialized services
export { auth, db, messaging };
export default app;

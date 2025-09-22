// public/firebase-messaging-sw-template.js - SECURE TEMPLATE
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__"
};

const hasValidConfig = Object.values(firebaseConfig).every(value => 
  value && !value.startsWith('__')
);

if (hasValidConfig) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  
  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || 'BookMate';
    const notificationOptions = {
      body: payload.notification?.body || 'Book reminder',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: payload.data?.bookId || 'bookmate-notification'
    };
    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
console.log('Firebase messaging service worker ready');

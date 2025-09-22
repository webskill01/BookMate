// scripts/build-sw.js - FIXED VERSION

import fs from 'fs';
import path from 'path';
import { loadEnv } from 'vite';

try {
  console.log('🔧 Building secure service workers...');
  
  // Load environment variables for production
  const env = loadEnv('production', process.cwd(), '');
  
  // Validate required environment variables
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN', 
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];
  
  const missingVars = requiredVars.filter(varName => !env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️ Missing environment variables:', missingVars.join(', '));
    console.warn('⚠️ Service workers will be built without Firebase config');
  }

  // Build Firebase messaging service worker - FIXED PATH
  const firebaseSWTemplatePath = 'public/firebase-messaging-sw-template.js';
  const firebaseSWOutputPath = 'public/firebase-messaging-sw.js'; // This was missing!
  
  if (fs.existsSync(firebaseSWTemplatePath)) {
    let firebaseSWContent = fs.readFileSync(firebaseSWTemplatePath, 'utf8');
    
    // Replace Firebase config placeholders
    if (env.VITE_FIREBASE_API_KEY) {
      firebaseSWContent = firebaseSWContent
        .replace(/__FIREBASE_API_KEY__/g, env.VITE_FIREBASE_API_KEY)
        .replace(/__FIREBASE_AUTH_DOMAIN__/g, env.VITE_FIREBASE_AUTH_DOMAIN || '')
        .replace(/__FIREBASE_PROJECT_ID__/g, env.VITE_FIREBASE_PROJECT_ID || '')
        .replace(/__FIREBASE_STORAGE_BUCKET__/g, env.VITE_FIREBASE_STORAGE_BUCKET || '')
        .replace(/__FIREBASE_MESSAGING_SENDER_ID__/g, env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
        .replace(/__FIREBASE_APP_ID__/g, env.VITE_FIREBASE_APP_ID || '');
    }
    
    fs.writeFileSync(firebaseSWOutputPath, firebaseSWContent);
    console.log('✅ Firebase messaging service worker built:', firebaseSWOutputPath);
  } else {
    console.warn('⚠️ Firebase messaging SW template not found');
  }

  // Build main service worker (existing code)
  const swTemplatePath = 'public/sw-template.js';
  const swOutputPath = 'public/sw.js';
  
  if (fs.existsSync(swTemplatePath)) {
    let swContent = fs.readFileSync(swTemplatePath, 'utf8');
    
    if (env.VITE_FIREBASE_API_KEY) {
      swContent = swContent
        .replace(/__FIREBASE_API_KEY__/g, env.VITE_FIREBASE_API_KEY)
        .replace(/__FIREBASE_AUTH_DOMAIN__/g, env.VITE_FIREBASE_AUTH_DOMAIN || '')
        .replace(/__FIREBASE_PROJECT_ID__/g, env.VITE_FIREBASE_PROJECT_ID || '')
        .replace(/__FIREBASE_STORAGE_BUCKET__/g, env.VITE_FIREBASE_STORAGE_BUCKET || '')
        .replace(/__FIREBASE_MESSAGING_SENDER_ID__/g, env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
        .replace(/__FIREBASE_APP_ID__/g, env.VITE_FIREBASE_APP_ID || '');
    }
    
    fs.writeFileSync(swOutputPath, swContent);
    console.log('✅ Main service worker built:', swOutputPath);
  }
  
  // Build summary
  console.log('📊 Build summary:');
  console.log(`  🔑 API Key: ${env.VITE_FIREBASE_API_KEY ? `***${env.VITE_FIREBASE_API_KEY.slice(-4)}` : 'MISSING'}`);
  console.log(`  🏗️ Project ID: ${env.VITE_FIREBASE_PROJECT_ID || 'MISSING'}`);
  console.log(`  📨 Messaging: ${env.VITE_FIREBASE_MESSAGING_SENDER_ID ? 'CONFIGURED' : 'MISSING'}`);
  
  console.log('✅ Service workers built successfully!');
  
} catch (error) {
  console.error('❌ Service worker build failed:', error.message);
  process.exit(1);
}

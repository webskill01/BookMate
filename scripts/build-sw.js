// scripts/build-sw.js - SECURE BUILD SCRIPT

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

  // Build main service worker
  const swTemplatePath = 'public/sw-template.js';
  const swOutputPath = 'public/sw.js';
  
  if (!fs.existsSync(swTemplatePath)) {
    throw new Error(`Template file not found at: ${swTemplatePath}`);
  }

  const swTemplate = fs.readFileSync(swTemplatePath, 'utf8');
  
  // Replace placeholders with environment variables or empty strings
  let swContent = swTemplate
    .replace(/__FIREBASE_API_KEY__/g, env.VITE_FIREBASE_API_KEY || '')
    .replace(/__FIREBASE_AUTH_DOMAIN__/g, env.VITE_FIREBASE_AUTH_DOMAIN || '')
    .replace(/__FIREBASE_PROJECT_ID__/g, env.VITE_FIREBASE_PROJECT_ID || '')
    .replace(/__FIREBASE_STORAGE_BUCKET__/g, env.VITE_FIREBASE_STORAGE_BUCKET || '')
    .replace(/__FIREBASE_MESSAGING_SENDER_ID__/g, env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
    .replace(/__FIREBASE_APP_ID__/g, env.VITE_FIREBASE_APP_ID || '')
    .replace(/__BUILD_TIME__/g, new Date().toISOString())
    .replace(/__CACHE_VERSION__/g, `v${Date.now()}`)
    .replace(/__VERSION__/g, process.env.npm_package_version || '1.0.0');

  fs.writeFileSync(swOutputPath, swContent, 'utf8');
  console.log('✅ Main service worker built:', swOutputPath);

  // Build Firebase messaging service worker
  const fcmTemplatePath = 'public/firebase-messaging-sw.js';
  
  if (fs.existsSync(fcmTemplatePath)) {
    const fcmTemplate = fs.readFileSync(fcmTemplatePath, 'utf8');
    
    // Only replace if it contains placeholders (template format)
    if (fcmTemplate.includes('__FIREBASE_API_KEY__')) {
      let fcmContent = fcmTemplate
        .replace(/__FIREBASE_API_KEY__/g, env.VITE_FIREBASE_API_KEY || '')
        .replace(/__FIREBASE_AUTH_DOMAIN__/g, env.VITE_FIREBASE_AUTH_DOMAIN || '')
        .replace(/__FIREBASE_PROJECT_ID__/g, env.VITE_FIREBASE_PROJECT_ID || '')
        .replace(/__FIREBASE_STORAGE_BUCKET__/g, env.VITE_FIREBASE_STORAGE_BUCKET || '')
        .replace(/__FIREBASE_MESSAGING_SENDER_ID__/g, env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
        .replace(/__FIREBASE_APP_ID__/g, env.VITE_FIREBASE_APP_ID || '');

      fs.writeFileSync(fcmTemplatePath, fcmContent, 'utf8');
      console.log('✅ Firebase messaging service worker updated');
    } else {
      console.log('ℹ️ Firebase messaging service worker already processed');
    }
  }

  // Log status (without exposing keys)
  console.log('📊 Build summary:');
  console.log('  🔑 API Key:', env.VITE_FIREBASE_API_KEY ? '***' + env.VITE_FIREBASE_API_KEY.slice(-4) : 'NOT SET');
  console.log('  🏗️ Project ID:', env.VITE_FIREBASE_PROJECT_ID || 'NOT SET');
  console.log('  📨 Messaging:', env.VITE_FIREBASE_MESSAGING_SENDER_ID ? 'CONFIGURED' : 'NOT SET');
  console.log('✅ Service workers built successfully!');

} catch (error) {
  console.error('❌ Failed to build service workers:', error.message);
  console.error('💡 Make sure:');
  console.error('   - public/sw-template.js exists');
  console.error('   - Environment variables are set in .env');
  console.error('   - You have write permissions');
  process.exit(1);
}

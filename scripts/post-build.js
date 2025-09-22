// scripts/post-build.js
import { copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, '../public');
const distDir = join(__dirname, '../dist');

// Files to copy to dist
const filesToCopy = [
  'sw.js',
  'firebase-messaging-sw.js',
  'manifest.json',
  'offline.html'
];

try {
  filesToCopy.forEach(file => {
    const srcPath = join(publicDir, file);
    const destPath = join(distDir, file);
    
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, destPath);
      console.log(`✅ Copied ${file} to dist`);
    } else {
      console.warn(`⚠️  File not found: ${file}`);
    }
  });
  
  console.log('🎉 Post-build completed successfully!');
} catch (error) {
  console.error('❌ Post-build failed:', error.message);
  process.exit(1);
}

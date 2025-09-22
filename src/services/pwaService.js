// src/services/pwaService.js
class PWAService {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.registration = null;
  }

  // Register service worker
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      
      if (import.meta.env.DEV) {
        console.log('PWA Service worker registered:', this.registration);
      }
      
      // Listen for updates
      this.handleServiceWorkerUpdates();
      
      return this.registration;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Service worker registration failed:', error);
      }
      return null;
    }
  }

  // Handle service worker updates
  handleServiceWorkerUpdates() {
    if (!this.registration) return;

    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration.installing;
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content available, could show update notification
            if (import.meta.env.DEV) {
              console.log('New content available, refresh to update');
            }
          }
        });
      }
    });
  }

  // Setup install prompt
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      
      if (import.meta.env.DEV) {
        console.log('PWA Install prompt available');
      }
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      
      if (import.meta.env.DEV) {
        console.log('PWA App installed');
      }
    });
  }

  // Show install prompt
  async showInstallPrompt() {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (import.meta.env.DEV) {
        console.log('PWA Install prompt outcome:', outcome);
      }
      
      this.deferredPrompt = null;
      return outcome === 'accepted';
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Install prompt failed:', error);
      }
      return false;
    }
  }

  // Check if app can be installed
  canInstall() {
    return !!this.deferredPrompt;
  }

  // Check if app is installed
  isAppInstalled() {
    return this.isInstalled ||
           window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // Check for updates
  async checkForUpdates() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Update check failed:', error);
      }
    }
  }

  // Get installation status
  getInstallationStatus() {
    return {
      canInstall: this.canInstall(),
      isInstalled: this.isAppInstalled(),
      hasServiceWorker: !!this.registration,
      isOnline: navigator.onLine
    };
  }
}

export const pwaService = new PWAService();
export default pwaService;

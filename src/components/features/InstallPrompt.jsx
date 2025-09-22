// src/components/InstallPrompt.jsx - Fixed
import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { pwaService } from '../../services/pwaService';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Check if we can show install prompt
    const checkInstallable = () => {
      if (pwaService.canInstall() && !pwaService.isAppInstalled()) {
        // Show prompt after a delay
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    // Setup PWA service
    pwaService.setupInstallPrompt();
    checkInstallable();

    // Listen for install prompt availability
    const handleBeforeInstallPrompt = () => {
      if (!pwaService.isAppInstalled()) {
        setTimeout(() => setShowPrompt(true), 1000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    
    try {
      const installed = await pwaService.showInstallPrompt();
      if (installed) {
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Install failed:', error);
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('installPromptDismissed', 'true');
  };

  // Don't show if already dismissed this session
  if (sessionStorage.getItem('installPromptDismissed')) {
    return null;
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-accent-primary text-white p-4 rounded-lg shadow-lg z-50 max-w-sm mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Download className="w-5 h-5 mr-2" />
          <div>
            <p className="font-semibold text-sm">Install BookMate</p>
            <p className="text-xs opacity-90">Get quick access to your library books</p>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="text-white/80 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleInstall}
          disabled={installing}
          className="bg-white text-accent-primary px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
        >
          {installing ? 'Installing...' : 'Install'}
        </button>
        
        <button
          onClick={handleDismiss}
          className="text-white/80 hover:text-white px-3 py-1 text-sm"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;

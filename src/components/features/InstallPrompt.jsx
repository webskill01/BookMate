// src/components/features/InstallPrompt.jsx - ENHANCED VERSION
import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Zap, Bell, Shield, ArrowRight, IndianRupee } from 'lucide-react';
import { pwaService } from '../../services/pwaService';
import { useTheme } from '../../contexts/ThemeContext';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const { isDark } = useTheme();

  // Benefits to show users
  const benefits = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Instant access to your library books'
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description: 'Never miss a due date again'
    },
    {
      icon: IndianRupee,
      title: 'Track Fine',
      description: 'Keep Track Of Your Overdue Books And Fine'
    }
  ];

  useEffect(() => {
    let stepInterval;
    
    if (showPrompt) {
      setIsVisible(true);
      // Cycle through benefits every 3 seconds
      stepInterval = setInterval(() => {
        setCurrentStep(prev => (prev + 1) % benefits.length);
      }, 3000);
    }

    return () => {
      if (stepInterval) clearInterval(stepInterval);
    };
  }, [showPrompt, benefits.length]);

  useEffect(() => {
    // Check if we should show install prompt
    const checkInstallable = () => {
      // Don't show if already dismissed permanently
      const permanentlyDismissed = localStorage.getItem('installPromptPermanentlyDismissed');
      const sessionDismissed = sessionStorage.getItem('installPromptDismissed');
      
      if (permanentlyDismissed || sessionDismissed) {
        return;
      }

      if (pwaService.canInstall() && !pwaService.isAppInstalled()) {
        // Show prompt after user has interacted with app for 30 seconds
        setTimeout(() => {
          // Only show if user is still active
          if (document.hasFocus()) {
            setShowPrompt(true);
          }
        }, 30000);
      }
    };

    // Setup PWA service
    pwaService.setupInstallPrompt();
    checkInstallable();

    // Listen for install prompt availability
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      if (!pwaService.isAppInstalled() && !localStorage.getItem('installPromptPermanentlyDismissed')) {
        // Show prompt after user has used the app a bit
        setTimeout(() => setShowPrompt(true), 15000);
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
        setIsVisible(false);
        // Show success message briefly
        setTimeout(() => {
          // Could show a success toast here
        }, 500);
      }
    } catch (error) {
      console.error('Install failed:', error);
      // Could show error toast here
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = (permanent = false) => {
    setIsVisible(false);
    setTimeout(() => {
      setShowPrompt(false);
    }, 300); // Match animation duration

    if (permanent) {
      localStorage.setItem('installPromptPermanentlyDismissed', 'true');
    } else {
      sessionStorage.setItem('installPromptDismissed', 'true');
    }
  };

  const handleMaybeLater = () => {
    handleDismiss(false);
  };

  const handleNotInterested = () => {
    handleDismiss(true);
  };

  // Don't render if not showing
  if (!showPrompt) {
    return null;
  }

  const currentBenefit = benefits[currentStep];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => handleDismiss(false)}
      />
      
      {/* Install Prompt */}
      <div 
        className={`fixed inset-x-4 bottom-4 z-50 transition-all duration-300 ease-out ${
          isVisible 
            ? 'translate-y-0 opacity-100 scale-100' 
            : 'translate-y-full opacity-0 scale-95'
        }`}
      >
        <div className={`relative max-w-sm mx-auto rounded-xl shadow-2xl border backdrop-blur-md overflow-hidden ${
          isDark 
            ? 'bg-gray-900/95 border-gray-700 text-white' 
            : 'bg-white/95 border-gray-200 text-gray-900'
        }`}>
          
          {/* Close Button */}
          <button
            onClick={() => handleDismiss(false)}
            className={`absolute top-3 right-3 z-10 p-1.5 rounded-full transition-colors ${
              isDark 
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
            aria-label="Close install prompt"
          >
            <X className="w-4 h-4" />
          </button>

          {/* App Icon & Header */}
          <div className="p-6 pb-4">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl shadow-lg">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Install BookMate</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Add to your home screen
                </p>
              </div>
            </div>

            {/* Animated Benefits */}
            <div className="h-16 overflow-hidden">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentStep * 100}%)` }}
              >
                {benefits.map((benefit, index) => (
                  <div key={index} className="w-full flex-shrink-0 flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isDark ? 'bg-gray-800' : 'bg-gray-50'
                    }`}>
                      <benefit.icon className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{benefit.title}</h4>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center space-x-1.5">
              {benefits.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'bg-green-500 scale-110'
                      : isDark 
                        ? 'bg-gray-700' 
                        : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 pt-0 space-y-3">
            <button
              onClick={handleInstall}
              disabled={installing}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center space-x-2 hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {installing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Installing...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Install App</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex space-x-2">
              <button
                onClick={handleMaybeLater}
                className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-lg transition-colors ${
                  isDark
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Maybe Later
              </button>
              <button
                onClick={handleNotInterested}
                className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-lg transition-colors ${
                  isDark
                    ? 'text-gray-500 hover:text-gray-400 hover:bg-gray-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Not Interested
              </button>
            </div>
          </div>

          {/* Bottom Accent */}
          <div className="h-1 bg-gradient-to-r from-green-500 to-green-600" />
        </div>
      </div>
    </>
  );
};

export default InstallPrompt;

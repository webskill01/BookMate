// src/App.jsx - ADD THIS
import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppRoutes from "./components/layout/AppRoutes";
import InstallPrompt from "./components/features/InstallPrompt";
import { pwaService } from "./services/pwaService";
import { useAuth } from "./contexts/AuthContext";
import { productionNotificationService } from "./services/productionNotificationService";

// Auto-check component
const AutoNotificationCheck = () => {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const checkAndNotify = async () => {
      try {
        // Check if notifications are enabled
        const isEnabled = await productionNotificationService.isEnabled(currentUser.uid);
        
        if (isEnabled && Notification.permission === 'granted') {
          // Check for books due soon - but only once per session
          const lastCheck = sessionStorage.getItem(`notification_check_${currentUser.uid}`);
          const now = Date.now();
          
          // Only check once per session or every 6 hours
          if (!lastCheck || (now - parseInt(lastCheck)) > 6 * 60 * 60 * 1000) {
            await productionNotificationService.checkAndSendNotifications(currentUser.uid);
            sessionStorage.setItem(`notification_check_${currentUser.uid}`, now.toString());
          }
        }
      } catch (error) {
        // Silent fail
      }
    };

    // Check after 2 seconds to let the app load
    setTimeout(checkAndNotify, 2000);
  }, [currentUser]);

  return null; // This component doesn't render anything
};

function App() {
  useEffect(() => {
    const initializePWA = async () => {
      try {
        if (pwaService && typeof pwaService.registerServiceWorker === "function") {
          await pwaService.registerServiceWorker();
          pwaService.setupInstallPrompt();
        }
      } catch (error) {
        // Silent error handling
      }
    };
    initializePWA();
  }, []);

  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-theme-bg">
            <AppRoutes />
            <InstallPrompt />
            <AutoNotificationCheck />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;

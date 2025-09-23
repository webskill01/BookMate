// src/contexts/ThemeContext.jsx - FIXED VERSION
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Initialize theme - DEFAULT TO LIGHT MODE
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bookmate-theme');
      return saved || 'light'; // Default to light mode
    }
    return 'light';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  // Set up system preference listener
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);

    const handleChange = (e) => setSystemPrefersDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('dark', 'light');
    
    // Apply theme based on setting
    if (theme === 'system') {
      root.classList.add(systemPrefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }
    
    // Save to localStorage
    localStorage.setItem('bookmate-theme', theme);
    
  }, [theme, systemPrefersDark]);

  // Helper getters for backwards compatibility
  const isDark = theme === 'system' ? systemPrefersDark : theme === 'dark';
  
  // Legacy toggle function for backwards compatibility
  const toggleTheme = () => {
    setTheme(current => current === 'dark' ? 'light' : 'dark');
  };

  const value = {
    // New API
    theme,
    setTheme,
    isDark,
    systemPrefersDark,
    
    // Legacy API for backwards compatibility
    setIsDark: (isDarkValue) => setTheme(isDarkValue ? 'dark' : 'light'),
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

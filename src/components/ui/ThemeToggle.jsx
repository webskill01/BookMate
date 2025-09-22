// src/components/ui/ThemeToggle.jsx
import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

const ThemeToggle = ({ className = '', size = 'default' }) => {
  const { isDark, toggleTheme } = useTheme()

  const sizeClasses = {
    default: 'w-12 h-12',
    compact: 'w-10 h-10',
    large: 'w-14 h-14'
  }

  const iconSizes = {
    default: 'w-5 h-5',
    compact: 'w-4 h-4',
    large: 'w-6 h-6'
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex items-center justify-center
        ${sizeClasses[size]}
        rounded-xl
        bg-dark-card border border-dark-border
        hover:bg-opacity-80 transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-accent-primary
        ${className}
      `}
      style={{
        background: isDark 
          ? 'rgba(30, 30, 30, 0.8)' 
          : 'rgba(248, 249, 250, 0.8)',
        borderColor: isDark 
          ? 'var(--color-dark-border)' 
          : 'var(--color-light-border)'
      }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Background gradient for active state */}
      <div className={`
        absolute inset-0 rounded-xl transition-opacity duration-200
        ${isDark ? 'bg-gradient-to-r from-blue-600 to-purple-600 opacity-10' : 'bg-gradient-to-r from-yellow-400 to-orange-500 opacity-10'}
      `} />
      
      {/* Icon container */}
      <div className="relative z-10 flex items-center justify-center">
        {isDark ? (
          <Moon className={`${iconSizes[size]} text-blue-400 transition-all duration-200`} />
        ) : (
          <Sun className={`${iconSizes[size]} text-yellow-500 transition-all duration-200`} />
        )}
      </div>
    </button>
  )
}

export default ThemeToggle

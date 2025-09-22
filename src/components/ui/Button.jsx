// src/components/ui/Button.jsx - Optimized Version
import React from 'react'
import { Loader2 } from 'lucide-react'

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'default', 
  loading = false, 
  disabled = false,
  icon: Icon,
  className = '',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-heading font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'hover:bg-theme-card text-theme-primary'
  }
  
  const sizes = {
    sm: 'px-4 py-2 text-mobile-sm min-h-[36px]',
    default: 'px-6 py-3 text-mobile-base min-h-[44px]',
    lg: 'px-8 py-4 text-mobile-lg min-h-[48px]'
  }

  // Pre-calculate classes to avoid reflows
  const buttonClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`.trim()

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      // Prevent layout calculations during interactions
      style={{ willChange: loading ? 'transform' : 'auto' }}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          {children}
        </>
      ) : Icon ? (
        <>
          <Icon className="w-5 h-5 mr-2" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  )
}

export default Button

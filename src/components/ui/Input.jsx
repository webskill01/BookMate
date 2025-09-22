// src/components/ui/Input.jsx
import React, { forwardRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const Input = forwardRef(({ 
  type = 'text', 
  label, 
  error, 
  icon: Icon,
  showPasswordToggle = false,
  className = '',
  helperText,
  ...props 
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false)
  const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-theme-primary font-medium mb-2 text-mobile-sm">
          {label}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
            <Icon className="w-5 h-5 text-theme-muted" />
          </div>
        )}
        
        <input
          ref={ref}
          type={inputType}
          className={`
            input-field
            ${Icon ? 'pl-12' : ''}
            ${showPasswordToggle ? 'pr-12' : ''}
            ${error ? 'border-status-danger focus:ring-status-danger/20' : ''}
          `}
          {...props}
        />
        
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10 p-1 rounded hover:bg-theme-card transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5 text-theme-muted" />
            ) : (
              <Eye className="w-5 h-5 text-theme-muted" />
            )}
          </button>
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-mobile-sm text-status-danger flex items-center">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-2 text-mobile-sm text-theme-muted">
          {helperText}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'
export default Input

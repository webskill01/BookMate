// src/components/ui/Alert.jsx
import React from 'react'
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'

const Alert = ({ type = 'info', title, message, onClose, className = '' }) => {
  const types = {
    error: {
      bg: 'bg-status-danger/10',
      border: 'border-status-danger/30',
      text: 'text-status-danger',
      icon: AlertCircle
    },
    success: {
      bg: 'bg-status-ontime/10',
      border: 'border-status-ontime/30',
      text: 'text-status-ontime',
      icon: CheckCircle
    },
    warning: {
      bg: 'bg-status-warning/10',
      border: 'border-status-warning/30',
      text: 'text-status-warning',
      icon: AlertCircle
    },
    info: {
      bg: 'bg-accent-primary/10',
      border: 'border-accent-primary/30',
      text: 'text-accent-primary',
      icon: Info
    }
  }

  const { bg, border, text, icon: Icon } = types[type]

  return (
    <div className={`
      ${bg} ${border} ${text}
      rounded-xl border p-4
      ${className}
    `}>
      <div className="flex items-start">
        <Icon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          {title && (
            <h4 className="font-heading font-semibold mb-1 text-mobile-sm">
              {title}
            </h4>
          )}
          <p className="text-mobile-sm">
            {message}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 p-1 hover:bg-black/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default Alert

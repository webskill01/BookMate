// src/components/ui/LoadingScreen.jsx
import React from 'react'
import { BookOpen } from 'lucide-react'

const LoadingScreen = () => {
  return (
    <div className="auth-layout">
      <div className="text-center">
        {/* App Logo/Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-accent-primary rounded-2xl mb-6 animate-pulse">
          <BookOpen className="w-10 h-10 text-white" />
        </div>
        
        {/* App Name */}
        <h1 className="text-mobile-2xl font-heading font-bold text-gradient mb-2">
          BookMate
        </h1>
        
        {/* Loading Message */}
        <p className="text-text-secondary text-mobile-base mb-6">
          Setting up your library...
        </p>
        
        {/* Loading Animation */}
        <div className="flex justify-center items-center space-x-2">
          <div className="w-3 h-3 bg-accent-primary rounded-full animate-bounce"></div>
          <div 
            className="w-3 h-3 bg-accent-primary rounded-full animate-bounce" 
            style={{animationDelay: '0.1s'}}
          ></div>
          <div 
            className="w-3 h-3 bg-accent-primary rounded-full animate-bounce" 
            style={{animationDelay: '0.2s'}}
          ></div>
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen

// src/components/layout/ProtectedRoute.jsx
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import LoadingScreen from '@/components/ui/LoadingScreen'

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  // Show loading while checking auth state
  if (loading) {
    return <LoadingScreen />
  }

  // Redirect to login if not authenticated
  // Save the current location they were trying to go to
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // User is authenticated, render the protected component
  return children
}

export default ProtectedRoute

// src/contexts/AuthContext.jsx - AUTO-FIXING VERSION
import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  getAuth
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const clearError = () => setError(null)

  // AUTOMATIC: Clear stale auth data
  const clearStaleAuthData = async () => {
    try {
      // Clear Firebase Auth cache
      await signOut(auth)
      
      // Clear all auth-related localStorage
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.startsWith('firebase:') ||
          key.startsWith('bookmate_') ||
          key.includes('auth') ||
          key.includes('user')
        )) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Clear sessionStorage
      const sessionKeysToRemove = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (
          key.startsWith('firebase:') ||
          key.startsWith('bookmate_') ||
          key.includes('auth')
        )) {
          sessionKeysToRemove.push(key)
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key))
      
    } catch (error) {
      // Silent fail - this is cleanup
    }
  }

  // Simple signup with clear error messages
  const signup = async (email, password, displayName) => {
    try {
      setError(null)
      setLoading(true)
      
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(result.user, { displayName })

      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        email: result.user.email,
        displayName: displayName,
        createdAt: new Date().toISOString(),
        preferences: {
          notifications: true,
          fineRate: 1
        }
      })

      return result
    } catch (error) {
      let friendlyMessage = error.message
      
      if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = 'An account with this email already exists. Please use the login page to sign in.'
      } else if (error.code === 'auth/weak-password') {
        friendlyMessage = 'Password should be at least 6 characters long.'
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.'
      } else if (error.code === 'auth/operation-not-allowed') {
        friendlyMessage = 'Email/password accounts are not enabled. Please contact support.'
      } else if (error.code === 'auth/network-request-failed') {
        friendlyMessage = 'Network error. Please check your connection and try again.'
      }

      setError(friendlyMessage)
      throw new Error(friendlyMessage)
    } finally {
      setLoading(false)
    }
  }

  // ENHANCED: Login with automatic session conflict resolution
  const login = async (email, password, retryCount = 0) => {
    try {
      setError(null)
      setLoading(true)
      
      return await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      // If it's an invalid credential error and this is the first attempt
      if (error.code === 'auth/invalid-credential' && retryCount === 0) {
        try {
          // Clear stale auth data and retry ONCE
          await clearStaleAuthData()
          // Wait a moment for cleanup to complete
          await new Promise(resolve => setTimeout(resolve, 500))
          // Retry login with same credentials
          return await signInWithEmailAndPassword(auth, email, password)
        } catch (retryError) {
          // If retry also fails, show the original error
          throw error
        }
      }

      // Handle error messages
      let friendlyMessage = error.message

      if (error.code === 'auth/invalid-credential') {
        friendlyMessage = 'Invalid email or password. Please check your credentials and try again.'
      } else if (error.code === 'auth/user-not-found') {
        friendlyMessage = 'No account found with this email address. Please create an account.'
      } else if (error.code === 'auth/wrong-password') {
        friendlyMessage = 'Incorrect password. Please try again.'
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.'
      } else if (error.code === 'auth/user-disabled') {
        friendlyMessage = 'This account has been disabled. Please contact support.'
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = 'Too many failed login attempts. Please try again later or reset your password.'
      } else if (error.code === 'auth/network-request-failed') {
        friendlyMessage = 'Network error. Please check your connection and try again.'
      }

      setError(friendlyMessage)
      throw new Error(friendlyMessage)
    } finally {
      setLoading(false)
    }
  }

  // Google sign-in with session clearing
  const loginWithGoogle = async () => {
    try {
      setError(null)
      setLoading(true)

      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      provider.setCustomParameters({
        prompt: 'select_account'
      })

      let result = null

      try {
        result = await signInWithPopup(auth, provider)
      } catch (popupError) {
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user') {
          localStorage.setItem('bookmate-google-signin', Date.now().toString())
          await signInWithRedirect(auth, provider)
          return
        } else {
          throw popupError
        }
      }

      if (result && result.user) {
        await createGoogleUserDoc(result.user)
        return result
      }

    } catch (error) {
      localStorage.removeItem('bookmate-google-signin')
      let friendlyMessage = error.message

      if (error.code === 'auth/popup-closed-by-user') {
        friendlyMessage = 'Sign-in was cancelled. Please try again.'
      } else if (error.code === 'auth/popup-blocked') {
        friendlyMessage = 'Pop-up was blocked. Please allow pop-ups for this site and try again.'
      } else if (error.code === 'auth/network-request-failed') {
        friendlyMessage = 'Network error. Please check your connection and try again.'
      } else if (error.code === 'auth/operation-not-allowed') {
        friendlyMessage = 'Google sign-in is not enabled. Please contact support.'
      } else if (error.code === 'auth/unauthorized-domain') {
        friendlyMessage = 'This domain is not authorized for Google sign-in. Please contact support.'
      } else if (error.code === 'auth/cancelled-popup-request') {
        friendlyMessage = 'Another sign-in attempt is in progress. Please try again.'
      } else {
        friendlyMessage = 'Google sign-in failed. Please try again or use email/password login.'
      }

      setError(friendlyMessage)
      setLoading(false)
      throw new Error(friendlyMessage)
    }
  }

  // Helper function to create Google user document
  const createGoogleUserDoc = async (user) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL,
          createdAt: new Date().toISOString(),
          signInMethod: 'google',
          preferences: {
            notifications: true,
            fineRate: 1
          }
        })
      }
    } catch (error) {
      console.error('Error creating user document:', error)
    }
  }

  // ENHANCED: Password reset with automatic cleanup instruction
  const resetPassword = async (email) => {
    try {
      setError(null)
      
      // Custom action code settings that include cleanup instruction
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/login?passwordReset=true`,
        handleCodeInApp: false,
      }
      
      await sendPasswordResetEmail(auth, email, actionCodeSettings)
      
      // Store a flag to help with post-reset login
      localStorage.setItem('bookmate_password_reset_pending', email)
      
    } catch (error) {
      let friendlyMessage = error.message
      
      if (error.code === 'auth/user-not-found') {
        friendlyMessage = 'No account found with this email address.'
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.'
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = 'Too many password reset requests. Please wait before trying again.'
      }

      setError(friendlyMessage)
      throw new Error(friendlyMessage)
    }
  }

  // Check if user exists
  const checkUserExists = async (email) => {
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email)
      return signInMethods.length > 0
    } catch (error) {
      if (error.code === 'auth/invalid-email') {
        return false
      }
      return true
    }
  }

  // Sign out
  const logout = async () => {
    try {
      setError(null)
      await signOut(auth)
      // Clean up any stored data on logout
      localStorage.removeItem('bookmate_password_reset_pending')
    } catch (error) {
      setError('Failed to sign out. Please try again.')
      throw error
    }
  }

  // AUTO-CLEANUP: Handle auth state changes with automatic session conflict resolution
  useEffect(() => {
    const isGoogleSignin = localStorage.getItem('bookmate-google-signin')
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Check for password reset scenario
      const passwordResetPending = localStorage.getItem('bookmate_password_reset_pending')
      if (passwordResetPending && !user) {
        // Clear stale auth data if password was recently reset
        await clearStaleAuthData()
      }
      
      setCurrentUser(user)
      
      if (isGoogleSignin) {
        localStorage.removeItem('bookmate-google-signin')
      }
      
      setLoading(false)
    })

    // Handle Google redirect result
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result && result.user) {
          localStorage.removeItem('bookmate-google-signin')
          await createGoogleUserDoc(result.user)
        } else if (isGoogleSignin) {
          localStorage.removeItem('bookmate-google-signin')
          setError('Google sign-in was cancelled or failed. Please try again.')
        }
      } catch (error) {
        localStorage.removeItem('bookmate-google-signin')
        if (error.code !== 'auth/no-redirect-result') {
          setError('Google sign-in failed. Please try again.')
        }
      }
    }

    handleRedirectResult()
    return unsubscribe
  }, [])

  const value = {
    currentUser,
    loading,
    error,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    clearError,
    checkUserExists,
    clearStaleAuthData // Export for manual use if needed
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

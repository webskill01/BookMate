// src/contexts/AuthContext.jsx - Simplified Version
import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'

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

  // Check if user exists by email
  const checkUserExists = async (email) => {
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email)
      return signInMethods.length > 0
    } catch (error) {
      if (error.code === 'auth/invalid-email') {
        return false
      }
      return true // Assume exists to be safe
    }
  }

  // Simple signup with clear error messages
  const signup = async (email, password, displayName) => {
    try {
      setError(null)
      setLoading(true)
      
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(result.user, { displayName })
      
      // Create user document in Firestore
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
      }
      
      setError(friendlyMessage)
      throw new Error(friendlyMessage)
    } finally {
      setLoading(false)
    }
  }

  // Simple login with clear error messages
  const login = async (email, password) => {
    try {
      setError(null)
      setLoading(true)
      
      return await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      let friendlyMessage = error.message
      
      if (error.code === 'auth/invalid-credential') {
        // Check if user exists to provide better message
        try {
          const userExists = await checkUserExists(email)
          if (!userExists) {
            friendlyMessage = 'No account found with this email address. Please create an account.'
          } else {
            friendlyMessage = 'Invalid email or password. Please check your credentials and try again.'
          }
        } catch (checkError) {
          friendlyMessage = 'Invalid email or password. Please check your credentials and try again.'
        }
      } else if (error.code === 'auth/user-not-found') {
        friendlyMessage = 'No account found with this email address. Please create an account.'
      } else if (error.code === 'auth/wrong-password') {
        friendlyMessage = 'Incorrect password. Please try again.'
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.'
      } else if (error.code === 'auth/user-disabled') {
        friendlyMessage = 'This account has been disabled. Please contact support.'
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = 'Too many failed attempts. Please try again later.'
      }
      
      setError(friendlyMessage)
      throw new Error(friendlyMessage)
    } finally {
      setLoading(false)
    }
  }

  // Google sign-in with proper error handling
  const loginWithGoogle = async () => {
  try {
    setError(null)
    
    // Batch state updates to prevent multiple reflows
    setLoading(true)
    
    // Store loading state efficiently
    const googleSigninKey = 'bookmate-google-signin'
    localStorage.setItem(googleSigninKey, Date.now().toString())
    
    const provider = new GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')
    provider.setCustomParameters({
      prompt: 'select_account'
    })
    
    // Use requestAnimationFrame to optimize timing
    await new Promise(resolve => requestAnimationFrame(resolve))
    
    await signInWithRedirect(auth, provider)
  } catch (error) {
    localStorage.removeItem('bookmate-google-signin')
    let friendlyMessage = error.message
    
    if (error.code === 'auth/popup-closed-by-user') {
      friendlyMessage = 'Sign-in cancelled. Please try again.'
    } else if (error.code === 'auth/network-request-failed') {
      friendlyMessage = 'Network error. Please check your connection and try again.'
    }
    
    // Batch state updates
    setError(friendlyMessage)
    setLoading(false)
    throw new Error(friendlyMessage)
  }
}

  // Password reset
  const resetPassword = async (email) => {
    try {
      setError(null)
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      let friendlyMessage = error.message
      
      if (error.code === 'auth/user-not-found') {
        friendlyMessage = 'No account found with this email address.'
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.'
      }
      
      setError(friendlyMessage)
      throw new Error(friendlyMessage)
    }
  }

  // Sign out
  const logout = async () => {
    try {
      setError(null)
      await signOut(auth)
    } catch (error) {
      setError(error.message)
      throw error
    }
  }

  // Handle auth state and Google redirect
  useEffect(() => {
    const isGoogleSignin = localStorage.getItem('bookmate-google-signin')
    if (isGoogleSignin) {
      setLoading(true)
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
          
          // Create user document if it doesn't exist
          const userDoc = await getDoc(doc(db, 'users', result.user.uid))
          if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', result.user.uid), {
              uid: result.user.uid,
              email: result.user.email,
              displayName: result.user.displayName || result.user.email.split('@')[0],
              photoURL: result.user.photoURL,
              createdAt: new Date().toISOString(),
              signInMethod: 'google',
              preferences: {
                notifications: true,
                fineRate: 1
              }
            })
          }
        } else if (isGoogleSignin) {
          localStorage.removeItem('bookmate-google-signin')
          setError('Google sign-in was cancelled or failed.')
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
    checkUserExists
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

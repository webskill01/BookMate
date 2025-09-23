// src/pages/LoginPage.jsx - ENHANCED ERROR HANDLING VERSION
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, BookMarked, ArrowRight, Sparkles, Info, Chrome } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login, loginWithGoogle, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  // Load saved email on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('bookmate_saved_email');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  // Handle navigation success messages
  useEffect(() => {
    if (location.state?.message) {
      setMessage({ 
        type: location.state.type || 'success', 
        text: location.state.message 
      });
      navigate(location.pathname, { replace: true });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  }, [location.state, navigate, location.pathname]);

  // Handle auth context errors
  useEffect(() => {
    if (error) {
      setMessage({ type: 'error', text: error });
      clearError();
    }
  }, [error, clearError]);

  // Clear messages when user starts typing
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (message.text) setMessage({ type: '', text: '' });
  };

  // Handle Remember Me checkbox
  const handleRememberMeChange = (checked) => {
    setRememberMe(checked);
    if (checked) {
      if (formData.email.trim()) {
        localStorage.setItem('bookmate_saved_email', formData.email.trim());
      }
    } else {
      localStorage.removeItem('bookmate_saved_email');
    }
  };

  // Enhanced form validation
  const validateForm = () => {
    if (!formData.email.trim()) {
      setMessage({ type: 'error', text: 'Email is required' });
      return false;
    }

    if (!formData.password.trim()) {
      setMessage({ type: 'error', text: 'Password is required' });
      return false;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return false;
    }

    return true;
  };

  // Handle form submission
  // Add this to your LoginPage.jsx - just the enhanced handleSubmit function
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;

  try {
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Check if this might be a post-password-reset scenario
    const passwordResetPending = localStorage.getItem('bookmate_password_reset_pending')
    const isPostPasswordReset = passwordResetPending === formData.email.trim()

    // Set Firebase persistence
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

    // Handle Remember Me
    if (rememberMe) {
      localStorage.setItem('bookmate_saved_email', formData.email.trim());
    } else {
      localStorage.removeItem('bookmate_saved_email');
    }

    // If this is potentially post-password-reset, show helpful message
    if (isPostPasswordReset) {
      setMessage({ 
        type: 'info', 
        text: 'Attempting login with new password...' 
      });
    }

    await login(formData.email.trim(), formData.password);
    
    // Clear password reset flag on successful login
    localStorage.removeItem('bookmate_password_reset_pending')
    
    navigate(from, { replace: true });
    
  } catch (error) {
    // If login fails and it might be post-password-reset, show helpful message
    const passwordResetPending = localStorage.getItem('bookmate_password_reset_pending')
    if (passwordResetPending === formData.email.trim() && error.message.includes('Invalid email or password')) {
      setMessage({
        type: 'warning',
        text: 'Login failed after password reset. This sometimes happens due to browser caching. The app has automatically cleared cached data - please try logging in again with your NEW password.'
      });
      // Clear the flag so user doesn't see this message repeatedly
      localStorage.removeItem('bookmate_password_reset_pending')
    }
  } finally {
    setLoading(false);
  }
};


  // Enhanced Google login with better error handling
  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setMessage({ type: '', text: '' });

      // Set persistence for Google login
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

      await loginWithGoogle();
      navigate(from, { replace: true });
      
    } catch (error) {
      // Error is handled by useEffect above through auth context
    } finally {
      setGoogleLoading(false);
    }
  };

  // Enhanced forgot password with better validation
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!resetEmail.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail.trim())) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    try {
      setSendingReset(true);
      
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/login`,
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, resetEmail.trim(), actionCodeSettings);
      
      setMessage({ 
        type: 'success', 
        text: `Password reset email sent to ${resetEmail}! Please check your inbox (and spam folder) and follow the instructions to reset your password.` 
      });
      
      setShowForgotPassword(false);
      setResetEmail('');
      
    } catch (error) {
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address. Please check the email or create a new account.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many reset attempts. Please wait a few minutes and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
         <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-accent-primary to-purple-500 rounded-2xl mb-4">
              <BookMarked className="w-8 h-8 text-white" />
            </div>
          
          <h1 className="text-mobile-2xl font-heading font-bold text-theme-primary mb-2">
            Welcome Back
          </h1>
          <p className="text-theme-secondary text-mobile-sm leading-relaxed">
            Sign in to manage your library books and never miss a due date
          </p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className="mb-6">
            <Alert 
              type={message.type}
              message={message.text}
              onClose={() => setMessage({ type: '', text: '' })}
            />
          </div>
        )}

        {/* Login Form */}
        {!showForgotPassword ? (
          <div className="bg-theme-card/80 backdrop-blur-sm rounded-3xl shadow-xl border border-theme-border/50 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                icon={Mail}
                disabled={loading || googleLoading}
                autoComplete="email"
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                icon={Lock}
                disabled={loading || googleLoading}
                showPasswordToggle={true}
                autoComplete="current-password"
                required
              />

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => handleRememberMeChange(e.target.checked)}
                    disabled={loading || googleLoading}
                    className="w-4 h-4 text-accent-primary bg-theme-card border-theme-border rounded focus:ring-accent-primary focus:ring-2"
                  />
                  <span className="text-mobile-sm text-theme-secondary">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  disabled={loading || googleLoading}
                  className="text-mobile-sm text-accent-primary hover:text-accent-primary/80 disabled:opacity-50"
                >
                  Forgot password?
                </button>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                loading={loading}
                disabled={googleLoading}
                icon={LogIn}
                className="w-full"
              >
                Sign In
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-theme-border"></div>
                </div>
                <div className="relative flex justify-center text-mobile-sm">
                  <span className="px-4 bg-theme-bg text-theme-secondary">Or continue with</span>
                </div>
              </div>

              {/* Google Login */}
              <Button
                type="button"
                variant="ghost"
                onClick={handleGoogleLogin}
                loading={googleLoading}
                disabled={loading}
                className="w-full border border-theme-border hover:border-accent-primary/50"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
                Continue with Google
              </Button>
            </form>

            {/* Register Link */}
            <div className="text-center mt-8 pt-6 border-t border-theme-border/50">
                  <p className="text-theme-secondary text-mobile-sm">
                    Don't have an account?{' '}
                    <Link
                      to="/auth/register"
                      className="text-accent-primary hover:text-accent-primary/80 font-semibold inline-flex items-center gap-1 transition-colors"
                    >
                      Create one now
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </p>
            </div>
          </div>
        ) : (
          /* Forgot Password Form */
          <div className="card">
            <div className="text-center mb-6">
              <h2 className="text-mobile-lg font-heading font-semibold text-theme-primary mb-2">
                Reset Password
              </h2>
              <p className="text-theme-secondary text-mobile-sm">
                Enter your email address and we'll send you a secure link to reset your password
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-6">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                icon={Mail}
                disabled={sendingReset}
                autoComplete="email"
                required
              />

              <div className="flex gap-3">
                <Button
                  type="submit"
                  loading={sendingReset}
                  className="flex-1"
                >
                  Send Reset Link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                    setMessage({ type: '', text: '' });
                  }}
                  disabled={sendingReset}
                >
                  Cancel
                </Button>
              </div>
            </form>

            {/* Email Tips */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-mobile-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Email Delivery Tips:
                  </h4>
                  <ul className="text-mobile-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Check your spam/junk folder</li>
                    <li>• Make sure the email address is correct</li>
                    <li>• Wait a few minutes for delivery</li>
                    <li>• Add bookmate to your contacts to avoid spam filters</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;

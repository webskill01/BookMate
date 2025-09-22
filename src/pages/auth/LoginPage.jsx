// src/pages/LoginPage.jsx - FULLY FUNCTIONAL VERSION
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Mail, Lock, LogIn, BookMarked, 
   ArrowRight, Sparkles, Info
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';

// Import utility components
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login, loginWithGoogle } = useAuth();
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

  // Clear messages when user starts typing
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (message.text) setMessage({ type: '', text: '' });
  };

  // Handle Remember Me checkbox
  const handleRememberMeChange = (checked) => {
    setRememberMe(checked);
    
    if (checked) {
      // Save current email to localStorage
      if (formData.email.trim()) {
        localStorage.setItem('bookmate_saved_email', formData.email.trim());
      }
    } else {
      // Remove saved email
      localStorage.removeItem('bookmate_saved_email');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email.trim()) {
      setMessage({ type: 'error', text: 'Email is required' });
      return;
    }
    
    if (!formData.password.trim()) {
      setMessage({ type: 'error', text: 'Password is required' });
      return;
    }

    try {
      setLoading(true);
      
      // Set Firebase persistence based on Remember Me
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      // Save/remove email based on Remember Me
      if (rememberMe) {
        localStorage.setItem('bookmate_saved_email', formData.email.trim());
      } else {
        localStorage.removeItem('bookmate_saved_email');
      }
      
      await login(formData.email, formData.password);
      
      navigate(from, { replace: true });
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please check and try again.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      
      // Set persistence for Google login too
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (error) {
      let errorMessage = 'Google sign-in failed. Please try again.';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Pop-up was blocked. Please allow pop-ups and try again.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Enhanced forgot password with better error handling and user guidance
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!resetEmail.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail.trim())) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    try {
      setSendingReset(true);
      
      // Configure action code settings for better email experience
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/login`, // Redirect back to login after reset
        handleCodeInApp: false, // Use email link instead of in-app handling
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
        errorMessage = 'Too many reset attempts. Please wait a few minutes before trying again.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-theme-bg via-accent-primary/5 to-purple-50 dark:to-gray-900">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-accent-primary to-purple-500 rounded-2xl mb-4">
              <BookMarked className="w-8 h-8 text-white" />
            </div>
            
            <h1 className="text-mobile-2xl font-heading font-bold text-theme-primary mb-2">
              Welcome Back!
            </h1>
            <p className="text-theme-secondary text-mobile-sm">
              Sign in to manage your library books and never miss a due date
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-theme-card/80 backdrop-blur-sm rounded-3xl shadow-xl border border-theme-border/50 p-8">
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

            {!showForgotPassword ? (
              <>
                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <Input
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email"
                      icon={Mail}
                      disabled={loading}
                      className="w-full"
                    />

                    <Input
                      label="Password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Enter your password"
                      icon={Lock}
                      disabled={loading}
                      className="w-full"
                      showPasswordToggle={true}
                    />
                  </div>

                  <div className="flex items-center justify-between text-mobile-sm">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => handleRememberMeChange(e.target.checked)}
                        className="w-4 h-4 rounded border-theme-border text-accent-primary focus:ring-accent-primary focus:ring-2"
                      />
                      <span className="ml-2 text-theme-secondary">Remember me</span>
                    </label>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setResetEmail(formData.email);
                      }}
                      className="text-accent-primary hover:text-accent-primary/80 font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    loading={loading}
                    disabled={loading}
                    icon={LogIn}
                    className="w-full shadow-lg shadow-accent-primary/25"
                  >
                    Sign In
                  </Button>
                </form>

                {/* Divider */}
                <div className="flex items-center my-6">
                  <div className="flex-1 border-t border-theme-border"></div>
                  <span className="px-3 text-theme-secondary text-mobile-sm">Or continue with</span>
                  <div className="flex-1 border-t border-theme-border"></div>
                </div>

                {/* Google Sign In */}
                <Button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  variant="ghost"
                  className="w-full border-1 border-theme-border hover:border-accent-primary/50 transition-all duration-200"
                ><svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
                  Continue with Google
                </Button>

                {/* Sign Up Link */}
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
              </>
            ) : (
              /* Enhanced Forgot Password Form */
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-mobile-xl font-heading font-semibold text-theme-primary mb-2">
                    Reset Password
                  </h2>
                  <p className="text-theme-secondary text-mobile-sm">
                    Enter your email address and we'll send you a secure link to reset your password
                  </p>
                </div>

                {/* Email Delivery Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-blue-800 text-mobile-sm font-medium mb-1">
                        Email Delivery Tips:
                      </p>
                      <ul className="text-blue-700 text-mobile-xs space-y-1">
                        <li>• Check your spam/junk folder</li>
                        <li>• Email may take up to 10 minutes to arrive</li>
                        <li>• Make sure you entered the correct email</li>
                        <li>• Add noreply@bookmate.com to your contacts</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <Input
                    label="Email Address"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email"
                    icon={Mail}
                    disabled={sendingReset}
                    className="w-full"
                  />

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      loading={sendingReset}
                      disabled={sendingReset}
                      className="flex-1"
                    >
                      {sendingReset ? 'Sending...' : 'Send Reset Email'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetEmail('');
                      }}
                      disabled={sendingReset}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Features Preview */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-theme-secondary text-mobile-xs">
              <Sparkles className="w-4 h-4" />
              <span>Track books • Set reminders • Calculate fines automatically</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

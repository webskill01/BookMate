// src/pages/RegisterPage.jsx - MODERN ENHANCED VERSION
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Mail, Lock, User, UserPlus, BookMarked, 
  AlertTriangle, ArrowRight, Sparkles, Chrome, CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Import utility components
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Password strength checker
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ];
    
    strength = checks.filter(Boolean).length;
    
    if (strength <= 2) return { strength, label: 'Weak', color: 'text-red-500 bg-red-500' };
    if (strength === 3) return { strength, label: 'Fair', color: 'text-yellow-500 bg-yellow-500' };
    if (strength === 4) return { strength, label: 'Good', color: 'text-blue-500 bg-blue-500' };
    return { strength, label: 'Strong', color: 'text-green-500 bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  // Form validation
  const validateForm = () => {
    if (!formData.displayName.trim()) {
      setMessage({ type: 'error', text: 'Display name is required' });
      return false;
    }
    
    if (!formData.email.trim()) {
      setMessage({ type: 'error', text: 'Email is required' });
      return false;
    }
    
    if (!formData.password) {
      setMessage({ type: 'error', text: 'Password is required' });
      return false;
    }
    
    if (formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return false;
    }
    
    if (!agreedToTerms) {
      setMessage({ type: 'error', text: 'Please agree to the Terms of Service and Privacy Policy' });
      return false;
    }
    
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      await signup(formData.email, formData.password, formData.displayName);
      
      navigate('/dashboard', { 
        replace: true,
        state: {
          message: 'Welcome to BookMate! Your account has been created successfully.',
          type: 'success'
        }
      });
    } catch (error) {
      let errorMessage = 'Account creation failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Handle Google signup
  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      
      navigate('/dashboard', { replace: true });
    } catch (error) {
      let errorMessage = 'Google sign-up failed. Please try again.';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-up was cancelled. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Pop-up was blocked. Please allow pop-ups and try again.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
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
              Join BookMate
            </h1>
            <p className="text-theme-secondary text-mobile-sm">
              Create your account to start tracking books and managing due dates
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

            {/* Register Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Enter your full name"
                  icon={User}
                  disabled={loading}
                  className="w-full"
                />

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

                <div>
                  <Input
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Create a strong password"
                    icon={Lock}
                    disabled={loading}
                    showPasswordToggle={true}
                    className="w-full"
                  />
                  
                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-theme-border rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                          />
                        </div>
                        <span className={`text-mobile-xs font-medium ${passwordStrength.color.split(' ')[0]}`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Input
                  label="Confirm Password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  icon={Lock}
                  disabled={loading}
                  showPasswordToggle={true}
                  className="w-full"
                />
              </div>

              {/* Terms Agreement */}
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 rounded border-theme-border text-accent-primary focus:ring-accent-primary focus:ring-2"
                    />
                  </div>
                  <span className="text-mobile-sm text-theme-secondary leading-relaxed">
                    I agree to the{' '}
                    <a href="#" className="text-accent-primary hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-accent-primary hover:underline">Privacy Policy</a>
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                icon={UserPlus}
                className="w-full shadow-lg shadow-accent-primary/25"
              >
                Create Account
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-theme-border"></div>
              <span className="px-3 text-theme-secondary text-mobile-sm">Or continue with</span>
              <div className="flex-1 border-t border-theme-border"></div>
            </div>

            {/* Google Sign Up */}
            <Button
              onClick={handleGoogleSignup}
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

            {/* Sign In Link */}
            <div className="text-center mt-8 pt-6 border-t border-theme-border/50">
              <p className="text-theme-secondary text-mobile-sm">
                Already have an account?{' '}
                <Link
                  to="/auth/login"
                  className="text-accent-primary hover:text-accent-primary/80 font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  Sign in here
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </p>
            </div>
          </div>

          {/* Features Preview */}
          <div className="mt-8">
            <div className="bg-theme-card/50 backdrop-blur-sm rounded-2xl border border-theme-border/30 p-4">
              <div className="text-center mb-3">
                <h3 className="text-theme-primary font-medium text-mobile-sm">What you'll get:</h3>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 text-theme-secondary text-mobile-xs">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Track unlimited library books</span>
                </div>
                <div className="flex items-center gap-2 text-theme-secondary text-mobile-xs">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Smart due date reminders</span>
                </div>
                <div className="flex items-center gap-2 text-theme-secondary text-mobile-xs">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Automatic fine calculations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

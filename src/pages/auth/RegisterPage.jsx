// src/pages/RegisterPage.jsx - ENHANCED ERROR HANDLING VERSION
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Mail, Lock, User, UserPlus, BookMarked, AlertTriangle, 
  Chrome, CheckCircle, Shield, Eye, EyeOff, 
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signup, loginWithGoogle, error, clearError } = useAuth();
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

  // Enhanced form validation
  const validateForm = () => {
    if (!formData.displayName.trim()) {
      setMessage({ type: 'error', text: 'Display name is required' });
      return false;
    }

    if (formData.displayName.trim().length < 2) {
      setMessage({ type: 'error', text: 'Display name must be at least 2 characters long' });
      return false;
    }

    if (!formData.email.trim()) {
      setMessage({ type: 'error', text: 'Email is required' });
      return false;
    }

    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
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
      setMessage({ type: '', text: '' });

      await signup(
        formData.email.trim(), 
        formData.password, 
        formData.displayName.trim()
      );
      
      navigate('/dashboard', { 
        replace: true,
        state: { 
          message: 'Welcome to BookMate! Your account has been created successfully.',
          type: 'success' 
        }
      });
      
    } catch (error) {
      // Error is handled by useEffect above through auth context
    } finally {
      setLoading(false);
    }
  };

  // Handle Google signup
  const handleGoogleSignup = async () => {
    try {
      setGoogleLoading(true);
      setMessage({ type: '', text: '' });

      await loginWithGoogle();
      navigate('/dashboard', { replace: true });
      
    } catch (error) {
      // Error is handled by useEffect above through auth context
    } finally {
      setGoogleLoading(false);
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
            Create Account
          </h1>
          <p className="text-theme-secondary text-mobile-sm leading-relaxed">
            Create your account to start tracking books and managing due dates
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

        {/* Registration Form */}
        <div className="bg-theme-card/80 backdrop-blur-sm rounded-3xl shadow-xl border border-theme-border/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <Input
              label="Full Name"
              type="text"
              placeholder="Enter your full name"
              value={formData.displayName}
              onChange={(e) => handleInputChange('displayName', e.target.value)}
              icon={User}
              disabled={loading || googleLoading}
              autoComplete="name"
              required
            />

            {/* Email */}
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

            {/* Password with strength indicator */}
            <div className="space-y-2">
              <Input
                label="Password"
                type="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                icon={Lock}
                disabled={loading || googleLoading}
                showPasswordToggle={true}
                autoComplete="new-password"
                required
              />
              
              {/* Password strength indicator */}
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-mobile-xs text-theme-secondary">Password strength:</span>
                    <span className={`text-mobile-xs font-medium ${passwordStrength.color.split(' ')[0]}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-theme-border rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color.split(' ')[1]}`}
                      style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              icon={Lock}
              disabled={loading || googleLoading}
              showPasswordToggle={true}
              autoComplete="new-password"
              required
            />

            {/* Terms Agreement */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                disabled={loading || googleLoading}
                className="w-4 h-4 text-accent-primary bg-theme-card border-theme-border rounded focus:ring-accent-primary focus:ring-2 mt-0.5"
              />
              <label htmlFor="terms" className="text-mobile-sm text-theme-secondary leading-relaxed">
                I agree to the{' '}
                <a href="/terms" className="text-accent-primary hover:text-accent-primary/80">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-accent-primary hover:text-accent-primary/80">
                  Privacy Policy
                </a>
              </label>
            </div>

            {/* Create Account Button */}
            <Button
              type="submit"
              loading={loading}
              disabled={googleLoading}
              icon={UserPlus}
              className="w-full"
            >
              Create Account
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

            {/* Google Signup */}
            <Button
              type="button"
              variant="ghost"
              onClick={handleGoogleSignup}
              loading={googleLoading}
              disabled={loading}
              className="w-full border border-theme-border hover:border-accent-primary/50"
            ><svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
              Continue with Google
            </Button>
          </form>

          {/* Login Link */}
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
  );
};

export default RegisterPage;

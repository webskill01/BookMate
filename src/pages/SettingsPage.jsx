// src/pages/SettingsPage.jsx - OPTIMIZED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Bell, IndianRupee, User, Shield, Mail, Lock, 
  Trash2, AlertTriangle, Sun, Moon, Monitor, Edit3, Save, X 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { productionNotificationService } from '../services/productionNotificationService';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth';
import { db } from '../config/firebase';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  
  // Settings state - notifications OFF by default
  const [settings, setSettings] = useState({
    finePerDay: 1,
    notificationsEnabled: false
  });
  
  // Profile state
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // UI state
  const [editMode, setEditMode] = useState({
    name: false,
    email: false,
    password: false
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  // Show permission prompt for first-time users
  useEffect(() => {
    const hasSeenPrompt = localStorage.getItem(`notification_prompt_${currentUser?.uid}`);
    if (currentUser && !hasSeenPrompt && Notification.permission === 'default') {
      setShowPermissionPrompt(true);
    }
  }, [currentUser]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load user settings
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setSettings({
          finePerDay: userData.finePerDay || 1,
          // Check actual notification status, default to false
          notificationsEnabled: userData.notificationsEnabled === true && Notification.permission === 'granted'
        });
      }

      // Load profile data
      setProfile(prev => ({
        ...prev,
        displayName: currentUser.displayName || '',
        email: currentUser.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  // Handle permission prompt
  const handlePermissionPrompt = async (enable) => {
    localStorage.setItem(`notification_prompt_${currentUser.uid}`, 'seen');
    setShowPermissionPrompt(false);
    
    if (enable) {
      await handleNotificationToggle();
    }
  };

  // Improved fine rate input handler
  const handleFineRateChange = (e) => {
    const value = e.target.value;
    
    if (value === '') {
      setSettings(prev => ({ ...prev, finePerDay: '' }));
      return;
    }
    
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 50) {
      setSettings(prev => ({ ...prev, finePerDay: numValue }));
    }
  };

  // Validate fine rate before saving
  const saveFineSettings = async () => {
    const fineRate = settings.finePerDay === '' ? 1 : settings.finePerDay;
    if (fineRate < 1 || fineRate > 50) {
      setMessage({ type: 'error', text: 'Fine rate must be between ₹1 and ₹50' });
      return;
    }

    try {
      setSaving(true);
      const userRef = doc(db, 'users', currentUser.uid);
      
      await setDoc(userRef, {
        finePerDay: fineRate,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await updateExistingBooksFineRate(fineRate);
      
      setSettings(prev => ({ ...prev, finePerDay: fineRate }));
      
      setMessage({ type: 'success', text: 'Fine settings saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save fine settings' });
    } finally {
      setSaving(false);
    }
  };

  // Update existing books fine rate
  const updateExistingBooksFineRate = async (newFinePerDay) => {
    try {
      const booksRef = collection(db, 'books');
      const q = query(booksRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return;
      
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, {
          finePerDay: newFinePerDay,
          updatedAt: new Date().toISOString()
        });
      });
      
      await batch.commit();
    } catch (error) {
      // Silent fail for background operation
    }
  };

  // Handle notification toggle with browser permission integration
  const handleNotificationToggle = async () => {
    try {
      setSaving(true);
      
      if (!settings.notificationsEnabled) {
        // Enable notifications
        const result = await productionNotificationService.requestPermission(currentUser.uid);
        if (result.success) {
          setSettings(prev => ({ ...prev, notificationsEnabled: true }));
          setMessage({ type: 'success', text: 'Notifications enabled successfully!' });
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to enable notifications' });
        }
      } else {
        // Disable notifications
        const result = await productionNotificationService.disableNotifications(currentUser.uid);
        if (result.success) {
          setSettings(prev => ({ ...prev, notificationsEnabled: false }));
          setMessage({ type: 'success', text: 'Notifications disabled successfully' });
        } else {
          setMessage({ type: 'error', text: 'Failed to disable notifications' });
        }
      }
      
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update notifications' });
    } finally {
      setSaving(false);
    }
  };

  // Update display name
  const updateDisplayName = async () => {
    if (!profile.displayName.trim()) {
      setMessage({ type: 'error', text: 'Display name cannot be empty' });
      return;
    }

    try {
      setSaving(true);
      
      await updateProfile(currentUser, {
        displayName: profile.displayName.trim()
      });

      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        displayName: profile.displayName.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setEditMode(prev => ({ ...prev, name: false }));
      setMessage({ type: 'success', text: 'Display name updated successfully!' });
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update display name' });
    } finally {
      setSaving(false);
    }
  };

  // Update email
  const updateUserEmail = async () => {
    if (!profile.email.trim() || !profile.currentPassword) {
      setMessage({ type: 'error', text: 'Email and current password are required' });
      return;
    }

    try {
      setSaving(true);

      const credential = EmailAuthProvider.credential(currentUser.email, profile.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updateEmail(currentUser, profile.email.trim());

      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        email: profile.email.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setEditMode(prev => ({ ...prev, email: false }));
      setProfile(prev => ({ ...prev, currentPassword: '' }));
      setMessage({ type: 'success', text: 'Email updated successfully!' });
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        setMessage({ type: 'error', text: 'Current password is incorrect' });
      } else if (error.code === 'auth/email-already-in-use') {
        setMessage({ type: 'error', text: 'Email is already in use' });
      } else {
        setMessage({ type: 'error', text: 'Failed to update email' });
      }
    } finally {
      setSaving(false);
    }
  };

  // Update password
  const updateUserPassword = async () => {
    if (!profile.currentPassword || !profile.newPassword || !profile.confirmPassword) {
      setMessage({ type: 'error', text: 'All password fields are required' });
      return;
    }

    if (profile.newPassword !== profile.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (profile.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    try {
      setSaving(true);

      const credential = EmailAuthProvider.credential(currentUser.email, profile.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, profile.newPassword);

      setEditMode(prev => ({ ...prev, password: false }));
      setProfile(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        setMessage({ type: 'error', text: 'Current password is incorrect' });
      } else {
        setMessage({ type: 'error', text: 'Failed to update password' });
      }
    } finally {
      setSaving(false);
    }
  };

  // Delete account
  const deleteAccount = async () => {
    try {
      setSaving(true);

      // Delete user data from Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      await deleteDoc(userRef);

      // Delete user's books
      const booksQuery = query(collection(db, 'books'), where('userId', '==', currentUser.uid));
      const booksSnapshot = await getDocs(booksQuery);
      
      const batch = writeBatch(db);
      booksSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Delete Firebase Auth account
      await deleteUser(currentUser);

      navigate('/auth/login', { 
        state: { message: 'Account deleted successfully' }
      });

    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete account' });
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  // Theme options
  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-theme-secondary">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg">
      <div className="layout-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/dashboard')}
            icon={ArrowLeft}
          />
          
          <div className="text-center">
            <h1 className="text-mobile-2xl font-heading font-bold text-theme-primary">
              Settings
            </h1>
            <p className="text-theme-secondary text-mobile-sm mt-1">
              Customize your BookMate experience
            </p>
          </div>
          
          <div className="w-[72px]"></div>
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

        <div className="space-y-6 max-w-2xl mx-auto pb-4">
          {/* Profile Section */}
          <section className="card">
            <div className="flex items-center mb-6">
              <div className="bg-accent-primary/10 p-2 rounded-lg mr-3">
                <User className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <h2 className="text-mobile-lg font-heading font-semibold text-theme-primary">
                  Profile
                </h2>
                <p className="text-theme-secondary text-mobile-sm">
                  Manage your account information
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-theme-primary text-mobile-sm font-medium mb-2">
                  Display Name
                </label>
                {editMode.name ? (
                  <div className="flex gap-3">
                    <Input
                      value={profile.displayName}
                      onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="Enter your display name"
                      className="flex-1"
                    />
                    <Button 
                      size="sm" 
                      onClick={updateDisplayName} 
                      loading={saving}
                      icon={Save}
                    />
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setEditMode(prev => ({ ...prev, name: false }));
                        setProfile(prev => ({ ...prev, displayName: currentUser.displayName || '' }));
                      }}
                      icon={X}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-theme-card/50 rounded-lg border border-theme-border">
                    <span className="text-theme-primary">
                      {profile.displayName || 'Not set'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditMode(prev => ({ ...prev, name: true }))}
                      icon={Edit3}
                    />
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-theme-primary text-mobile-sm font-medium mb-2">
                  Email Address
                </label>
                {editMode.email ? (
                  <div className="space-y-3">
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter new email"
                      icon={Mail}
                    />
                    <Input
                      type="password"
                      value={profile.currentPassword}
                      onChange={(e) => setProfile(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Current password (required)"
                      icon={Lock}
                      showPasswordToggle={true}
                    />
                    <div className="flex gap-3">
                      <Button 
                        onClick={updateUserEmail} 
                        loading={saving}
                        icon={Save}
                      >
                        Update Email
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditMode(prev => ({ ...prev, email: false }));
                          setProfile(prev => ({ 
                            ...prev, 
                            email: currentUser.email || '',
                            currentPassword: ''
                          }));
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-theme-card/50 rounded-lg border border-theme-border">
                    <span className="text-theme-primary flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-theme-secondary" />
                      {profile.email}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditMode(prev => ({ ...prev, email: true }))}
                      icon={Edit3}
                    />
                  </div>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-theme-primary text-mobile-sm font-medium mb-2">
                  Password
                </label>
                {editMode.password ? (
                  <div className="space-y-3">
                    <Input
                      type="password"
                      value={profile.currentPassword}
                      onChange={(e) => setProfile(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Current password"
                      icon={Lock}
                      showPasswordToggle={true}
                    />
                    <Input
                      type="password"
                      value={profile.newPassword}
                      onChange={(e) => setProfile(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="New password (min 6 characters)"
                      icon={Lock}
                      showPasswordToggle={true}
                    />
                    <Input
                      type="password"
                      value={profile.confirmPassword}
                      onChange={(e) => setProfile(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                      icon={Lock}
                      showPasswordToggle={true}
                    />
                    <div className="flex gap-3">
                      <Button 
                        onClick={updateUserPassword} 
                        loading={saving}
                        icon={Save}
                      >
                        Update Password
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditMode(prev => ({ ...prev, password: false }));
                          setProfile(prev => ({ 
                            ...prev, 
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: ''
                          }));
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-theme-card/50 rounded-lg border border-theme-border">
                    <span className="text-theme-primary flex items-center">
                      <Lock className="w-4 h-4 mr-2 text-theme-secondary" />
                      ••••••••
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditMode(prev => ({ ...prev, password: true }))}
                      icon={Edit3}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* App Preferences Section */}
          <section className="card">
            <div className="flex items-center mb-6">
              <div className="bg-accent-primary/10 p-2 rounded-lg mr-3">
                <Shield className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <h2 className="text-mobile-lg font-heading font-semibold text-theme-primary">
                  App Preferences
                </h2>
                <p className="text-theme-secondary text-mobile-sm">
                  Customize your app experience
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Theme Selection */}
              <div>
                <label className="block text-theme-primary text-mobile-sm font-medium mb-3">
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center space-y-2 ${
                        theme === value
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                          : 'border-theme-border bg-theme-card hover:border-accent-primary/50 text-theme-secondary hover:text-theme-primary'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-mobile-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fine Settings */}
              <div>
                <label className="block text-theme-primary text-mobile-sm font-medium mb-3">
                  Overdue Fine Rate
                </label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <IndianRupee className="w-5 h-5 text-theme-secondary flex-shrink-0" />
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={settings.finePerDay}
                      onChange={handleFineRateChange}
                      onBlur={() => {
                        if (settings.finePerDay === '' || settings.finePerDay < 1) {
                          setSettings(prev => ({ ...prev, finePerDay: 1 }));
                        }
                      }}
                      placeholder="Fine per day"
                      helperText="Amount charged per day for overdue books (₹1-₹50)"
                      className="flex-1"
                    />
                  </div>
                  <Button 
                    onClick={saveFineSettings} 
                    loading={saving}
                    icon={Save}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Save Fine Settings
                  </Button>
                </div>
              </div>

              {/* Notification Settings */}
              <div>
                <label className="block text-theme-primary text-mobile-sm font-medium mb-3">
                  Due Date Notifications
                </label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-theme-card rounded-lg border border-theme-border">
                    <div className="flex items-center space-x-3">
                      <Bell className="w-5 h-5 text-accent-primary" />
                      <div>
                        <p className="text-theme-primary font-medium">
                          Push Notifications
                        </p>
                        <p className="text-theme-secondary text-mobile-xs">
                          Get reminders for due books
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleNotificationToggle}
                      disabled={saving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-theme-bg ${
                        settings.notificationsEnabled
                          ? 'bg-accent-primary shadow-md'
                          : 'bg-theme-border hover:bg-opacity-80'
                      } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full transition-all duration-300 shadow-sm ${
                          settings.notificationsEnabled 
                            ? 'translate-x-6 bg-white'
                            : 'translate-x-1 bg-theme-primary'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {settings.notificationsEnabled && (
                    <div className="p-3 bg-accent-primary/5 rounded-lg border border-accent-primary/20">
                      <p className="text-accent-primary text-mobile-xs">
                        ✓ You'll receive notifications 3 days, 1 day before due date, on due date, and daily for overdue books.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="card border-status-danger/20">
            <div className="flex items-center mb-6">
              <div className="bg-status-danger/10 p-2 rounded-lg mr-3">
                <AlertTriangle className="w-5 h-5 text-status-danger" />
              </div>
              <div>
                <h2 className="text-mobile-lg font-heading font-semibold text-status-danger">
                  Danger Zone
                </h2>
                <p className="text-theme-secondary text-mobile-sm">
                  Irreversible and destructive actions
                </p>
              </div>
            </div>

            <div className="p-4 bg-status-danger/5 rounded-lg border border-status-danger/50">
              <h3 className="font-semibold text-theme-primary mb-2">Delete Account</h3>
              <p className="text-theme-secondary text-mobile-sm mb-4">
                This will permanently delete your account and all your books. This action cannot be undone.
              </p>
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                icon={Trash2}
                className="text-status-danger hover:bg-status-danger/10 border border-status-danger/40 hover:border-status-danger/80 w-full"
              >
                Delete Account
              </Button>
            </div>
          </section>

          {/* Logout Button */}
          <div className="pt-4">
            <Button
              variant="ghost"
              onClick={logout}
              className="w-full text-theme-secondary hover:text-theme-primary border border-gray-500"
            >
              Log Out
            </Button>
          </div>
        </div>

        {/* Permission Prompt Modal */}
        {showPermissionPrompt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-theme-card rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="bg-accent-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-accent-primary" />
                </div>
                <h3 className="text-mobile-lg font-heading font-semibold text-theme-primary mb-2">
                  Enable Notifications?
                </h3>
                <p className="text-theme-secondary text-mobile-sm">
                  Get reminders for due books and never miss a return date. You can change this later in settings.
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => handlePermissionPrompt(false)}
                  className="flex-1"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={() => handlePermissionPrompt(true)}
                  className="flex-1"
                  icon={Bell}
                >
                  Enable Notifications
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-theme-card rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="bg-status-danger/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-status-danger" />
                </div>
                <h3 className="text-mobile-lg font-heading font-semibold text-theme-primary mb-2">
                  Delete Account
                </h3>
                <p className="text-theme-secondary text-mobile-sm">
                  Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={saving}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={deleteAccount}
                  loading={saving}
                  className="flex-1 bg-status-danger hover:bg-status-danger/90 text-white"
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;

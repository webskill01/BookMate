// src/components/layout/Navbar.jsx - LEFT SIDEBAR VERSION
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Settings, LogOut, Menu, X, User, ChevronDown, Home, Plus, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't show navbar on auth pages
  if (location.pathname.startsWith('/auth/')) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth/login');
      setIsMobileMenuOpen(false);
      setIsUserDropdownOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Get user display name or email
  const getUserDisplayName = () => {
    if (currentUser?.displayName) return currentUser.displayName;
    if (currentUser?.email) return currentUser.email.split('@')[0];
    return 'User';
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase() + (name.charAt(1) || '').toUpperCase();
  };

  // Navigation links for mobile
  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/add-book', label: 'Add Book', icon: Plus },
  ];

  // Check if current path is active
  const isActivePath = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Main Navbar */}
      <nav className="z-40 w-full bg-theme-bg/95 border-b border-theme-border/50 shadow-sm">
        <div className="layout-container px-4 py-2">
          <div className="flex items-center justify-between h-16 md:h-18">
            
            {/* LEFT SIDE - Mobile Menu Button + Brand Logo */}
            <div className="flex items-center justify-center space-x-4">
              {/* Mobile Menu Button - MOVED TO LEFT */}
              {currentUser && (
                <div className="md:hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className={`p-2 transition-all duration-300 ease-in-out transform ${
                      isMobileMenuOpen 
                        ? 'rotate-180 bg-accent-primary/10 text-accent-primary scale-110' 
                        : 'hover:scale-105'
                    }`}
                  >
                    <div className="relative w-5">
                      {/* Animated hamburger/close icon */}
                      <span
                        className={`absolute block h-0.5 w-5 bg-current transform transition-all duration-300 ease-in-out ${
                          isMobileMenuOpen ? 'rotate-45 translate-y-0' : '-translate-y-1.5'
                        }`}
                      />
                      <span
                        className={`absolute block h-0.5 w-5 bg-current transform transition-all duration-300 ease-in-out ${
                          isMobileMenuOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
                        }`}
                      />
                      <span
                        className={`absolute block h-0.5 w-5 bg-current transform transition-all duration-300 ease-in-out ${
                          isMobileMenuOpen ? '-rotate-45 translate-y-0' : 'translate-y-1.5'
                        }`}
                      />
                    </div>
                  </Button>
                </div>
              )}

              {/* Brand Logo Section */}
              <Link 
                to="/dashboard" 
                className="flex items-center space-x-3 group hover:scale-105 transition-transform duration-200"
              >
                {/* App Icon */}
                <div className="relative">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-accent-primary to-accent-primary/80 shadow-lg flex items-center justify-center group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                    <img 
                      src="/icons/icon-96x96.png" 
                      alt="BookMate" 
                      className="w-6 h-6 md:w-7 md:h-7 object-contain transition-transform duration-300 group-hover:rotate-12"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <BookOpen className="w-6 h-6 md:w-7 md:h-7 text-white hidden" />
                  </div>
                  {/* Pulse animation */}
                  <div className="absolute inset-0 rounded-xl bg-accent-primary/20 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>

                {/* Brand Text */}
                <div className="flex flex-col">
                  <h1 className="text-lg md:text-xl font-heading font-bold text-theme-primary group-hover:text-accent-primary transition-colors duration-200">
                    BookMate
                  </h1>
                  <p className="text-xs text-theme-secondary -mt-1 hidden sm:block">
                    Smart Library Manager
                  </p>
                </div>
              </Link>
            </div>

            {/* RIGHT SIDE - Desktop Navigation + User Profile */}
            <div className="flex items-center space-x-6">
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-2">
                {currentUser && navLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center border-1 space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                      isActivePath(to)
                        ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20 scale-105'
                        : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-card/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>

              {/* Desktop User Profile + Mobile User Name */}
              {currentUser && (
                <div className="flex items-center justify-center">
                  {/* Mobile User Name */}
                  <div className="text-right md:hidden">
                    <p className="text-sm font-medium text-theme-primary">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-theme-secondary">
                      Online
                    </p>
                  </div>

                  {/* Desktop User Profile Dropdown */}
                  <div className="hidden md:block relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                      className="flex items-center space-x-3 p-2 rounded-xl hover:bg-theme-card/50 transition-all duration-200 group transform hover:scale-105"
                    >
                      {/* User Avatar */}
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-primary/20 to-accent-primary/10 border-2 border-accent-primary/20 flex items-center justify-center text-sm font-semibold text-accent-primary group-hover:border-accent-primary/40 transition-all duration-200 group-hover:scale-110">
                          {getUserInitials()}
                        </div>
                        {/* Online indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-status-success rounded-full border-2 border-theme-bg animate-pulse"></div>
                      </div>

                      {/* User Info */}
                      <div className="text-left">
                        <p className="text-sm font-medium text-theme-primary group-hover:text-accent-primary transition-colors duration-200">
                          {getUserDisplayName()}
                        </p>
                        <p className="text-xs text-theme-secondary truncate max-w-32">
                          {currentUser.email}
                        </p>
                      </div>

                      {/* Dropdown Arrow */}
                      <ChevronDown className={`w-4 h-4 text-theme-secondary transition-all duration-300 ease-in-out ${
                        isUserDropdownOpen ? 'rotate-180 text-accent-primary' : ''
                      }`} />
                    </button>

                    {/* Desktop Dropdown Menu */}
                    {isUserDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-64 bg-theme-card rounded-xl shadow-xl border border-theme-border/50 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                        {/* User Info Header */}
                        <div className="px-4 py-3 border-b border-theme-border/30">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-primary/20 to-accent-primary/10 border-2 border-accent-primary/20 flex items-center justify-center text-base font-semibold text-accent-primary">
                              {getUserInitials()}
                            </div>
                            <div>
                              <p className="font-medium text-theme-primary">
                                {getUserDisplayName()}
                              </p>
                              <p className="text-sm text-theme-secondary">
                                {currentUser.email}
                              </p>
                              <div className="flex items-center space-x-1 mt-1">
                                <div className="w-2 h-2 bg-status-success rounded-full animate-pulse"></div>
                                <span className="text-xs text-status-success font-medium">Online</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          <button
                            onClick={() => {
                              navigate('/settings');
                              setIsUserDropdownOpen(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-theme-bg/50 transition-all duration-200 group transform hover:translate-x-1"
                          >
                            <div className="w-8 h-8 rounded-lg bg-theme-bg/50 flex items-center justify-center group-hover:bg-accent-primary/10 transition-all duration-200 group-hover:scale-110">
                              <Settings className="w-4 h-4 text-theme-secondary group-hover:text-accent-primary transition-colors duration-200" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-theme-primary">Settings</p>
                              <p className="text-xs text-theme-secondary">Manage your account</p>
                            </div>
                          </button>

                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-status-danger/5 transition-all duration-200 group transform hover:translate-x-1"
                          >
                            <div className="w-8 h-8 rounded-lg bg-theme-bg/50 flex items-center justify-center group-hover:bg-status-danger/10 transition-all duration-200 group-hover:scale-110">
                              <LogOut className="w-4 h-4 text-theme-secondary group-hover:text-status-danger transition-colors duration-200" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-theme-primary group-hover:text-status-danger transition-colors duration-200">Sign Out</p>
                              <p className="text-xs text-theme-secondary">Sign out of your account</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay - SLIDES FROM LEFT */}
      {isMobileMenuOpen && (
        <div
          className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen ? 'bg-black/50 backdrop-blur-sm' : 'bg-black/0'
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className={`fixed left-0 top-0 h-full w-80 bg-theme-card shadow-2xl transform transition-all duration-300 ease-in-out ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-6 border-b border-theme-border/30">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-primary/80 shadow-lg flex items-center justify-center">
                    <img 
                      src="/icons/icon-96x96.png" 
                      alt="BookMate" 
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <BookOpen className="w-6 h-6 text-white hidden" />
                  </div>
                  <div>
                    <h2 className="text-lg font-heading font-bold text-theme-primary">BookMate</h2>
                    <p className="text-xs text-theme-secondary">Smart Library Manager</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-status-danger/10 hover:text-status-danger transition-all duration-200 transform hover:scale-110 hover:rotate-90"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Mobile User Profile */}
              {currentUser && (
                <div className="p-6 border-b border-theme-border/30">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-primary/20 to-accent-primary/10 border-2 border-accent-primary/20 flex items-center justify-center text-lg font-semibold text-accent-primary">
                        {getUserInitials()}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-status-success rounded-full border-3 border-theme-card animate-pulse"></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-theme-primary">
                        {getUserDisplayName()}
                      </h3>
                      <p className="text-sm text-theme-secondary">
                        {currentUser.email}
                      </p>
                      <div className="flex items-center space-x-1 mt-1">
                        <div className="w-2 h-2 bg-status-success rounded-full animate-pulse"></div>
                        <span className="text-xs text-status-success font-medium">Online</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Navigation Links */}
              <div className="flex-1 p-6">
                <div className="space-y-3 mb-8">
                  {navLinks.map(({ to, label, icon: Icon }, index) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 hover:translate-x-2 ${
                        isActivePath(to)
                          ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20 translate-x-1'
                          : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-bg/50'
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                        isActivePath(to) 
                          ? 'bg-accent-primary/20 text-accent-primary scale-110' 
                          : 'bg-theme-bg/50 text-theme-secondary'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-base font-medium">{label}</span>
                    </Link>
                  ))}
                </div>

                {/* Mobile Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      navigate('/settings');
                      setIsMobileMenuOpen(false);
                    }}
                    variant="ghost"
                    icon={Settings}
                    className="w-full justify-start text-theme-primary border border-theme-border hover:border-accent-primary/50 hover:bg-accent-primary/5 h-14 transition-all duration-300 transform hover:scale-105 hover:translate-x-2"
                  >
                    <span className="ml-3 text-base">Settings</span>
                  </Button>

                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    icon={LogOut}
                    className="w-full justify-start text-status-danger border border-status-danger/20 hover:border-status-danger/50 hover:bg-status-danger/5 h-14 transition-all duration-300 transform hover:scale-105 hover:translate-x-2"
                  >
                    <span className="ml-3 text-base">Sign Out</span>
                  </Button>
                </div>
              </div>

              {/* Mobile Footer */}
              <div className="p-6 border-t border-theme-border/30">
                <div className="text-center">
                  <p className="text-xs text-theme-secondary">
                    BookMate v1.0.0
                  </p>
                  <p className="text-xs text-theme-secondary/70">
                    Smart Library Management
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;

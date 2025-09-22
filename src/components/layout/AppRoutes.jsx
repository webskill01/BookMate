// src/components/layout/AppRoutes.jsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Layout
import Layout from './Layout';

// Auth Components
import LoginPage from '../../pages/auth/LoginPage';
import RegisterPage from '../../pages/auth/RegisterPage';

// Main Pages
import DashboardPage from '../../pages/DashboardPage';
import AddBookPage from '../../pages/AddBookPage';
import BookDetailsPage from '../../pages/BookDetailsPage';
import SettingsPage from '../../pages/SettingsPage';

// ENHANCED: Scroll to Top Component
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth' // Use 'auto' for instant scroll
    });
  }, [pathname]);

  return null;
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-accent-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-6 h-6 bg-accent-primary rounded-full"></div>
          </div>
          <p className="text-theme-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return currentUser ? children : <Navigate to="/auth/login" />;
};

// Public Route Component (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-accent-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-6 h-6 bg-accent-primary rounded-full"></div>
          </div>
          <p className="text-theme-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return currentUser ? <Navigate to="/dashboard" /> : children;
};

const AppRoutes = () => {
  return (
    <>
     <ScrollToTop />
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/auth/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />
      <Route 
        path="/auth/register" 
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        } 
      />

      {/* Protected Routes with Layout */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/add-book" 
        element={
          <ProtectedRoute>
            <Layout>
              <AddBookPage />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/book/:bookId" 
        element={
          <ProtectedRoute>
            <Layout>
              <BookDetailsPage />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        } 
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      
      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
    </>
  );
};

export default AppRoutes;

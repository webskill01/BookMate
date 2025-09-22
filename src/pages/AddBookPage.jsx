// src/pages/AddBookPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Hash, User, ArrowLeft, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { bookService } from '../services/bookService';
import { bookUtils } from '../utils/bookUtils';
import { productionNotificationService } from '../services/productionNotificationService';

const AddBookPage = () => {
  const [formData, setFormData] = useState({
    title: '',
    bookId: '',
    author: '',
    issueDate: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Calculate due date based on issue date
  const dueDate = formData.issueDate ? 
    bookUtils.calculateDueDate(formData.issueDate) : 
    bookUtils.calculateDueDate(new Date());

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('You must be logged in to add books');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Prepare book data
      const bookData = {
        title: formData.title.trim(),
        bookId: formData.bookId.trim(),
        author: formData.author.trim(),
        issueDate: new Date(formData.issueDate).toISOString(),
        dueDate: bookUtils.calculateDueDate(formData.issueDate).toISOString()
      };

      // Validate required fields
      if (!bookData.title || !bookData.issueDate) {
        setError('Please fill in all required fields');
        return;
      }

      // Add book to Firestore
      await bookService.addBook(currentUser.uid, bookData);
      
      // Trigger notification system update after successful addition
      try {
        if (productionNotificationService && typeof productionNotificationService.checkBooksAndNotify === 'function') {
          // Delayed check to ensure Firestore data is propagated
          setTimeout(() => {
            productionNotificationService.checkBooksAndNotify();
          }, 1000);
        }
      } catch (notificationError) {
        // Silent fail for notification system - don't block user flow
        if (import.meta.env.DEV) {
          console.warn('Notification update failed:', notificationError);
        }
      }
      
      // Redirect to dashboard with success state
      navigate('/dashboard', { 
        state: { 
          message: 'Book added successfully! Due date notifications are now active.',
          type: 'success' 
        }
      });
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error adding book:', error);
      }
      
      // Provide user-friendly error messages
      if (error.code === 'permission-denied') {
        setError('You don\'t have permission to add books. Please check your account.');
      } else if (error.code === 'network-error') {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to add book. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      bookId: '',
      author: '',
      issueDate: new Date().toISOString().split('T')[0]
    });
    setError('');
  };

  return (
    <div className="min-h-screen bg-theme-bg">
      <div className="layout-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 ">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/dashboard')}
              className="btn-secondary p-3 mr-4 hover:bg-theme-card/50 transition-colors"
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-mobile-2xl font-heading font-bold text-theme-primary">
                Add New Book
              </h1>
              <p className="text-theme-secondary text-mobile-base">
                Track a newly borrowed book and get due date reminders
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Add Book Form */}
          <div className="card">
            {/* Error Alert */}
            {error && (
              <div className="bg-status-danger/20 border border-status-danger/30 text-status-danger px-4 py-3 rounded-lg mb-6 animate-in slide-in-from-top duration-200">
                <div className="flex items-start">
                  <svg className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Book Title - Required */}
              <div>
                <label htmlFor="title" className="block text-theme-primary font-medium mb-2 text-mobile-sm">
                  Book Title *
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-theme-muted" />
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="input-field pl-12"
                    placeholder="Enter book title"
                    required
                    maxLength={200}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Book ID - Optional */}
              <div>
                <label htmlFor="bookId" className="block text-theme-primary font-medium mb-2 text-mobile-sm">
                  Book ID
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-theme-muted" />
                  <input
                    type="text"
                    id="bookId"
                    name="bookId"
                    value={formData.bookId}
                    onChange={handleChange}
                    className="input-field pl-12"
                    placeholder="e.g., BK001, LIB-2025-001"
                    maxLength={50}
                    autoComplete="off"
                  />
                </div>
                <p className="text-theme-muted text-mobile-xs mt-1">
                  Optional: Library catalog number or barcode
                </p>
              </div>

              {/* Author - Optional */}
              <div>
                <label htmlFor="author" className="block text-theme-primary font-medium mb-2 text-mobile-sm">
                  Author
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-theme-muted" />
                  <input
                    type="text"
                    id="author"
                    name="author"
                    value={formData.author}
                    onChange={handleChange}
                    className="input-field pl-12"
                    placeholder="Enter author name"
                    maxLength={100}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Issue Date - Required */}
              <div>
                <label htmlFor="issueDate" className="block text-theme-primary font-medium mb-2 text-mobile-sm">
                  Issue Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-theme-muted" />
                  <input
                    type="date"
                    id="issueDate"
                    name="issueDate"
                    value={formData.issueDate}
                    onChange={handleChange}
                    className="input-field pl-12"
                    max={new Date().toISOString().split('T')[0]} // Can't select future dates
                    required
                  />
                </div>
                <p className="text-theme-muted text-mobile-xs mt-1">
                  When you borrowed this book from the library
                </p>
              </div>

              {/* Due Date Preview Card */}
              <div className="card bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 border-accent-primary/30">
                <div className="flex items-center">
                  <div className="bg-accent-primary/20 p-3 rounded-lg">
                    <Calendar className="w-6 h-6 text-accent-primary" />
                  </div>
                  <div className="ml-4">
                    <p className="text-theme-secondary text-mobile-sm">Due Date (Auto-calculated)</p>
                    <p className="text-theme-primary font-heading font-semibold text-mobile-lg">
                      {bookUtils.formatDate(dueDate)}
                    </p>
                    <p className="text-theme-muted text-mobile-xs">
                      14 days from issue date
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center justify-center sm:flex-1 transition-all duration-200"
                  aria-label="Add book to your library"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Adding Book...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Add Book
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="btn-secondary sm:flex-1 transition-colors"
                  aria-label="Reset form fields"
                >
                  Reset Form
                </button>
              </div>
            </form>
             
            {/* Help Text */}
            <div className="mt-8 p-4 bg-accent-primary/10 border border-accent-primary/20 rounded-lg">
              <h3 className="font-heading font-semibold text-theme-primary mb-2 text-mobile-sm">
                💡 Quick Tips
              </h3>
              <ul className="text-theme-secondary text-mobile-xs space-y-1">
                <li>• Issue date defaults to today - change if you borrowed earlier</li>
                <li>• Due date is automatically calculated (14 days from issue)</li>
                <li>• You'll receive notifications 3 days, 1 day, and on the due date</li>
                <li>• Book ID and author are optional but help with organization</li>
                <li>• All your books will be tracked on the dashboard</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBookPage;

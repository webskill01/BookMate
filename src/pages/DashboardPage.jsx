// src/pages/DashboardPage.jsx - CLEAN MODERN VERSION
import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Calendar, AlertCircle, Clock, IndianRupee, 
  RotateCcw, Bell, ChevronDown, BookMarked
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { bookService } from '../services/bookService';
import { bookUtils } from '../utils/bookUtils';
import { productionNotificationService } from '../services/productionNotificationService';
import { Link, useNavigate, useLocation } from 'react-router-dom';

// Import utility components
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';

const DashboardPage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reissuingBook, setReissuingBook] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [checking, setChecking] = useState(false);
  const [sortBy, setSortBy] = useState('due');
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle success messages from navigation state
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

  // Load user's books
  useEffect(() => {
    const loadBooks = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        setError(null);
        const userBooks = await bookService.getUserBooks(currentUser.uid);
        setBooks(userBooks);
      } catch (err) {
        setError('Failed to load books. Please try refreshing the page.');
        if (import.meta.env.DEV) {
          console.error('Error loading books:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadBooks();
  }, [currentUser]);

  // Auto-check notifications
  useEffect(() => {
    const autoCheckNotifications = async () => {
      if (!currentUser) return;
      
      try {
        const isEnabled = await productionNotificationService.isEnabled(currentUser.uid);
        if (isEnabled && Notification.permission === 'granted') {
          const lastCheck = localStorage.getItem(`last_auto_check_${currentUser.uid}`);
          const now = Date.now();
          
          if (!lastCheck || (now - parseInt(lastCheck)) > 4 * 60 * 60 * 1000) {
            await productionNotificationService.checkAndSendNotifications(currentUser.uid);
            localStorage.setItem(`last_auto_check_${currentUser.uid}`, now.toString());
          }
        }
      } catch (error) {
        // Silent fail
      }
    };

    if (books.length > 0 && !loading) {
      setTimeout(autoCheckNotifications, 3000);
    }
  }, [currentUser, books, loading]);

  // Handle book reissue
  const handleReissue = async (book, event) => {
  event.stopPropagation();
  try {
    setReissuingBook(book.id);
    setError(null);
    
    // Calculate new due date (14 days from today) - same as BookDetailsPage
    const today = new Date();
    const newDueDate = new Date(today);
    newDueDate.setDate(today.getDate() + 14);
    
    // Update the existing book with new due date - same method as BookDetailsPage
    const updatedData = {
      dueDate: newDueDate.toISOString(),
      reissuedAt: new Date().toISOString(),
      reissueCount: (book.reissueCount || 0) + 1
    };
    
    await bookService.updateBook(book.id, updatedData); // <- FIXED: Use updateBook instead
    
    // Refresh the books list
    const userBooks = await bookService.getUserBooks(currentUser.uid);
    setBooks(userBooks);
    
    setMessage({ 
      type: 'success', 
      text: `"${book.title}" has been reissued! New due date: ${bookUtils.formatDate(newDueDate.toISOString())}` 
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    
  } catch (error) {
    setError('Failed to reissue book. Please try again.');
    if (import.meta.env.DEV) {
      console.error('Error reissuing book:', error);
    }
  } finally {
    setReissuingBook(null);
  }
};

  // Updated handleManualCheck with mobile debug
const handleManualCheck = async () => {
  try {
    setChecking(true);
    
    // First check if notifications are enabled at all
    const isEnabled = await productionNotificationService.isEnabled(currentUser.uid);
    
    if (!isEnabled) {
      const enableResult = await productionNotificationService.requestPermission(currentUser.uid);
      if (!enableResult.success) {
        setMessage({ 
          type: 'error', 
          text: 'Please enable notifications in your browser settings to receive reminders.' 
        });
        return;
      }
    }
    
    if (Notification.permission !== 'granted') {
      setMessage({ 
        type: 'error', 
        text: 'Notification permission not granted. Please enable notifications in your browser.' 
      });
      return;
    }
    
    // Get debug info before checking notifications
    const result = await productionNotificationService.checkAndSendNotifications(currentUser.uid);

    
    if (result.success && result.notificationsSent > 0) {
      setMessage({ 
        type: 'success', 
        text: `Sent ${result.notificationsSent} notification${result.notificationsSent !== 1 ? 's' : ''} for upcoming due dates` 
      });
    } else {
      setMessage({ 
        type: 'success', 
        text: 'All books checked - no notifications needed right now' 
      });
    }
    
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  } catch (error) {
    console.error('Manual check error:', error);
    setMessage({ type: 'error', text: 'Failed to check notifications' });
  } finally {
    setChecking(false);
  }
};



  // Sort books based on selected criteria
  const sortBooks = (books, criteria) => {
    const sortedBooks = [...books];
    
    switch (criteria) {
      case 'newest':
        return sortedBooks.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
      case 'oldest':
        return sortedBooks.sort((a, b) => new Date(a.issueDate) - new Date(b.issueDate));
      case 'due':
        return sortedBooks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      case 'overdue':
        return sortedBooks.sort((a, b) => {
          const aDays = bookUtils.calculateDaysRemaining(a.dueDate);
          const bDays = bookUtils.calculateDaysRemaining(b.dueDate);
          
          // Overdue books first (negative days), then by most overdue
          if (aDays < 0 && bDays >= 0) return -1;
          if (bDays < 0 && aDays >= 0) return 1;
          if (aDays < 0 && bDays < 0) return aDays - bDays; // Most overdue first
          return aDays - bDays; // Due soonest first for non-overdue
        });
      case 'title':
        return sortedBooks.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sortedBooks;
    }
  };

  // Calculate stats
  const stats = {
    total: books.length,
    overdue: books.filter(book => bookUtils.calculateDaysRemaining(book.dueDate) < 0).length,
    dueSoon: books.filter(book => {
      const days = bookUtils.calculateDaysRemaining(book.dueDate);
      return days >= 0 && days <= 3;
    }).length,
    totalFines: books.reduce((sum, book) => {
      return sum + bookUtils.calculateFineSync(book.dueDate, book.finePerDay || 1);
    }, 0)
  };

  // Sort options
  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'due', label: 'Due Date' },
    { value: 'overdue', label: 'Overdue First' },
    { value: 'title', label: 'Title A-Z' }
  ];

  const sortedBooks = sortBooks(books, sortBy);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg">
        <div className="layout-container">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-3 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div>
                <h3 className="text-mobile-lg font-heading font-semibold text-theme-primary">
                  Loading Your Library
                </h3>
                <p className="text-theme-secondary text-mobile-sm mt-1">
                  Please wait...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-theme-bg overflow-x-hidden">
      <div className="layout-container pb-6">
        {/* Header */}
        <div className=" pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-mobile-xl sm:text-mobile-2xl font-heading font-bold text-theme-primary flex items-center">
                <div className="bg-accent-primary p-2 rounded-xl mr-3 flex-shrink-0">
                  <BookMarked className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="truncate">My Library</span>
              </h1>
              <p className="text-theme-secondary text-mobile-sm mt-1">
                Track your borrowed books
              </p>
            </div>
            
            <div className="flex items-center justify-around gap-2 sm:gap-3 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualCheck}
                loading={checking}
                icon={Bell}
                className="cursor-pointer border border-theme-border hover:border-accent-primary "
              >
                Check Notifications
              </Button>
              
              <Button
                onClick={() => navigate('/add-book')}
                icon={Plus}
                size="sm"
                className="px-4 sm:px-6"
              >
                Add Book
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/15 dark:to-blue-900/10 border border-blue-200/50 dark:border-blue-700/30 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-blue-600 dark:text-blue-500 text-mobile-xs font-medium uppercase tracking-wide truncate">
                    Total
                  </p>
                  <p className="text-mobile-lg sm:text-mobile-xl font-heading font-bold text-theme-primary mt-0.5">
                    {stats.total}
                  </p>
                </div>
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-500 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-500/15 dark:to-red-900/10 border border-red-200/50 dark:border-red-700/30 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-red-600 dark:text-red-500 text-mobile-xs font-medium uppercase tracking-wide truncate">
                    Overdue
                  </p>
                  <p className="text-mobile-lg sm:text-mobile-xl font-heading font-bold text-theme-primary mt-0.5">
                    {stats.overdue}
                  </p>
                </div>
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-500 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-500/15 dark:to-yellow-900/10 border border-yellow-200/50 dark:border-yellow-700/30 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-yellow-600 dark:text-yellow-500 text-mobile-xs font-medium uppercase tracking-wide truncate">
                    Due Soon
                  </p>
                  <p className="text-mobile-lg sm:text-mobile-xl font-heading font-bold text-theme-primary mt-0.5">
                    {stats.dueSoon}
                  </p>
                </div>
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-500/15 dark:to-purple-900/10 border border-purple-200/50 dark:border-purple-700/30 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-purple-600 dark:text-purple-500 text-mobile-xs font-medium uppercase tracking-wide truncate">
                    Fines
                  </p>
                  <p className="text-mobile-lg sm:text-mobile-xl font-heading font-bold text-theme-primary mt-0.5">
                    ₹{stats.totalFines}
                  </p>
                </div>
                <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-500 flex-shrink-0 ml-2" />
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className="mb-4 sm:mb-6">
            <Alert 
              type={message.type}
              message={message.text}
              onClose={() => setMessage({ type: '', text: '' })}
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 sm:mb-6">
            <Alert 
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          </div>
        )}

        {/* Sort Controls */}
        {books.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-mobile-lg font-heading font-semibold text-theme-primary">
                Your Books
              </h2>
              
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-theme-card border border-theme-border rounded-lg px-3 py-2 pr-8 text-mobile-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-secondary pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Books Grid */}
        {sortedBooks.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-theme-card/50 rounded-2xl p-8 max-w-sm mx-auto">
              <div className="bg-accent-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-6">
                <BookOpen className="w-8 h-8 text-accent-primary mx-auto" />
              </div>
              <h3 className="text-mobile-lg font-heading font-semibold text-theme-primary mb-3">
                Welcome to Your Library!
              </h3>
              <p className="text-theme-secondary mb-6 text-mobile-sm leading-relaxed">
                Add your borrowed books to track due dates and fines.
              </p>
              <Button
                onClick={() => navigate('/add-book')}
                icon={Plus}
              >
                Add Your First Book
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {sortedBooks.map(book => {
              const daysRemaining = bookUtils.calculateDaysRemaining(book.dueDate);
              const fine = bookUtils.calculateFineSync(book.dueDate, book.finePerDay || 1);
              const statusInfo = bookUtils.getStatusInfo(daysRemaining, fine);
              
              return (
                <div
                  key={book.id}
                  onClick={() => navigate(`/book/${book.id}`)}
                  className="group bg-theme-card border border-theme-border hover:border-accent-primary/40 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-4 sm:p-6 pb-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-3">
                        <h3 className="text-mobile-base sm:text-mobile-lg font-heading font-bold text-theme-primary group-hover:text-accent-primary transition-colors line-clamp-2 mb-1">
                          {book.title}
                        </h3>
                        {book.author && (
                          <p className="text-theme-secondary text-mobile-sm truncate">
                            by {book.author}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className={`px-2 py-1 rounded-lg text-mobile-xs font-medium ${statusInfo.color} ${statusInfo.bgColor}`}>
                          {statusInfo.message}
                        </div>
                        {fine > 0 && (
                          <div className="bg-red-200 dark:bg-red-500/10 text-red-600 dark:text-red-500 px-2 py-1 rounded-lg text-mobile-xs font-bold flex items-center">
                            <IndianRupee className="w-3 h-3 mr-1" />
                            {fine}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-mobile-sm">
                        <span className="text-theme-secondary flex items-center">
                          <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">Due Date</span>
                        </span>
                        <span className={`font-medium ${statusInfo.color} flex-shrink-0`}>
                          {bookUtils.formatDate(book.dueDate)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-mobile-sm">
                        <span className="text-theme-secondary flex items-center">
                          <span className="w-4 mr-2 flex-shrink-0 text-center font-mono text-mobile-lg">#</span>
                          <span className="truncate">Book ID</span>
                        </span>
                        <span className="text-theme-primary font-mono text-mobile-xs flex-shrink-0">
                          {book.bookId}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/book/${book.id}`)}
                        className="flex-1 text-mobile-sm"
                      >
                        View Details
                      </Button>
                      
                      {daysRemaining < 0 && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => handleReissue(book, e)}
                          loading={reissuingBook === book.id}
                          icon={RotateCcw}
                          className="bg-yellow-100 dark:bg-yellow-400/5 text-yellow-500 dark:text-yellow-500 hover:bg-yellow-200 dark:hover:bg-yellow-500/15 dark:hover:text-yellow-400 border-yellow-200 dark:border-yellow-800 flex-shrink-0"
                        >
                          <span className="inline">Reissue</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;

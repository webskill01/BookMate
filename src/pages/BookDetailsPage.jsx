// src/pages/BookDetailsPage.jsx - SUBTLE COLOR & RESPONSIVE IMPROVEMENTS
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, IndianRupee, RotateCcw, Edit3, Trash2,
  BookOpen, User, AlertTriangle, CheckCircle2, BookMarked, Package,
  Save, X, Hash,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { bookService } from '../services/bookService';
import { bookUtils } from '../utils/bookUtils';

// Import utility components
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import Input from '../components/ui/Input';

const BookDetailsPage = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [book, setBook] = useState(null);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [reissuing, setReissuing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [returning, setReturning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Load book details
  useEffect(() => {
    const loadBookDetails = async () => {
      if (!currentUser || !bookId) return;

      try {
        setLoading(true);
        setError(null);

        const bookData = await bookService.getBookById(bookId);

        // Verify this book belongs to the current user
        if (bookData.userId !== currentUser.uid) {
          throw new Error('Book not found or access denied');
        }

        setBook(bookData);

        // Initialize edit data - only the fields that exist in database
        setEditData({
          title: bookData.title || '',
          author: bookData.author || '',
          bookId: bookData.bookId || ''
        });
      } catch (err) {
        setError('Failed to load book details');
        if (import.meta.env.DEV) {
          console.error('Error loading book:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadBookDetails();
  }, [currentUser, bookId]);

  // Handle inline editing toggle
  const handleEditToggle = () => {
    if (editing) {
      // Cancel editing - reset edit data
      setEditData({
        title: book.title || '',
        author: book.author || '',
        bookId: book.bookId || ''
      });
    }
    setEditing(!editing);
  };

  // Handle save edited data
  const handleSaveEdit = async () => {
    // Validation
    if (!editData.title.trim()) {
      setMessage({ type: 'error', text: 'Book title is required' });
      return;
    }

    if (!editData.bookId.trim()) {
      setMessage({ type: 'error', text: 'Book ID is required' });
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Update book in database
      const updatedData = {
        title: editData.title.trim(),
        author: editData.author.trim(),
        bookId: editData.bookId.trim()
      };

      await bookService.updateBook(bookId, updatedData);

      // Update local state
      setBook({ ...book, ...updatedData });
      setEditing(false);

      setMessage({
        type: 'success',
        text: 'Book details updated successfully!'
      });

      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setError('Failed to update book details. Please try again.');
      if (import.meta.env.DEV) {
        console.error('Update error:', error);
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle book reissue
  const handleReissue = async () => {
    try {
      setReissuing(true);
      setError(null);

      // Calculate new due date (14 days from today)
      const today = new Date();
      const newDueDate = new Date(today);
      newDueDate.setDate(today.getDate() + 14);

      // Update the existing book with new due date
      const updatedData = {
        dueDate: newDueDate.toISOString(),
        reissuedAt: new Date().toISOString(),
        reissueCount: (book.reissueCount || 0) + 1
      };

      await bookService.updateBook(bookId, updatedData);

      // Update local state
      setBook({ ...book, ...updatedData });

      setMessage({
        type: 'success',
        text: `"${book.title}" has been reissued! New due date: ${bookUtils.formatDate(newDueDate.toISOString())}`
      });

      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      setError('Failed to reissue book. Please try again.');
      if (import.meta.env.DEV) {
        console.error('Reissue error:', error);
      }
    } finally {
      setReissuing(false);
    }
  };

  // Handle Mark as Return
  const handleMarkAsReturn = async () => {
    try {
      setReturning(true);
      setError(null);

      // Mark book as returned using the service method
      await bookService.returnBook(bookId);

      navigate('/dashboard', {
        state: {
          message: `"${book.title}" has been marked as returned and removed from your active books!`,
          type: 'success'
        }
      });
    } catch (error) {
      setError('Failed to mark book as returned. Please try again.');
      if (import.meta.env.DEV) {
        console.error('Return error:', error);
      }
    } finally {
      setReturning(false);
    }
  };

  // Handle book deletion
  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);

      await bookService.deleteBook(bookId);

      navigate('/dashboard', {
        state: {
          message: `"${book.title}" has been deleted permanently`,
          type: 'success'
        }
      });
    } catch (error) {
      setError('Failed to delete book. Please try again.');
      setDeleting(false);
      setShowDeleteConfirm(false);
      if (import.meta.env.DEV) {
        console.error('Delete error:', error);
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg">
        <div className="layout-container">
          <div className="pt-8">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                icon={ArrowLeft}
              />
              <div className="ml-4">
                <div className="h-6 bg-theme-border animate-pulse rounded w-32 mb-2"></div>
                <div className="h-4 bg-theme-border animate-pulse rounded w-24"></div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-theme-card rounded-2xl p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-theme-border rounded w-3/4"></div>
                  <div className="h-4 bg-theme-border rounded w-1/2"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-theme-border rounded w-full"></div>
                    <div className="h-4 bg-theme-border rounded w-full"></div>
                    <div className="h-4 bg-theme-border rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !book) {
    return (
      <div className="min-h-screen bg-theme-bg">
        <div className="layout-container">
          <div className="pt-8">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                icon={ArrowLeft}
              />
              <h1 className="ml-4 text-mobile-xl font-heading font-semibold text-theme-primary">
                Book Details
              </h1>
            </div>

            <Alert
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!book) return null;

  // Calculate book status and metrics
  const daysRemaining = bookUtils.calculateDaysRemaining(book.dueDate);
  const fine = bookUtils.calculateFineSync(book.dueDate, book.finePerDay || 1);
  const isOverdue = daysRemaining < 0;

  return (
    <div className="min-h-screen bg-theme-bg">
      <div className="layout-container pb-8">
        {/* Header */}
        <div className="pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                icon={ArrowLeft}
                className="mr-3"
              />
              <div>
                <h1 className="text-mobile-xl font-heading font-bold text-theme-primary">
                  Book Details
                </h1>
                <p className="text-theme-secondary text-mobile-sm">
                  Manage your borrowed book
                </p>
              </div>
            </div>

            {!editing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditToggle}
                icon={Edit3}
                className='cursor-pointer'
              >
                Edit
              </Button>
            )}
          </div>
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

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <Alert
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          </div>
        )}

        <div className="space-y-6 max-w-4xl mx-auto">
  {/* Main Book Information Card - ENHANCED: Grid Layout with Top-Right Badge */}
  <div className={`bg-theme-card rounded-2xl border p-6 ${isOverdue
      ? 'border-red-300/60 bg-red-50/30'
      : daysRemaining <= 3
        ? 'border-orange-300/50 bg-orange-50/30'
        : 'border-green-300/50 bg-green-50/30'
    }`}>
    
    {/* ENHANCED: Top-level grid with status badge in top-right */}
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-6">
      {/* Content Area - Full width on mobile, takes most space on larger screens */}
      <div className="sm:col-span-9 order-2 sm:order-1">
        {editing ? (
          /* Edit Mode - Input Fields with Maximum Width */
          <div className="space-y-4">
            <Input
              label="Book Title"
              value={editData.title}
              onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter book title"
              className="w-full"
            />
            <Input
              label="Author"
              value={editData.author}
              onChange={(e) => setEditData(prev => ({ ...prev, author: e.target.value }))}
              placeholder="Enter author name"
              className="w-full"
            />
            <Input
              label="Book ID"
              value={editData.bookId}
              onChange={(e) => setEditData(prev => ({ ...prev, bookId: e.target.value }))}
              placeholder="Enter book ID"
              className="w-full"
              icon={Hash}
            />
          </div>
        ) : (
          /* Display Mode - Book Information */
          <div className="space-y-3">
            <h2 className="text-mobile-2xl font-heading font-semibold text-theme-primary leading-tight">
              {book.title}
            </h2>
            {book.author && (
              <p className="text-mobile-lg text-theme-secondary flex items-center gap-2">
                <User className="w-4 h-4 flex-shrink-0" />
                <span>by {book.author}</span>
              </p>
            )}
            <div className="flex items-center gap-2 text-theme-secondary">
              <Hash className="w-4 h-4 flex-shrink-0" />
              <code className="py-1 rounded text-mobile-sm font-mono break-all">
                {book.bookId}
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Status Badge Area - Top-right position, minimal space */}
      <div className="sm:col-span-3 order-1 sm:order-2 flex justify-start sm:justify-end items-start">
        <div className={`inline-flex px-3 py-2 rounded-full text-mobile-sm font-semibold items-center gap-2 whitespace-nowrap transition-all duration-200 ${isOverdue
            ? 'text-red-700 bg-red-100/85 border border-red-200/80 shadow-sm'
            : daysRemaining === 0
              ? 'text-orange-700 bg-orange-100/85 border border-orange-200/80 shadow-sm'
              : daysRemaining <= 3
                ? 'text-orange-700 bg-orange-100/85 border border-orange-200/80 shadow-sm'
                : 'text-green-700 bg-green-100/85 border border-green-200/80 shadow-sm'
          }`}>
          {isOverdue ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="inline">{Math.abs(daysRemaining)} days overdue</span>
            </>
          ) : daysRemaining === 0 ? (
            <>
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Due today</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="inline">{daysRemaining} days left</span>
            </>
          )}
        </div>
      </div>
    </div>


            {/* Edit Action Buttons */}
            {editing && (
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Button
                  onClick={handleSaveEdit}
                  loading={saving}
                  icon={Save}
                  className="flex-1 sm:flex-none"
                >
                  Save Changes
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleEditToggle}
                  icon={X}
                  className="flex-1 sm:flex-none cursor-pointer border-1"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Simplified Metrics Grid - Only Fine and Fine Rate */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center sm:text-left">
                <p className="text-theme-secondary text-mobile-xs uppercase tracking-wide font-medium">
                  Current Fine
                </p>
                <p className={`text-mobile-2xl font-heading font-semibold ${fine > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                  ₹{fine}
                </p>
              </div>

              <div className="text-center sm:text-left">
                <p className="text-theme-secondary text-mobile-xs uppercase tracking-wide font-medium">
                  Fine Rate
                </p>
                <p className="text-mobile-xl font-heading font-semibold text-theme-primary">
                  ₹{book.finePerDay || 1}/day
                </p>
              </div>
            </div>
          </div>


          {/* Date Information Cards - COMPACT: Two Columns, Optimized for Mobile */}
<div className="grid grid-cols-2 gap-4">
  {/* Issue Date Card - Compact */}
  <div className="bg-theme-card border border-theme-border rounded-xl p-4">
    <div className="flex items-center gap-2 mb-3">
      <div className="bg-blue-500/20 p-2 rounded-lg">
        <Calendar className="w-4 h-4 text-blue-600" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-heading font-semibold text-theme-primary text-mobile-sm leading-tight">
          Issue Date
        </h3>
      </div>
    </div>
    <p className="text-xs text-theme-secondary mt-1">
     Borrowed On
    </p>
    <p className="text-mobile-sm font-heading font-semibold text-theme-primary">
      {bookUtils.formatDate(book.issueDate)}
    </p>
  </div>

  {/* Due Date Card - Compact with Status */}
  <div className="bg-theme-card border border-theme-border rounded-xl p-4">
    <div className="flex items-center gap-2 mb-3">
      <div className={`p-2 rounded-lg ${isOverdue
          ? 'bg-red-500/20'
          : daysRemaining <= 3
            ? 'bg-orange-500/20'
            : 'bg-green-500/20'
        }`}>
        <Clock className={`w-4 h-4 ${isOverdue
            ? 'text-red-600'
            : daysRemaining <= 3
              ? 'text-orange-600'
              : 'text-green-600'
          }`} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-heading font-semibold text-theme-primary text-mobile-sm leading-tight">
          Due Date
        </h3>
      </div>
    </div>
    
    <p className="text-xs text-theme-secondary mt-1">
      Submit On
    </p>
    <p className="text-mobile-sm font-heading font-semibold text-theme-primary">
      {bookUtils.formatDate(book.dueDate)}
    </p>
    <p className={`text-xs font-medium mt-1 ${isOverdue
        ? 'text-red-600'
        : daysRemaining <= 3
          ? 'text-orange-600'
          : 'text-green-600'
      }`}>
      {isOverdue
        ? `Overdue by ${Math.abs(daysRemaining)}d`
        : daysRemaining === 0
          ? 'Due today'
          : `${daysRemaining} days left`
      }
    </p>
  </div>
</div>


          {/* UPDATED: Subtle Fine Information Colors */}
          {fine > 0 && (
            <div className="bg-theme-card border-1 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-500/10 p-2 rounded-lg">
                  <IndianRupee className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-theme-primary">Fine Calculation</h3>
                  <p className="text-theme-secondary text-mobile-sm">Overdue fine breakdown</p>
                </div>
              </div>
              <div className="bg-red-500/10 border border-red-200/80 rounded-lg p-4">
                <p className="text-mobile-sm text-red-600">
                  <strong>{Math.abs(daysRemaining)} days overdue</strong> × ₹{book.finePerDay || 1} per day = <strong>₹{fine}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!editing && (
             <div className="bg-theme-card border border-theme-border rounded-2xl p-6">
    <h3 className="text-mobile-lg font-heading font-semibold text-theme-primary mb-4 flex items-center gap-2">
      <div className="bg-green-500/20 p-2 rounded-lg">
      <Zap className="w-5 h-5 text-accent-primary" />
      </div>
      Quick Actions
    </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button
                  onClick={handleMarkAsReturn}
                  loading={returning}
                  icon={Package}
                  className="bg-green-600 hover:bg-green-700 text-white w-full"
                >
                  Mark as Returned
                </Button>

                {isOverdue && (
                  <Button
                    onClick={handleReissue}
                    loading={reissuing}
                    icon={RotateCcw}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white w-full"
                  >
                    Reissue Book
                  </Button>
                )}

                <Button
                  onClick={handleEditToggle}
                  icon={Edit3}
                  variant="secondary"
                  className="w-full"
                >
                  Edit Details
                </Button>

                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  icon={Trash2}
                  variant="ghost"
                  className="text-red-500 hover:bg-red-100/85 hover:text-red-600 border-red-200 w-full cursor-pointer"
                >
                  Delete Book
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-theme-card rounded-2xl shadow-2xl max-w-md w-full p-6 border border-theme-border">
              <div className="text-center mb-6">
                <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-mobile-xl font-heading font-bold text-theme-primary mb-2">
                  Delete Book
                </h3>
                <p className="text-theme-secondary text-mobile-sm leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-medium text-theme-primary">"{book.title}"</span>?{' '}
                  This will remove it from your library and cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  loading={deleting}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  Delete Book
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookDetailsPage;

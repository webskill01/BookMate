// src/utils/bookUtils.js
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const bookUtils = {
  // Calculate due date (14 days from issue date)
  calculateDueDate: (issueDate) => {
    const issue = new Date(issueDate);
    const due = new Date(issue);
    due.setDate(issue.getDate() + 14); // 14 days loan period
    return due;
  },

  // Format date for display
  formatDate: (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  // FIXED: Calculate days remaining (positive = future, negative = overdue)
  calculateDaysRemaining: (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0); // Start of due date (NOT end of day)
    
    const diffTime = due.getTime() - today.getTime();
    const days = diffTime / (1000 * 60 * 60 * 24);
    
    // Use Math.round() for accurate day counting
    return Math.round(days);
  },

  // Get user's fine rate from Firestore
  getUserFineRate: async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data().finePerDay || 1;
      }
      return 1;
    } catch (error) {
      return 1;
    }
  },

  // Calculate fine synchronously using book's stored fine rate
  calculateFineSync: (dueDate, finePerDay = 1) => {
    const daysRemaining = bookUtils.calculateDaysRemaining(dueDate);
    
    if (daysRemaining >= 0) {
      return 0; // Not overdue
    }
    
    const daysOverdue = Math.abs(daysRemaining);
    return daysOverdue * finePerDay;
  },

  // Calculate fine async (fallback method)
  calculateFine: async (dueDate, userId, bookFineRate = null) => {
    const daysRemaining = bookUtils.calculateDaysRemaining(dueDate);
    
    if (daysRemaining >= 0) {
      return 0; // Not overdue
    }

    let fineRate = bookFineRate;
    if (!fineRate) {
      fineRate = await bookUtils.getUserFineRate(userId);
    }

    const daysOverdue = Math.abs(daysRemaining);
    return daysOverdue * fineRate;
  },

  // Get book status and styling info
  getStatusInfo: (daysRemaining, fine = 0) => {
    if (daysRemaining < 0) {
      return {
        status: 'overdue',
        color: 'text-status-danger',
        bgColor: 'bg-status-danger/10',
        borderColor: 'border-status-danger/30',
        message: `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} overdue`,
        priority: 'high',
        fine: fine
      };
    } else if (daysRemaining === 0) {
      return {
        status: 'due-today',
        color: 'text-status-warning',
        bgColor: 'bg-status-warning/10',
        borderColor: 'border-status-warning/30',
        message: 'Due today',
        priority: 'medium',
        fine: 0
      };
    } else if (daysRemaining === 1) {
      return {
        status: 'due-tomorrow',
        color: 'text-status-warning',
        bgColor: 'bg-status-warning/10',
        borderColor: 'border-status-warning/30',
        message: 'Due tomorrow',
        priority: 'medium',
        fine: 0
      };
    } else if (daysRemaining <= 3) {
      return {
        status: 'due-soon',
        color: 'text-status-warning',
        bgColor: 'bg-status-warning/10',
        borderColor: 'border-status-warning/30',
        message: `Due in ${daysRemaining} days`,
        priority: 'medium',
        fine: 0
      };
    } else {
      return {
        status: 'active',
        color: 'text-status-success',
        bgColor: 'bg-status-success/10',
        borderColor: 'border-status-success/30',
        message: `${daysRemaining} days remaining`,
        priority: 'low',
        fine: 0
      };
    }
  },

  // Legacy method for backward compatibility
  getBookStatus: (dueDate) => {
    const daysRemaining = bookUtils.calculateDaysRemaining(dueDate);
    const statusInfo = bookUtils.getStatusInfo(daysRemaining);
    return statusInfo.status;
  }
};

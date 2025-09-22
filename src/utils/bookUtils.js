// src/utils/bookUtils.js - VERCEL-COMPATIBLE TIMEZONE FIX

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const bookUtils = {
  // Calculate due date (14 days from issue date)
  calculateDueDate: (issueDate) => {
    const issue = new Date(issueDate);
    const due = new Date(issue);
    due.setDate(issue.getDate() + 14);
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

  // VERCEL-COMPATIBLE: Calculate days remaining with IST timezone
  calculateDaysRemaining: (dueDate) => {
    // Always calculate in IST regardless of server timezone
    const now = new Date();
    
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60; // IST offset in minutes
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utc + (istOffset * 60000));
    
    // Set to start of day in IST
    istTime.setHours(0, 0, 0, 0);
    
    // Convert due date to IST
    const due = new Date(dueDate);
    const utcDue = due.getTime() + (due.getTimezoneOffset() * 60000);
    const istDue = new Date(utcDue + (istOffset * 60000));
    istDue.setHours(0, 0, 0, 0);
    
    const diffTime = istDue.getTime() - istTime.getTime();
    const days = diffTime / (1000 * 60 * 60 * 24);
    
    return Math.round(days);
  },

  // Rest of your existing methods...
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

  calculateFineSync: (dueDate, finePerDay = 1) => {
    const daysRemaining = bookUtils.calculateDaysRemaining(dueDate);
    if (daysRemaining >= 0) {
      return 0;
    }
    const daysOverdue = Math.abs(daysRemaining);
    return daysOverdue * finePerDay;
  },

  calculateFine: async (dueDate, userId, bookFineRate = null) => {
    const daysRemaining = bookUtils.calculateDaysRemaining(dueDate);
    if (daysRemaining >= 0) {
      return 0;
    }
    let fineRate = bookFineRate;
    if (!fineRate) {
      fineRate = await bookUtils.getUserFineRate(userId);
    }
    const daysOverdue = Math.abs(daysRemaining);
    return daysOverdue * fineRate;
  },

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

  getBookStatus: (dueDate) => {
    const daysRemaining = bookUtils.calculateDaysRemaining(dueDate);
    const statusInfo = bookUtils.getStatusInfo(daysRemaining);
    return statusInfo.status;
  }
};

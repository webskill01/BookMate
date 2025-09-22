// src/services/bookService.js
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../config/firebase";

export const bookService = {
  // Add a new book with user's current fine rate
  async addBook(userId, bookData) {
    try {
      // Get user's current fine rate
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const userFineRate = userDoc.exists() ? (userDoc.data().finePerDay || 1) : 1;

      const docRef = await addDoc(collection(db, "books"), {
        ...bookData,
        userId,
        finePerDay: userFineRate, // Store user's current fine rate with the book
        createdAt: new Date().toISOString(),
        status: "active",
      });
      
      return {
        id: docRef.id,
        ...bookData,
        userId,
        finePerDay: userFineRate,
        status: "active"
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error adding book:", error);
      }
      throw error;
    }
  },

  // Get all active books for a user
  async getUserBooks(userId) {
    try {
      const q = query(
        collection(db, "books"),
        where("userId", "==", userId),
        where("status", "==", "active"),
        orderBy("createdAt", "desc") // Newest first
      );
      
      const querySnapshot = await getDocs(q);
      const books = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure finePerDay exists (backward compatibility)
          finePerDay: data.finePerDay || 1
        };
      });

      return books;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching books:", error);
      }
      throw error;
    }
  },

  // Get all books (including returned) for a user
  async getUserAllBooks(userId) {
    try {
      const q = query(
        collection(db, "books"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        finePerDay: doc.data().finePerDay || 1
      }));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching all books:", error);
      }
      throw error;
    }
  },

  // Mark book as returned
  async returnBook(bookId) {
    try {
      await updateDoc(doc(db, "books", bookId), {
        status: "returned",
        returnedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error returning book:", error);
      }
      throw error;
    }
  },

  // Reissue a book (creates new entry and marks old as returned)
  async reissueBook(userId, originalBook) {
    try {
      const today = new Date();
      
      // Get user's current fine rate for the new book
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const currentFineRate = userDoc.exists() ? (userDoc.data().finePerDay || 1) : 1;

      // Create new book entry with current fine rate
      const newBookData = {
        title: originalBook.title,
        bookId: originalBook.bookId,
        author: originalBook.author || "",
        issueDate: today.toISOString(),
        dueDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from today
        finePerDay: currentFineRate, // Use current fine rate
        reissuedFrom: originalBook.id, // Track reissue history
      };

      // Add new book
      const newBook = await this.addBook(userId, newBookData);

      // Mark original as returned
      await this.returnBook(originalBook.id);

      return newBook;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error reissuing book:", error);
      }
      throw error;
    }
  },

  // Get book details by ID
  async getBookById(bookId) {
    try {
      const docRef = doc(db, "books", bookId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          // Ensure finePerDay exists (backward compatibility)
          finePerDay: data.finePerDay || 1
        };
      } else {
        throw new Error("Book not found");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching book:", error);
      }
      throw error;
    }
  },

  // Update book details
  async updateBook(bookId, updateData) {
    try {
      const sanitizedData = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      // Don't allow updating critical fields through this method
      delete sanitizedData.userId;
      delete sanitizedData.createdAt;
      delete sanitizedData.status;

      await updateDoc(doc(db, 'books', bookId), sanitizedData);
      
      return sanitizedData;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating book:', error);
      }
      throw error;
    }
  },

  // Delete book (admin function)
  async deleteBook(bookId) {
    try {
      await deleteDoc(doc(db, "books", bookId));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error deleting book:", error);
      }
      throw error;
    }
  },
  // Get user's reading history (returned books)
async getUserHistory(userId) {
  try {
    const q = query(
      collection(db, "books"),
      where("userId", "==", userId),
      where("status", "==", "returned"),
      orderBy("returnedAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      finePerDay: doc.data().finePerDay || 1
    }));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Error fetching reading history:", error);
    }
    return [];
  }
},

// Get reading statistics
async getUserStats(userId) {
  try {
    const allBooks = await this.getUserAllBooks(userId);
    const returnedBooks = allBooks.filter(book => book.status === 'returned');
    
    return {
      totalBooksRead: returnedBooks.length,
      currentlyBorrowed: allBooks.filter(book => book.status === 'active').length,
      averageReadingTime: this.calculateAverageReadingTime(returnedBooks),
      favoriteGenres: this.extractGenres(returnedBooks) // If you add genre field later
    };
  } catch (error) {
    return {
      totalBooksRead: 0,
      currentlyBorrowed: 0,
      averageReadingTime: 0,
      favoriteGenres: []
    };
  }
},

// Helper method for reading time calculation
calculateAverageReadingTime(returnedBooks) {
  if (returnedBooks.length === 0) return 0;
  
  const totalDays = returnedBooks.reduce((total, book) => {
    if (book.returnedAt && book.issueDate) {
      const issued = new Date(book.issueDate);
      const returned = new Date(book.returnedAt);
      const days = Math.ceil((returned - issued) / (1000 * 60 * 60 * 24));
      return total + (days > 0 ? days : 14); // Default to 14 if invalid
    }
    return total + 14; // Default loan period
  }, 0);
  
  return Math.round(totalDays / returnedBooks.length);
}
};

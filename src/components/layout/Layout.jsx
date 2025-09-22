// src/components/layout/Layout.jsx
import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-theme-bg">
      <Navbar />
      <main>
        {children}
      </main>
    </div>
  );
};

export default Layout;

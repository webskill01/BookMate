// src/components/features/UpdateNotification.jsx - NEW FILE
import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const UpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setShowUpdate(true);
      });
    }
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    // Reload to activate new service worker
    window.location.reload();
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-accent-primary text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <Download className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-medium mb-1">Update Available</h4>
            <p className="text-sm opacity-90 mb-3">
              A new version of BookMate is ready
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowUpdate(false)}
          className="p-1 hover:bg-white/20 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="bg-white text-accent-primary px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          {isUpdating ? 'Updating...' : 'Update Now'}
        </button>
        <button
          onClick={() => setShowUpdate(false)}
          className="text-white/80 text-sm hover:text-white"
        >
          Later
        </button>
      </div>
    </div>
  );
};

export default UpdateNotification;

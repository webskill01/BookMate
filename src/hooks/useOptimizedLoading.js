// src/hooks/useOptimizedLoading.js - NEW FILE
import { useState, useCallback, useMemo } from 'react';

export const useOptimizedLoading = (initialData = []) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const memoizedData = useMemo(() => data, [data]);

  const updateData = useCallback((newData) => {
    setData(prevData => {
      if (JSON.stringify(prevData) === JSON.stringify(newData)) {
        return prevData; // Prevent unnecessary re-renders
      }
      return newData;
    });
  }, []);

  return { data: memoizedData, loading, setLoading, updateData };
};

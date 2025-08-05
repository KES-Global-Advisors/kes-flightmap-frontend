import React from 'react';
import { useState, useEffect } from 'react';
import { showToast } from '@/components/Forms/Utils/toastUtils';


const FlowCreationErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      if (error.message?.includes('FlowCreation') || error.message?.includes('milestone')) {
        setHasError(true);
        showToast.error('An error occurred with flow creation. Please refresh and try again.');
      }
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 mb-4">Something went wrong with flow creation.</p>
        <button 
          onClick={() => {
            setHasError(false);
            window.location.reload();
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default FlowCreationErrorBoundary;
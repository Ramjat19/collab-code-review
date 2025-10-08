import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useError } from '../contexts/ErrorContext';

const ErrorBoundary: React.FC = () => {
  const { errors, removeError, clearErrors } = useError();

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {errors.map((error, index) => (
        <div
          key={index}
          className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md animate-slide-in"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className="bg-red-50 rounded-md inline-flex text-red-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={() => removeError(index)}
              >
                <span className="sr-only">Close</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
      
      {errors.length > 1 && (
        <button
          onClick={clearErrors}
          className="w-full bg-red-600 text-white text-sm py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
        >
          Clear All ({errors.length})
        </button>
      )}
    </div>
  );
};

export default ErrorBoundary;
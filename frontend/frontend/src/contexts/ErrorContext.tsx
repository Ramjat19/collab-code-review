import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface ErrorContextType {
  errors: string[];
  addError: (error: string) => void;
  removeError: (index: number) => void;
  clearErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<string[]>([]);

  const addError = (error: string) => {
    setErrors(prev => [...prev, error]);
    // Auto-remove error after 5 seconds
    setTimeout(() => {
      setErrors(prev => prev.slice(1));
    }, 5000);
  };

  const removeError = (index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return (
    <ErrorContext.Provider value={{ errors, addError, removeError, clearErrors }}>
      {children}
    </ErrorContext.Provider>
  );
};
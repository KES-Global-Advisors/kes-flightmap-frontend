// QuickEditProvider.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface QuickEditContextType {
  isQuickEditEnabled: boolean;
  toggleQuickEdit: () => void;
  editingField: string | null;
  setEditingField: (field: string | null) => void;
  pendingUpdates: Set<string>;
  addPendingUpdate: (key: string) => void;
  removePendingUpdate: (key: string) => void;
}

const QuickEditContext = createContext<QuickEditContextType | undefined>(undefined);

export const useQuickEdit = () => {
  const context = useContext(QuickEditContext);
  if (!context) {
    throw new Error('useQuickEdit must be used within QuickEditProvider');
  }
  return context;
};

interface QuickEditProviderProps {
  children: ReactNode;
}

export const QuickEditProvider: React.FC<QuickEditProviderProps> = ({ children }) => {
  const [isQuickEditEnabled, setIsQuickEditEnabled] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState(new Set<string>());

  const toggleQuickEdit = () => {
    setIsQuickEditEnabled(prev => !prev);
    // Clear editing state when disabling
    if (isQuickEditEnabled) {
      setEditingField(null);
    }
  };

  const addPendingUpdate = (key: string) => {
    setPendingUpdates(prev => new Set([...prev, key]));
  };

  const removePendingUpdate = (key: string) => {
    setPendingUpdates(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  };

  const value: QuickEditContextType = {
    isQuickEditEnabled,
    toggleQuickEdit,
    editingField,
    setEditingField,
    pendingUpdates,
    addPendingUpdate,
    removePendingUpdate,
  };

  return (
    <QuickEditContext.Provider value={value}>
      {children}
    </QuickEditContext.Provider>
  );
};
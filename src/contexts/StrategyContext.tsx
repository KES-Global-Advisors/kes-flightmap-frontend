// Create new file: src/contexts/StrategyContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Strategy } from '../types/model';

interface StrategyContextType {
  currentStrategy: Strategy | null;
  setCurrentStrategy: (strategy: Strategy | null) => void;
  getCurrentStrategyId: () => number | null;
}

const StrategyContext = createContext<StrategyContextType | undefined>(undefined);

interface StrategyProviderProps {
  children: ReactNode;
}

export const StrategyProvider: React.FC<StrategyProviderProps> = ({ children }) => {
  const [currentStrategy, setCurrentStrategy] = useState<Strategy | null>(null);

  const getCurrentStrategyId = () => {
    return currentStrategy?.id || null;
  };

  const value = {
    currentStrategy,
    setCurrentStrategy,
    getCurrentStrategyId,
  };

  return (
    <StrategyContext.Provider value={value}>
      {children}
    </StrategyContext.Provider>
  );
};

export const useStrategy = () => {
  const context = useContext(StrategyContext);
  if (context === undefined) {
    throw new Error('useStrategy must be used within a StrategyProvider');
  }
  return context;
};

// Hook for strategy-scoped data fetching
export const useStrategyScoped = () => {
  const { getCurrentStrategyId } = useStrategy();
  
  const getStrategyFilteredUrl = (baseUrl: string, queryParam: string = 'strategy') => {
    const strategyId = getCurrentStrategyId();
    if (!strategyId) return baseUrl;
    
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${queryParam}=${strategyId}`;
  };

  return {
    getCurrentStrategyId,
    getStrategyFilteredUrl,
  };
};
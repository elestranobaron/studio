
'use client';

import React, { createContext, useContext, ReactNode, RefObject } from 'react';

interface ScrollContextType {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  showScrollTop: boolean;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export const useScrollContext = () => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScrollContext must be used within a ScrollProvider');
  }
  return context;
};

interface ScrollProviderProps {
  children: ReactNode;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  showScrollTop: boolean;
}

export const ScrollProvider: React.FC<ScrollProviderProps> = ({
  children,
  scrollContainerRef,
  showScrollTop,
}) => {
  return (
    <ScrollContext.Provider value={{ scrollContainerRef, showScrollTop }}>
      {children}
    </ScrollContext.Provider>
  );
};

import React, { createContext, useContext } from 'react';
import { usePostureDetection } from '../hooks/usePostureDetection';

const ErgonomicsContext = createContext(null);

export const useErgonomics = () => {
  const context = useContext(ErgonomicsContext);
  if (!context) {
    throw new Error('useErgonomics must be used within an ErgonomicsProvider');
  }
  return context;
};

export const ErgonomicsProvider = ({ children }) => {
  const posture = usePostureDetection();

  return (
    <ErgonomicsContext.Provider value={posture}>
      {children}
    </ErgonomicsContext.Provider>
  );
};

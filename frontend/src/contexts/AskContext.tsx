import React, { ReactNode, createContext, useContext } from 'react';

// Define the context value type
interface AskContextType {
  inputText: string;
}

// Create the context
const AskContext = createContext<AskContextType | undefined>(
  sessionStorage.getItem('askContext')
    ? JSON.parse(sessionStorage.getItem('askContext')!)
    : undefined
);

// Context provider component
export const AskProvider: React.FC<{
  value: AskContextType;
  children: ReactNode;
}> = ({ value, children }) => {
  sessionStorage.setItem('askContext', JSON.stringify(value));
  return <AskContext.Provider value={value}>{children}</AskContext.Provider>;
};

// Custom hook to use the context
export const useAskContext = () => {
  const context = useContext(AskContext);
  if (context === undefined) {
    throw new Error('useAskContext must be used within an AskProvider');
  }
  return context;
};

export { AskContext };

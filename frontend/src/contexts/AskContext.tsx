import React, { ReactNode, createContext } from 'react';

// Define the context value type
interface AskContextType {
  inputText: string;
}

// Create the context
// if context provider is not found (ie because after login page is reloaded),
// then default to session storage. More info:
// Default is the value that you want the context to have when there
// is no matching context provider in the tree above the component that reads context.
// The default value is meant as a “last resort” fallback.
// It is static and never changes over time.
const AskContext = createContext<AskContextType | null>(
  // if the key does not exist, the browser returns null
  null
);

// Context provider component used in searchBox
// this is a component!!!
// this gets called whenever value prop changes in searchBox
export const AskProvider: React.FC<{
  value: AskContextType;
  children: ReactNode;
}> = ({ value, children }) => {
  sessionStorage.setItem('askContext', JSON.stringify(value));
  return <AskContext.Provider value={value}>{children}</AskContext.Provider>;
};

// handleAskContext
export const handleAskContext = (reset = false): AskContextType | null => {
  if (reset) {
    // If there is no item associated with the given key, this method will do nothing.
    sessionStorage.removeItem('askContext');
    return null;
  }
  return sessionStorage.getItem('askContext')
    ? JSON.parse(sessionStorage.getItem('askContext')!)
    : null;
};

export { AskContext };

import React, { ReactNode, createContext } from 'react';

// Define the context value type
interface AskContextType {
  inputText?: string;
}

// Create the context
// if context provider is not found (i.e because after login the page is reloaded),
// then default to null. More info:
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

export const askContextSelector = (
  obj: AskContextType | null,
  attr: string
): string => {
  return obj ? obj[attr as keyof AskContextType] || '' : '';
};

// handleAskContext closure to be use on useState
export const handleAskContext = (
  reset = false,
  attr = 'inputText'
): (() => string) => {
  console.log('handleAskContext called with reset:', reset);
  const existingContext = sessionStorage.getItem('askContext')
    ? { ...JSON.parse(sessionStorage.getItem('askContext')!) }
    : null;
  if (reset) {
    sessionStorage.removeItem('askContext');
  }
  // the function returned will be called twice during development if passed to useState
  return function (): string {
    // If there is no item associated with the given key, this method will do nothing.
    return askContextSelector(existingContext, attr);
  };
};

const askInputandResetContextHandler: () => string = handleAskContext(true);

export { AskContext, askInputandResetContextHandler };

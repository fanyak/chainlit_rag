import { useCallback } from 'react';

const useScrollTo = () => {
  const scrollTo = useCallback(
    (x: number, y: number, behavior: ScrollBehavior = 'smooth') => {
      window.scrollTo({
        left: x,
        top: y,
        behavior: behavior
      });
    },
    []
  );

  return scrollTo;
};

export default useScrollTo;

import { useRef, useState, useEffect } from 'react';

const defaultObserverOptions: IntersectionObserverInit = {
  root: null,
  rootMargin: '0px',
  threshold: 0
};

export const useElementOnScreen = (options = defaultObserverOptions) => {
  const [isVisible, setIsVisible] = useState(false);

  const observedContainerRef = useRef<HTMLDivElement | null>(null);

  const callback = (entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting) setIsVisible(true);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(callback, options);
    const currentRef = observedContainerRef.current;

    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [observedContainerRef, options]);

  return { observedContainerRef, isVisible };
};

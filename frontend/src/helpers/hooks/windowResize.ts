import { useState, useEffect } from 'react';

function useWindowResize() {
  const [windowResize, setWindowResize] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowResize(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [windowResize]);

  return windowResize;
}

export default useWindowResize;

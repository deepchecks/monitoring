import { OverlayScrollbars } from 'overlayscrollbars';
import { useEffect } from 'react';

const defaultConfig = {};

export const useScrollBar = <T extends HTMLElement>(
  root: { current: T | null | undefined },
  hasScroll = true,
  config = {}
) => {
  useEffect(() => {
    let scrollbars: OverlayScrollbars;

    if (root.current && hasScroll) {
      scrollbars = OverlayScrollbars(root.current, { ...defaultConfig, ...config });
    }

    return () => {
      if (scrollbars) {
        scrollbars.destroy();
      }
    };
  }, [root, hasScroll, config]);

  return {
    '& .os-scrollbar-vertical > .os-scrollbar-track > .os-scrollbar-handle': {
      background: '#fff',
      maxWidth: 3,
      minWidth: 3,
      maxHeight: 133,
      minHeight: 20
    },
    '& .os-scrollbar-vertical > .os-scrollbar-track': {
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '100px',
      maxWidth: 3,
      minWidth: 3
    }
  };
};

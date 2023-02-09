import React, { useEffect, useRef, useCallback, useState } from 'react';

import { Box, BoxProps, styled } from '@mui/material';

import HorizontalScrollingIconButton from './HorizontalScrollingIconButton';

import { WindowInterval } from 'helpers/types/index';

export type SlideType = 'left' | 'right';

const STEP = 30;
const DISTANCE = 300;

export const HorizontalScrolling = ({ children, component, ref, sx }: BoxProps) => {
  const [scroll, setScroll] = useState(0);
  const [width, setWidth] = useState(0);

  const sliderRef = useRef<HTMLDivElement | null>(null);
  const slideTimer = useRef<WindowInterval>();

  const slide = useCallback(
    (side: SlideType) => () => {
      const slider = sliderRef.current;
      clearInterval(slideTimer.current);
      if (slider) {
        let scrollAmount = 0;
        slideTimer.current = setInterval(() => {
          if (side === 'left') {
            const slideDistance = slider.scrollLeft - STEP;
            slider.scrollLeft = slideDistance;
          }

          if (side === 'right') {
            const slideDistance = slider.scrollLeft + STEP;
            slider.scrollLeft = slideDistance;
          }

          scrollAmount += STEP;
          if (scrollAmount >= DISTANCE) {
            setScroll(slider.scrollLeft);
            clearInterval(slideTimer.current);
          }
        }, 25);
      }
    },
    []
  );

  useEffect(() => {
    if (sliderRef.current) {
      setScroll(sliderRef.current.scrollLeft);
      setWidth(sliderRef.current.scrollWidth);
    }
  }, [children, sliderRef.current?.scrollWidth]);

  const disabledRightArrow = !sliderRef.current ? true : Math.ceil(scroll) + sliderRef.current.clientWidth >= width;
  const disabledLeftArrow = scroll === 0;

  return (
    <StyledHorizontalScrolling sx={sx} component={component} ref={ref}>
      <HorizontalScrollingIconButton
        type="left"
        slide={slide}
        primaryArrow={disabledLeftArrow}
        secondaryArrow={disabledRightArrow}
      />
      <StyledHorizontalScrollingChildrenContainer ref={sliderRef}>
        {children}
      </StyledHorizontalScrollingChildrenContainer>
      <HorizontalScrollingIconButton
        type="right"
        slide={slide}
        primaryArrow={disabledRightArrow}
        secondaryArrow={disabledLeftArrow}
      />
    </StyledHorizontalScrolling>
  );
};

const StyledHorizontalScrolling = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  justifyContent: 'space-between',
  width: '100%'
});

const StyledHorizontalScrollingChildrenContainer = styled(Box)({
  display: 'flex',
  flexGrow: 1,
  overflow: 'scroll',
  msOverflowStyle: 'none',
  scrollbarWidth: 'none',
  transition: 'all 0.4 easy',

  '::-webkit-scrollbar': {
    width: 0,
    height: 0
  }
});

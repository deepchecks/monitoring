import { Box, IconButton, styled } from '@mui/material';
import { CollapseArrowLeft, CollapseArrowRight } from 'assets/icon/icon';
import React, { ReactNode, useEffect, useRef, useState } from 'react';

interface HorizontalScrollingProps {
  children: ReactNode;
}

const StyledIconButton = styled(IconButton)(() => ({
  padding: 0,
  background: 'none',
  ':hover': {
    background: 'none'
  },
  width: 24,
  height: 24
}));

const step = 30;
const distance = 300;

export const HorizontalScrolling = ({ children }: HorizontalScrollingProps) => {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [scroll, setScroll] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const slideTimer = useRef<ReturnType<typeof setInterval>>();

  const slide = (side: 'left' | 'right') => () => {
    const slider = sliderRef.current;
    clearInterval(slideTimer.current);
    if (slider) {
      let scrollAmount = 0;
      slideTimer.current = setInterval(() => {
        if (side === 'left') {
          const slideDistance = slider.scrollLeft - step;
          slider.scrollLeft = slideDistance;
        }

        if (side === 'right') {
          const slideDistance = slider.scrollLeft + step;
          slider.scrollLeft = slideDistance;
        }

        scrollAmount += step;
        if (scrollAmount >= distance) {
          setScroll(slider.scrollLeft);
          clearInterval(slideTimer.current);
        }
      }, 25);
    }
  };

  useEffect(() => {
    if (sliderRef.current) {
      setScroll(sliderRef.current.scrollLeft);
      setWidth(sliderRef.current.scrollWidth);
    }
  }, [sliderRef.current, children, sliderRef.current?.scrollWidth]);

  const disabledRightArrow = !sliderRef.current ? true : scroll + sliderRef.current.clientWidth === width;
  const disabledLeftArrow = scroll === 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        justifyContent: 'space-between',
        width: 1
      }}
    >
      <StyledIconButton
        onClick={slide('left')}
        sx={{
          opacity: disabledLeftArrow ? 0.1 : 1,
          display: disabledLeftArrow && disabledRightArrow ? 'none' : 'block'
        }}
      >
        <CollapseArrowLeft />
      </StyledIconButton>
      <Box
        ref={sliderRef}
        sx={{
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
        }}
      >
        {children}
      </Box>
      <StyledIconButton
        disabled={disabledRightArrow}
        onClick={slide('right')}
        sx={{
          opacity: disabledRightArrow ? 0.1 : 1,
          display: disabledLeftArrow && disabledRightArrow ? 'none' : 'block'
        }}
      >
        <CollapseArrowRight />
      </StyledIconButton>
    </Box>
  );
};

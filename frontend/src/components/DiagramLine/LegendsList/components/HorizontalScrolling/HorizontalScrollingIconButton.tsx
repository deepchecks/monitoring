import React from 'react';

import { IconButton, styled } from '@mui/material';

import { CollapseArrowLeft, CollapseArrowRight } from 'assets/icon/icon';

import { SlideType } from './HorizontalScrolling';

interface HorizontalScrollingIconButtonProps {
  type: SlideType;
  slide: (side: SlideType) => () => void;
  primaryArrow: boolean;
  secondaryArrow: boolean;
}

const HorizontalScrollingIconButton = ({
  type,
  slide,
  primaryArrow,
  secondaryArrow
}: HorizontalScrollingIconButtonProps) => (
  <StyledIconButton
    onClick={slide(type)}
    sx={{
      cursor: primaryArrow ? 'default' : 'pointer',
      opacity: primaryArrow ? 0.1 : 1,
      display: primaryArrow && secondaryArrow ? 'none' : 'block'
    }}
  >
    {type === 'left' ? <CollapseArrowLeft /> : <CollapseArrowRight />}
  </StyledIconButton>
);

const StyledIconButton = styled(IconButton)({
  height: 24,
  width: 24,
  padding: 0,
  background: 'none',

  ':hover': {
    background: 'none'
  }
});

export default HorizontalScrollingIconButton;

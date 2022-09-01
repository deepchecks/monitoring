import React, { memo, useState } from 'react';
import { useLocation, Link, LinkProps } from 'react-router-dom';
import { Arrow } from '../assets/icon/icon';
import { SidebarInfo } from '../helpers/helper';

import { Box, styled, Typography } from '@mui/material';
import { colors } from '../theme/colors';

interface StyledLinkWrapperProps {
  active: boolean;
}

const StyledLinkWrapper = styled(
  (
    { active, ...props }: LinkProps & StyledLinkWrapperProps // eslint-disable-line @typescript-eslint/no-unused-vars
  ) => <Link {...props} />
)<StyledLinkWrapperProps>(
  ({ active }) => `
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-left: 14px;
  border-radius: 20px 0px 0px 20px;
  width: 100%;
  margin: 12px 0;
  padding: 7px 0 7px 16px;
  text-decoration: none;
  color: ${active ? '#17003E' : '#fff'};
  cursor: pointer;
  ${active ? 'background-color: #fff;' : ''}

  &:hover {
    color: #B17DFF;
  };

  &:hover img {
    color: #B17DFF;
  }

  &:first-of-type {
    margin-top: 0;
  };

  &:last-of-type {
    margin-bottom: 0;
  };
`
);

interface SidebarMenuItemProps {
  width: number;
  info: SidebarInfo;
}

function SidebarMenuItemComponent({ info }: SidebarMenuItemProps) {
  const [hover, setHover] = useState<boolean>(false);

  const location = useLocation();
  const { ActivIcon, Icon, IconHover, link } = info;
  const active = location?.pathname === link;

  const onMouseOver = () => {
    setHover(true);
  };

  const onMouseLeave = () => {
    setHover(false);
  };

  return (
    <StyledLinkWrapper to={link} active={active} key={info.link} onMouseLeave={onMouseLeave} onMouseOver={onMouseOver}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center'
        }}
      >
        {hover ? <IconHover /> : active ? <ActivIcon /> : <Icon />}
        <Typography
          sx={{
            fontSize: '14px',
            lineHeight: '120%',
            marginLeft: '14px'
          }}
          variant="subtitle1"
        >
          {info.text}
        </Typography>
      </Box>
      {info.text === 'Analysis' && (
        <Box
          sx={theme => ({
            width: 16,
            height: 16,
            borderRadius: '50%',
            marginRight: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: hover ? theme.palette.primary.dark : theme.palette.primary.contrastText,
            '& svg': {
              fill: hover ? colors.primary.violet[600] : theme.palette.common.black
            }
          })}
        >
          <Arrow />
        </Box>
      )}
    </StyledLinkWrapper>
  );
}

export const SidebarMenuItem = memo(SidebarMenuItemComponent);

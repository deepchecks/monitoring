import React, { MouseEvent, ReactNode } from 'react';
import { useTheme } from '@mui/material';
import Link from '@mui/material/Link';

import { Container } from '../Container/Container';
import { Text } from '../Text/Text';

import { isDarkMode } from '../../theme/darkMode.helpers';

export interface NavLinkProps {
  linkLabel: string;
  icon: ReactNode;
  link?: string;
  activeIcon?: ReactNode;
  endIcon?: ReactNode;
  activeEndIcon?: ReactNode;
  isActive?: boolean;
  setIsActive?: (isActive: boolean) => void;
  onClick?: () => void;
}

export const NavLink = (props: NavLinkProps) => {
  const { link, linkLabel, icon, isActive, activeIcon, endIcon, activeEndIcon, onClick, setIsActive } = props;

  const theme = useTheme();

  const linkColor = isActive
    ? isDarkMode
      ? theme.palette.common.white
      : theme.palette.common.black
    : theme.palette.grey[500];
  const sxStyles = { color: linkColor, textDecoration: 'none', fontWeight: 600, fontSize: '16px', height: '17px' };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    !link && e.preventDefault();

    setIsActive && setIsActive(!isActive);
    onClick && onClick();
  };

  return (
    <Container
      onClick={(e: MouseEvent<HTMLDivElement>) => handleClick(e)}
      style={{ cursor: 'pointer', flexDirection: 'row', alignItems: 'center', gap: '16px' }}
    >
      {isActive && activeIcon ? activeIcon : icon}
      {link ? (
        <Link href={link} sx={{ ...sxStyles }}>
          {linkLabel}
        </Link>
      ) : (
        <Text text={linkLabel} sx={{ ...sxStyles, height: '19px' }} />
      )}
      {endIcon && isActive ? activeEndIcon : endIcon && endIcon}
    </Container>
  );
};

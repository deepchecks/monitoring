import React, { MouseEvent, ReactNode } from 'react';

import Link from '@mui/material/Link';
import { useTheme } from '@mui/material';

import { Text } from '../Text/Text';
import { Container } from '../Container/Container';
import { ToolTip } from '../Container/ToolTip/ToolTip';

export interface NavLinkProps {
  linkLabel: string;
  icon: React.ReactElement;
  link?: string;
  activeIcon?: React.ReactElement;
  endIcon?: ReactNode;
  activeEndIcon?: ReactNode;
  isActive?: boolean;
  iconsOnly?: boolean;
  setIsActive?: (isActive: boolean) => void;
  onClick?: () => void;
}

export const NavLink = (props: NavLinkProps) => {
  const { link, linkLabel, icon, isActive, activeIcon, endIcon, activeEndIcon, iconsOnly, onClick, setIsActive } =
    props;

  const theme = useTheme();

  const linkColor = isActive && !endIcon ? theme.palette.primary.main : theme.palette.grey[500];
  const sxStyles = {
    color: linkColor,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '16px',
    height: '20px',
    lineHeight: '20px'
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    !link && e.preventDefault();

    setIsActive && setIsActive(!isActive);
    onClick && onClick();
  };

  return (
    <Container
      onClick={(e: MouseEvent<HTMLDivElement>) => handleClick(e)}
      style={{
        cursor: 'pointer',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '6px',
        marginLeft: iconsOnly && endIcon ? '-24px' : '0'
      }}
    >
      <ToolTip text={iconsOnly ? linkLabel : ''}>{isActive && activeIcon ? activeIcon : icon}</ToolTip>
      {!iconsOnly &&
        (link ? (
          <Link href={link} sx={sxStyles}>
            {linkLabel}
          </Link>
        ) : (
          <Text text={linkLabel} sx={sxStyles} />
        ))}
      {endIcon && isActive ? activeEndIcon : endIcon && endIcon}
    </Container>
  );
};

import React, { memo, useState } from 'react';
import { Link, LinkProps, useLocation, useNavigate } from 'react-router-dom';

import { Box, styled, Typography } from '@mui/material';

import { PathInfo } from 'helpers/routes';

import { Arrow } from 'assets/icon/icon';

import { theme } from 'components/lib/theme';
import { StyledNavLink } from 'components/lib';

interface SidebarMenuItemProps {
  width: number;
  info: PathInfo;
  onOpenSubMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

function SidebarMenuItemComponent({ info, onOpenSubMenu }: SidebarMenuItemProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [hover, setHover] = useState(false);
  const [submenuIsOpen, setSubmenuIsOpen] = useState(false);

  const { ActiveIcon, Icon, link } = info;
  const active = location?.pathname.startsWith(link);
  const activeHover = hover && !active;
  const LinkWithParams = `${link}${window.location.search ?? ''}`;

  const toggleSubMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.preventDefault();
    setSubmenuIsOpen(prevState => !prevState);
  };

  const onMouseOver = () => {
    setHover(true);
  };

  const onMouseLeave = () => {
    setHover(false);
  };

  const goToLink = (e: React.SyntheticEvent<Element, Event>, link: string) => {
    e.preventDefault();
    navigate({ pathname: link, search: window.location.search });
  };

  const MenuItem = (
    <>
      <StyledNavLink
        linkLabel={info.title}
        icon={Icon ? <Icon /> : null}
        isActive={active}
        activeIcon={ActiveIcon ? <ActiveIcon /> : null}
      />
      {info.title === 'Analysis' && (
        <Box
          onClick={onOpenSubMenu}
          sx={theme => ({
            width: 24,
            paddingTop: '4px',
            '& svg': {
              fill: activeHover ? theme.palette.primary.main : theme.palette.grey[500]
            }
          })}
        >
          <Arrow />
        </Box>
      )}
      {(info.title === 'Configuration' || info.title === 'Alerts') && (
        <Box
          onClick={info.title === 'Alerts' ? toggleSubMenu : () => 1}
          sx={theme => ({
            width: '30px',
            padding: '2px',
            '& svg': {
              fill: activeHover ? theme.palette.primary.main : theme.palette.grey[500]
            }
          })}
        >
          {submenuIsOpen ? (
            <Box
              sx={theme => ({
                height: 2,
                width: 8,
                background: activeHover ? theme.palette.primary.main : theme.palette.grey[500]
              })}
            />
          ) : (
            <Box
              sx={theme => ({
                height: 2,
                width: 8,
                background: activeHover ? theme.palette.primary.main : theme.palette.grey[500],
                position: 'relative',
                ':after': {
                  content: "''",
                  display: 'block',
                  width: 2,
                  height: 8,
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  background: activeHover ? theme.palette.primary.main : theme.palette.grey[500],
                  transform: 'translate(-50%, -50%)'
                }
              })}
            />
          )}
        </Box>
      )}
    </>
  );

  return (
    <>
      {info.title === 'Configuration' ? (
        <Box
          sx={{
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginLeft: '14px',
            borderRadius: '20px 0px 0px 20px',
            width: 1,
            margin: '28px 0 0',
            padding: '6px 0 6px 16px',
            textDecoration: 'none',
            cursor: 'pointer',
            color: active ? theme.palette.primary.contrastText : hover ? theme.palette.primary.main : '#fff'
          }}
          onMouseLeave={onMouseLeave}
          onMouseOver={onMouseOver}
          onClick={toggleSubMenu}
        >
          {MenuItem}
        </Box>
      ) : (
        <StyledLinkWrapper
          onClick={e => goToLink(e, link)}
          to={LinkWithParams}
          active={active}
          onMouseLeave={onMouseLeave}
          onMouseOver={onMouseOver}
          sx={{
            color: active ? theme.palette.primary.dark : hover ? theme.palette.primary.main : '#fff'
          }}
        >
          {MenuItem}
        </StyledLinkWrapper>
      )}
      {submenuIsOpen &&
        info.children?.map(childInfo => (
          <StyledLinkWrapper
            onClick={e => goToLink(e, childInfo.link)}
            to={childInfo.link}
            key={childInfo.link}
            active={location.pathname === childInfo.link}
            sx={{
              color: location.pathname === childInfo.link ? theme.palette.primary.dark : '#fff',
              ':hover': {
                color: location.pathname !== childInfo.link ? theme.palette.primary.main : theme.palette.primary.dark
              },
              m: '21px 0'
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                borderRadius: '4px'
              }}
            >
              <Typography
                sx={{
                  fontSize: '14px',
                  lineHeight: '25px',
                  marginLeft: '38px',
                  fontWeight: location.pathname === childInfo.link ? 500 : 400
                }}
                variant="subtitle1"
              >
                {childInfo.title}
              </Typography>
            </Box>
          </StyledLinkWrapper>
        ))}
    </>
  );
}

interface StyledLinkWrapperProps {
  active?: boolean;
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
  margin: 28px 0;
  padding: 6px 0 6px 16px;
  text-decoration: none;
  cursor: pointer;
  ${active ? 'background-color: #fff;' : ''}

  &:first-of-type {
    margin-top: 0;
  };

  &:last-of-type {
    margin-bottom: 0;
  };
`
);

export const SidebarMenuItem = memo(SidebarMenuItemComponent);

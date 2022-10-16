import mixpanel from 'mixpanel-browser';
import React, { memo, useState } from 'react';
import { Link, LinkProps, useLocation } from 'react-router-dom';

import { PathInfo } from '../helpers/helper';

import { Box, styled, Typography } from '@mui/material';
import { Arrow } from 'assets/icon/icon';
import { colors } from '../theme/colors';

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

interface SidebarMenuItemProps {
  width: number;
  info: PathInfo;
  onOpenSumMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

function SidebarMenuItemComponent({ info, onOpenSumMenu }: SidebarMenuItemProps) {
  const [hover, setHover] = useState<boolean>(false);

  const location = useLocation();
  const { ActiveIcon, Icon, IconHover, link } = info;
  const active = location?.pathname.startsWith(link);
  const [isConfigurationOpen, setIsConfigurationOpen] = useState<boolean>(false);

  const activeHover = hover && !active;

  const openOrCloseConfiguration = () => {
    setIsConfigurationOpen(prevState => !prevState);
  };

  const onMouseOver = () => {
    setHover(true);
  };

  const onMouseLeave = () => {
    setHover(false);
  };

  const handleClick = (infoPath: string) => {
    switch (infoPath) {
      case '/dashboard':
        mixpanel.track('Click on the Dashboard');
        break;

      case '/alerts':
        mixpanel.track('Click on the Alerts');
        break;

      case '/configuration/alert-rules':
        mixpanel.track('Click on the Alert Rules');
        break;

      case '/configuration/notifications':
        mixpanel.track('Click on the Notification');
        break;

      case '/configuration/integrations':
        mixpanel.track('Click on the Integrations');
        break;

      default:
        break;
    }
  };

  const MenuItem = (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center'
        }}
        onClick={() => handleClick(info.link)}
      >
        {Icon && IconHover && ActiveIcon ? hover && !active ? <IconHover /> : active ? <ActiveIcon /> : <Icon /> : null}
        <Typography
          sx={{
            fontSize: '14px',
            lineHeight: '120%',
            marginLeft: '14px',
            fontWeight: active ? 500 : 400
          }}
          variant="subtitle1"
        >
          {info.title}
        </Typography>
      </Box>
      {info.title === 'Analysis' && (
        <Box
          onClick={onOpenSumMenu}
          sx={theme => ({
            width: 16,
            height: 16,
            borderRadius: '50%',
            marginRight: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: activeHover ? theme.palette.primary.dark : theme.palette.primary.contrastText,
            '& svg': {
              fill: activeHover ? colors.primary.violet[600] : theme.palette.common.black
            }
          })}
        >
          <Arrow />
        </Box>
      )}
      {info.title === 'Configuration' && (
        <Box
          sx={theme => ({
            width: 12,
            height: 12,
            borderRadius: '50%',
            marginRight: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            backgroundColor: theme.palette.primary.contrastText
          })}
        >
          {isConfigurationOpen ? (
            <Box sx={{ height: 2, width: 6, background: colors.primary.violet[600] }} />
          ) : (
            <Box
              sx={{
                height: 2,
                width: 6,
                background: colors.primary.violet[600],
                position: 'relative',
                ':after': {
                  content: "''",
                  display: 'block',
                  width: 2,
                  height: 6,
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  background: colors.primary.violet[600],
                  transform: 'translate(-50%, -50%)'
                }
              }}
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
            color: active ? colors.primary.violet[200] : hover ? colors.primary.violet[300] : '#fff'
          }}
          onMouseLeave={onMouseLeave}
          onMouseOver={onMouseOver}
          onClick={openOrCloseConfiguration}
        >
          {MenuItem}
        </Box>
      ) : (
        <StyledLinkWrapper
          to={link}
          active={active}
          onMouseLeave={onMouseLeave}
          onMouseOver={onMouseOver}
          sx={{
            color: active ? colors.primary.violet[600] : hover ? colors.primary.violet[300] : '#fff'
          }}
        >
          {MenuItem}
        </StyledLinkWrapper>
      )}

      {isConfigurationOpen &&
        info.children?.map(childInfo => (
          <StyledLinkWrapper
            to={childInfo.link}
            key={childInfo.link}
            active={location.pathname === childInfo.link}
            sx={{
              color: location.pathname === childInfo.link ? colors.primary.violet[600] : '#fff',
              ':hover': {
                color: location.pathname !== childInfo.link ? colors.primary.violet[400] : colors.primary.violet[600]
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
              onClick={() => handleClick(childInfo.link)}
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

export const SidebarMenuItem = memo(SidebarMenuItemComponent);

import React from 'react';
import { useNavigate } from 'react-router-dom';

import { logoutApiV1AuthLogoutGet } from 'api/generated';
import { cancelPendingRequests } from 'helpers/services/customAxios';

import useUser from 'helpers/hooks/useUser';

import { alpha, Avatar, Box, Divider, Menu, Typography } from '@mui/material';

import { StyledMenuItem } from 'components/Dashboard/MonitorList/components/GraphicsSection/GraphicsSection.style';
import { RowAutoGap } from 'components/base/Container/Container.styles';

import { ReportModal } from './components/ReportModal';

import { WorkspaceSettings } from 'assets/icon/icon';

export const UserInfo = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [isReportModalOpen, setIsReportModalOpen] = React.useState<boolean>(false);
  const navigate = useNavigate();

  const open = Boolean(anchorEl);
  const { user } = useUser();
  if (!user) return null;

  const { full_name, picture_url } = user;

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setAnchorEl(event.currentTarget);
  };
  // const handleMyAccount = () => {
  //   handleClose();
  // };
  const handleLogout = () => {
    cancelPendingRequests();
    logoutApiV1AuthLogoutGet().then(() => {
      handleClose();
      window.location.reload();
    });
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOpenReportModal = () => setIsReportModalOpen(true);
  const handleCLoseReportModal = () => setIsReportModalOpen(false);

  return (
    <>
      <Box
        sx={{ mt: 4, pt: '7px', pb: '27px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        onClick={handleClick}
      >
        <Avatar
          sx={{
            width: { xs: '24px', lg: '24px', xl: '36px' },
            height: { xs: '24px', lg: '24px', xl: '36px' },
            flexGrow: 0,
            border: theme => `2px solid ${alpha(theme.palette.common.white, 0.2)}`
          }}
          alt={full_name}
          src={picture_url}
        ></Avatar>
        <Typography
          sx={{
            fontSize: 14,
            marginLeft: '8px'
          }}
        >
          {user.full_name}
        </Typography>
      </Box>
      <Divider
        sx={{
          border: `1px dashed rgba(255, 255, 255, 0.4)`
        }}
      />
      <RowAutoGap>
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 800
          }}
        >
          {user.organization?.name}
        </Typography>
        <WorkspaceSettings onClick={() => navigate('/workspace-settings')} cursor="pointer" height={70} />
      </RowAutoGap>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button'
        }}
      >
        <StyledMenuItem sx={{ minWidth: 200 }} onClick={handleOpenReportModal}>
          <Typography variant="body2">Report a bug</Typography>
        </StyledMenuItem>
        <StyledMenuItem sx={{ minWidth: 200 }} onClick={handleLogout}>
          <Typography variant="body2">Logout</Typography>
        </StyledMenuItem>
      </Menu>
      <ReportModal open={isReportModalOpen} onClose={handleCLoseReportModal} />
    </>
  );
};

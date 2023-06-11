import React from 'react';
import { useNavigate } from 'react-router-dom';
import mixpanel from 'mixpanel-browser';

import { alpha, Avatar, Box, Divider, Menu, Typography } from '@mui/material';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';

import { logoutApiV1AuthLogoutGet } from 'api/generated';

import { cancelPendingRequests } from 'helpers/services/customAxios';
import useUser from 'helpers/hooks/useUser';

import { StyledMenuItem } from 'components/Dashboard/MonitorList/components/GraphicsSection/GraphicsSection.style';
import { ReportModal } from './components/ReportModal';
import { StyledText } from 'components/lib';

export const UserInfo = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [isReportModalOpen, setIsReportModalOpen] = React.useState<boolean>(false);
  const navigate = useNavigate();

  const open = Boolean(anchorEl);
  const { user, isAdmin, isOwner } = useUser();
  if (!user) return null;

  const { full_name, picture_url } = user;

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleLogout = () => {
    cancelPendingRequests();
    logoutApiV1AuthLogoutGet().then(() => {
      handleClose();
      mixpanel.reset();
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
      <Box onClick={handleClick} display="flex" flexDirection="row" alignItems="center" gap="8px" margin="16px 0">
        <Avatar
          sx={{
            width: '36px',
            height: '36px',
            border: theme => `2px solid ${alpha(theme.palette.common.white, 0.2)}`
          }}
          alt={full_name}
          src={picture_url}
        />
        <StyledText
          text={user.full_name}
          type="bodyBold"
          sx={{
            width: '130px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis'
          }}
        />
      </Box>
      <Divider
        sx={{
          border: `1px dashed gray`
        }}
      />
      <Box display="flex" flexDirection="row" alignItems="center" justifyContent="space-between" margin={'20px 0'}>
        <StyledText
          text={user.organization?.name}
          type="bodyBold"
          sx={{
            width: '130px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis'
          }}
        />
        {(isAdmin || isOwner) && (
          <SettingsSuggestIcon
            onClick={() => navigate('/workspace-settings')}
            cursor="pointer"
            sx={{ color: 'gray' }}
          />
        )}
      </Box>
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

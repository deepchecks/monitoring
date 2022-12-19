import React, { ReactNode, useState } from 'react';
import { Box, Button, List, Paper, Popover, Typography, useTheme, styled, Alert, Snackbar } from '@mui/material';
import { Link, MarkedMail, Share } from 'assets/icon/icon';
import { colors } from 'theme/colors';

interface ShareButtonProps {
    onlyIcon?: boolean;
}

export const ShareButton = ({onlyIcon = false}: ShareButtonProps) => {
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
    const [snackOpen, setSnackOpen] = React.useState<boolean>(false);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setSnackOpen(false);
      };
  
    const handleCopyLink = async () => {
        const url = location.href;
        await navigator.clipboard.writeText(url);

        setSnackOpen(true);
        
    };

    const handleEmailClick = () => {
        const subject = "Check Out Deepchecks New Insight"
        const body = `Hey, \nI just found an interesting insight in the Deepchecks platform.\nCheck it out here: ${location.href}`
        window.open(`mailto:?to=&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
    };

    const open = Boolean(anchorEl);
    return (
        <Box>
            <Button
                sx={{
                padding: '11px 8px',
                color: colors.primary.violet[400],
                fontSize: '14px',
                lineHeight: '17px',
                fontWeight: 400,
                '& .MuiButton-startIcon': {
                    mr: '4px'
                }
                }}
                variant="text"
                startIcon={<Share fill={theme.palette.primary.main} />}
                onClick={handleClick}
            >
                { onlyIcon ? '' : 'Share' }
            </Button>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left'
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center'
                }}
            >
                <Box sx={{height: '200px', width: '400px'}}>
                    <Box sx={{background: '#F3F5F8', height: '43px'}}>
                        <Typography sx={{p:2, fontSize: '18px', lineHeight: '160%', fontWeight: 500}}>Share Monitor</Typography>
                    </Box>
                    <Box sx={{
                        display: 'flex', 
                        alignItems: 'center', 
                        height: 'calc(100% - 43px)', 
                        width: '100%',
                        justifyContent: 'center'}}>
                        <Box 
                            sx={{
                                m: '30px', 
                                cursor: 'pointer',
                                alignItems: 'center',
                                display:'flex',
                                flexDirection: 'column'
                            }}
                            onClick={handleCopyLink}
                        >
                            <StyledIconBox>
                                <Link style={{'margin': 'auto'}}></Link>
                            </StyledIconBox>
                            <Typography>Copy Link</Typography>
                        </Box>
                        <Box 
                            sx={{
                                m: '30px', 
                                cursor: 'pointer',
                                alignItems: 'center',
                                display:'flex',
                                flexDirection: 'column'
                            }}
                            onClick={handleEmailClick}
                        >
                            <StyledIconBox>
                                <MarkedMail style={{'margin': 'auto'}}></MarkedMail>   
                            </StyledIconBox>
                            <Typography>Email</Typography>
                        </Box>
                    </Box>
                </Box>
                <Snackbar open={snackOpen} autoHideDuration={3000} anchorOrigin={{vertical: 'top', horizontal: 'center'}}>
                    <Alert severity="success" sx={{ width: '100%' }} variant='filled'>
                        Link copied successfully!
                    </Alert>
                </Snackbar>
            </Popover>
        </Box>
    );
}

const StyledIconBox = styled(Box)({
    borderRadius: '10000px',
    background: '#F3F5F8',
    width: 50,
    height: 50,
    display: 'flex',
    justifyContent: 'center'
})
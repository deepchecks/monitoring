import React, { useEffect } from 'react';

import { Box, Button, Checkbox, CssBaseline, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, Grid, Paper, Stack, ThemeProvider } from '@mui/material';
import { EULAImage } from '../assets/bg/backgrounds';
import { renderToStaticMarkup } from 'react-dom/server';
import { theme } from '../theme';
import { eulaAcceptanceApiV1UsersAcceptEulaGet } from 'api/generated';


export const LicenseAgreementPage = function () {
    const svgString = encodeURIComponent(renderToStaticMarkup(< EULAImage />));
    const descriptionElementRef = React.useRef<HTMLElement>(null);
    const [agree, setAgreement] = React.useState(false);

    useEffect(() => {
        const { current: descriptionElement } = descriptionElementRef;
        if (descriptionElement !== null) {
            descriptionElement.focus();
        }
    });

    const handleSubscribe = () => {
        eulaAcceptanceApiV1UsersAcceptEulaGet().then(success => {
            window.location.href = '/'
        })
    };

    return (
        <ThemeProvider theme={theme}>
            <Grid container component="main" sx={{ height: '100vh' }}>
                <CssBaseline />
                <Box sx={{
                    backgroundImage: `url("data:image/svg+xml,${svgString}")`,
                    width: '100%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center top',
                    backgroundSize: 'cover'
                
                }}
                />
            </Grid>
            <Dialog
                open={true}
                scroll='paper'
                fullWidth={true}
                maxWidth='lg'
            >
                <DialogTitle>
                    Please review and approve our EULA agreement
                </DialogTitle>
                <DialogContent>
                    <DialogContentText
                        id="scroll-dialog-description"
                        ref={descriptionElementRef}
                        tabIndex={-1}
                    >
                       {[...new Array(50)]
              .map(
                () => `Cras mattis consectetur purus sit amet fermentum.
Cras justo odio, dapibus ac facilisis in, egestas eget quam.
Morbi leo risus, porta ac consectetur ac, vestibulum at eros.
Praesent commodo cursus magna, vel scelerisque nisl consectetur et.`
              )
              .join('\n')} 
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <FormControlLabel 
                        control={<Checkbox value={agree} onChange={e => setAgreement(!agree)}></Checkbox>} 
                        label="I agree to the end user license agreement"
                        sx={{flex: 1, ml: 0}}
                    />
                    <Button disabled={!agree} onClick={handleSubscribe}>Continue</Button>
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
};

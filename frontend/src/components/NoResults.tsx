import React from 'react';

import { Box, Typography, BoxProps, styled } from '@mui/material';

import { NoResultsImage } from 'assets/bg/backgrounds';

import { theme } from 'theme';

interface NoResultsProps extends BoxProps {
  handleReset: () => void;
  isTwoWeeksOlder?: boolean;
}

const NoResults = ({ handleReset, isTwoWeeksOlder, ...props }: NoResultsProps) => (
  <Box sx={{ display: 'flex', justifyContent: 'center', mx: 'auto' }} {...props}>
    <Box width={444}>
      <NoResultsImage />
      {isTwoWeeksOlder ? (
        <StyledTypography>Note that alerts are running on the most recent 2 weeks</StyledTypography>
      ) : (
        <StyledTypography variant="body1">
          No results found for the applied filters maybe try to{' '}
          <Typography
            component="span"
            sx={{ color: theme => theme.palette.primary.main, cursor: 'pointer' }}
            onClick={handleReset}
          >
            reset the filters
          </Typography>{' '}
          and start over
        </StyledTypography>
      )}
    </Box>
  </Box>
);

export default NoResults;

const StyledTypography = styled(Typography)({
  marginTop: '60px',
  color: theme.palette.text.disabled,
  textAlign: 'center',
  padding: '0 20px'
});

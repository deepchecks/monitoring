import React from 'react';

import { Box, Typography, BoxProps, styled } from '@mui/material';

import { NoResultsImage } from 'assets/bg/backgrounds';

import { theme } from 'components/lib/theme';

interface NoResultsProps extends BoxProps {
  handleReset: () => void;
  isTwoWeeksOlder?: boolean;
}

const constants = {
  noResults: {
    first: 'No results found for the applied filters, maybe try to \n',
    second: 'reset the filters'
  },
  noResults2Weeks: 'No results found.\n Note that alerts are running on the most recent 2 weeks'
};

const NoResults = ({ handleReset, isTwoWeeksOlder, ...props }: NoResultsProps) => (
  <Box sx={{ display: 'flex', justifyContent: 'center', mx: 'auto' }} {...props}>
    <Box width={444}>
      <NoResultsImage />
      {!isTwoWeeksOlder ? (
        <StyledTypography>{constants.noResults2Weeks}</StyledTypography>
      ) : (
        <StyledTypography variant="body1">
          {constants.noResults.first}
          <Typography
            component="span"
            sx={{ color: theme => theme.palette.primary.main, cursor: 'pointer', fontWeight: 700, fontSize: '16px' }}
            onClick={handleReset}
          >
            {constants.noResults.second}
          </Typography>
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
  padding: '0 20px',
  fontSize: '16px',
  whiteSpace: 'pre-line'
});

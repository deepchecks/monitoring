import React from 'react';

import { Box, Typography, BoxProps } from '@mui/material';

import { NoResultsImage } from 'assets/bg/backgrounds';

interface NoResultsProps extends BoxProps {
  handleReset: () => void;
}

const NoResults = ({ handleReset, ...props }: NoResultsProps) => (
  <Box sx={{ display: 'flex', justifyContent: 'center', mx: 'auto' }} {...props}>
    <Box width={444}>
      <NoResultsImage />
      <Typography
        variant="body1"
        sx={{
          mt: '60px',
          color: theme => theme.palette.text.disabled,
          textAlign: 'center',
          padding: '0 20px'
        }}
      >
        No results found for the applied filters maybe try to{' '}
        <Typography
          component="span"
          sx={{ color: theme => theme.palette.primary.main, cursor: 'pointer' }}
          onClick={handleReset}
        >
          reset the filters
        </Typography>{' '}
        and start over
      </Typography>
    </Box>
  </Box>
);

export default NoResults;

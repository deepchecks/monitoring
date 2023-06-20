import React from 'react';

import { Typography, styled, Stack, StackProps } from '@mui/material';

import { NoResultsImage } from 'assets/bg/backgrounds';

interface NoResultsProps extends StackProps {
  custom?: string;
  handleReset?: () => void;
  simple?: boolean;
  isTwoWeeksOlder?: boolean;
}

const constants = {
  noResults: {
    simple: 'No results found',
    first: 'No results found for the applied filters, maybe try to \n',
    second: 'reset the filters'
  },
  noResults2Weeks: 'No results found\n Note that alerts are running on the most recent 2 weeks'
};

const NoResults = ({ custom, handleReset, isTwoWeeksOlder, simple, ...props }: NoResultsProps) => (
  <Stack justifyContent="center" alignItems="center" height={1} {...props}>
    <NoResultsImage width={444} />
    {custom ? (
      <StyledTypography>{custom}</StyledTypography>
    ) : simple ? (
      <StyledTypography>{constants.noResults.simple}</StyledTypography>
    ) : !isTwoWeeksOlder ? (
      <StyledTypography>{constants.noResults2Weeks}</StyledTypography>
    ) : (
      <StyledTypography variant="body1">
        {constants.noResults.first}
        <StyledLink component="span" onClick={handleReset}>
          {constants.noResults.second}
        </StyledLink>
      </StyledTypography>
    )}
  </Stack>
);

export default NoResults;

const StyledTypography = styled(Typography)(({ theme }) => ({
  marginTop: '60px',
  color: theme.palette.text.disabled,
  textAlign: 'center',
  fontSize: '18px',
  whiteSpace: 'pre-line'
}));

const StyledLink = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '16px'
})) as typeof Typography;

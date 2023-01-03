import React from 'react';

import { OperatorsEnum } from 'api/generated';

import { Stack, Typography, TextField, styled } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import { SelectPrimary, SelectPrimaryItem } from 'components/SelectPrimary/SelectPrimary';

import mapToOptionsList from 'helpers/utils/mapToOptionsList';
import { SetStateType } from 'helpers/types';

interface SelectConditionProps {
  title?: string;
  operator: OperatorsEnum | '';
  setOperator: SetStateType<OperatorsEnum | ''>;
  value: number | string;
  setValue: SetStateType<number | string>;
}

const OPERATORS = mapToOptionsList(OperatorsEnum);

export const SelectCondition = ({
  title = 'Activate alert when check value is:',
  operator,
  setOperator,
  value,
  setValue
}: SelectConditionProps) => (
  <>
    <StyledTitle variant="body1">{title}</StyledTitle>
    <Stack
      direction="row"
      divider={<ArrowForwardIcon />}
      spacing={2}
      alignItems="center"
      justifyContent="space-between"
    >
      <SelectPrimary
        label="Select Operator"
        value={operator}
        onChange={event => setOperator(event.target.value as OperatorsEnum)}
      >
        {OPERATORS.map(({ label, value }) => (
          <SelectPrimaryItem value={value} key={value}>
            {label}
          </SelectPrimaryItem>
        ))}
      </SelectPrimary>
      <TextField
        placeholder="0"
        type="number"
        label="Value"
        value={value}
        onChange={event => setValue(event.target.value)}
      />
    </Stack>
  </>
);

export const StyledTitle = styled(Typography)({
  fontWeight: 600,
  fontSize: '16px',
  letterSpacing: '0.2px',
  marginBottom: '40px'
});

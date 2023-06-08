import React from 'react';

import { OperatorsEnum } from 'api/generated';

import { Stack, Typography, TextField, styled } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import { SelectPrimary, SelectPrimaryItem } from 'components/Select/SelectPrimary';

import mapToOptionsList from 'helpers/utils/mapToOptionsList';
import { SetStateType } from 'helpers/types';

interface SelectConditionProps {
  title?: string;
  operator: OperatorsEnum | '';
  setOperator: SetStateType<OperatorsEnum | ''>;
  value: number | string;
  setValue: SetStateType<number | string>;
}

const OPERATORS = mapToOptionsList(OperatorsEnum, [OperatorsEnum.in, OperatorsEnum.equals, OperatorsEnum.not_equals]);

export const SelectCondition = ({
  title = 'Activate alert when check value is:',
  operator,
  setOperator,
  value,
  setValue
}: SelectConditionProps) => (
  <>
    <StyledTitle>{title}</StyledTitle>
    <Stack direction="row" divider={<ArrowForwardIcon />} alignItems="center" justifyContent="space-between">
      <SelectPrimary
        label="Select Operator"
        value={operator}
        onChange={event => setOperator(event.target.value as OperatorsEnum)}
        sx={{ width: '268px' }}
      >
        {OPERATORS.map(({ label, value }) => (
          <SelectPrimaryItem value={value} key={value}>
            {label}
          </SelectPrimaryItem>
        ))}
      </SelectPrimary>
      <TextField
        sx={{ width: '200px' }}
        placeholder="0"
        type="number"
        label="Threshold"
        value={value}
        onChange={event => setValue(event.target.value)}
      />
    </Stack>
  </>
);

export const StyledTitle = styled(Typography)({
  fontWeight: 700,
  fontSize: '16px',
  letterSpacing: '0.2px',
  marginBottom: '23px'
});

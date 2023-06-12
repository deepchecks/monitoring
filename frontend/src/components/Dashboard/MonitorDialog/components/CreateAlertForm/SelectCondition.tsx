import React from 'react';

import { OperatorsEnum } from 'api/generated';

import { MenuItem, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import { StyledText } from 'components/lib';
import { BaseInput, BaseDropdown } from 'components/base/InputDropdown/InputDropdown';

import mapToOptionsList from 'helpers/utils/mapToOptionsList';
import { SetStateType } from 'helpers/types';
import { constants } from '../../monitorDialog.constants';

interface SelectConditionProps {
  title?: string;
  operator: OperatorsEnum | '';
  setOperator: SetStateType<OperatorsEnum | ''>;
  value: number | string;
  setValue: SetStateType<number | string>;
}

const OPERATORS = mapToOptionsList(OperatorsEnum, [OperatorsEnum.in, OperatorsEnum.equals, OperatorsEnum.not_equals]);
const { selectOperatorLabel, thresholdLabel, titleStr, thresholdPlaceholder } = constants.selectCondition;

export const SelectCondition = ({ title = titleStr, operator, setOperator, value, setValue }: SelectConditionProps) => (
  <>
    <StyledText text={title} type="h3" sx={{ fontWeight: 700, marginBottom: '24px' }} />
    <Stack
      direction="row"
      divider={<ArrowForwardIcon />}
      alignItems={'center'}
      justifyContent="space-between"
      marginBottom="30px"
      spacing="24px"
    >
      <BaseDropdown
        label={selectOperatorLabel}
        value={operator}
        onChange={event => setOperator(event.target.value as OperatorsEnum)}
        required
      >
        {OPERATORS.map(({ label, value }) => (
          <MenuItem value={value} key={value}>
            {label}
          </MenuItem>
        ))}
      </BaseDropdown>
      <BaseInput
        placeholder={thresholdPlaceholder}
        type="number"
        label={thresholdLabel}
        value={value}
        onChange={event => setValue(event.target.value)}
      />
    </Stack>
  </>
);

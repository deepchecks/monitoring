import React, { ReactNode } from 'react';
import { SelectPrimary, SelectPrimaryProps, SelectPrimaryItem } from './SelectPrimary';
import { Stack, TextFieldProps, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RangePickerInput from '../RangePickerInput';
import { OperatorsEnum } from '../../api/generated';
import mapToOptionsList from '../../helpers/utils/mapToOptionsList';

type BaseSelectProps = Omit<SelectPrimaryProps, 'children' | 'label'> & Partial<Pick<SelectPrimaryProps, 'label'>>;
type BaseTextFieldProps = TextFieldProps;

interface SelectConditionProps {
  title?: ReactNode;
  operatorProps: BaseSelectProps;
  valueProps: BaseTextFieldProps;
  setFieldValue: (fieldName: string, value: any, shouldValidate?: boolean | undefined) => any;
}

const OPERATORS = mapToOptionsList(OperatorsEnum, [OperatorsEnum.in, OperatorsEnum.equals, OperatorsEnum.not_equals]);

export const SelectCondition = ({
  title = 'Activate alert when check value is:',
  operatorProps,
  valueProps
}: SelectConditionProps) => (
  <>
    <Typography
      variant="body1"
      component="h2"
      sx={{ mb: '40px', fontWeight: 600, fontSize: '16px', letterSpacing: '0.2px' }}
    >
      {title}
    </Typography>
    <Stack
      direction="row"
      divider={<ArrowForwardIcon />}
      spacing={2}
      alignItems="center"
      justifyContent="space-between"
    >
      <SelectPrimary label="Select Operator" {...operatorProps}>
        {OPERATORS.map(({ label, value }) => (
          <SelectPrimaryItem value={value} key={value}>
            {label}
          </SelectPrimaryItem>
        ))}
      </SelectPrimary>
      <RangePickerInput label="Value" {...valueProps} />
    </Stack>
  </>
);

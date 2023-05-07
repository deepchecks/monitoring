import React, { useEffect, useMemo, useCallback } from 'react';
import { SelectPrimary, SelectPrimaryProps, SelectPrimaryItem } from './SelectPrimary';
import {
  ColumnMetadata,
  ModelSchema,
  OperatorsEnum,
  ColumnType,
  useGetModelColumnsApiV1ModelsModelIdColumnsGet
} from '../../api/generated';
import { ColumnStatsCategorical, ColumnStatsNumeric } from '../../helpers/types/model';
import { RangePicker } from '../RangePicker';
import { Box, styled, Typography } from '@mui/material';
import { Subcategory } from 'components/Subcategory';
import { SelectChangeEvent } from '@mui/material/Select';

interface BaseSelectProps extends Omit<SelectPrimaryProps, 'children' | 'label' | 'onBlur'> {
  label?: SelectPrimaryProps['label'];
}

interface SelectModelColumnProps extends BaseSelectProps {
  modelId: ModelSchema['id'];
  valueProps: BaseSelectProps;
  setFieldValue: (fieldName: string, value: any, shouldValidate?: boolean | undefined) => any;
}

const OPERATOR_BY_COLUMN_TYPE = {
  [ColumnType.categorical]: OperatorsEnum.equals,
  [ColumnType.numeric]: OperatorsEnum.greater_than_equals
};

export const SelectModelColumn = ({
  modelId,
  label = 'Column',
  valueProps,
  setFieldValue,
  ...props
}: SelectModelColumnProps) => {
  const { data: columnsMap = {}, isLoading } = useGetModelColumnsApiV1ModelsModelIdColumnsGet(modelId);
  const columns = useMemo(
    () =>
      Object.entries(columnsMap)
        .filter(([, value]) => value.type in ColumnType)
        .map(([key, value]) => ({ key, value })),
    [columnsMap]
  );

  const column = props.value as string;
  const columnMetadata = column ? columnsMap[column] : undefined;

  useEffect(() => {
    if (!columnMetadata) return;
    setFieldValue('operator', OPERATOR_BY_COLUMN_TYPE[columnMetadata.type as keyof typeof OPERATOR_BY_COLUMN_TYPE]);

    !valueProps.value &&
      setFieldValue(
        'value',
        ColumnType.numeric || ColumnType.integer ? [columnMetadata.stats.min, columnMetadata.stats.max] : ''
      );
  }, [columnMetadata, setFieldValue, valueProps.value]);

  return (
    <>
      <SelectPrimary label={label} {...props} disabled={isLoading}>
        {columns.map(({ key }) => (
          <SelectPrimaryItem value={key} key={key}>
            {key}
          </SelectPrimaryItem>
        ))}
      </SelectPrimary>
      <SelectModelColumnSub columnMetadata={columnMetadata} setFieldValue={setFieldValue} {...valueProps} />
    </>
  );
};

interface SelectModelColumnSub extends BaseSelectProps {
  columnMetadata?: ColumnMetadata;
  setFieldValue: (fieldName: string, value: any, shouldValidate?: boolean | undefined) => any;
}

const SelectModelColumnSub = ({ columnMetadata, setFieldValue, ...props }: SelectModelColumnSub) => {
  const handleInputChange = useCallback((val: number[]) => setFieldValue('value', val), [setFieldValue]);
  const handleSliderChange = (event: Event) => props.onChange && props.onChange(event as SelectChangeEvent, null);

  if (!columnMetadata) return null;

  const { type, stats } = columnMetadata;

  switch (type) {
    case ColumnType.categorical: {
      const { values } = stats as ColumnStatsCategorical;

      return (
        <Subcategory>
          <SelectPrimary label="Select category" {...props} disabled={!values.length}>
            {values.map((value: string) => (
              <SelectPrimaryItem value={value} key={value}>
                {value}
              </SelectPrimaryItem>
            ))}
          </SelectPrimary>
        </Subcategory>
      );
    }

    case ColumnType.numeric || ColumnType.integer: {
      const { name, value, label = 'Select Value' } = props;
      const { min, max } = stats as ColumnStatsNumeric;

      return (
        <Box mt="39px">
          <StyledTypographyLabel>{label}</StyledTypographyLabel>
          <RangePicker
            name={name}
            value={(value as number[]) || [min, max]}
            onChange={handleSliderChange}
            handleValueChange={handleInputChange}
            min={min}
            max={max}
            valueLabelDisplay="auto"
          />
        </Box>
      );
    }

    default:
      return null;
  }
};

const StyledTypographyLabel = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  lineHeight: 1.57,
  letterSpacing: '0.1px',
  marginBottom: '10px',
  color: theme.palette.text.disabled
}));

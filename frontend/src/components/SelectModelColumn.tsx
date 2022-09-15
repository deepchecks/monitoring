import React, { useEffect, useMemo } from 'react';
import { SelectPrimary, SelectPrimaryProps, SelectPrimaryItem } from './SelectPrimary/SelectPrimary';
import {
  ColumnMetadata,
  ModelSchema,
  OperatorsEnum,
  ColumnType,
  useGetModelColumnsApiV1ModelsModelIdColumnsGet
} from '../api/generated';
import { ColumnStatsCategorical, ColumnStatsNumeric } from '../helpers/types/model';
import { StyledTypographyLabel } from './MonitorDrawer/MonitorForm/MonitorForm.style';
import { RangePicker } from './RangePicker';
import { Box } from '@mui/material';
import { Subcategory } from './MonitorDrawer/Subcategory';
import { SelectChangeEvent } from '@mui/material/Select/SelectInput';

interface BaseSelectProps extends Omit<SelectPrimaryProps, 'children' | 'label'> {
  label?: SelectPrimaryProps['label'];
}

interface SelectModelColumnProps extends BaseSelectProps {
  modelId: ModelSchema['id'];
  valueProps: BaseSelectProps;
  setFieldValue: (fieldName: string, value: any, shouldValidate?: boolean | undefined) => any;
}

// const DEFAULT_VALUE_BY_COLUMN_TYPE = {
//   [ColumnType.categorical]: '',
//   [ColumnType.numeric]: 0
// } as const;

const OPERATOR_BY_COLUMN_TYPE = {
  [ColumnType.categorical]: OperatorsEnum.contains,
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

  const columns = useMemo(() => Object.entries(columnsMap).map(([key, value]) => ({ key, value })), [columnsMap]);

  const column = props.value as string;
  const columnMetadata = column ? columnsMap[column] : undefined;

  useEffect(() => {
    if (!columnMetadata) return;
    setFieldValue('operator', OPERATOR_BY_COLUMN_TYPE[columnMetadata.type as keyof typeof OPERATOR_BY_COLUMN_TYPE]);
    !valueProps.value && setFieldValue('value', ColumnType.numeric ? 0 : '');
  }, [column]);

  return (
    <>
      <SelectPrimary label={label} {...props} disabled={isLoading}>
        {columns.map(({ key }) => (
          <SelectPrimaryItem value={key} key={key}>
            {key}
          </SelectPrimaryItem>
        ))}
      </SelectPrimary>
      <SelectModelColumnSub columnMetadata={columnMetadata} {...valueProps} />
    </>
  );
};

interface SelectModelColumnSub extends BaseSelectProps {
  columnMetadata?: ColumnMetadata;
}

const SelectModelColumnSub = ({ columnMetadata, ...props }: SelectModelColumnSub) => {
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

    case ColumnType.numeric: {
      const { min, max } = stats as ColumnStatsNumeric;
      const { name, value, label = 'Select Value' } = props;
      const handleSliderChange = (event: Event) => props.onChange!(event as SelectChangeEvent, null);
      const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => props.onChange!(event, null);

      return (
        <Box mt="39px">
          <StyledTypographyLabel>{label}</StyledTypographyLabel>
          <RangePicker
            name={name}
            value={Number(value || 0)}
            onChange={handleSliderChange}
            handleInputChange={handleInputChange}
            min={min}
            max={max}
            step={0.01}
            valueLabelDisplay="auto"
          />
        </Box>
      );
    }
    default:
      return null;
  }
};

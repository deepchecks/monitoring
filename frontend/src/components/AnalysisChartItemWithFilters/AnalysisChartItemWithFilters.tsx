import React, { Dispatch, ReactNode, SetStateAction } from 'react';

import { MonitorCheckConfSchemaCheckConf, MonitorValueConf } from 'api/generated';

import { Button, MenuItem, SelectChangeEvent, SelectProps, Stack, styled } from '@mui/material';

import { AnalysisChartItem } from 'components/AnalysisChartItem';
import { RoundedSelect } from './components/RoundedSelect';

import { colors } from 'theme/colors';

interface AnalysisChartItemWithFiltersProps extends SelectProps {
  activeFilter: number;
  changeActiveFilter: Dispatch<SetStateAction<number>>;
  children: ReactNode;
  filters: MonitorCheckConfSchemaCheckConf[];
  selectData: MonitorValueConf[];
  setSelectValue: Dispatch<SetStateAction<string>>;
  subtitle: string;
  title: string;
}

export function AnalysisChartItemWithFilters({
  activeFilter,
  changeActiveFilter,
  children,
  filters,
  selectData,
  setSelectValue,
  subtitle,
  title,
  ...props
}: AnalysisChartItemWithFiltersProps) {
  const handleSelectValueChange = (event: SelectChangeEvent<unknown>) => {
    setSelectValue(event.target.value as string);
  };

  const handleActiveItemChange = (index: number) => {
    changeActiveFilter(index);
    setSelectValue('');
  };

  return (
    <AnalysisChartItem
      subtitle={subtitle}
      title={title}
      headerChildren={
        <Stack direction="row" spacing="10px">
          {filters.map(({ type }, index) => (
            <StyledButton
              key={type}
              variant="outlined"
              active={activeFilter === index}
              onClick={() => handleActiveItemChange(index)}
            >
              {type}
            </StyledButton>
          ))}
          <RoundedSelect size="small" onChange={handleSelectValueChange} {...props} label="Select Class/es">
            {selectData.map(({ name }, index) => (
              <MenuItem key={index} value={name}>
                {name}
              </MenuItem>
            ))}
          </RoundedSelect>
        </Stack>
      }
    >
      {children}
    </AnalysisChartItem>
  );
}

interface StyledButtonOptions {
  active: boolean;
}

const StyledButton = styled(Button, {
  shouldForwardProp: prop => prop !== 'active'
})<StyledButtonOptions>(({ active, theme }) => ({
  textTransform: 'none',
  fontSize: 12,
  letterSpacing: '0.17px',
  fontWeight: active ? 700 : 400,
  lineHeight: '14.4px',
  height: 30,
  minHeight: '30px',
  padding: '10px',
  color: colors.primary.violet[400],
  backgroundColor: active ? theme.palette.primary.light : theme.palette.common.white,
  boxShadow: 'none',
  borderRadius: '1000px',
  transition: 'all 0s'
}));

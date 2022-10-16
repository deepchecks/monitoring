import { Button, MenuItem, SelectChangeEvent, SelectProps, Stack, styled } from '@mui/material';
import { MonitorCheckConfSchemaCheckConf, MonitorValueConf } from 'api/generated';
import { AnalysisChartItem } from 'components/AnalysisChartItem';
import React, { Dispatch, ReactNode, SetStateAction } from 'react';
import { RoundedSelect } from './components/RoundedSelect';

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

interface StyledButtonOptions {
  active: boolean;
}

const StyledButton = styled(Button, {
  shouldForwardProp: prop => prop !== 'active'
})<StyledButtonOptions>(({ active, theme }) => ({
  borderRadius: '1000px',
  padding: '6.5px 10px',
  textTransform: 'none',
  minHeight: '30px',
  height: 30,
  fontSize: 12,
  fontWeight: active ? 700 : 400,
  backgroundColor: active ? theme.palette.primary.light : theme.palette.common.white,
  transition: 'all 0s',
  boxShadow: 'none'
}));

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

  const handleActiveItemChenge = (index: number) => {
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
              onClick={() => handleActiveItemChenge(index)}
            >
              {type}
            </StyledButton>
          ))}
          <RoundedSelect size="small" onChange={handleSelectValueChange} {...props} label="Selected Classes">
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

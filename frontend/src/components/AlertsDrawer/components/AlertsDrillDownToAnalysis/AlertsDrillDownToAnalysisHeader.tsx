import React, { SyntheticEvent, memo } from 'react';

import { Stack, styled, Tabs, Tab, Typography, Box } from '@mui/material';

import { SwitchButton } from 'components/SwitchButton';
import {
  ControlledMarkedSelect,
  ControlledMarkedSelectSelectValues
} from 'components/MarkedSelect/ControlledMarkedSelect';

import { Checks, Research } from 'assets/icon/icon';
import { colors } from 'theme/colors';

import { SetStateType } from 'helpers/types';

function a11yProps(index: number) {
  return {
    id: `alert-drill-down-to-analysis-tab-${index}`,
    'aria-controls': `alert-drill-down-to-analysis-tabpanel-${index}`
  };
}

const TAB_PRIMARY_COLOR = colors.primary.violet[400];

interface AlertsDrillDownToAnalysisHeaderProps {
  tabIndex: number;
  setTabIndex: SetStateType<number>;
  prevPeriod: boolean;
  setPrevPeriod: SetStateType<boolean>;
  featuresNames: ControlledMarkedSelectSelectValues[];
  selectedFeature: ControlledMarkedSelectSelectValues;
  setSelectedFeature: SetStateType<ControlledMarkedSelectSelectValues>;
  checksNames: ControlledMarkedSelectSelectValues[];
  selectedCheck: ControlledMarkedSelectSelectValues;
  setSelectedCheck: SetStateType<ControlledMarkedSelectSelectValues>;
  datasetsNames: ControlledMarkedSelectSelectValues[];
  selectedDatasetName: ControlledMarkedSelectSelectValues;
  setSelectedDatasetName: SetStateType<ControlledMarkedSelectSelectValues>;
  disabled?: boolean;
}

export const AlertsDrillDownToAnalysisHeaderComponent = ({
  tabIndex,
  setTabIndex,
  prevPeriod,
  setPrevPeriod,
  featuresNames,
  selectedFeature,
  setSelectedFeature,
  checksNames,
  selectedCheck,
  setSelectedCheck,
  datasetsNames,
  selectedDatasetName,
  setSelectedDatasetName,
  disabled
}: AlertsDrillDownToAnalysisHeaderProps) => {
  const handleTabChange = (event: SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  return (
    <StyledContainer>
      <StyledStack justifyContent="space-between" padding="30px 40px 10px">
        <StyledHeading>Alert drill-down</StyledHeading>
        <StyledStack marginLeft="auto">
          {tabIndex === 0 ? (
            <>
              <StyledControlledMarkedSelect
                label="Select feature"
                values={featuresNames}
                value={selectedFeature}
                setValue={setSelectedFeature}
                disabled={disabled}
              />
              <StyledControlledMarkedSelect
                label="Select check"
                values={checksNames}
                value={selectedCheck}
                setValue={setSelectedCheck}
                disabled={disabled}
              />
              {datasetsNames.length > 1 && (
                <StyledControlledMarkedSelect
                  label="Scorer/Feature"
                  values={datasetsNames}
                  value={selectedDatasetName}
                  setValue={setSelectedDatasetName}
                  disabled={disabled}
                />
              )}
            </>
          ) : (
            <Box marginRight="20px">
              <SwitchButton
                label="Compare to previous period"
                labelPlacement="end"
                checked={prevPeriod}
                setChecked={setPrevPeriod}
                disabled={disabled}
              />
            </Box>
          )}
        </StyledStack>
        <StyledTabs value={tabIndex} onChange={handleTabChange} aria-label="alert drill down tabs">
          <StyledTab label="research" icon={<Research />} iconPosition="start" {...a11yProps(0)} />
          <StyledTab label="checks" icon={<Checks />} iconPosition="start" {...a11yProps(1)} />
        </StyledTabs>
      </StyledStack>
    </StyledContainer>
  );
};

const StyledContainer = styled(Stack)({
  position: 'sticky',
  top: 131,
  background: 'inherit',
  zIndex: 999,
  borderTop: `3px solid ${colors.neutral.grey[200]}`
});

const StyledStack = styled(Stack)({
  alignItems: 'center',
  flexDirection: 'row'
});

const StyledHeading = styled(Typography)({
  fontWeight: 700,
  fontSize: '24px',
  lineHeight: '140%'
});

const StyledControlledMarkedSelect = styled(ControlledMarkedSelect)({
  width: '166px',
  minWidth: '166px',
  marginRight: '20px'
});

const StyledTabs = styled(Tabs)({
  alignItems: 'center',

  '& .MuiTabs-indicator': {
    display: 'none'
  }
});

const StyledTab = styled(Tab)({
  fontWeight: 500,
  fontSize: '14px',
  lineHeight: '22.4px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  height: '40px',
  minHeight: '40px',
  color: TAB_PRIMARY_COLOR,
  border: `1px solid ${TAB_PRIMARY_COLOR}`,

  '&.Mui-selected': {
    color: colors.neutral.white,
    background: TAB_PRIMARY_COLOR
  }
});

export const AlertsDrillDownToAnalysisHeader = memo(AlertsDrillDownToAnalysisHeaderComponent);

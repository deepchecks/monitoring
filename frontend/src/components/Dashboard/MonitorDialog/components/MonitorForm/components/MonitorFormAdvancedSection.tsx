import React, { useState } from 'react';

import { Collapse, Box, styled, Stack, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import RemoveCircleRoundedIcon from '@mui/icons-material/RemoveCircleRounded';
import RefreshIcon from '@mui/icons-material/Refresh';

import { StyledButton as StyledLibButton, StyledText } from 'components/lib';

import { SelectValues } from 'helpers/types';
import { FrequencyNumberMap, FrequencyNumberType } from 'helpers/utils/frequency';
import { constants } from '../../../monitorDialog.constants';

const { aggregationStr, advancedStr } = constants.monitorForm;

interface MonitorFormAdvancedSectionProps {
  aggregationWindow: number;
  setAggregationWindow: (value: React.SetStateAction<number>) => void;
  frequency: SelectValues;
}

export const MonitorFormAdvancedSection = ({
  aggregationWindow,
  frequency,
  setAggregationWindow
}: MonitorFormAdvancedSectionProps) => {
  const [advanced, setAdvanced] = useState(false);

  const aggregationWindowSuffix = `${FrequencyNumberMap[frequency as FrequencyNumberType['type']].toLowerCase()}${
    aggregationWindow > 1 ? 's' : ''
  }`;

  const aggregationWindowButtonColor = (value: 1 | 30) => (aggregationWindow === value ? 'disabled' : 'action');

  const subtractAggregation = () => setAggregationWindow(prevState => prevState - 1);
  const addAggregation = () => setAggregationWindow(prevState => prevState + 1);

  const resetToDefault = () => {
    setAdvanced(false);
    setAggregationWindow(1);
  };

  return (
    <Stack>
      <StyledButtonContainer>
        <StyledButton
          label={advancedStr}
          variant="text"
          endIcon={<ExpandMoreIcon />}
          onClick={() => setAdvanced(prevState => !prevState)}
          advanced={advanced}
        />
      </StyledButtonContainer>
      <Collapse in={advanced}>
        <Stack alignItems="center">
          <Stack direction="row" alignItems="center">
            <StyledText text={aggregationStr} type="smallBold" />
            <IconButton onClick={resetToDefault} sx={{ marginLeft: '5px' }}>
              <RefreshIcon />
            </IconButton>
          </Stack>
          <StyledAggregationWindowContainer>
            <IconButton onClick={subtractAggregation} disabled={aggregationWindow === 1}>
              <RemoveCircleRoundedIcon color={aggregationWindowButtonColor(1)} />
            </IconButton>
            <StyledText text={`${aggregationWindow} ${aggregationWindowSuffix}`} type="h3" />
            <IconButton onClick={addAggregation} disabled={aggregationWindow === 30}>
              <AddCircleRoundedIcon color={aggregationWindowButtonColor(30)} />
            </IconButton>
          </StyledAggregationWindowContainer>
        </Stack>
      </Collapse>
    </Stack>
  );
};

const StyledButtonContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',

  '&::before, ::after': {
    position: 'absolute',
    content: '""',
    height: '1px',
    top: '17px',
    backgroundColor: theme.palette.grey[100]
  },
  '&::before': { left: 0, right: '340px' },
  '&::after': {
    left: '340px',
    right: 0
  }
}));

interface StyledButtonProps {
  advanced: boolean;
}

const StyledButton = styled(StyledLibButton, {
  shouldForwardProp: prop => prop !== 'advanced'
})<StyledButtonProps>(({ advanced, theme }) => ({
  margin: '0 auto',
  color: theme.palette.primary.main,
  '& svg': { transform: advanced ? 'rotate(180deg)' : 'rotate(0deg)' },
  '&:hover': { background: 'transparent', opacity: 0.7 }
}));

const StyledAggregationWindowContainer = styled(Stack)({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '160px',
  margin: '0 auto'
});

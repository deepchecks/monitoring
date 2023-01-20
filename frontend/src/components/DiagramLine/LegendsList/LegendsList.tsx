import React, { PropsWithChildren, memo, useState, useEffect, useCallback } from 'react';
import { ChartData, LegendItem as ILegendItem } from 'chart.js';

import { styled, Box, Stack, Typography } from '@mui/material';

import HorizontalScrolling from './components/HorizontalScrolling';
import LegendItem from './components/LegendItem';

import { GraphData } from 'helpers/types';
import { PREVIOUS_PERIOD } from 'helpers/setGraphOptions';

interface LegendsListProps {
  data: ChartData<'line', GraphData, unknown>;
  lineIndexMap: Record<number, boolean>;
  hideLine: (item: ILegendItem) => void;
  legends: ILegendItem[];
  analysis?: boolean;
  comparison?: boolean;
}

const ANALYSIS_LEGENDS_CONTAINER_HEIGHT = '60px';

function replacePreviousPeriodSubstring(legend: ILegendItem) {
  return legend.text.replace(PREVIOUS_PERIOD, '');
}

function legendTextWithPreviousPeriod(legend: ILegendItem) {
  return legend.text + PREVIOUS_PERIOD;
}

function isEndsWithPreviousPeriod(legend: ILegendItem) {
  return legend.text.endsWith(PREVIOUS_PERIOD);
}

const LegendsList = ({
  data,
  lineIndexMap,
  hideLine,
  legends,
  analysis,
  comparison,
  children
}: PropsWithChildren<LegendsListProps>) => {
  const [delayedComparison, setDelayedComparison] = useState(comparison);

  useEffect(() => {
    setTimeout(() => setDelayedComparison(comparison), 0);
  }, [comparison]);

  const handleCurrentPeriodLegendClick = useCallback(
    (legendItem: ILegendItem) => {
      hideLine(legendItem);

      const previousLegendItem = legends.find(
        legendToFind => legendToFind.text === legendTextWithPreviousPeriod(legendItem)
      );
      if (previousLegendItem) hideLine(previousLegendItem);
    },
    [hideLine, legends]
  );

  const handlePreviousPeriodLegendClick = useCallback(
    (legendItem: ILegendItem) => {
      hideLine(legendItem);

      const currentLegendItem = legends.find(
        legendToFind => legendToFind.text === replacePreviousPeriodSubstring(legendItem)
      );
      if (currentLegendItem) hideLine(currentLegendItem);
    },
    [hideLine, legends]
  );

  return (
    <StyledLegendsList>
      {!!data?.labels?.length && !!legends.length && (
        <StyledLegendsListContainer
          direction={delayedComparison ? 'column' : 'row'}
          height={analysis ? ANALYSIS_LEGENDS_CONTAINER_HEIGHT : 'auto'}
          marginTop={analysis ? '13px' : '15px'}
        >
          <HorizontalScrolling>
            {delayedComparison ? (
              <Stack justifyContent="space-between" height={ANALYSIS_LEGENDS_CONTAINER_HEIGHT}>
                <StyledLegendsStack>
                  <StyledLegendsHeader>Current</StyledLegendsHeader>
                  {legends.map(
                    (legendItem, index) =>
                      !isEndsWithPreviousPeriod(legendItem) && (
                        <LegendItem
                          key={index}
                          item={legendItem}
                          lineIndexMap={lineIndexMap}
                          analysis={analysis}
                          current={true}
                          onClick={() => handleCurrentPeriodLegendClick(legendItem)}
                        />
                      )
                  )}
                </StyledLegendsStack>
                <StyledLegendsStack>
                  <StyledLegendsHeader>Previous</StyledLegendsHeader>
                  {legends.map(
                    (legendItem, index) =>
                      isEndsWithPreviousPeriod(legendItem) && (
                        <LegendItem
                          key={index}
                          item={legendItem}
                          lineIndexMap={lineIndexMap}
                          analysis={analysis}
                          current={false}
                          onClick={() => handlePreviousPeriodLegendClick(legendItem)}
                        />
                      )
                  )}
                </StyledLegendsStack>
              </Stack>
            ) : (
              legends.map((legendItem, index) => (
                <LegendItem
                  key={index}
                  item={legendItem}
                  lineIndexMap={lineIndexMap}
                  analysis={analysis}
                  current={true}
                  onClick={() => hideLine(legendItem)}
                />
              ))
            )}
          </HorizontalScrolling>
        </StyledLegendsListContainer>
      )}
      {children}
    </StyledLegendsList>
  );
};

const StyledLegendsList = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  transform: 'translateY(2px)'
});

const StyledLegendsListContainer = styled(Stack)({
  justifyContent: 'center',
  minWidth: '70%'
});

const StyledLegendsHeader = styled(Typography)({
  fontWeight: '700',
  fontSize: '12px',
  lineHeight: '29px',
  letterSpacing: '0.17px',
  width: '75px'
});

const StyledLegendsStack = styled(Stack)({
  flexDirection: 'row',
  alignItems: 'center'
});

export default memo(LegendsList);

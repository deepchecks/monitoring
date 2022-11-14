import React, { PropsWithChildren, memo, useState, useEffect } from 'react';
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

const LegendsList = ({
  data,
  lineIndexMap,
  hideLine,
  legends,
  analysis,
  comparison,
  children
}: PropsWithChildren<LegendsListProps>) => {
  const [sortedLegends, setSortedLegends] = useState<ILegendItem[]>([]);
  const [delayedComparison, setDelayedComparison] = useState(comparison);

  useEffect(() => {
    setTimeout(() => setDelayedComparison(comparison), 0);
  }, [comparison]);

  useEffect(() => {
    if (comparison) {
      const paired: ILegendItem[] = [];
      const single: ILegendItem[] = [];

      legends.forEach(legend => {
        if (legend.text.endsWith(PREVIOUS_PERIOD)) {
          legends.find(l => legend.text === l.text + PREVIOUS_PERIOD) ? paired.push(legend) : single.push(legend);
        } else {
          legends.find(l => l.text === legend.text + PREVIOUS_PERIOD) ? paired.push(legend) : single.push(legend);
        }
      });

      setSortedLegends(paired.concat(single));
    }
  }, [comparison, legends, hideLine]);

  const handleCurrentPeriodLegendClick = (legendItem: ILegendItem) => {
    hideLine(legendItem);

    const previousLegendItem = legends.find(legend => legend.text === legendItem.text + PREVIOUS_PERIOD);
    if (previousLegendItem) hideLine(previousLegendItem);
  };

  const handlePreviousPeriodLegendClick = (legendItem: ILegendItem) => {
    hideLine(legendItem);

    const currentLegendItem = legends.find(legend => legend.text === replacePreviousPeriodSubstring(legendItem));
    if (currentLegendItem) hideLine(currentLegendItem);
  };

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
                  {sortedLegends.map(
                    (legendItem, index) =>
                      !legendItem.text.endsWith(PREVIOUS_PERIOD) && (
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
                      legendItem.text.endsWith(PREVIOUS_PERIOD) && (
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
  width: '100%'
});

const StyledLegendsListContainer = styled(Stack)({
  justifyContent: 'center',
  minWidth: '70%'
});

const StyledLegendsHeader = styled(Typography)({
  fontWeight: '700',
  fontSize: '12px',
  lineHeight: '140%',
  letterSpacing: '0.17px',
  width: '75px'
});

const StyledLegendsStack = styled(Stack)({
  flexDirection: 'row',
  alignItems: 'center'
});

export default memo(LegendsList);

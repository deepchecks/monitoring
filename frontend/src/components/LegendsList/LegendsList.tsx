import React, { ReactNode, useMemo } from 'react';
import { ChartData, LegendItem } from 'chart.js';

import { styled, Box, Tooltip, Typography } from '@mui/material';

import { HorizontalScrolling } from './components/HorizontalScrolling/HorizontalScrolling';

import { GraphData } from 'helpers/types';

interface LegendsListProps {
  children: ReactNode;
  chartData: ChartData<'line', GraphData, unknown>;
  lineIndexMap: Record<number, boolean>;
  hideLine: (item: LegendItem) => void;
  legends: LegendItem[];
}

const MAX_LENGTH_OF_TOOLTIP_TEXT = 120;

const LegendsList = ({ children, chartData, lineIndexMap, hideLine, legends }: LegendsListProps) => {
  const legendsBox = useMemo(
    () => (
      <StyledLegendsList>
        {!!chartData?.labels?.length && !!legends.length && (
          <Box sx={{ padding: '6.5px 0', minWidth: '70%' }}>
            <HorizontalScrolling>
              {legends.map((legendItem, index) => {
                const text = legendItem?.text?.split('|');

                return (
                  <Tooltip
                    title={legendItem?.text || ''}
                    disableHoverListener={legendItem?.text?.length <= MAX_LENGTH_OF_TOOLTIP_TEXT}
                    key={index}
                  >
                    <StyledLegendsListLegendItem onClick={() => hideLine(legendItem)} key={index}>
                      <StyledLegendsListLegendItemDot
                        sx={{
                          backgroundColor: legendItem.strokeStyle ? legendItem.strokeStyle.toString() : '#00F0FF'
                        }}
                      />
                      <Typography
                        variant="subtitle2"
                        ml="5px"
                        sx={{
                          textDecoration: lineIndexMap[
                            typeof legendItem.datasetIndex === 'number' ? legendItem.datasetIndex : -2
                          ]
                            ? 'line-through'
                            : 'none'
                        }}
                      >
                        {text[0].length > MAX_LENGTH_OF_TOOLTIP_TEXT
                          ? `${text[0].slice(0, MAX_LENGTH_OF_TOOLTIP_TEXT)}...`
                          : text[0]}
                      </Typography>
                    </StyledLegendsListLegendItem>
                  </Tooltip>
                );
              })}
            </HorizontalScrolling>
          </Box>
        )}
        {children && <Box sx={{ ml: '42px' }}>{children}</Box>}
      </StyledLegendsList>
    ),
    [legends, lineIndexMap, chartData?.labels?.length, children, hideLine]
  );

  return legendsBox;
};

const StyledLegendsList = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  marginTop: '0px'
});

const StyledLegendsListLegendItem = styled(Box)({
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  minWidth: 'max-content',
  margin: '0 7px',
  padding: '3px 0'
});

const StyledLegendsListLegendItemDot = styled(Box)({
  width: 9,
  height: 9,
  borderRadius: '3px'
});

export default LegendsList;

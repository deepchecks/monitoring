import React, { PropsWithChildren, memo } from 'react';
import { ChartData, LegendItem } from 'chart.js';

import { styled, Box, Tooltip, Typography } from '@mui/material';

import { HorizontalScrolling } from './components/HorizontalScrolling/HorizontalScrolling';

import { GraphData } from 'helpers/types';

interface LegendsListProps {
  data: ChartData<'line', GraphData, unknown>;
  lineIndexMap: Record<number, boolean>;
  hideLine: (item: LegendItem) => void;
  legends: LegendItem[];
}

const MAX_LENGTH_OF_TOOLTIP_TEXT = 120;

const LegendsList = ({ data, lineIndexMap, hideLine, legends, children }: PropsWithChildren<LegendsListProps>) => (
  <StyledLegendsList>
    {!!data?.labels?.length && !!legends.length && (
      <StyledLegendsListContainer>
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
                  <StyledLegendsListLegendItemPoint
                    sx={{
                      backgroundColor: legendItem.strokeStyle ? legendItem.strokeStyle.toString() : '#00F0FF'
                    }}
                  />
                  <Typography
                    variant="subtitle2"
                    sx={{
                      ml: '5px',
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
      </StyledLegendsListContainer>
    )}
    {children}
  </StyledLegendsList>
);

const StyledLegendsList = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  marginTop: '0px'
});

const StyledLegendsListContainer = styled(Box)({
  padding: '6.5px 0',
  minWidth: '70%'
});

const StyledLegendsListLegendItem = styled(Box)({
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  minWidth: 'max-content',
  margin: '0 7px',
  padding: '3px 0'
});

const StyledLegendsListLegendItemPoint = styled(Box)({
  width: 9,
  height: 9,
  borderRadius: '3px'
});

export default memo(LegendsList);

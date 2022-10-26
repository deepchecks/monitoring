import React, { ReactNode, useMemo } from 'react';
import { ChartData, LegendItem } from 'chart.js';

import { Box, Tooltip, Typography } from '@mui/material';

import { HorizontalScrolling } from './HorizontalScrolling';

import { GraphData } from '../helpers/types';

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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 1,
          marginTop: '0px'
        }}
      >
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
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        m: '0 7px',
                        minWidth: 'max-content',
                        cursor: 'pointer',
                        padding: 0,
                        p: '3px 0'
                      }}
                      onClick={() => hideLine(legendItem)}
                      key={index}
                    >
                      <Box
                        sx={{
                          width: 9,
                          height: 9,
                          borderRadius: '3px',
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
                    </Box>
                  </Tooltip>
                );
              })}
            </HorizontalScrolling>
          </Box>
        )}
        {children && <Box sx={{ ml: '42px' }}>{children}</Box>}
      </Box>
    ),
    [legends, lineIndexMap]
  );

  return legendsBox;
};

export default LegendsList;

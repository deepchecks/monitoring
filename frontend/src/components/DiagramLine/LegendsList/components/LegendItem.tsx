import React from 'react';
import { LegendItem as ILegendItem } from 'chart.js';

import { styled, Box, BoxProps, Tooltip, Typography } from '@mui/material';

import { GraphLegendCurrent, GraphLegendPrevious } from 'assets/icon/icon';

const MAX_LENGTH_OF_TOOLTIP_TEXT = 120;

interface LegendItemProps extends BoxProps {
  item: ILegendItem;
  lineIndexMap: Record<number, boolean>;
  analysis?: boolean;
  current?: boolean;
}

const LegendItem = ({ item, lineIndexMap, analysis, current, onClick }: LegendItemProps) => {
  const text = item?.text?.split('|');
  const color = item.strokeStyle ? item.strokeStyle.toString() : '#00F0FF';
  const legendLabel =
    (text[0].length > MAX_LENGTH_OF_TOOLTIP_TEXT
      ? `${text[0].slice(0, MAX_LENGTH_OF_TOOLTIP_TEXT)}...`
      : analysis
      ? text[0] + ' - ' + text[1]
      : text[0]) || '-';

  return (
    <Tooltip title={item?.text || ''} disableHoverListener={item?.text?.length <= MAX_LENGTH_OF_TOOLTIP_TEXT}>
      <StyledLegendItem
        onClick={onClick}
        sx={{
          opacity: lineIndexMap[typeof item.datasetIndex === 'number' ? item.datasetIndex : -2] ? 0.2 : 1
        }}
      >
        {analysis ? (
          current ? (
            <GraphLegendCurrent width="20px" fill={color} stroke={color} />
          ) : (
            <GraphLegendPrevious width="20px" fill={color} stroke={color} />
          )
        ) : (
          <StyledLegendItemPoint
            sx={{
              backgroundColor: color
            }}
          />
        )}

        <Typography variant="subtitle2" marginLeft="10px">
          {legendLabel}
        </Typography>
      </StyledLegendItem>
    </Tooltip>
  );
};

const StyledLegendItem = styled(Box)({
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  minWidth: 'max-content',
  margin: '0 7px',
  padding: '3px 0',
  transition: 'opacity 0.2s'
});

const StyledLegendItemPoint = styled(Box)({
  width: 9,
  height: 9,
  borderRadius: '3px'
});

export default LegendItem;

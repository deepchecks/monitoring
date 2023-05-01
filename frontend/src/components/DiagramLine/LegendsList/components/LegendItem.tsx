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
  version: string;
  indexInVersion: number;
}

const LegendItem = ({ item, lineIndexMap, analysis, current, version, indexInVersion, onClick }: LegendItemProps) => {
  const text = item?.text?.split('|');
  const color = item.strokeStyle ? item.strokeStyle.toString() : '#00F0FF';
  const legendLabel =
    (text?.[0] &&
      (text[0].length > MAX_LENGTH_OF_TOOLTIP_TEXT ? `${text[0].slice(0, MAX_LENGTH_OF_TOOLTIP_TEXT)}...` : text[0])) ||
    '-';

  return (
    <>
      {indexInVersion == 0 && analysis && (
        <StyledLegendHeaderContainer>
          <StyledLegendsHeader>{`${version}:`}</StyledLegendsHeader>
        </StyledLegendHeaderContainer>
      )}
      <Tooltip title={text?.[1] ? text[0] + ' - ' + text[1] : text?.[0]} placement="top">
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

          <Typography variant="subtitle2" marginLeft="10px" sx={{ color: color }}>
            {legendLabel}
          </Typography>
        </StyledLegendItem>
      </Tooltip>
    </>
  );
};

const StyledLegendItem = styled(Box)({
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  minWidth: 'max-content',
  margin: '0 7px',
  padding: '3px 0',
  transition: 'opacity 0.3s ease'
});

const StyledLegendItemPoint = styled(Box)({
  width: 9,
  height: 9,
  borderRadius: '3px'
});

const StyledLegendHeaderContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  minWidth: 'max-content',
  margin: '0 7px 0 1.7em',
  padding: '3px 0',
  ':first-of-type': {
    marginLeft: 0
  }
});

const StyledLegendsHeader = styled(Typography)({
  fontWeight: '700',
  fontSize: '12px',
  lineHeight: '29px',
  letterSpacing: '0.17px'
});

export default LegendItem;

import React from 'react';

import { Chart as ChartJS, ArcElement, Tooltip, Plugin, ChartEvent } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

import { Box, BoxProps, useTheme } from '@mui/material';
import {
  HelpOutline,
  ThumbDownRounded,
  ThumbUpRounded,
  UpdateRounded,
  ThumbUpOutlined,
  ThumbDownOutlined
} from '@mui/icons-material';

import { Text } from '../Text/Text';
import { Image } from '../Image/Image';
import { ToolTip } from '../Container/ToolTip/ToolTip';

import { StyledScoresBox, StyledDoughnutChartContainer, doughnutChartImageStyle } from './DoughnutChart.styles';
import { getData, options } from './DoughnutChart.helpers';

import { paletteOptions } from '../../theme/palette';

interface AnnotationInfoSchema {
  good?: number;
  bad?: number;
  unknown?: number;
  pending?: number;
  score?: number;
}

ChartJS?.register(ArcElement, Tooltip);

interface DoughnutChartProps extends BoxProps {
  data: number[];
  score?: number;
  actions: {
    badRedirect: () => void;
    goodRedirect: () => void;
    unannotatedRedirect: () => void;
  };
  isIncludeEstimated?: boolean;
  userAnnotated?: AnnotationInfoSchema;
  estimatedAnnotated?: AnnotationInfoSchema;
  pendingAnnotated?: number;
  handleCenterClick?: () => void;
  checkboxCheckedIcon?: string;
  checkboxUnCheckedIcon?: string;
}

export const DoughnutChart = ({
  data,
  score,
  width = 260,
  actions,
  isIncludeEstimated,
  userAnnotated,
  estimatedAnnotated,
  handleCenterClick,
  pendingAnnotated,
  checkboxCheckedIcon,
  checkboxUnCheckedIcon,
  ...otherProps
}: DoughnutChartProps) => {
  const { badRedirect, goodRedirect, unannotatedRedirect } = actions;

  const theme = useTheme();

  const calculatedScore = score || score === 0 ? `${Math.round(Number(score) * 100)}%` : 'N/A';
  const isBadScore = !score || Number(score) < 0.5;
  const allScores = Number(data[0]) + Number(data[1]) + Number(data[2]);

  const checkboxChecked = require('../../assets/chart/select-all-checkbox.svg').default;
  const checkboxUnChecked = require('../../assets/chart/select-all-checkbox-unchecked.svg').default;

  const calculatePercentage = (samples?: number) => {
    const percentage = (Number(samples) / Number(allScores)) * 100;

    return `${
      Number(samples) > 0 && percentage < 1 && percentage > 0 ? percentage.toFixed(2) : Math.round(percentage)
    }%`;
  };

  const handleRedirect = (index: number) => {
    switch (index) {
      case 1:
        return goodRedirect();
      case 0:
        return badRedirect();
      default:
        return unannotatedRedirect();
    }
  };

  const centerText: Plugin<'doughnut'> = {
    id: 'centerText',
    afterDatasetsDraw: chart => {
      const { ctx } = chart;

      const title = calculatedScore;
      const subTitle = 'Include Estimated';
      const image = document.querySelector('img#chart-checkbox');

      const x = chart.getDatasetMeta(0).data[0].x;
      const y = chart.getDatasetMeta(0).data[0].y;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '300 56px Manrope';
      ctx.fillStyle =
        calculatedScore === 'N/A'
          ? paletteOptions.grey?.[400] || ''
          : isBadScore
          ? paletteOptions.error?.['main' as keyof typeof paletteOptions.error] || ''
          : paletteOptions.success?.['main' as keyof typeof paletteOptions.success] || '';
      ctx.fillText(title, x, y);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 12px Manrope';
      ctx.fillStyle = paletteOptions.grey?.[300] as typeof ctx.fillStyle;
      ctx.fillText(subTitle, x + 12, y + 35);

      ctx.drawImage(image as CanvasImageSource, x - 63, y + 24, 20, 20);
      ctx.restore();
    }
  };

  const handleChartItmClick = (_e: ChartEvent, item: { index: number }[]) => {
    if (item) {
      if (item[0]) {
        handleRedirect(item[0]?.index);
      }

      if (item.length < 1 && handleCenterClick) {
        handleCenterClick();
      }
    }
  };

  const checkboxData = () => {
    switch (isIncludeEstimated) {
      case true:
        return {
          icon: checkboxCheckedIcon || checkboxChecked,
          alt: 'checked checkbox'
        };
      default:
        return {
          icon: checkboxUnCheckedIcon || checkboxUnChecked,
          alt: 'unchecked checkbox'
        };
    }
  };

  return (
    <StyledDoughnutChartContainer width={width} key={score}>
      <Box position="relative" width={width} {...otherProps}>
        <Doughnut
          data={getData(data)}
          options={{ ...options(allScores), onClick: handleChartItmClick }}
          style={{ cursor: 'pointer', background: theme.palette.common.white }}
          plugins={[centerText]}
        />
      </Box>

      <Image
        alt={checkboxData().alt}
        src={checkboxData().icon}
        width="20px"
        height="20px"
        id="chart-checkbox"
        onClick={handleCenterClick}
        style={doughnutChartImageStyle}
      />

      <StyledScoresBox>
        <ToolTip
          text="Annotated Good:"
          descriptions={
            isIncludeEstimated
              ? [
                  {
                    text: 'User Annotation - ',
                    info: `${calculatePercentage(userAnnotated?.good)} (${userAnnotated?.good})`,
                    icon: <ThumbUpRounded fontSize="small" />
                  },
                  {
                    text: 'Estimated Annotation - ',
                    info: `${calculatePercentage(estimatedAnnotated?.good)} (${estimatedAnnotated?.good})`,
                    icon: <ThumbUpOutlined fontSize="small" />
                  }
                ]
              : [
                  {
                    text: 'User Annotation - ',
                    info: `${calculatePercentage(data[1])} (${data[1]})`,
                    icon: <ThumbUpRounded fontSize="small" />
                  }
                ]
          }
        >
          <Box sx={{ cursor: 'pointer' }} onClick={() => handleRedirect(1)}>
            <ThumbUpRounded color="success" />
            <Text text={`${calculatePercentage(data[1])} (${data[1]})`} type="tinyBold" />
          </Box>
        </ToolTip>
        <ToolTip
          text="Annotated Bad:"
          descriptions={
            isIncludeEstimated
              ? [
                  {
                    text: 'User Annotation - ',
                    info: `${calculatePercentage(userAnnotated?.bad)} (${userAnnotated?.bad})`,
                    icon: <ThumbDownRounded fontSize="small" />
                  },
                  {
                    text: 'Estimated Annotation - ',
                    info: `${calculatePercentage(estimatedAnnotated?.bad)} (${estimatedAnnotated?.bad})`,
                    icon: <ThumbDownOutlined fontSize="small" />
                  }
                ]
              : [
                  {
                    text: 'User Annotation - ',
                    info: `${calculatePercentage(data[0])} (${data[0]})`,
                    icon: <ThumbDownRounded fontSize="small" />
                  }
                ]
          }
        >
          <Box sx={{ cursor: 'pointer' }} onClick={() => handleRedirect(0)}>
            <ThumbDownRounded color="error" />
            <Text text={`${calculatePercentage(data[0])} (${data[0]})`} type="tinyBold" />
          </Box>
        </ToolTip>
        <ToolTip
          text="Not Annotated:"
          descriptions={[
            {
              text: 'Annotation Unknown - ',
              info: `${calculatePercentage(data[2] - Number(pendingAnnotated))} (${
                data[2] - Number(pendingAnnotated)
              })`,
              icon: <HelpOutline fontSize="small" />
            },
            {
              text: 'Pending Annotation - ',
              info: `${calculatePercentage(pendingAnnotated)} (${pendingAnnotated})`,
              icon: <UpdateRounded fontSize="small" />
            }
          ]}
        >
          <Box sx={{ cursor: 'pointer' }} onClick={() => handleRedirect(2)}>
            <HelpOutline color="info" />
            <Text text={`${calculatePercentage(data[2])} (${data[2]})`} type="tinyBold" />
          </Box>
        </ToolTip>
      </StyledScoresBox>
    </StyledDoughnutChartContainer>
  );
};

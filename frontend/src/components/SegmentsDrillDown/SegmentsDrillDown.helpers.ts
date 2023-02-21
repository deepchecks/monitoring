import { ChartOptions, ChartData } from 'chart.js';

import { alpha } from '@mui/material';
import { CheckGroupBySchema } from 'api/generated';

export const TITLE = 'Check Per Segment';
export const ACTIVE_BAR_COLOR = alpha('#00CCFF', 1);
export const BAR_COLOR = alpha(ACTIVE_BAR_COLOR, 0.3);
export const ACTIVE_BAR_BG_COLOR = alpha(ACTIVE_BAR_COLOR, 0.1);

export const barsColorArray = (length: number): string[] => Array(length).fill(BAR_COLOR);

export const chartOptions = (
  segmentData: CheckGroupBySchema[],
  data: Array<number | null>,
  yTitle?: string,
  xTitle?: string,
  activeIndex?: number
): ChartOptions<'bar'> => {
  const allZeros = data.every(d => d === 0);
  const nonNulls: number[] = data.filter(f => f !== null) as number[];
  const max = Math.max(...nonNulls);
  const min = Math.min(...nonNulls);
  const stepSize = Math.max(...nonNulls.map(d => Math.abs(d))) / 3;

  return {
    indexAxis: 'x' as const,
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      bar: {
        borderRadius: 6
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context) {
            const totalCount = segmentData[0].count;
            const thisCount = segmentData[context.dataIndex].count;
            const percent = new Intl.NumberFormat('default', { style: 'percent', maximumFractionDigits: 2 }).format(
              thisCount / totalCount
            );
            return [
              ' ' + (yTitle || context.dataset.label || '') + ': ' + context.formattedValue,
              ' Segment Size: ' + thisCount + ' (' + percent + ')'
            ];
          }
        }
      },
      legend: {
        display: false
      },
      drawActiveBarEffect: {
        activeIndex
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        type: 'category',
        title: {
          display: xTitle !== undefined,
          text: xTitle
        }
      },
      y: {
        max: allZeros ? 0.1 : max <= 0 ? 0 : max + stepSize,
        min: min >= 0 ? 0 : min - stepSize,
        ticks: {
          stepSize
        },
        grid: { drawBorder: false, drawTicks: false },
        title: {
          display: yTitle !== undefined,
          text: yTitle
        }
      }
    }
  };
};

export const chartData = (labels: string[], data: Array<number | null>, barsColors: string[]): ChartData<'bar'> => ({
  labels,
  datasets: [
    {
      label: TITLE,
      data: data as number[],
      borderColor: 'transparent',
      backgroundColor: barsColors,
      hoverBackgroundColor: ACTIVE_BAR_COLOR,
      barPercentage: 0.5,
      minBarLength: 10 // Used to show also values of 0.
    }
  ]
});

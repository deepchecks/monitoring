import { ChartOptions, ChartData } from 'chart.js';

import { alpha } from '@mui/material';

export const TITLE = 'Check Per Segment';
export const ACTIVE_BAR_COLOR = alpha('#00CCFF', 1);
export const BAR_COLOR = alpha(ACTIVE_BAR_COLOR, 0.3);

export const barsColorArray = (length: number): string[] => Array(length).fill(BAR_COLOR);

export const chartOptions = (data: number[], yTitle?: string, xTitle?: string): ChartOptions<'bar'> => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const stepSize = Math.max(...data.map(d => Math.abs(d))) / 3;

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
      legend: {
        display: false
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
        max: max <= 0 ? 0 : max + stepSize,
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

export const chartData = (labels: string[], data: number[]): ChartData<'bar'> => ({
  labels,
  datasets: [
    {
      label: TITLE,
      data,
      borderColor: 'transparent',
      backgroundColor: barsColorArray(data.length),
      hoverBackgroundColor: ACTIVE_BAR_COLOR,
      barPercentage: 0.5
    }
  ]
});

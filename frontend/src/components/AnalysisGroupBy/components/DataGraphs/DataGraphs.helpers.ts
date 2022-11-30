import { ChartOptions, ChartData } from 'chart.js';

import { alpha } from '@mui/material';

export const TITLE = 'Check per segment';
export const ACTIVE_BAR_COLOR = alpha('#00CCFF', 1);
export const BAR_COLOR = alpha(ACTIVE_BAR_COLOR, 0.3);

export const filledBarColorsArray = (length: number) => Array(length).fill(BAR_COLOR);

export const chartOptions = (data: number[]): ChartOptions<'bar'> => {
  const max = Math.max(...data);
  const stepSize = max / 3;

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
        type: 'category'
      },
      y: {
        max: max + stepSize,
        ticks: {
          stepSize
        },
        grid: { drawBorder: false, drawTicks: false }
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
      backgroundColor: filledBarColorsArray(data.length),
      hoverBackgroundColor: ACTIVE_BAR_COLOR,
      barPercentage: 0.5
    }
  ]
});

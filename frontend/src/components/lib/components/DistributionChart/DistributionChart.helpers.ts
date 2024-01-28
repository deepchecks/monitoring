import { ChartData, ChartOptions } from 'chart.js';

import { theme } from '../../theme';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getData(data: number[], labels: any[]): ChartData<'line', number[], string> {
  return {
    labels: [[labels[0], 'Bad'], ...labels.slice(1, labels.length - 2), [labels[labels.length - 1], 'Good']],
    datasets: [
      {
        fill: true,
        data,
        borderColor: '#9159F7',
        backgroundColor: 'rgba(121, 100, 255, 0.22)',
        borderWidth: 3,
        pointRadius: 0
      }
    ]
  };
}

export const getOptions = (): ChartOptions<'line'> => ({
  responsive: true,
  elements: {
    line: {
      tension: 0.5
    }
  },
  plugins: {
    legend: {
      display: false
    },
    title: {
      display: false
    }
    // annotation: {
    //   annotations: [
    //     {
    //       drawTime: 'afterDatasetsDraw',
    //       type: 'line',
    //       scaleID: 'x',
    //       value: average,
    //       borderWidth: 2,
    //       borderColor: 'black',
    //       label: {
    //         content: 'Average',
    //         display: true,
    //         position: 'end',
    //         backgroundColor: 'transparent',
    //         color: 'black',
    //         xAdjust: -24,
    //         padding: 0,
    //         font: {
    //           family: 'Manrope',
    //           size: 11,
    //           weight: '700',
    //           lineHeight: '14px'
    //         }
    //       }
    //     },
    //     {
    //       drawTime: 'afterDatasetsDraw',
    //       type: 'line',
    //       scaleID: 'x',
    //       value: condition,
    //       borderWidth: 2,
    //       borderColor: theme.palette.grey[500],
    //       borderDash: [6],
    //       label: {
    //         content: 'Condition',
    //         display: true,
    //         position: 'start',
    //         backgroundColor: 'transparent',
    //         color: theme.palette.grey[500],
    //         xAdjust: 28,
    //         padding: 0,
    //         font: {
    //           family: 'Manrope',
    //           size: 11,
    //           weight: '700',
    //           lineHeight: '14px'
    //         }
    //       }
    //     }
    //   ]
    // }
  },
  scales: {
    x: {
      grid: {
        display: true,
        color: theme.palette.grey[200],
        lineWidth: 2,
        tickColor: 'transparent'
      },
      ticks: {
        color: theme.palette.grey[500],
        font: {
          family: 'Manrope',
          size: 10,
          weight: '700'
        }
      }
    },
    y: {
      grid: {
        display: false
      },
      ticks: {
        color: theme.palette.grey[500],
        font: {
          family: 'Manrope',
          size: 10,
          weight: '700'
        }
      }
    }
  }
});

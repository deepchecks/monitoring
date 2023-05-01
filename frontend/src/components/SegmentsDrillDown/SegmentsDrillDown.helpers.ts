import { ChartOptions, ChartData } from 'chart.js';

import { CheckGroupBySchema, CheckGroupBySchemaValue } from 'api/generated';

import { alpha } from '@mui/material';

import { theme } from 'components/lib/theme';

const NULL_VALUE_BAR_COLOR = theme.palette.grey[100];
const NULL_VALUE_ACTIVE_BAR_COLOR = theme.palette.grey[300];
const ACTIVE_BAR_COLOR = '#00CCFF';
const BAR_COLOR = alpha(ACTIVE_BAR_COLOR, 0.3);
export const ACTIVE_BAR_BG_COLOR = alpha(ACTIVE_BAR_COLOR, 0.1);
export const TITLE = 'Check Per Segment';

export function barsColorArray(data: (number | null)[], activeBarIndex?: number) {
  return data.map((d, index) =>
    activeBarIndex === index ? ACTIVE_BAR_COLOR : d === null ? NULL_VALUE_BAR_COLOR : BAR_COLOR
  );
}

function barsHoverColorArray(data: (number | null)[]) {
  return data.map(d => (d === null ? NULL_VALUE_ACTIVE_BAR_COLOR : ACTIVE_BAR_COLOR));
}

function stringNameFix(str: string) {
  return str.replaceAll('_', ' ').toLowerCase();
}

export function getKeyByDatasetName(obj: CheckGroupBySchemaValue, name: string) {
  return Object.keys(obj).find(key => stringNameFix(key) == stringNameFix(name));
}

function removeNulls(data: (number | null)[]) {
  return data.map(d => (d === null ? 0 : d));
}

export const chartOptions = (
  segmentData: CheckGroupBySchema[],
  data: Array<number | null>,
  activeIndex: number,
  yTitle?: string,
  xTitle?: string
): ChartOptions<'bar'> => {
  const allZeros = data.every(d => d === 0);
  const nonNulls = removeNulls(data);
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

            const nullValueTooltip = 'Not enough samples to run check';
            const valueTooltip = [
              ' ' + (yTitle || context.dataset.label || '') + ': ' + context.formattedValue,
              ' Segment Size: ' + thisCount + ' (' + percent + ')'
            ];

            return data[context.dataIndex] === null ? nullValueTooltip : valueTooltip;
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
          display: !!xTitle,
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
          display: !!yTitle,
          text: yTitle
        }
      }
    }
  };
};

export const chartData = (labels: string[], data: (number | null)[], barsColors: string[]): ChartData<'bar'> => ({
  labels,
  datasets: [
    {
      label: TITLE,
      data: removeNulls(data),
      borderColor: 'transparent',
      backgroundColor: barsColors,
      hoverBackgroundColor: barsHoverColorArray(data),
      barPercentage: 0.5,
      minBarLength: 10 // Used to show also values of 0.
    }
  ]
});

import React, { useRef } from 'react';
import { alpha, Box, useTheme } from '@mui/material';
import { Chart, ChartData, registerables, TimeUnit, TooltipCallbacks, TooltipItem, TooltipModel } from 'chart.js';
import { _DeepPartialObject } from 'chart.js/types/utils';
import 'chartjs-adapter-dayjs-3';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Line } from 'react-chartjs-2';
import { addSpace, drawCircle, setThreshold } from '../helpers/diagramLine';
import { GraphData } from '../helpers/types';
import { colors } from '../theme/colors';
import { Loader } from './Loader';

Chart.register(...registerables, zoomPlugin);

export interface DiagramLineProps {
  data: ChartData<'line', GraphData>;
  threshold?: number;
  minTimeUnit?: TimeUnit;
  isLoading?: boolean;
  tooltipCallbacks?: _DeepPartialObject<TooltipCallbacks<'line', TooltipModel<'line'>, TooltipItem<'line'>>>;
}

const defaultTooltipCallbacks: _DeepPartialObject<TooltipCallbacks<'line', TooltipModel<'line'>, TooltipItem<'line'>>> =
  {
    labelColor: (context: TooltipItem<'line'>) => ({
      backgroundColor: context.dataset?.borderColor as string,
      borderColor: context.dataset?.borderColor as string
    }),
    title: (context: TooltipItem<'line'>[]) => context[0].formattedValue,
    label: (context: TooltipItem<'line'>) => `${context.label}`
  };

function DiagramLine({
  data,
  threshold = 0,
  minTimeUnit = 'day',
  isLoading,
  tooltipCallbacks = defaultTooltipCallbacks
}: DiagramLineProps) {
  const chartRef = useRef<Chart<'line'>>();
  const range = { min: 0, max: 0 };
  const theme = useTheme();
  const _tCallbacks = { ...defaultTooltipCallbacks, ...tooltipCallbacks };

  const getNewData = () => ({
    ...data,
    datasets: data.datasets.map((el: any) => {
      el.data.forEach((item: any) => {
        if (typeof item === 'number') {
          if (item < range.min) {
            range.min = item;
          }

          if (item > range.max) {
            range.max = item;
          }
          return;
        }
        if (item && typeof item === 'object') {
          if (item.y < range.min) {
            range.min = item.y;
          }
          if (item.y > range.max) {
            range.max = item.y;
          }
        }
      });
      return {
        ...el,
        backgroundColor: alpha(el.borderColor, 0.05)
      };
    })
  });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}
    >
      {isLoading ? (
        <Loader />
      ) : (
        <Line
          data={getNewData()}
          ref={chartRef}
          options={{
            responsive: true,
            layout: {
              padding: {
                right: threshold ? 15 : 0
              }
            },
            elements: {
              point: {
                borderWidth: 2,
                radius: 4,
                hoverRadius: 6,
                hitRadius: 10,
                hoverBorderWidth: 3
              },
              line: {
                tension: 0.4,
                fill: true
              }
            },
            plugins: {
              legend: {
                display: true,
                position: 'bottom',
                align: 'start',
                labels: {
                  usePointStyle: true,
                  textAlign: 'center',
                  generateLabels: chart => {
                    const { data } = chart;
                    if (data && data.labels?.length && data.datasets.length) {
                      return data.datasets.map(({ label, borderColor }, index) => ({
                        datasetIndex: index,
                        text: label as string,
                        textColor: theme.palette.text.primary,
                        fillStyle: borderColor as string,
                        strokeStyle: borderColor as string,
                        pointStyle: 'rectRounded',
                        textAlign: 'center',
                        hidden: !chart.isDatasetVisible(index)
                      }));
                    }
                    return [];
                  },
                  boxWidth: 6,
                  boxHeight: 6,
                  font: {
                    size: 12
                  }
                }
              },
              tooltip: {
                backgroundColor: colors.neutral.blue,
                padding: {
                  bottom: 4,
                  left: 16,
                  right: 16,
                  top: 4
                },
                boxPadding: 5,
                callbacks: _tCallbacks
              },
              zoom: {
                limits: {
                  y: {
                    min: range.min,
                    max: range.max + addSpace(range.max),
                    minRange: (range.max - range.min) / 2
                  }
                },
                pan: {
                  enabled: true,
                  mode: 'xy'
                },
                zoom: {
                  wheel: {
                    enabled: false
                  },
                  //   pinch: {
                  //     enabled: false,
                  //   },
                  mode: 'xy'
                }
              }
            },
            scales: {
              x: {
                grid: {
                  display: false
                },
                // max: 15,
                type: 'timeseries',
                time: {
                  minUnit: minTimeUnit
                }
              },
              y: {
                min: range.min,
                max: range.max + (range.max - range.min) * 0.3
              }
            }
          }}
          plugins={threshold ? [setThreshold(threshold), drawCircle] : [drawCircle]}
        />
      )}
    </Box>
  );
}

export default DiagramLine;

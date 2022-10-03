import { alpha, Stack, useTheme } from '@mui/material';
import { AlertRuleSchema, AlertSchema, AlertSeverity } from 'api/generated';
import {
  Chart,
  ChartArea,
  ChartData,
  ChartOptions,
  registerables,
  TimeUnit,
  TooltipCallbacks,
  TooltipItem,
  TooltipModel
} from 'chart.js';
import { DistributiveArray, _DeepPartialObject } from 'chart.js/types/utils';
import 'chartjs-adapter-dayjs-3';
import zoomPlugin from 'chartjs-plugin-zoom';
import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  addSpace,
  drawAlerts,
  drawCircle,
  minimapPanorama,
  OriginalMinMax,
  setAlertLine
} from '../helpers/diagramLine';
import { GraphData } from '../helpers/types';
import { colors } from '../theme/colors';
import { Loader } from './Loader';
import { Minimap } from './Minimap';

declare module 'chart.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    drawAlerts: {
      activeIndex: number;
      changeAlertIndex: Dispatch<SetStateAction<number>>;
      severity: AlertSeverity;
    };
    minimapPanorama: {
      minimapRef: HTMLDivElement;
    };
    drawAlertsOnMinimap: {
      activeIndex: number;
      changeAlertIndex: Dispatch<SetStateAction<number>>;
      severity: AlertSeverity;
    };
  }
  /* eslint-disable @typescript-eslint/no-unused-vars */
  interface Chart<
    TType extends keyof ChartTypeRegistry = keyof ChartTypeRegistry,
    TData = DistributiveArray<ChartTypeRegistry[TType]['defaultDataPoint']>,
    TLabel = unknown
  > {
    originalMinMax: OriginalMinMax;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

Chart.register(...registerables, zoomPlugin);

function createGradient(ctx: CanvasRenderingContext2D, area: ChartArea, colorStart: string, colorEnd: string) {
  const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

interface IMinimap {
  alertSeverity: AlertSeverity;
  alertIndex: number;
  alerts: AlertSchema[];
  changeAlertIndex: Dispatch<SetStateAction<number>>;
}

export interface DiagramLineProps {
  data: ChartData<'line', GraphData>;
  alert_rules?: Array<AlertRuleSchema>;
  height?: number;
  minTimeUnit?: TimeUnit;
  isLoading?: boolean;
  minimap?: IMinimap;
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

const initMinimap: IMinimap = {
  alertSeverity: 'low',
  alertIndex: 0,
  alerts: [],
  changeAlertIndex: () => 1
};

function DiagramLine({
  data,
  height,
  alert_rules = [],
  minTimeUnit = 'day',
  isLoading,
  minimap = initMinimap,
  tooltipCallbacks = defaultTooltipCallbacks
}: DiagramLineProps) {
  const { alerts, alertIndex, alertSeverity, changeAlertIndex } = minimap;
  const chartRef = useRef<Chart<'line', number[], string>>();
  const minimapRef = useRef<HTMLDivElement[]>([]);
  const range = useRef({ min: 0, max: 0 });
  const theme = useTheme();
  const _tCallbacks = { ...defaultTooltipCallbacks, ...tooltipCallbacks };
  const [chartData, setChartData] = useState(data);

  const getNewData = () => {
    const char = chartRef.current;

    if (!char) {
      return data;
    }

    return {
      ...data,
      datasets: data.datasets.map(el => {
        el.data.forEach(item => {
          if (typeof item === 'number') {
            if (item < range.current.min) {
              range.current.min = item;
            }

            if (item > range.current.max) {
              range.current.max = item;
            }
            return;
          }
          if (item && typeof item === 'object') {
            if (item.y < range.current.min) {
              range.current.min = item.y;
            }
            if (item.y > range.current.max) {
              range.current.max = item.y;
            }
          }
        });

        return {
          ...el,
          backgroundColor: createGradient(
            char.ctx,
            char.chartArea,
            alpha(el.borderColor as string, 0),
            alpha(el.borderColor as string, 0.1)
          )
        };
      })
    };
  };

  const onChange = ({ chart }: { chart: Chart }) => {
    if (chart.originalMinMax && minimapRef?.current?.length) {
      const { min, max } = chart.scales.x;
      const { originalMinMax } = chart;
      const left = ((min - originalMinMax.min) / (originalMinMax.max - originalMinMax.min)) * 100;
      const right = ((max - originalMinMax.min) / (originalMinMax.max - originalMinMax.min)) * 100;
      const lf = left > 0 ? (left > 98 ? 98 : left) : 0;
      const rg = right < 100 ? (right < 2 ? 2 : right) : 100;
      minimapRef.current[0].style.width = `${lf}%`;
      minimapRef.current[1].style.width = `${rg - lf}%`;
      minimapRef.current[1].style.left = `${lf}%`;
      minimapRef.current[2].style.width = `${100 - rg}%`;
    }
  };

  const getActivePlugins = () => {
    const currentPlugins = [drawCircle];
    if (alerts.length) {
      currentPlugins.push(drawAlerts(alerts));
      currentPlugins.push(minimapPanorama(onChange));
    }

    if (alert_rules.length) {
      alert_rules.forEach(alert_rule => currentPlugins.push(setAlertLine(alert_rule)));
    }

    return currentPlugins;
  };

  const options: ChartOptions<'line'> = {
    maintainAspectRatio: false,
    responsive: true,
    onResize: chart => {
      chart.resize(chart.canvas.parentElement?.clientWidth, chart.canvas.parentElement?.clientHeight);
    },
    layout: {
      padding: {
        right: alert_rules.length ? 15 : 0,
        top: alerts.length ? 40 : 0
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
      drawAlerts: {
        activeIndex: alertIndex,
        changeAlertIndex,
        severity: alertSeverity
      },
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
      minimapPanorama: {
        minimapRef: minimapRef.current[1]
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
            min: range.current.min,
            max: range.current.max + addSpace(range.current.max),
            minRange: (range.current.max - range.current.min) / 2
          }
        },
        pan: {
          enabled: true,
          onPan: alerts.length ? onChange : () => 1,
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
        min: range.current.min,
        max: Math.max(range.current.max + (range.current.max - range.current.min) * 0.3, 1)
      }
    }
  };

  useEffect(() => {
    if (chartRef.current) {
      setChartData(getNewData());
    }
  }, [chartRef.current, data]);

  return isLoading ? (
    <Loader />
  ) : (
    <Stack spacing="44px" height={height}>
      <Line data={chartData} ref={chartRef} options={options} plugins={getActivePlugins()} />
      {changeAlertIndex && !!alerts.length && (
        <Minimap
          alerts={alerts}
          alertIndex={alertIndex}
          alertSeverity={alertSeverity}
          changeAlertIndex={changeAlertIndex}
          data={chartData}
          options={options}
          ref={minimapRef}
        />
      )}
    </Stack>
  );
}

export default DiagramLine;

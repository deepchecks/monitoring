import React, { Dispatch, ReactNode, SetStateAction, useEffect, useRef, useState } from 'react';
import {
  Chart,
  ChartArea,
  ChartData,
  ChartOptions,
  LegendItem,
  registerables,
  TimeUnit,
  TooltipCallbacks,
  TooltipItem,
  TooltipModel
} from 'chart.js';
import { DistributiveArray, _DeepPartialObject } from 'chart.js/types/utils';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-dayjs-3';
import zoomPlugin from 'chartjs-plugin-zoom';
import mixpanel from 'mixpanel-browser';

import { AlertRuleSchema, AlertSchema, AlertSeverity } from 'api/generated';

import {
  addSpace,
  drawAlerts,
  drawCircle,
  minimapPanorama,
  OriginalMinMax,
  setAlertLine
} from '../helpers/diagramLine';

import { alpha, Box, Tooltip, Typography } from '@mui/material';

import { HorizontalScrolling } from './HorizontalScrolling';
import { Loader } from './Loader';
import { Minimap } from './Minimap';

import { colors } from '../theme/colors';

import { GraphData } from '../helpers/types';

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
  alert_rules?: Array<AlertRuleSchema>;
  data: ChartData<'line', GraphData>;
  children?: ReactNode;
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

const maxLengthOfTooltipText = 120;

function DiagramLine({
  data,
  children,
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
  const _tCallbacks = { ...defaultTooltipCallbacks, ...tooltipCallbacks };
  const [lineIndexMap, setLineIndexMap] = useState<Record<number, boolean>>({});
  const [legends, setLegends] = useState<LegendItem[]>([]);
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

  const hideLine = (item: LegendItem) => {
    mixpanel.track('Click on a legend on the graph');

    const chart = chartRef.current;

    if (chart && typeof item.datasetIndex === 'number') {
      const isDatasetVisible = chart.isDatasetVisible(item.datasetIndex);
      chart.setDatasetVisibility(item.datasetIndex, !isDatasetVisible);
      setLineIndexMap(prevState => ({
        ...prevState,
        [typeof item.datasetIndex === 'number' ? item.datasetIndex : -1]: isDatasetVisible
      }));
    }
  };

  const options: ChartOptions<'line'> = {
    maintainAspectRatio: false,
    responsive: true,
    onResize: chart => {
      chart.resize(chart.canvas.parentElement?.clientWidth, chart.canvas.parentElement?.clientHeight);
    },
    interaction: {
      mode: 'nearest',
      intersect: false
    },
    layout: {
      padding: {
        right: alert_rules.length ? 15 : 0,
        top: alerts.length ? 40 : 0
      }
    },
    elements: {
      point: {
        borderWidth: 0,
        radius: 2,
        hoverRadius: 4,
        hitRadius: 6,
        hoverBorderWidth: 0
      },
      line: {
        borderWidth: 2,
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
        display: false
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
          minUnit: minTimeUnit,
          unit: minTimeUnit
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

  useEffect(() => {
    if (chartRef.current && chartRef.current?.legend?.legendItems?.length) {
      setLegends(chartRef.current?.legend?.legendItems);
      chartRef.current?.legend?.legendItems.forEach(item => {
        chartRef.current?.setDatasetVisibility(item.datasetIndex || 0, true);
      });
      setLineIndexMap({});
    }
  }, [chartData]);

  return isLoading ? (
    <Loader />
  ) : (
    <>
      <Box height={height ? height - 61 : 'auto'} sx={{ position: 'relative' }}>
        <Line data={chartData} ref={chartRef} options={options} plugins={getActivePlugins()} />
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 1,
          marginTop: '30px'
        }}
      >
        {!!chartData?.labels?.length && !!legends.length && (
          <Box sx={{ padding: '6.5px 0', minWidth: '70%' }}>
            <HorizontalScrolling>
              {legends.map((legendItem, index) => {
                const text = legendItem?.text?.split('|');
                return (
                  <Tooltip
                    title={legendItem?.text || ''}
                    disableHoverListener={legendItem?.text?.length <= maxLengthOfTooltipText}
                    key={index}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        m: '0 7px',
                        minWidth: 'max-content',
                        cursor: 'pointer',
                        padding: 0,
                        p: '3px 0'
                      }}
                      onClick={() => hideLine(legendItem)}
                      key={index}
                    >
                      <Box
                        sx={{
                          width: 9,
                          height: 9,
                          borderRadius: '3px',
                          backgroundColor: legendItem.strokeStyle ? legendItem.strokeStyle.toString() : '#00F0FF'
                        }}
                      />
                      <Typography
                        variant="subtitle2"
                        ml="5px"
                        sx={{
                          textDecoration: lineIndexMap[
                            typeof legendItem.datasetIndex === 'number' ? legendItem.datasetIndex : -2
                          ]
                            ? 'line-through'
                            : 'none'
                        }}
                      >
                        {text[0].length > maxLengthOfTooltipText
                          ? `${text[0].slice(0, maxLengthOfTooltipText)}...`
                          : text[0]}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })}
            </HorizontalScrolling>
          </Box>
        )}
        {children && <Box sx={{ ml: '42px' }}>{children}</Box>}
      </Box>
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
    </>
  );
}

export default DiagramLine;

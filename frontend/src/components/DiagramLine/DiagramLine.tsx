import React, { PropsWithChildren, useEffect, useRef, useState, useCallback } from 'react';
import { Chart, Tooltip, ChartOptions, LegendItem, registerables } from 'chart.js';
declare module 'chart.js' {
  interface TooltipPositionerMap {
    myCustomPositioner: TooltipPositionerFunction<ChartType>;
  }
}
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-dayjs-3';
import zoomPlugin from 'chartjs-plugin-zoom';
import mixpanel from 'mixpanel-browser';

import { drawAlerts, drawCircle, minimapPanorama, setAlertLine } from 'helpers/diagramLine';
import { createGradient, defaultTooltipCallbacks, initMinimap } from './DiagramLine.helpers';

import { alpha, Box, Collapse, Typography } from '@mui/material';

import LegendsList from './LegendsList/LegendsList';
import DiagramTutorialTooltip from '../DiagramTutorialTooltip';
import { Loader } from '../Loader';
import { Minimap } from '../Minimap';

import { colors } from 'theme/colors';

import { DiagramLineProps } from './DiagramLine.types';

Chart.register(...registerables, zoomPlugin);

Tooltip.positioners.myCustomPositioner = function (elements, eventPosition) {
  const nearest = Tooltip.positioners.nearest.call(this, elements, eventPosition);
  if (nearest) {
    const isRight = nearest.x < this.width / 2;
    const isHide = (isRight && nearest.x + this.width > this.chart.width - 100) || (!isRight && nearest.x - this.width < 100);
    return {
      x: nearest.x,
      y: nearest.y,
      yAlign: isHide ? (nearest.y < this.chart.height / 2 ? 'top' : 'bottom') : undefined
    };
  }
  return false
}

function DiagramLine({
  data,
  children,
  height,
  alert_rules = [],
  minTimeUnit = 'day',
  timeFreq = 86400,
  isLoading,
  minimap = initMinimap,
  tooltipCallbacks = defaultTooltipCallbacks(timeFreq),
  analysis,
  comparison,
  onPointCLick,
  expand = true
}: PropsWithChildren<DiagramLineProps>) {
  const [chartData, setChartData] = useState(data);
  const [lineIndexMap, setLineIndexMap] = useState<Record<number, boolean>>({});
  const [legends, setLegends] = useState<LegendItem[]>([]);

  const { alerts, alertIndex, alertSeverity, changeAlertIndex } = minimap;
  const _tCallbacks = { ...defaultTooltipCallbacks(timeFreq), ...tooltipCallbacks };

  const chartRef = useRef<Chart<'line', number[], string>>();
  const minimapRef = useRef<HTMLDivElement[]>([]);
  const range = useRef({ min: 0, max: 0 });

  const getNewData = useCallback(() => {
    const currentChart = chartRef.current;

    if (!currentChart) {
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
            currentChart.ctx,
            currentChart.chartArea,
            alpha(el.borderColor as string, 0),
            alpha(el.borderColor as string, 0.1)
          )
        };
      })
    };
  }, [data]);

  const onChange = useCallback(({ chart }: { chart: Chart }) => {
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
  }, []);

  const getActivePlugins = useCallback(() => {
    const currentPlugins = [drawCircle];

    if (alerts.length) {
      currentPlugins.push(drawAlerts(alerts));
      currentPlugins.push(minimapPanorama(onChange));
    }

    if (alert_rules.length) {
      alert_rules.forEach(alert_rule => currentPlugins.push(setAlertLine(alert_rule)));
    }

    return currentPlugins;
  }, [onChange, alert_rules, alerts]);

  const hideLine = useCallback((item: LegendItem) => {
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
  }, []);

  const options: ChartOptions<'line'> = {
    maintainAspectRatio: false,
    animation: false,
    responsive: true,
    onClick: (event, elements) => {
      if (elements.length && onPointCLick) {
        const { index, datasetIndex } = elements[0];

        const dataset = chartData.datasets[datasetIndex];
        const [datasetName, versionName] = dataset.label?.split('|') || [null, null];
        const timeLabel = chartData.labels?.[index] as number;

        if (datasetName && versionName && timeLabel) {
          onPointCLick(datasetName, versionName, timeLabel);
        }
      }
    },
    onResize: chart => {
      chart.resize(chart.canvas.parentElement?.clientWidth, chart.canvas.parentElement?.clientHeight);
    },
    interaction: {
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
        tension: 0,
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
        backgroundColor: colors.neutral.blue[100],
        padding: {
          bottom: 4,
          left: 16,
          right: 16,
          top: 4
        },
        boxPadding: 5,
        callbacks: _tCallbacks,
        position: 'myCustomPositioner'
      },
      zoom: {
        limits: {
          x: {
            min: 'original',
            max: 'original'
          },
          y: {
            min: range.current.min,
            max: range.current.max * 2,
            minRange: (range.current.max - range.current.min) / 2
          }
        },
        pan: {
          enabled: false,
          onPan: alerts.length ? onChange : () => 1,
          mode: 'xy'
        },
        zoom: {
          onZoom: alerts.length ? onChange : () => 1,
          wheel: {
            enabled: false
          },
          pinch: {
            enabled: false
          },
          mode: 'x'
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        type: 'timeseries',
        time: {
          minUnit: minTimeUnit,
          unit: minTimeUnit
        }
      },
      y: analysis
        ? {
          ticks: {
            stepSize: range.current.max === 0 ? 1 / 3 : (range.current.max - range.current.min) * 0.3,
            align: 'end'
          },
          grid: { drawBorder: false, drawTicks: false },
          min: range.current.min,
          max: range.current.max === 0 ? 1 : range.current.max * 1.2
        }
        : {
          min: range.current.min,
          max: Math.max(range.current.max + (range.current.max - range.current.min) * 0.3, 1)
        }
    }
  };

  useEffect(() => {
    if (chartRef.current) {
      setChartData(getNewData());
    }
  }, [getNewData]);

  useEffect(() => {
    if (isLoading) {
      setLegends([]);
    }
  }, [isLoading]);

  useEffect(() => {
    if (chartRef.current && chartRef.current?.legend?.legendItems?.length) {
      const legendItems = chartRef.current.legend.legendItems;
      const map: Record<number, boolean> = {};

      legendItems.forEach(legendItem => {
        const index = legendItem.datasetIndex || 0;
        const hidden = legendItem.hidden || false;

        map[index] = hidden;
        chartRef.current?.setDatasetVisibility(index, !hidden);
      });

      setLineIndexMap(map);
      setLegends(legendItems);
    }
  }, [chartData, comparison]);

  return isLoading ? (
    <Loader sx={{ transform: 'translate(0, -16%)' }} />
  ) : !data.datasets.length || data.datasets.every(d => !d) ? (
    <Box display="flex" alignItems="center" height={{ xs: height.lg - 61, lg: height.lg - 61, xl: height.xl - 61 }}>
      <Typography variant="h4" fontWeight={500} margin="0 auto">
        No data for this monitor configuration
      </Typography>
    </Box>
  ) : (
    <>
      <Collapse in={expand} timeout="auto" unmountOnExit>
        <DiagramTutorialTooltip>
          <Box height={{ xs: height.lg, lg: height.lg, xl: height.xl }} position="relative">
            <Line data={chartData} ref={chartRef} options={options} plugins={getActivePlugins()} height={0} />
          </Box>
        </DiagramTutorialTooltip>
        <LegendsList
          data={chartData}
          lineIndexMap={lineIndexMap}
          hideLine={hideLine}
          legends={legends}
          analysis={analysis}
          comparison={comparison}
        >
          {children}
        </LegendsList>
      </Collapse>
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

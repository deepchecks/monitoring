import React, { PropsWithChildren, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Chart, ChartOptions, LegendItem, registerables, Plugin } from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-dayjs-3';
import zoomPlugin from 'chartjs-plugin-zoom';
import mixpanel from 'mixpanel-browser';

import { drawAlerts, drawCircle, setAlertLine } from 'helpers/diagramLine';
import { createGradient, defaultTooltipCallbacks, initAlertsWidget } from './DiagramLine.helpers';

import { alpha, Box, Typography, styled } from '@mui/material';

import LegendsList from './LegendsList/LegendsList';
import DiagramTutorialTooltip from '../DiagramTutorialTooltip';
import { Loader } from '../Loader';

import { colors } from 'theme/colors';

import { DiagramLineProps } from './DiagramLine.types';

Chart.register(...registerables, zoomPlugin);

function handleTimeUnit(freq: number) {
  return freq < 86400 ? 'hour' : 'day'
}

function DiagramLine({
  data,
  children,
  height,
  alert_rules = [],
  timeFreq = 86400,
  minTimeUnit = handleTimeUnit(timeFreq),
  isLoading,
  alertsWidget = initAlertsWidget,
  tooltipCallbacks,
  analysis = false,
  previousPeriodLabels = [],
  comparison,
  onPointCLick
}: PropsWithChildren<DiagramLineProps>) {
  const [lineIndexMap, setLineIndexMap] = useState<Record<number, boolean>>({});
  const [legends, setLegends] = useState<LegendItem[]>([]);

  const { alerts, alertIndex, alertSeverity, changeAlertIndex } = alertsWidget;
  const _tCallbacks = { ...defaultTooltipCallbacks(timeFreq, previousPeriodLabels), ...tooltipCallbacks };

  const chartRef = useRef<Chart<'line', number[], string>>();
  const range = useMemo(() => {
    return { min: 0, max: 0 };
  }, [data]);

  const getActivePlugins = useCallback(() => {
    const currentPlugins: Plugin[] = [drawCircle];

    if (alerts.length) {
      currentPlugins.push(drawAlerts);
    }

    if (alert_rules.length) {
      alert_rules.forEach(alert_rule => currentPlugins.push(setAlertLine(alert_rule)));
    }

    return currentPlugins;
  }, [alert_rules, alerts]);

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

  const chartData = useMemo(() => {
    const currentChart = chartRef.current;

    if (!currentChart) {
      return data;
    }

    return {
      ...data,
      datasets: data.datasets.map(el => {
        el.data.forEach(item => {
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
          backgroundColor: createGradient(
            currentChart.ctx,
            currentChart.chartArea,
            alpha(el.borderColor as string, 0),
            alpha(el.borderColor as string, 0.25)
          )
        };
      })
    };
  }, [data, chartRef.current]);

  const options: ChartOptions<'line'> = useMemo(() => ({
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
        alerts,
        activeIndex: alertIndex,
        changeAlertIndex,
        severity: alertSeverity
      },
      legend: {
        display: false
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
            min: range.min,
            max: range.max * 2,
            minRange: (range.max - range.min) / 2
          }
        },
        pan: {
          enabled: false,
          mode: 'xy'
        },
        zoom: {
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
        },
        ticks: {
          source: "data"
        }
      },
      y: analysis
        ? {
          ticks: {
            stepSize: range.max === 0 ? 1 / 3 : (range.max - range.min) * 0.3,
            align: 'end'
          },
          grid: { drawBorder: false, drawTicks: false },
          min: range.min,
          max: range.max === 0 ? 1 : range.max * 1.2
        }
        : {
          min: range.min,
          max: Math.max(range.max + (range.max - range.min) * 0.3, 1)
        }
    }
  }), [chartData, range.max, range.min]);

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

  useEffect(() => {
    const currentChart = chartRef.current;

    if (currentChart && alerts.length) {
      currentChart.data.datasets.forEach((currentDataset, currentDatasetIndex) => {
        const label: string[] | undefined = currentDataset.label?.split('|');

        if (label) {
          const failedValue = alerts[alertIndex]?.failed_values[label[1]] || {};
          const evaluationResult = Object.keys(failedValue).includes(label[0]);

          currentChart.setDatasetVisibility(currentDatasetIndex, evaluationResult);
          setLineIndexMap(prevState => ({
            ...prevState,
            [currentDatasetIndex]: !evaluationResult
          }));
        }
      });
    }
  }, [chartData, alertIndex, alerts]);

  return isLoading ? (
    <Loader sx={{ transform: 'translate(0, -16%)' }} />
  ) : !data.datasets.length || data.datasets.every(d => !d) ? (
    <Box display="flex" alignItems="center" height={{ xs: height.lg - 61, lg: height.lg - 61, xl: height.xl - 61 }}>
      <StyledNoDataWarning variant="h4" fontWeight={500} margin="0 auto">
        No data for this monitor configuration
      </StyledNoDataWarning>
    </Box>
  ) : (
    <>
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
    </>
  );
}

export default DiagramLine;

const StyledNoDataWarning = styled(Typography)({
  fontWeight: '500',
  margin: '0 auto',
  '@media (max-width: 1765px)': {
    fontSize: '22px'
  },
  '@media (max-width: 1665px)': {
    fontSize: '20px'
  },
  '@media (max-width: 1565px)': {
    fontSize: '18px'
  }
});

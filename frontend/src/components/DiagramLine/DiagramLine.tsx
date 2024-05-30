import React, { PropsWithChildren, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Chart, ChartOptions, LegendItem, registerables, Plugin } from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-dayjs-3';

import { drawAlerts, drawCircle, setAlertLine } from 'helpers/base/diagramLine';
import { createGradient, defaultTooltipCallbacks, initAlertsWidget } from './DiagramLine.helpers';
import { frequencyValues } from 'helpers/utils/frequency';

import { alpha, Box, Typography, styled } from '@mui/material';

import LegendsList from './LegendsList/LegendsList';
import DiagramTutorialTooltip from './DiagramTutorialTooltip/DiagramTutorialTooltip';
import { Loader } from '../base/Loader/Loader';

import { DiagramLineProps } from './DiagramLine.types';
import { theme } from 'components/lib/theme';
import { constants } from './diagramLine.constants';

Chart.register(...registerables, zoomPlugin);

function handleTimeUnit(freq: number) {
  return freq < frequencyValues.DAY ? 'hour' : 'day';
}

const { noDataMessage } = constants;

function DiagramLine({
  data,
  children,
  height,
  alert_rules = [],
  timeFreq = frequencyValues.DAY,
  minTimeUnit = handleTimeUnit(timeFreq),
  isLoading,
  alertsWidget = initAlertsWidget,
  tooltipCallbacks,
  analysis = false,
  previousPeriodLabels = [],
  comparison,
  onPointCLick,
  zoomEnabled
}: PropsWithChildren<DiagramLineProps>) {
  const [lineIndexMap, setLineIndexMap] = useState<Record<number, boolean>>({});
  const [legends, setLegends] = useState<LegendItem[]>([]);

  const { alerts, alertIndex, alertSeverity, changeAlertIndex } = alertsWidget;
  const _tCallbacks = useMemo(
    () => ({ ...defaultTooltipCallbacks(timeFreq, previousPeriodLabels), ...tooltipCallbacks }),
    [previousPeriodLabels, timeFreq, tooltipCallbacks]
  );

  const chartRef = useRef<Chart<'line', number[], string>>();
  const range = useRef({ min: 0, max: 0 });

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

  const currentChart = chartRef.current;

  const hideLine = useCallback(
    (item: LegendItem) => {
      if (currentChart && typeof item.datasetIndex === 'number') {
        const isDatasetVisible = currentChart.isDatasetVisible(item.datasetIndex);

        currentChart.setDatasetVisibility(item.datasetIndex, !isDatasetVisible);

        setLineIndexMap(prevState => ({
          ...prevState,
          [typeof item.datasetIndex === 'number' ? item.datasetIndex : -1]: isDatasetVisible
        }));
      }
    },
    [currentChart]
  );

  const chartData = useMemo(() => {
    if (!currentChart) {
      return data;
    }

    range.current.min = 0;
    range.current.max = 0;

    return {
      ...data,
      labels: data?.labels?.map(l => l as number) || [],
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
          fill: {
            target: 'origin',
            above: createGradient(
              currentChart.ctx,
              currentChart.chartArea,
              alpha(el.borderColor as string, 0),
              alpha(el.borderColor as string, 0.25)
            ),
            below: 'transparent'
          }
        };
      })
    };
  }, [data, currentChart]);

  const options: ChartOptions<'line'> = useMemo(
    () => ({
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
          backgroundColor: theme.palette.info.main,
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
            enabled: !!zoomEnabled,
            threshold: 10,
            scaleMode: 'xy',
            overScaleMode: 'xy'
          },
          zoom: {
            wheel: {
              enabled: !!zoomEnabled,
              speed: 0.02
            },
            pinch: {
              enabled: !!zoomEnabled
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          type: 'time',
          distribution: 'series',
          time: {
            minUnit: minTimeUnit,
            unit: minTimeUnit
          }
        },
        y: {
          min: range.current.min,
          max: range.current.max <= 1 ? 1 : undefined
        }
      }
    }),
    [
      _tCallbacks,
      alertIndex,
      alertSeverity,
      alert_rules.length,
      alerts,
      analysis,
      changeAlertIndex,
      chartData.datasets,
      chartData.labels,
      minTimeUnit,
      onPointCLick,
      lineIndexMap
    ]
  );

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
  ) : !data.datasets?.length || data.datasets.every(d => !d) ? (
    <StyledNoDataWarningContainer>
      <StyledNoDataWarning variant="h4">{noDataMessage}</StyledNoDataWarning>
    </StyledNoDataWarningContainer>
  ) : (
    <>
      <DiagramTutorialTooltip>
        <Box height={{ xs: height.lg, lg: height.lg, xl: height.xl }} position="relative">
          <Line data={chartData} ref={chartRef} options={options} plugins={getActivePlugins()} />
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

const StyledNoDataWarningContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  height: '100%',
  maxHeight: '185px'
});

const StyledNoDataWarning = styled(Typography)({
  fontWeight: 500,
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

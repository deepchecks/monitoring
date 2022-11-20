import React, { PropsWithChildren, useEffect, useRef, useState, useCallback } from 'react';
import { Chart, ChartOptions, LegendItem, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-dayjs-3';
import zoomPlugin from 'chartjs-plugin-zoom';
import mixpanel from 'mixpanel-browser';

import { drawAlerts, drawCircle, minimapPanorama, setAlertLine } from 'helpers/diagramLine';
import { createGradient, defaultTooltipCallbacks, initMinimap } from './DiagramLine.helpers';

import { alpha, Box } from '@mui/material';

import LegendsList from './LegendsList/LegendsList';
import DiagramTutorialTooltip from '../DiagramTutorialTooltip';
import { Loader } from '../Loader';
import { Minimap } from '../Minimap';

import { colors } from 'theme/colors';

import { DiagramLineProps } from './DiagramLine.types';

Chart.register(...registerables, zoomPlugin);

function DiagramLine({
  data,
  children,
  height,
  alert_rules = [],
  minTimeUnit = 'day',
  isLoading,
  minimap = initMinimap,
  tooltipCallbacks = defaultTooltipCallbacks,
  analysis,
  comparison
}: PropsWithChildren<DiagramLineProps>) {
  const [chartData, setChartData] = useState(data);
  const [lineIndexMap, setLineIndexMap] = useState<Record<number, boolean>>({});
  const [legends, setLegends] = useState<LegendItem[]>([]);

  const { alerts, alertIndex, alertSeverity, changeAlertIndex } = minimap;
  const _tCallbacks = { ...defaultTooltipCallbacks, ...tooltipCallbacks };

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
        backgroundColor: colors.neutral.blue[100],
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
    <Loader />
  ) : (
    <>
      <DiagramTutorialTooltip>
        <Box
          height={height ? height - 61 : 'auto'}
          sx={{ position: 'relative' }}
          onMouseLeave={() => chartRef.current?.resetZoom()}
        >
          <Line data={chartData} ref={chartRef} options={options} plugins={getActivePlugins()} height={1} />
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

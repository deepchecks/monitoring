import { Dispatch, SetStateAction } from 'react';
import { ZoomPluginOptions } from 'chartjs-plugin-zoom/types/options';
import { Chart, ChartEvent, ChartMeta } from 'chart.js';
import dayjs from 'dayjs';

import { AlertRuleSchema, AlertSchema } from 'api/generated';

import { ACTIVE_BAR_BG_COLOR } from '../../components/SegmentsDrillDown/SegmentsDrillDown.helpers';

import { theme } from 'components/lib/theme';

export const zoomOptions: ZoomPluginOptions = {
  limits: {
    y: { min: 0, max: 200, minRange: 50 }
  },
  pan: {
    enabled: true,
    mode: 'xy'
  },
  zoom: {
    wheel: {
      enabled: false
    },
    pinch: {
      enabled: false
    },
    mode: 'xy'
  }
};

export const setAlertLine = (alert_rule: AlertRuleSchema) => ({
  id: 'setAlertLine',
  beforeDatasetsDraw(chart: Chart<'line', number[], string>) {
    const {
      ctx,
      chartArea: { left, right },
      scales: { x, y }
    } = chart;

    if (!x || !y) return;

    const startTime = alert_rule.start_time;
    const minTime = x.min;
    const yOffset = y.getPixelForValue(alert_rule.condition.value);

    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.palette.text.primary;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();

    if (startTime) {
      const alertRuleStartTime = new Date(startTime).getTime();
      const alertRuleStartTimeOnTheGraph = alertRuleStartTime < minTime ? minTime : alertRuleStartTime;
      const xOffset = x.getPixelForValue(alertRuleStartTimeOnTheGraph);

      ctx.moveTo(left, yOffset);
      ctx.lineTo(xOffset, yOffset);
      ctx.stroke();

      ctx.strokeStyle = theme.palette.error.main;
      ctx.beginPath();
      ctx.moveTo(xOffset, yOffset);
      ctx.lineTo(right, yOffset);
    } else {
      ctx.moveTo(left, yOffset);
      ctx.lineTo(right, yOffset);
    }

    ctx.stroke();
  }
});

interface Tooltip {
  tooltip: {
    _active: {
      element: {
        x: number;
        y: number;
      };
    }[];
  };
}

type ChartOption = Chart<'line', number[], string> & Tooltip;

export const drawCircle = {
  id: 'drawCircle',
  beforeDatasetsDraw(chart: ChartOption) {
    if (!chart.tooltip) return;
    const { ctx, tooltip } = chart;

    ctx.save();

    const { _active: active } = tooltip;

    const angle = Math.PI / 180;

    if (active[0]) {
      ctx.beginPath();
      ctx.fillStyle = '#E2CFFE';
      ctx.arc(active[0].element.x, active[0].element.y, 15, angle * 0, angle * 360, false);
      ctx.fill();
      ctx.closePath();
    }
  }
};

const OUTER_RADIUS = 18;

function getMetaData(alerts: AlertSchema[], alertIndex: number, chart: ChartOption) {
  const failedValues = alerts[alertIndex].failed_values;

  const datasetIndex = chart.data.datasets.findIndex(
    dataset => `${Object.keys(Object.values(failedValues)[0])[0]}|${Object.keys(failedValues)[0]}` === dataset.label
  );

  return datasetIndex !== -1 ? chart.getDatasetMeta(datasetIndex) : chart.getDatasetMeta(0);
}

export const drawActiveBarEffect = {
  id: 'drawActiveBarEffect',
  beforeDatasetsDraw(
    chart: Chart<'bar', number[], string>,
    args: { cancelable: true },
    { activeIndex }: { activeIndex: number }
  ) {
    const {
      ctx,
      chartArea: { top, bottom }
    } = chart;

    const barElement: any = chart.getDatasetMeta(0).data[activeIndex];
    const { x, width } = barElement;
    const left = x - width * 1.2;
    const right = x + width * 1.2;

    ctx.fillStyle = ACTIVE_BAR_BG_COLOR;
    ctx.beginPath();
    ctx.rect(left, top, right - left, bottom - top);
    ctx.closePath();
    ctx.fill();
  }
};

export const drawAlerts = {
  id: 'drawAlerts',
  afterEvent(
    chart: ChartOption,
    args: { event: ChartEvent; replay: boolean; changed?: boolean; cancelable: false; inChartArea: boolean },
    {
      alerts,
      activeIndex,
      changeAlertIndex
    }: { alerts: AlertSchema[]; activeIndex: number; changeAlertIndex: Dispatch<SetStateAction<number>> }
  ) {
    const {
      chartArea: { bottom, top }
    } = chart;

    const eventType = args.event.type;
    const xCursor = args.event.x;
    const yCursor = args.event.y;
    const deviation = 4;

    const angle = Math.PI / 180;

    if (eventType === 'click' && xCursor && yCursor && chart?.data?.labels && chart?.data?.labels.length) {
      chart?.data?.labels.forEach((label, index) => {
        alerts.forEach(({ end_time }, alertIndex) => {
          if (+label === dayjs(end_time).valueOf() && alertIndex !== activeIndex) {
            const meta = getMetaData(alerts, alertIndex, chart);
            const xData = meta.data[index].x;
            const yData = meta.data[index].y;
            const currentTop = yData - OUTER_RADIUS < top ? yData - OUTER_RADIUS : top;
            const currentBottom = yData + OUTER_RADIUS > bottom ? yData + OUTER_RADIUS : bottom;
            const yCondition = yCursor < currentBottom && yCursor > currentTop;
            const yCoordinates = yData - OUTER_RADIUS < yCursor && yData + OUTER_RADIUS > yCursor;

            let xLineMin = xData - deviation < xCursor;
            let xLineMax = xData + deviation > xCursor;

            let side = 0;

            if (yCoordinates) {
              if (yCursor <= yData) {
                side = Math.abs((yCursor - (yData - OUTER_RADIUS)) / Math.tan(angle * 45));
              }

              if (yCursor > yData) {
                side = Math.abs(OUTER_RADIUS - (yCursor - yData) / Math.tan(angle * 45));
              }

              xLineMin = xData - side < xCursor;
              xLineMax = xData + side > xCursor;
            }

            if (yCondition && xLineMin && xLineMax) {
              changeAlertIndex(alertIndex);
            }
          }
        });
      });
    }
  },
  beforeDatasetsDraw(
    chart: ChartOption,
    args: { cancelable: true },
    { alerts, activeIndex }: { alerts: AlertSchema[]; activeIndex: number }
  ) {
    const {
      ctx,
      chartArea: { bottom, top }
    } = chart;

    const drawLine = (index: number, meta: ChartMeta) => {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = theme.palette.error.main;

      ctx.moveTo(meta?.data[index]?.x, bottom);
      ctx.lineTo(meta?.data[index]?.x, top);

      ctx.stroke();
      ctx.closePath();
    };

    if (chart?.data?.labels?.length) {
      chart.data.labels.forEach((label, index) => {
        alerts.forEach(({ end_time }, alertIndex) => {
          if (+label === dayjs(end_time).valueOf()) {
            const meta = getMetaData(alerts, alertIndex, chart);
            alertIndex === activeIndex && drawLine(index, meta);
          }
        });
      });
    }
  }
};

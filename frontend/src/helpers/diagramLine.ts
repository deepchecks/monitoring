import { Dispatch, SetStateAction } from 'react';
import { ZoomPluginOptions } from 'chartjs-plugin-zoom/types/options';
import { Chart, ChartEvent, ChartMeta } from 'chart.js';
import dayjs from 'dayjs';

import { AlertRuleSchema, AlertSchema, OperatorsEnum } from 'api/generated';

import { colors } from 'theme/colors';

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
      scales: { y }
    } = chart;

    if (!y) return;
    const yOffset = y.getPixelForValue(alert_rule.condition.value);

    ctx.save();
    
    // const severity_color = lightPaletteOptions.severity[alert_rule.alert_severity || ('medium' as AlertSeverity)];
    const severity_color = '#17003E';
    ctx.strokeStyle = severity_color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(left, yOffset);
    ctx.lineTo(right, yOffset);

    ctx.shadowColor = severity_color;
    ctx.shadowBlur = 10;
    if (alert_rule.condition.operator == OperatorsEnum.greater_than_equals || alert_rule.condition.operator == OperatorsEnum.greater_than) {
      ctx.shadowOffsetY = -6;
    } else if (alert_rule.condition.operator == OperatorsEnum.less_than_equals || alert_rule.condition.operator == OperatorsEnum.less_than) {
      ctx.shadowOffsetY = 6;
    }
    
    ctx.setLineDash([6, 6]);
    ctx.stroke();

    ctx.shadowColor = "unset";
    ctx.shadowOffsetY = 0;
    ctx.shadowOffsetX = 0
    ctx.shadowBlur = 0;

    ctx.restore();
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

  return datasetIndex != -1 ? chart.getDatasetMeta(datasetIndex) : chart.getDatasetMeta(0);
}

export const drawAlerts = (alerts: AlertSchema[]) => ({
  id: 'drawAlerts',
  afterEvent(
    chart: ChartOption,
    args: { event: ChartEvent; replay: boolean; changed?: boolean; cancelable: false; inChartArea: boolean },
    { activeIndex, changeAlertIndex }: { activeIndex: number; changeAlertIndex: Dispatch<SetStateAction<number>> }
  ) {
    const {
      chartArea: { bottom, top }
    } = chart;

    const click = args.event.type;
    const xCursor = args.event.x;
    const yCursor = args.event.y;
    const deviation = 4;

    const angle = Math.PI / 180;

    if (click === 'click' && xCursor && yCursor && chart?.data?.labels && chart?.data?.labels.length) {
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
  beforeDatasetsDraw(chart: ChartOption, args: { cancelable: true }, { activeIndex }: { activeIndex: number }) {
    const {
      ctx,
      chartArea: { bottom, top }
    } = chart;

    const drawLine = (index: number, meta: ChartMeta) => {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.semantic.red;

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
});

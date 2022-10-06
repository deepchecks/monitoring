import { alpha } from '@mui/material';
import { AlertRuleSchema, AlertSchema, AlertSeverity } from 'api/generated';
import { Chart, ChartEvent, ChartMeta } from 'chart.js';
import { ZoomPluginOptions } from 'chartjs-plugin-zoom/types/options';
import dayjs from 'dayjs';
import { Dispatch, SetStateAction } from 'react';
import { OperatorsEnumMap } from '../helpers/conditionOperator';
import { lightPaletteOptions } from '../theme/palette';

const drawFilledRhombus = (
  ctx: CanvasRenderingContext2D,
  meta: ChartMeta,
  color: string,
  index: number,
  rhombusRadius: number,
  rounding: number
) => {
  ctx.beginPath();
  // eslint-disable-next-line no-param-reassign
  ctx.fillStyle = color;
  ctx.setLineDash([6, 0]);
  ctx.moveTo(meta?.data[index]?.x - rounding, meta?.data[index]?.y - rhombusRadius + rounding);
  ctx.quadraticCurveTo(
    meta?.data[index]?.x,
    meta?.data[index]?.y - rhombusRadius,
    meta?.data[index]?.x + rounding,
    meta?.data[index]?.y - rhombusRadius + rounding
  );
  ctx.lineTo(meta?.data[index]?.x + rhombusRadius - rounding, meta?.data[index]?.y - rounding);
  ctx.quadraticCurveTo(
    meta?.data[index]?.x + rhombusRadius,
    meta?.data[index]?.y,
    meta?.data[index]?.x + rhombusRadius - rounding,
    meta?.data[index]?.y + rounding
  );
  ctx.lineTo(meta?.data[index]?.x + rounding, meta?.data[index]?.y + rhombusRadius - rounding);
  ctx.quadraticCurveTo(
    meta?.data[index]?.x,
    meta?.data[index]?.y + rhombusRadius,
    meta?.data[index]?.x - rounding,
    meta?.data[index]?.y + rhombusRadius - rounding
  );
  ctx.lineTo(meta?.data[index]?.x - rhombusRadius + rounding, meta?.data[index]?.y + rounding);
  ctx.quadraticCurveTo(
    meta?.data[index]?.x - rhombusRadius,
    meta?.data[index]?.y,
    meta?.data[index]?.x - rhombusRadius + rounding,
    meta?.data[index]?.y - rounding
  );
  ctx.fill();
  ctx.closePath();
};

const drawExclamationMark = (
  ctx: CanvasRenderingContext2D,
  meta: ChartMeta,
  color: string,
  index: number,
  height: number,
  width: number
) => {
  // eslint-disable-next-line no-param-reassign
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.fillRect(
    meta?.data[index]?.x - width / 2,
    meta?.data[index]?.y - height / 2,
    width,
    height / 2 + (height * 0.2) / 2
  );

  ctx.fill();
  ctx.closePath();
  // eslint-disable-next-line no-param-reassign
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.fillRect(meta?.data[index]?.x - width / 2, meta?.data[index]?.y + height / 2, width, -height * 0.2);
  ctx.fill();
  ctx.closePath();
};

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

    ctx.beginPath();
    // const severity_color = lightPaletteOptions.severity[alert_rule.alert_severity || ('medium' as AlertSeverity)];
    const severity_color = '#17003E';
    ctx.strokeStyle = severity_color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.moveTo(left, yOffset);
    ctx.lineTo(right, yOffset);
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([6, 0]);
    ctx.save();
    const angle = Math.PI / 180;
    ctx.translate(0, 0);
    ctx.font = 'bold 12px Roboto';
    ctx.fillStyle = severity_color;
    ctx.direction = 'inherit';
    ctx.textAlign = 'center';
    ctx.rotate(270 * angle);
    ctx.fillText(OperatorsEnumMap[alert_rule.condition.operator], -yOffset, right + 10);
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export const addSpace = (space: number) => {
  const extraSpace = 10 ** (space.toString().length - 1);
  if (extraSpace <= 1) {
    return 5;
  }

  return extraSpace;
};

const outerRadius = 18;

export const drawAlerts = (alerts: AlertSchema[]) => ({
  id: 'drawAlerts',
  beforeDatasetsDraw: () => 1,
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
    const meta = chart.getDatasetMeta(0);
    const deviation = 4;

    const angle = Math.PI / 180;

    if (click === 'click' && xCursor && yCursor && chart?.data?.labels && chart?.data?.labels.length) {
      chart?.data?.labels.forEach((label, index) => {
        const xData = meta.data[index].x;
        const yData = meta.data[index].y;
        alerts.forEach(({ end_time }, alertIndex) => {
          if (label === dayjs(end_time).format('MMM. DD YYYY') && alertIndex !== activeIndex) {
            let xLineMin = xData - deviation < xCursor;
            let xLineMax = xData + deviation > xCursor;
            const currentTop = yData - outerRadius < top ? yData - outerRadius : top;
            const currentBottom = yData + outerRadius > bottom ? yData + outerRadius : bottom;
            const yCondition = yCursor < currentBottom && yCursor > currentTop;
            const yRhombusCoordinates = yData - outerRadius < yCursor && yData + outerRadius > yCursor;

            let side = 0;

            if (yRhombusCoordinates) {
              if (yCursor <= yData) {
                side = Math.abs((yCursor - (yData - outerRadius)) / Math.tan(angle * 45));
              }

              if (yCursor > yData) {
                side = Math.abs(outerRadius - (yCursor - yData) / Math.tan(angle * 45));
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
  afterDatasetsDraw(
    chart: ChartOption,
    args: Record<string, never>,
    { activeIndex }: { activeIndex: number; severity: AlertSeverity }
  ) {
    const {
      ctx,
      chartArea: { bottom, top }
    } = chart;
    const angle = Math.PI / 180;
    const space = 8;
    const meta = chart.getDatasetMeta(0);
    const criticalColor = '#17003E';

    const drawActiveAlert = (index: number) => {
      const rectWidth = 100;
      const rectHeight = 32;

      drawFilledRhombus(ctx, meta, criticalColor, index, 20, 2);
      drawFilledRhombus(ctx, meta, alpha(criticalColor, 0.15), index, 30, 10);

      ctx.beginPath();
      ctx.fillStyle = criticalColor;
      ctx.arc(
        meta?.data[index]?.x - rectWidth / 2,
        top - rectHeight / 2 - space,
        rectHeight / 2,
        angle * 0,
        angle * 360,
        false
      );
      ctx.fill();
      ctx.closePath();

      ctx.beginPath();
      ctx.fillStyle = criticalColor;
      ctx.arc(
        meta?.data[index]?.x + rectWidth / 2,
        top - rectHeight / 2 - space,
        rectHeight / 2,
        angle * 0,
        angle * 360,
        false
      );
      ctx.fill();
      ctx.closePath();

      ctx.beginPath();
      ctx.fillStyle = criticalColor;
      ctx.fillRect(meta?.data[index]?.x - rectWidth / 2, top - rectHeight - space, rectWidth, rectHeight);

      ctx.fill();
      ctx.closePath();

      const currentIndex = activeIndex + 1;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = '16px Roboto';
      ctx.fillText(`Alert ${currentIndex}/${alerts.length}`, meta?.data[index]?.x, top - space / 4 - rectHeight / 2);

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = criticalColor;
      ctx.setLineDash([6, 0]);
      ctx.moveTo(meta?.data[index]?.x, bottom);
      ctx.lineTo(meta?.data[index]?.x, meta?.data[index]?.y);
      ctx.stroke();
      ctx.closePath();

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = criticalColor;
      ctx.setLineDash([6, 0]);
      ctx.moveTo(meta?.data[index]?.x, meta?.data[index]?.y - 22);
      ctx.lineTo(meta?.data[index]?.x, top - space);
      ctx.stroke();
      ctx.closePath();

      ctx.beginPath();
      ctx.fillStyle = criticalColor;
      ctx.arc(meta?.data[index]?.x, bottom, 4, angle * 0, angle * 360, false);
      ctx.fill();
      ctx.closePath();

      drawExclamationMark(ctx, meta, '#fff', index, 20, 4);
    };

    const drawAlert = (index: number) => {
      ctx.beginPath();
      ctx.strokeStyle = criticalColor;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 3]);
      ctx.moveTo(meta?.data[index]?.x, bottom);
      ctx.lineTo(meta?.data[index]?.x, top);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      ctx.setLineDash([6, 0]);

      drawFilledRhombus(ctx, meta, '#fff', index, outerRadius, 4);
      drawFilledRhombus(ctx, meta, criticalColor, index, 14, 3);
      drawFilledRhombus(ctx, meta, alpha('#fff', 0.85), index, 10, 0);
      drawExclamationMark(ctx, meta, criticalColor, index, 12, 2);
    };

    if (chart?.data?.labels && chart?.data?.labels.length) {
      chart?.data?.labels.forEach((label, index) => {
        alerts.forEach(({ end_time }, alertIndex) => {
          if (label === dayjs(end_time).format('MMM. DD YYYY')) {
            alertIndex === activeIndex ? drawActiveAlert(index) : drawAlert(index);
          }
        });
      });
    }
  }
});

export const drawAlertsOnMinimap = (alerts: AlertSchema[]) => ({
  id: 'drawAlertsOnMinimap',
  afterDatasetsDraw(
    chart: ChartOption,
    args: Record<string, never>,
    { activeIndex }: { activeIndex: number; severity: AlertSeverity }
  ) {
    const {
      ctx,
      chartArea: { bottom, top }
    } = chart;

    const angle = Math.PI / 180;

    const meta = chart.getDatasetMeta(0);

    const criticalColor = '#17003E';

    const drawActiveAlert = (index: number) => {
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = criticalColor;
      ctx.setLineDash([6, 0]);
      ctx.moveTo(meta?.data[index]?.x, bottom);
      ctx.lineTo(meta?.data[index]?.x, meta?.data[index]?.y + 4);
      ctx.stroke();
      ctx.closePath();

      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = criticalColor;
      ctx.setLineDash([6, 0]);
      ctx.moveTo(meta?.data[index]?.x, meta?.data[index]?.y - 4);
      ctx.lineTo(meta?.data[index]?.x, top);
      ctx.stroke();
      ctx.closePath();

      ctx.beginPath();
      ctx.fillStyle = criticalColor;
      ctx.arc(meta?.data[index]?.x, meta?.data[index]?.y, 6, angle * 0, angle * 360, false);
      ctx.stroke();
      ctx.closePath();
    };

    const drawAlert = (index: number) => {
      ctx.beginPath();
      ctx.strokeStyle = '#17003E';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.moveTo(meta?.data[index]?.x, bottom);
      ctx.lineTo(meta?.data[index]?.x, top);
      ctx.stroke();
      ctx.restore();
      ctx.setLineDash([6, 0]);
      ctx.save();
    };
    chart.pan;
    if (chart?.data?.labels && chart?.data?.labels.length) {
      chart?.data?.labels.forEach((label, index) => {
        alerts.forEach(({ end_time }, alertIndex) => {
          if (label === dayjs(end_time).format('MMM. DD YYYY')) {
            alertIndex === activeIndex ? drawActiveAlert(index) : drawAlert(index);
          }
        });
      });
    }
  }
});

export interface OriginalMinMax {
  min: number;
  max: number;
}

export const minimapPanorama = (onChange: ({ chart }: { chart: ChartOption }) => void) => ({
  id: 'minimapPanorama',
  beforeDatasetsDraw: () => 1,
  afterDatasetsDraw: function (
    chart: ChartOption,
    args: Record<string, never>,
    { minimapRef }: Record<string, HTMLDivElement>
  ) {
    if (chart.originalMinMax || !minimapRef) {
      return;
    }

    const { labels } = chart.data;
    if (labels && labels.length) {
      // eslint-disable-next-line no-param-reassign
      chart.originalMinMax = {
        min: +new Date(labels[0]),
        max: +new Date(labels[labels.length - 1])
      };
      onChange({ chart });

      const mc = new Hammer.Manager(minimapRef);
      const threshold = 10;

      mc.add(new Hammer.Pinch());
      mc.add(new Hammer.Pan({ threshold }));

      let currentDeltaX = 0;
      let currentDeltaY = 0;

      const handlePan = function (e: HammerInput) {
        const deltaX = e.deltaX - currentDeltaX;
        const deltaY = e.deltaY - currentDeltaY;
        currentDeltaX = e.deltaX;
        currentDeltaY = e.deltaY;
        const perc = parseFloat(minimapRef?.style?.width) / 100 || 0.1;
        chart.pan({ x: -deltaX / perc, y: -deltaY / perc });
      };

      mc.on('panstart', function (e) {
        currentDeltaX = 0;
        currentDeltaY = 0;
        handlePan(e);
      });
      mc.on('pan', handlePan);
    }
  }
});

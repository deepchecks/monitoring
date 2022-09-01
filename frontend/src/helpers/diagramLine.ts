import { Chart } from 'chart.js';
import { ZoomPluginOptions } from 'chartjs-plugin-zoom/types/options';

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

export const setThreshold = (threshold: number) => ({
  id: 'setThreshold',
  beforeDatasetsDraw(chart: Chart<'line', number[], string>) {
    const {
      ctx,
      chartArea: { left, right },
      scales: { y }
    } = chart;

    if (!y) return;
    const yOffset = y.getPixelForValue(threshold);

    ctx.beginPath();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.moveTo(left, yOffset);
    ctx.lineTo(right, yOffset);
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([6, 0]);
    ctx.save();

    const angle = Math.PI / 180;
    const text = 'critical';
    ctx.translate(0, 0);
    ctx.font = '12px Roboto';
    ctx.fillStyle = 'red';
    ctx.direction = 'inherit';
    ctx.textAlign = 'center';
    ctx.rotate(270 * angle);
    ctx.fillText(text, -yOffset, right + 10);
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
  id: 'columnSelection',
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

import { ChartArea, TooltipCallbacks, TooltipItem, TooltipModel, Tooltip } from 'chart.js';
import { _DeepPartialObject } from 'chart.js/types/utils';
import 'chartjs-adapter-dayjs-3';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { frequencyValues } from 'helpers/utils/frequency';

import { AlertsWidget } from './DiagramLine.types';

dayjs.extend(localizedFormat);

export function createGradient(ctx: CanvasRenderingContext2D, area: ChartArea, colorStart: string, colorEnd: string) {
  const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

function getTime(timeLabel: string, monitorFreq: number) {
  if (monitorFreq < frequencyValues.DAY) return dayjs(timeLabel).format('L LT');
  return dayjs(timeLabel).format('L');
}

export const defaultTooltipCallbacks: (
  frequency: number,
  previousPeriodLabels: number[]
) => _DeepPartialObject<TooltipCallbacks<'line', TooltipModel<'line'>, TooltipItem<'line'>>> = (
  frequency,
  previousPeriodLabels
) => ({
  labelColor: (context: TooltipItem<'line'>) => ({
    backgroundColor: context.dataset?.borderColor as string,
    borderColor: context.dataset?.borderColor as string
  }),
  title: (context: TooltipItem<'line'>[]) => {
    const textArray = context[0].dataset?.label?.split('|');
    return `${textArray && textArray[0]} : ${context[0].formattedValue}`;
  },
  label: (context: TooltipItem<'line'>) => {
    const textArray = context?.dataset?.label?.split('|');

    if (previousPeriodLabels.length && context.dataset.label?.endsWith('|previous_period')) {
      return `${getTime(new Date(previousPeriodLabels[context.dataIndex]).toISOString(), frequency)} ${
        textArray && textArray[1] ? '| Version: ' + textArray[1] : ''
      }`;
    } else {
      return `${getTime(context.label, frequency)} ${textArray && textArray[1] ? '| Version: ' + textArray[1] : ''}`;
    }
  }
});

Tooltip.positioners.myCustomPositioner = function (elements, eventPosition) {
  const nearest = Tooltip.positioners.nearest.call(this, elements, eventPosition);
  if (nearest) {
    const isRight = nearest.x < this.width / 2;
    const isHide =
      (isRight && nearest.x + this.width > this.chart.width - 100) || (!isRight && nearest.x - this.width < 100);
    return {
      x: nearest.x,
      y: nearest.y,
      yAlign: isHide ? (nearest.y < this.chart.height / 2 ? 'top' : 'bottom') : undefined
    };
  }
  return false;
};

export const initAlertsWidget: AlertsWidget = {
  alertSeverity: 'low',
  alertIndex: 0,
  alerts: [],
  changeAlertIndex: () => 1
};

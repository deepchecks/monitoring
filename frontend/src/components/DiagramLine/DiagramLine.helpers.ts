import { ChartArea, TooltipCallbacks, TooltipItem, TooltipModel } from 'chart.js';
import { _DeepPartialObject } from 'chart.js/types/utils';
import 'chartjs-adapter-dayjs-3';
import dayjs from 'dayjs';

import { IMinimap } from './DiagramLine.types';

export function createGradient(ctx: CanvasRenderingContext2D, area: ChartArea, colorStart: string, colorEnd: string) {
  const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

function getTime(timeLabel: string, monitorFreq: number) {
  if (monitorFreq < 86400) return dayjs(timeLabel).format('MMM. DD YYYY hha');
  return dayjs(timeLabel).format('MMM. DD YYYY');
}

export const defaultTooltipCallbacks: (
  frequency: number
) => _DeepPartialObject<TooltipCallbacks<'line', TooltipModel<'line'>, TooltipItem<'line'>>> = frequency => ({
  labelColor: (context: TooltipItem<'line'>) => ({
    backgroundColor: context.dataset?.borderColor as string,
    borderColor: context.dataset?.borderColor as string
  }),
  title: (context: TooltipItem<'line'>[]) => {
    const textArray = context[0].dataset?.label?.split('|');
    
    return `${textArray && textArray[0]} : ${context[0].formattedValue}`
  },
  label: (context: TooltipItem<'line'>) => {
    const textArray = context?.dataset?.label?.split('|');
    return `${getTime(context.label, frequency)} ${(textArray && textArray[1]) ? '| Version: ' + textArray[1] :  ''}`;
  }
});

export const initMinimap: IMinimap = {
  alertSeverity: 'low',
  alertIndex: 0,
  alerts: [],
  changeAlertIndex: () => 1
};

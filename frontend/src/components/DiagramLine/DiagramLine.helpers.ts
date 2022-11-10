import { ChartArea, TooltipCallbacks, TooltipItem, TooltipModel } from 'chart.js';
import { _DeepPartialObject } from 'chart.js/types/utils';
import 'chartjs-adapter-dayjs-3';

import { IMinimap } from './DiagramLine.types';

export function createGradient(ctx: CanvasRenderingContext2D, area: ChartArea, colorStart: string, colorEnd: string) {
  const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

export const defaultTooltipCallbacks: _DeepPartialObject<
  TooltipCallbacks<'line', TooltipModel<'line'>, TooltipItem<'line'>>
> = {
  labelColor: (context: TooltipItem<'line'>) => ({
    backgroundColor: context.dataset?.borderColor as string,
    borderColor: context.dataset?.borderColor as string
  }),
  title: (context: TooltipItem<'line'>[]) => context[0].formattedValue,
  label: (context: TooltipItem<'line'>) => `${context.label}`
};

export const initMinimap: IMinimap = {
  alertSeverity: 'low',
  alertIndex: 0,
  alerts: [],
  changeAlertIndex: () => 1
};

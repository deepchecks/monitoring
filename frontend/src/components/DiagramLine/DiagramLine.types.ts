import { ChartData, TimeUnit, TooltipCallbacks, TooltipItem, TooltipModel } from 'chart.js';
import { DistributiveArray, _DeepPartialObject } from 'chart.js/types/utils';
import 'chartjs-adapter-dayjs-3';

import { AlertRuleSchema, AlertSchema, AlertSeverity } from 'api/generated';

import { OriginalMinMax } from 'helpers/diagramLine';
import { GraphData, SetStateType } from 'helpers/types';

declare module 'chart.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    drawAlerts: {
      activeIndex: number;
      changeAlertIndex: SetStateType<number>;
      severity: AlertSeverity;
    };
    minimapPanorama: {
      minimapRef: HTMLDivElement;
    };
    drawAlertsOnMinimap: {
      activeIndex: number;
      changeAlertIndex: SetStateType<number>;
      severity: AlertSeverity;
    };
  }
  /* eslint-disable @typescript-eslint/no-unused-vars */
  interface Chart<
    TType extends keyof ChartTypeRegistry = keyof ChartTypeRegistry,
    TData = DistributiveArray<ChartTypeRegistry[TType]['defaultDataPoint']>,
    TLabel = unknown
  > {
    originalMinMax: OriginalMinMax;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

export interface IMinimap {
  alertSeverity: AlertSeverity;
  alertIndex: number;
  alerts: AlertSchema[];
  changeAlertIndex: SetStateType<number>;
}

export interface DiagramLineProps {
  alert_rules?: Array<AlertRuleSchema>;
  data: ChartData<'line', GraphData>;
  height?: number;
  minTimeUnit?: TimeUnit;
  isLoading?: boolean;
  minimap?: IMinimap;
  tooltipCallbacks?: _DeepPartialObject<TooltipCallbacks<'line', TooltipModel<'line'>, TooltipItem<'line'>>>;
  analysis?: boolean;
  comparison?: boolean;
  handlePointCLick?: (datasetName: string, versionName: string, timeLabel: number) => void;
}

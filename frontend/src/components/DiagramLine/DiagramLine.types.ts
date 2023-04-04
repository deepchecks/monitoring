import { ChartData, TimeUnit, TooltipCallbacks, TooltipItem, TooltipModel } from 'chart.js';
import { DistributiveArray, _DeepPartialObject } from 'chart.js/types/utils';
import 'chartjs-adapter-dayjs-3';

import { AlertRuleSchema, AlertSchema, AlertSeverity } from 'api/generated';

import { GraphData, SetStateType } from 'helpers/types';

interface OriginalMinMax {
  min: number;
  max: number;
}

declare module 'chart.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    drawAlerts: {
      alerts: AlertSchema[];
      activeIndex: number;
      changeAlertIndex: SetStateType<number>;
      severity: AlertSeverity;
    };
    drawActiveBarEffect: {
      activeIndex: number;
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

  interface TooltipPositionerMap {
    myCustomPositioner: TooltipPositionerFunction<ChartType>;
  }
}

export interface AlertsWidget {
  alertSeverity: AlertSeverity;
  alertIndex: number;
  alerts: AlertSchema[];
  changeAlertIndex: SetStateType<number>;
}

interface DiagramLineHeight {
  xl: number;
  lg: number;
}

export interface DiagramLineProps {
  alert_rules?: Array<AlertRuleSchema>;
  data: ChartData<'line', GraphData>;
  height: DiagramLineHeight;
  minTimeUnit?: TimeUnit;
  timeFreq?: number;
  isLoading?: boolean;
  alertsWidget?: AlertsWidget;
  tooltipCallbacks?: _DeepPartialObject<TooltipCallbacks<'line', TooltipModel<'line'>, TooltipItem<'line'>>>;
  analysis?: boolean;
  previousPeriodLabels?: number[];
  comparison?: boolean;
  zoomEnabled?: boolean;
  onPointCLick?: (datasetName: string, versionName: string, timeLabel: number) => void;
}

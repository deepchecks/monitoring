import { ReactNode, Dispatch, SetStateAction } from 'react';

import { ChartData } from 'chart.js';

import {
  MonitorCheckConf,
  MonitorValueConf,
  MonitorTypeConf,
  MonitorCheckConfSchema,
  MonitorSchema,
  OperatorsEnum
} from 'api/generated';

import { DrawerProps } from '@mui/material';

export type isAggShownProps = boolean | undefined;

export interface CheckInfoSchema {
  checkInfo: MonitorCheckConf;
  setFieldValue: (fieldName: string, fieldValue: any, shouldValidate: boolean) => void;
  initialCheckInfoValues?: MonitorCheckConfSchema;
}

export interface CheckInfoItemSchema {
  data: MonitorTypeConf;
  confType: string;
  isAggShown: isAggShownProps;
  handleOnChange: (confType: string, key: string, item?: MonitorValueConf) => void;
  initValue: any;
  setIsAggShown: (flag: boolean) => void;
}

export interface LookbackCheckProps {
  checkId: number;
  data: {
    start_time: string;
    end_time: string;
    filter?: {
      filters: {
        column: string;
        operator: OperatorsEnum;
        value: string | number;
      }[];
    };
    additional_kwargs: MonitorCheckConfSchema;
    frequency: number;
    aggregation_window: number;
  };
}

export enum DrawerNamesMap {
  CreateMonitor = 'new monitor',
  CreateAlert = 'new alert',
  EditMonitor = 'edit monitor'
}

export type DrawerNames = DrawerNamesMap.CreateMonitor | DrawerNamesMap.CreateAlert | DrawerNamesMap.EditMonitor;

export interface MonitorDrawerProps extends DrawerProps {
  monitor?: MonitorSchema;
  drawerName: DrawerNames;
  onClose: () => void;
}

export interface GraphViewProps {
  onClose: () => void | undefined;
  graphData?: ChartData<'line'>;
  isLoading: boolean;
  setResetMonitor: Dispatch<SetStateAction<boolean>>;
  timeFreq?: number;
}

export interface SubcategoryProps {
  children: ReactNode;
}

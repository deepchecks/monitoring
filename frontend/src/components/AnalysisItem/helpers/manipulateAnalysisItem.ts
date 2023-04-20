import { MutableRefObject } from 'react';
import {
  CheckResultSchema,
  CheckSchema,
  DataFilter,
  MonitorCheckConfSchema,
  getCheckReferenceApiV1ChecksCheckIdRunReferencePost
} from 'api/generated';

import { FrequencyNumberMap, FrequencyNumberType } from 'helpers/utils/frequency';
import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';
import { showDatasets } from './showDatasets';

import { IDataset, RunCheckBody } from '../AnalysisItem.types';

interface ManipulateData {
  isVisible: boolean;
  runLookBack: boolean;
  frequency: number;
  ascending: boolean;
  additionalKwargs: any;
  checksWithCustomProps: MutableRefObject<Set<number>> | undefined;
  check: CheckSchema;
  activeFilters: DataFilter[];
  period: [Date, Date];
  initialData: CheckResultSchema | undefined;
  isMostWorstActive: boolean;
  compareWithPreviousPeriod: boolean;
  compareByReference?: boolean;
  setAlertRules: (arg: any) => void;
  setIsItemLoading: (loading: boolean) => void;
  setPerviousPeriodLabels: (labels: any) => void;
  runCheck: (checkBody: RunCheckBody) => void;
  setData: (chartData: any) => void;
}

const showOneDataset = (dataSets: IDataset[], ascending = true) => showDatasets(dataSets, 1, ascending);
const showThreeDatasets = (dataSets: IDataset[], ascending = true) => showDatasets(dataSets, 3, ascending);

export const manipulateAnalysisItem = (props: ManipulateData) => {
  const {
    isVisible,
    runLookBack,
    additionalKwargs,
    checksWithCustomProps,
    initialData,
    check,
    isMostWorstActive,
    compareWithPreviousPeriod,
    frequency,
    activeFilters,
    period,
    ascending,
    compareByReference,
    setAlertRules,
    runCheck,
    setData,
    setPerviousPeriodLabels,
    setIsItemLoading
  } = props;

  if (!isVisible || !runLookBack) {
    return;
  }

  setIsItemLoading(true);

  const hasCustomProps = additionalKwargs != undefined || activeFilters.length > 0;
  // Update the checksWithCustomProps set which indicates to the parent component if it needs to load this check data
  hasCustomProps ? checksWithCustomProps?.current.add(check.id) : checksWithCustomProps?.current.delete(check.id);

  async function getData() {
    let response;

    const runCheckBody: RunCheckBody = {
      checkId: check.id,
      data: {
        frequency: FrequencyNumberMap[frequency as FrequencyNumberType['type']],
        start_time: period[0].toISOString(),
        end_time: period[1].toISOString()
      }
    };

    // If there are no special arguments for this check, it is loaded it using a single request for all checks in analysis page
    if (initialData && !hasCustomProps) {
      response = initialData;
    } else {
      if (activeFilters.length) {
        runCheckBody.data.filter = { filters: activeFilters };
      }

      runCheckBody.data.additional_kwargs = additionalKwargs as MonitorCheckConfSchema;

      response = await runCheck(runCheckBody);

      setIsItemLoading(false);
      setData({ datasets: [], labels: [] });
    }

    const parsedChartData = parseDataForLineChart(response as CheckResultSchema);

    if (compareByReference) {
      const getReferenceData = async () => {
        const response = await getCheckReferenceApiV1ChecksCheckIdRunReferencePost(check.id, {
          additional_kwargs: additionalKwargs
        });

        if (response && (response as any[])[0]) {
          setAlertRules(response);
        } // else { Delete! An example until server will fix the endpoint
        //   setAlertRules([
        //     {
        //       alert_severity: 'high',
        //       id: 1169,
        //       is_active: true,
        //       monitor_id: 2199,
        //       start_time: null,
        //       condition: {
        //         operator: 'greater_than',
        //         value: 0.25
        //       }
        //     }
        //   ]);
        // }
      };

      getReferenceData();
    }

    if (compareWithPreviousPeriod) {
      const periodsTimeDifference = period[1].getTime() - period[0].getTime();
      const runCheckPreviousPeriodBody: RunCheckBody = {
        ...runCheckBody,
        data: {
          ...runCheckBody.data,
          start_time: new Date(period[0].getTime() - periodsTimeDifference).toISOString(),
          end_time: new Date(period[1].getTime() - periodsTimeDifference).toISOString()
        }
      };

      const previousPeriodResponse: any = await runCheck(runCheckPreviousPeriodBody);
      const parsedPreviousPeriodChartData = parseDataForLineChart(previousPeriodResponse, true);

      setPerviousPeriodLabels(parsedPreviousPeriodChartData.labels);

      const paired: IDataset[] = [];
      const single: IDataset[] = [];

      parsedChartData.datasets.forEach((i: IDataset) =>
        parsedPreviousPeriodChartData.datasets.find(e => e.id === i.id) ? paired.push(i) : single.push(i)
      );
      parsedPreviousPeriodChartData.datasets.forEach(i =>
        parsedChartData.datasets.find((e: IDataset) => e.id === i.id) ? paired.push(i) : single.push(i)
      );

      if (paired.length) {
        const pairedHalfLength = paired.length / 2;

        paired.forEach((item, index) => {
          if (index < pairedHalfLength) {
            paired[pairedHalfLength + index].borderColor = item.borderColor;
            paired[pairedHalfLength + index].pointBackgroundColor = item.pointBackgroundColor;
          }
        });
      }

      const dataSets = paired.concat(single);
      const result = isMostWorstActive ? showOneDataset(dataSets, !!ascending) : showOneDataset(dataSets);

      parsedChartData.datasets = result;
    } else {
      const result = isMostWorstActive
        ? showThreeDatasets(parsedChartData.datasets, !!ascending)
        : parsedChartData.datasets;

      parsedChartData.datasets = result;
    }

    setData(parsedChartData);
    setIsItemLoading(false);
  }

  getData();
};

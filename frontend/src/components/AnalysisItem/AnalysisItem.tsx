import React, { memo, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';

import {
  CheckSchema,
  MonitorCheckConfSchema,
  MonitorOptions,
  useGetCheckInfoApiV1ChecksCheckIdInfoGet
} from 'api/generated';
import { AnalysisContext, ComparisonModeOptions } from 'context/analysis-context';
import { useRunCheckLookback } from 'hooks/useRunCheckLookback';

import { AnalysisChartItemWithFilters } from './components/AnalysisChartItemWithFilters/AnalysisChartItemWithFilters';
import { AnalysisChartItem } from './components/AnalysisChartItem';
import AnalysisItemDiagram from './components/AnalysisItemDiagram';

import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';
import { showDatasets } from './AnalysisItem.helpers';

import { SetStateType } from 'helpers/types';
import { AnalysisItemFilterTypes, IDataset } from './AnalysisItem.types';
import { CheckType, CheckTypeOptions } from 'helpers/types/check';

interface AnalysisItemProps {
  check: CheckSchema;
  lastUpdate: Date;
  handlePointCLick: (datasetName: string, versionName: string, timeLabel: number) => void;
  setCurrentCheck: SetStateType<CheckSchema | null>;
  setCurrentAdditionalKwargs: SetStateType<MonitorCheckConfSchema | null>;
  setCurrentType: SetStateType<CheckType>;
}

interface IRunCheckBody {
  checkId: number;
  data: MonitorOptions;
}

function AnalysisItemComponent({
  check,
  lastUpdate,
  handlePointCLick,
  setCurrentCheck,
  setCurrentAdditionalKwargs,
  setCurrentType
}: AnalysisItemProps) {
  const { isComparisonModeOn, comparisonMode, period, frequency, activeFilters } = useContext(AnalysisContext);

  const { data: checkInfo } = useGetCheckInfoApiV1ChecksCheckIdInfoGet(check.id);
  const { mutateAsync: runCheck, chartData, isLoading } = useRunCheckLookback('line');

  const [data, setData] = useState<typeof chartData>(chartData);
  const [activeFilter, setActiveFilter] = useState<AnalysisItemFilterTypes | null>(null);
  const [filtersSingleSelectValue, setFiltersSingleSelectValue] = useState('');
  const [filtersMultipleSelectValue, setFiltersMultipleSelectValue] = useState<string[]>([]);
  const [isMostWorstActive, setIsMostWorstActive] = useState(false);

  const checkConf = checkInfo?.check_conf;

  const ascending = useMemo(
    () => checkConf && checkConf.find(e => e.type === AnalysisItemFilterTypes.AGGREGATION),
    [checkConf]
  );

  const showOneDataset = useCallback(
    (dataSets: IDataset[], ascending = true) => showDatasets(dataSets, 1, ascending),
    []
  );
  const showThreeDatasets = useCallback(
    (dataSets: IDataset[], ascending = true) => showDatasets(dataSets, 3, ascending),
    []
  );

  const additionalKwargs = useMemo(() => {
    if (
      checkConf?.length &&
      (filtersSingleSelectValue.length || filtersMultipleSelectValue.length) &&
      typeof activeFilter === 'string'
    ) {
      const filter =
        activeFilter === AnalysisItemFilterTypes.AGGREGATION ? [filtersSingleSelectValue] : filtersMultipleSelectValue;

      const additionalKwargs = {
        check_conf: {
          [activeFilter]: filter
        },
        res_conf: []
      };

      return additionalKwargs;
    }
  }, [activeFilter, checkConf?.length, filtersMultipleSelectValue, filtersSingleSelectValue]);

  useEffect(() => {
    async function getData() {
      const runCheckBody: IRunCheckBody = {
        checkId: check.id,
        data: {
          frequency,
          start_time: period[0].toISOString(),
          end_time: period[1].toISOString()
        }
      };

      if (activeFilters.length) {
        runCheckBody.data.filter = { filters: activeFilters };
      }

      runCheckBody.data.additional_kwargs = additionalKwargs;

      const response = await runCheck(runCheckBody);
      const parsedChartData = parseDataForLineChart(response);

      if (isComparisonModeOn && comparisonMode === ComparisonModeOptions.previousPeriod) {
        const periodsTimeDifference = period[1].getTime() - period[0].getTime();
        const runCheckPreviousPeriodBody: IRunCheckBody = {
          ...runCheckBody,
          data: {
            ...runCheckBody.data,
            start_time: new Date(period[0].getTime() - periodsTimeDifference).toISOString(),
            end_time: new Date(period[1].getTime() - periodsTimeDifference).toISOString()
          }
        };

        const previousPeriodResponse = await runCheck(runCheckPreviousPeriodBody);
        const parsedPreviousPeriodChartData = parseDataForLineChart(previousPeriodResponse, true);

        const paired: IDataset[] = [];
        const single: IDataset[] = [];

        parsedChartData.datasets.forEach(i =>
          parsedPreviousPeriodChartData.datasets.find(e => e.id === i.id) ? paired.push(i) : single.push(i)
        );
        parsedPreviousPeriodChartData.datasets.forEach(i =>
          parsedChartData.datasets.find(e => e.id === i.id) ? paired.push(i) : single.push(i)
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
    }

    getData();
  }, [
    activeFilters,
    additionalKwargs,
    ascending,
    check.id,
    comparisonMode,
    frequency,
    isComparisonModeOn,
    isMostWorstActive,
    period,
    runCheck,
    showOneDataset,
    showThreeDatasets
  ]);

  const handleDrawerOpen = useCallback(
    (datasetName: string, versionName: string, timeLabel: number) => {
      if (additionalKwargs) {
        const type = checkInfo?.res_conf ? CheckTypeOptions.Class : CheckTypeOptions.Feature;

        setCurrentType(type);
        setCurrentAdditionalKwargs(additionalKwargs);
      }

      setCurrentCheck(check);
      handlePointCLick(datasetName, versionName, timeLabel);
    },
    [
      additionalKwargs,
      check,
      checkInfo?.res_conf,
      handlePointCLick,
      setCurrentAdditionalKwargs,
      setCurrentCheck,
      setCurrentType
    ]
  );

  return (
    <>
      {checkConf && checkConf.length ? (
        <AnalysisChartItemWithFilters
          title={check?.name || '-'}
          subtitle={`Last Update: ${dayjs(lastUpdate).format('MMM. DD, YYYY')}`}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          setSingleSelectValue={setFiltersSingleSelectValue}
          multipleSelectValue={filtersMultipleSelectValue}
          setMultipleSelectValue={setFiltersMultipleSelectValue}
          isMostWorstActive={isMostWorstActive}
          setIsMostWorstActive={setIsMostWorstActive}
          filters={checkConf}
        >
          <AnalysisItemDiagram
            isLoading={isLoading}
            data={data}
            comparison={isComparisonModeOn}
            handlePointCLick={handleDrawerOpen}
          />
        </AnalysisChartItemWithFilters>
      ) : (
        <AnalysisChartItem
          subtitle={`Last Update: ${dayjs(lastUpdate).format('MMM. DD, YYYY')}`}
          title={check?.name || '-'}
        >
          <AnalysisItemDiagram
            isLoading={isLoading}
            data={data}
            comparison={isComparisonModeOn}
            handlePointCLick={handleDrawerOpen}
          />
        </AnalysisChartItem>
      )}
    </>
  );
}

export const AnalysisItem = memo(AnalysisItemComponent);

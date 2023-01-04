import React, { memo, useEffect, useState, useMemo, useCallback, MutableRefObject } from 'react';
import dayjs from 'dayjs';

import {
  CheckSchema,
  MonitorCheckConfSchema,
  MonitorOptions,
  useGetCheckInfoApiV1ChecksCheckIdInfoGet,
  DataFilter,
  MonitorCheckConf,
  CheckResultSchema
} from 'api/generated';
import { useRunCheckLookback } from 'hooks/useRunCheckLookback';

import { AnalysisChartItemWithFilters } from './components/AnalysisChartItemWithFilters';
import { AnalysisChartItem } from './components/AnalysisChartItem';
import DiagramLine from 'components/DiagramLine/DiagramLine';

import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';
import { showDatasets } from './AnalysisItem.helpers';

import { AnalysisItemFilterTypes, IDataset } from './AnalysisItem.types';
import { ComparisonModeOptions } from 'context/analysis-context';

interface AnalysisItemProps {
  check: CheckSchema;
  initialData?: CheckResultSchema;
  checksWithCustomProps?: MutableRefObject<Set<number>>;
  lastUpdate: Date;
  isComparisonModeOn: boolean;
  comparisonMode: ComparisonModeOptions;
  period: [Date, Date];
  frequency: number;
  activeFilters: DataFilter[];
  onPointCLick?: (
    datasetName: string,
    versionName: string,
    timeLabel: number,
    additionalKwargs: MonitorCheckConfSchema | undefined,
    checkInfo: MonitorCheckConf | undefined,
    check: CheckSchema
  ) => void;
  height: number;
  graphHeight: number;
}

interface RunCheckBody {
  checkId: number;
  data: MonitorOptions;
}

const showOneDataset = (dataSets: IDataset[], ascending = true) => showDatasets(dataSets, 1, ascending);
const showThreeDatasets = (dataSets: IDataset[], ascending = true) => showDatasets(dataSets, 3, ascending);

function AnalysisItemComponent({
  check,
  initialData,
  checksWithCustomProps,
  lastUpdate,
  onPointCLick,
  isComparisonModeOn,
  comparisonMode,
  period,
  frequency,
  activeFilters,
  height,
  graphHeight
}: AnalysisItemProps) {
  const { data: checkInfo } = useGetCheckInfoApiV1ChecksCheckIdInfoGet(check.id);
  const { mutateAsync: runCheck, chartData, isLoading } = useRunCheckLookback('line');

  const [data, setData] = useState<typeof chartData>(chartData);
  const [activeFilter, setActiveFilter] = useState<AnalysisItemFilterTypes | null>(null);
  const [filtersSingleSelectValue, setFiltersSingleSelectValue] = useState('');
  const [filtersMultipleSelectValue, setFiltersMultipleSelectValue] = useState<string[]>([]);
  const [isMostWorstActive, setIsMostWorstActive] = useState(false);

  const checkConf = useMemo(() => checkInfo?.check_conf, [checkInfo?.check_conf]);

  const ascending = useMemo(
    () => checkConf && checkConf.find(e => e.type === AnalysisItemFilterTypes.AGGREGATION),
    [checkConf]
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
        res_conf: undefined
      };

      if (activeFilter !== AnalysisItemFilterTypes.AGGREGATION)
        additionalKwargs.check_conf[AnalysisItemFilterTypes.AGGREGATION] = ['none'];

      return additionalKwargs;
    }
  }, [activeFilter, checkConf?.length, filtersMultipleSelectValue, filtersSingleSelectValue]);

  useEffect(() => {
    const hasCustomProps = additionalKwargs != undefined || activeFilters.length > 0
    // Update the checksWithCustomProps set which indicates to the parent component if it needs to load this check data
    if (hasCustomProps)
      checksWithCustomProps?.current.add(check.id);
    else
      checksWithCustomProps?.current.delete(check.id);

    async function getData() {
      let response;
      const runCheckBody: RunCheckBody = {
        checkId: check.id,
        data: {
          frequency,
          start_time: period[0].toISOString(),
          end_time: period[1].toISOString()
        }
      };
      // If there are no special arguments for this check, it is loaded it using a single request for all checks in analysis page
      if (initialData && !hasCustomProps) {
        response = initialData;
      }
      else {
        if (activeFilters.length) {
          runCheckBody.data.filter = { filters: activeFilters };
        }

        runCheckBody.data.additional_kwargs = additionalKwargs;

        response = await runCheck(runCheckBody);
      }

      const parsedChartData = parseDataForLineChart(response);

      if (isComparisonModeOn && comparisonMode === ComparisonModeOptions.previousPeriod) {
        const periodsTimeDifference = period[1].getTime() - period[0].getTime();
        const runCheckPreviousPeriodBody: RunCheckBody = {
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
    initialData,
    checksWithCustomProps
  ]);

  const handlePointClick = useCallback(
    (datasetName: string, versionName: string, timeLabel: number) => {
      if (onPointCLick) {
        onPointCLick(datasetName, versionName, timeLabel, additionalKwargs, checkInfo, check);
      }
    },
    [additionalKwargs, check, checkInfo, onPointCLick]
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
          sx={{ height, minHeight: height }}
        >
          <DiagramLine
            data={data}
            isLoading={isLoading}
            comparison={isComparisonModeOn}
            onPointCLick={handlePointClick}
            timeFreq={frequency}
            analysis
            height={graphHeight}
          />
        </AnalysisChartItemWithFilters>
      ) : (
        <AnalysisChartItem
          subtitle={`Last Update: ${dayjs(lastUpdate).format('MMM. DD, YYYY')}`}
          title={check?.name || '-'}
          sx={{ height, minHeight: height }}
        >
          <DiagramLine
            data={data}
            isLoading={isLoading}
            comparison={isComparisonModeOn}
            onPointCLick={handlePointClick}
            analysis
            height={graphHeight}
          />
        </AnalysisChartItem>
      )}
    </>
  );
}

export const AnalysisItem = memo(AnalysisItemComponent);

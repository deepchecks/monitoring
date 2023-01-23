import React, { memo, useEffect, useState, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { useGetCheckInfoApiV1ChecksCheckIdInfoGet } from 'api/generated';
import { useRunCheckLookback } from 'hooks/useRunCheckLookback';
import { ComparisonModeOptions } from 'context/analysis-context';

import { AnalysisChartItemWithFilters } from './components/AnalysisChartItemWithFilters';
import { AnalysisChartItem } from './components/AnalysisChartItem';
import DiagramLine from 'components/DiagramLine/DiagramLine';

import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';
import { showDatasets } from './AnalysisItem.helpers';

import { AnalysisItemFilterTypes, IDataset } from './AnalysisItem.types';

import { AnalysisItemProps, RunCheckBody, FilteredValues } from './AnalysisItem.types';

dayjs.extend(localizedFormat);

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

  // {} as FilteredValues should be fixed !!!
  const [filteredValues, setFilteredValues] = useState<FilteredValues>({} as FilteredValues);
  const [isMostWorstActive, setIsMostWorstActive] = useState(false);

  const checkConf = useMemo(() => checkInfo?.check_conf, [checkInfo?.check_conf]);

  const ascending = useMemo(
    () => checkConf && checkConf.find(e => e.type === AnalysisItemFilterTypes.AGGREGATION),
    [checkConf]
  );

  const additionalKwargs = useMemo(() => {
    if (Object.keys(filteredValues).length) {
      const additionalKwargs = {
        check_conf: filteredValues,
        res_conf: undefined
      };

      return additionalKwargs;
    }
  }, [filteredValues]);

  useEffect(() => {
    const hasCustomProps = additionalKwargs != undefined || activeFilters.length > 0;
    // Update the checksWithCustomProps set which indicates to the parent component if it needs to load this check data
    hasCustomProps ? checksWithCustomProps?.current.add(check.id) : checksWithCustomProps?.current.delete(check.id);

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
      } else {
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
    additionalKwargs,
    isMostWorstActive,
    ascending,
    activeFilters,
    check.id,
    comparisonMode,
    frequency,
    isComparisonModeOn,
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
          subtitle={`Last Update: ${dayjs(lastUpdate).format('L')}`}
          docsLink={check.docs_link}
          isDriftCheck={check && check.config.class_name.toLowerCase().includes('drift')}
          checkParams={check?.config.params || []}
          isMostWorstActive={isMostWorstActive}
          setIsMostWorstActive={setIsMostWorstActive}
          filters={checkConf}
          filteredValues={filteredValues}
          setFilteredValues={setFilteredValues}
          sx={{ height: { xs: height - 104, xl: height }, minHeight: { xs: height - 104, xl: height } }}
        >
          <DiagramLine
            data={data}
            isLoading={isLoading}
            comparison={isComparisonModeOn}
            onPointCLick={handlePointClick}
            timeFreq={frequency}
            analysis
            height={{ lg: graphHeight - 104, xl: graphHeight }}
          />
        </AnalysisChartItemWithFilters>
      ) : (
        <AnalysisChartItem
          subtitle={`Last Update: ${dayjs(lastUpdate).format('L')}`}
          title={check?.name || '-'}
          sx={{ height: { xs: height - 104, xl: height }, minHeight: { xs: height - 104, xl: height } }}
          docsLink={check.docs_link}
        >
          <DiagramLine
            data={data}
            isLoading={isLoading}
            comparison={isComparisonModeOn}
            onPointCLick={handlePointClick}
            analysis
            height={{ lg: graphHeight - 104, xl: graphHeight }}
          />
        </AnalysisChartItem>
      )}
    </>
  );
}

export const AnalysisItem = memo(AnalysisItemComponent);

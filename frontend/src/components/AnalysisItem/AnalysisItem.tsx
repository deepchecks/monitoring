import React, { memo, useEffect, useState, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import { MonitorCheckConfSchema, useGetCheckInfoApiV1ChecksCheckIdInfoGet } from 'api/generated';
import { useRunCheckLookback } from 'helpers/hooks/useRunCheckLookback';
import { useElementOnScreen } from 'helpers/hooks/useElementOnScreen';

import { AnalysisChartItemWithFilters } from './components/AnalysisChartItemWithFilters';
import { AnalysisChartItem } from './components/AnalysisChartItem';
import DiagramLine from 'components/DiagramLine/DiagramLine';

import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';
import { showDatasets } from './AnalysisItem.helpers';
import { AnalysisItemProps, RunCheckBody, IDataset } from './AnalysisItem.types';
import { CheckFilterTypes, FilteredValues } from 'helpers/utils/checkUtil';
import { events, reportEvent } from 'helpers/services/mixPanel';
import { FrequencyNumberMap, FrequencyNumberType } from 'helpers/utils/frequency';

dayjs.extend(localizedFormat);

const showOneDataset = (dataSets: IDataset[], ascending = true) => showDatasets(dataSets, 1, ascending);
const showThreeDatasets = (dataSets: IDataset[], ascending = true) => showDatasets(dataSets, 3, ascending);

function AnalysisItemComponent({
  check,
  initialData,
  checksWithCustomProps,
  lastUpdate,
  onPointCLick,
  compareWithPreviousPeriod,
  period,
  frequency,
  activeFilters,
  height,
  graphHeight
}: AnalysisItemProps) {
  const { data: checkInfo, refetch: refetchInfo } = useGetCheckInfoApiV1ChecksCheckIdInfoGet(check.id, {
    query: {
      enabled: false
    }
  });
  // If check.id has changed refetch the check info
  useEffect(() => {
    if (check.id) {
      refetchInfo();
    }
  }, [check.id, refetchInfo]);

  const { observedContainerRef, isVisible } = useElementOnScreen();

  const { mutateAsync: runCheck, chartData, isLoading } = useRunCheckLookback('line');

  const [data, setData] = useState(chartData);
  const [perviousPeriodLabels, setPerviousPeriodLabels] = useState<number[]>([]);

  // {} as FilteredValues should be fixed !!!
  const [filteredValues, setFilteredValues] = useState<FilteredValues>({} as FilteredValues);
  const [isMostWorstActive, setIsMostWorstActive] = useState(false);

  // Todo - delete all of this part when refactor this component!
  const [runLookBack, setRunLookBack] = useState(false);
  setTimeout(() => setRunLookBack(true), 500);
  const loading = !runLookBack ? true : isLoading;

  const checkConf = useMemo(() => checkInfo?.check_conf, [checkInfo?.check_conf]);

  const ascending = useMemo(
    () => checkConf && checkConf.find(e => e.type === CheckFilterTypes.AGGREGATION),
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
    if (!isVisible || !runLookBack) {
      return;
    }

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
      }

      const parsedChartData = parseDataForLineChart(response);

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

        const previousPeriodResponse = await runCheck(runCheckPreviousPeriodBody);
        const parsedPreviousPeriodChartData = parseDataForLineChart(previousPeriodResponse, true);

        setPerviousPeriodLabels(parsedPreviousPeriodChartData.labels);

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

    return () => setPerviousPeriodLabels([]);
  }, [
    additionalKwargs,
    isMostWorstActive,
    ascending,
    activeFilters,
    check.id,
    frequency,
    compareWithPreviousPeriod,
    period,
    runCheck,
    initialData,
    checksWithCustomProps,
    isVisible,
    runLookBack
  ]);

  const handlePointClick = useCallback(
    (datasetName: string, versionName: string, timeLabel: number) => {
      if (onPointCLick) {
        onPointCLick(datasetName, versionName, timeLabel, additionalKwargs as MonitorCheckConfSchema, checkInfo, check);
        reportEvent(events.analysisPage.clickedPointOnTheGraph);
      }
    },
    [additionalKwargs, check, checkInfo, onPointCLick]
  );

  if (!data) {
    return <></>;
  }

  return (
    <div ref={observedContainerRef}>
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
            isLoading={isLoading || loading}
            comparison={compareWithPreviousPeriod}
            onPointCLick={handlePointClick}
            timeFreq={frequency}
            analysis
            previousPeriodLabels={perviousPeriodLabels}
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
            isLoading={isLoading || loading}
            comparison={compareWithPreviousPeriod}
            onPointCLick={handlePointClick}
            timeFreq={frequency}
            analysis
            previousPeriodLabels={perviousPeriodLabels}
            height={{ lg: graphHeight - 104, xl: graphHeight }}
          />
        </AnalysisChartItem>
      )}
    </div>
  );
}

export const AnalysisItem = memo(AnalysisItemComponent);

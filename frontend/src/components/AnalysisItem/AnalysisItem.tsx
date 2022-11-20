import React, { memo, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';

import { CheckSchema, DataFilter, MonitorOptions, useGetCheckInfoApiV1ChecksCheckIdInfoGet } from 'api/generated';
import { AnalysisContext, ComparisonModeOptions } from 'context/analysis-context';
import { useRunCheckLookback } from 'hooks/useRunCheckLookback';

import { styled, Box } from '@mui/material';

import { AnalysisChartItemWithFilters } from './components/AnalysisChartItemWithFilters/AnalysisChartItemWithFilters';
import { AnalysisChartItem } from './components/AnalysisChartItem';
import AnalysisItemDiagram from './components/AnalysisItemDiagram';

import { OperatorsMap } from 'helpers/conditionOperator';
import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';
import { showDatasets } from './AnalysisItem.helpers';

import { AnalysisItemFilterTypes, IDataset } from './AnalysisItem.types';

interface AnalysisItemProps {
  check: CheckSchema;
  lastUpdate: Date;
}

interface IRunCheckBody {
  checkId: number;
  data: MonitorOptions;
}

function AnalysisItemComponent({ check, lastUpdate }: AnalysisItemProps) {
  const { isComparisonModeOn, comparisonMode, filters, period, frequency } = useContext(AnalysisContext);

  const { data: checkInfo } = useGetCheckInfoApiV1ChecksCheckIdInfoGet(check.id);
  const { mutateAsync: runCheck, chartData, isLoading } = useRunCheckLookback('line');

  const [data, setData] = useState<typeof chartData>(chartData);
  const [activeFilter, setActiveFilter] = useState<AnalysisItemFilterTypes | null>(null);
  const [filtersSingleSelectValue, setFiltersSingleSelectValue] = useState('');
  const [filtersMultipleSelectValue, setFiltersMultipleSelectValue] = useState<string[]>([]);
  const [isMostWorstActive, setIsMostWorstActive] = useState(false);

  const checkConf = checkInfo?.check_conf;

  const isMost = useMemo(
    () => checkConf && checkConf.find(e => e.type === AnalysisItemFilterTypes.AGGREGATION),
    [checkConf]
  );

  const showOneDataset = useCallback((dataSets: IDataset[], isMost = true) => showDatasets(dataSets, 1, isMost), []);
  const showThreeDatasets = useCallback((dataSets: IDataset[], isMost = true) => showDatasets(dataSets, 3, isMost), []);

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

      const activeFilters: DataFilter[] = [];

      Object.entries(filters).forEach(([column, value]) => {
        if (value) {
          if (typeof value[0] === 'number' && typeof value[1] === 'number') {
            activeFilters.push({
              column,
              operator: OperatorsMap.greater_than,
              value: value[0]
            });
            activeFilters.push({
              column,
              operator: OperatorsMap.less_than,
              value: value[1]
            });
            return;
          }

          if (typeof value === 'object') {
            Object.entries(value).forEach(([category, active]) => {
              if (active) {
                activeFilters.push({
                  column,
                  operator: OperatorsMap.contains,
                  value: category
                });
              }
            });
          }
        }
      });

      if (activeFilters.length) {
        runCheckBody.data.filter = { filters: activeFilters };
      }

      if (
        checkConf?.length &&
        (filtersSingleSelectValue || filtersMultipleSelectValue.length) &&
        typeof activeFilter === 'string'
      ) {
        const filter =
          activeFilter === AnalysisItemFilterTypes.AGGREGATION
            ? [filtersSingleSelectValue]
            : filtersMultipleSelectValue;

        runCheckBody.data.additional_kwargs = {
          check_conf: {
            [activeFilter]: filter
          },
          res_conf: []
        };
      }

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
        const result = isMostWorstActive ? showOneDataset(dataSets, !!isMost) : showOneDataset(dataSets);

        parsedChartData.datasets = result;
      } else {
        const result = isMostWorstActive
          ? showThreeDatasets(parsedChartData.datasets, !!isMost)
          : parsedChartData.datasets;

        parsedChartData.datasets = result;
      }

      setData(parsedChartData);
    }

    getData();
  }, [
    activeFilter,
    check.id,
    checkConf?.length,
    comparisonMode,
    filters,
    filtersMultipleSelectValue,
    filtersSingleSelectValue,
    frequency,
    isComparisonModeOn,
    isMostWorstActive,
    period,
    runCheck,
    showOneDataset,
    showThreeDatasets,
    isMost
  ]);

  return (
    <StyledAnalysisItem>
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
          <AnalysisItemDiagram isLoading={isLoading} data={data} comparison={isComparisonModeOn} />
        </AnalysisChartItemWithFilters>
      ) : (
        <AnalysisChartItem
          subtitle={`Last Update: ${dayjs(lastUpdate).format('MMM. DD, YYYY')}`}
          title={check?.name || '-'}
        >
          <AnalysisItemDiagram isLoading={isLoading} data={data} comparison={isComparisonModeOn} />
        </AnalysisChartItem>
      )}
    </StyledAnalysisItem>
  );
}

const StyledAnalysisItem = styled(Box)({
  minHeight: '528px',
  borderRadius: '10px',
  boxShadow: '0px 0px 25px 2px rgba(0, 0, 0, 0.09)'
});

export const AnalysisItem = memo(AnalysisItemComponent);

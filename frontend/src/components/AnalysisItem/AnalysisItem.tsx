import React, { memo, useContext, useEffect, useState } from 'react';
import dayjs from 'dayjs';

import { CheckSchema, DataFilter, MonitorOptions, useGetCheckInfoApiV1ChecksCheckIdInfoGet } from 'api/generated';
import { AnalysisContext } from 'context/analysis-context';
import { useRunCheckLookback } from 'hooks/useRunCheckLookback';

import { styled, Box } from '@mui/material';

import { AnalysisChartItemWithFilters } from 'components/AnalysisChartItemWithFilters/AnalysisChartItemWithFilters';
import { AnalysisChartItem } from 'components/AnalysisChartItem';
import AnalysisItemDiagram from './components/AnalysisItemDiagram';

import { OperatorsMap } from 'helpers/conditionOperator';
import { parseDataForLineChart } from 'helpers/utils/parseDataForChart';

interface AnalysisItemProps {
  check: CheckSchema;
  lastUpdate: Date;
}

interface IRunCheckBody {
  checkId: number;
  data: MonitorOptions;
}

function AnalysisItemComponent({ check, lastUpdate }: AnalysisItemProps) {
  const { referencePreviousPeriod, filters, period, frequency } = useContext(AnalysisContext);

  const { data: checkInfo } = useGetCheckInfoApiV1ChecksCheckIdInfoGet(check.id);
  const { mutateAsync: runCheck, chartData, isLoading } = useRunCheckLookback('line');

  const [data, setData] = useState<typeof chartData>(chartData);
  const [activeFilter, setActiveFilter] = useState(0);
  const [filtersSelectValue, setFiltersSelectValue] = useState('');

  const checkConf = checkInfo?.check_conf;

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

      if (checkConf?.length && filtersSelectValue) {
        const currentCheckConf = checkConf[activeFilter];

        runCheckBody.data.additional_kwargs = {
          check_conf: {
            [currentCheckConf.type]: filtersSelectValue
          },
          res_conf: []
        };
      }

      const response = await runCheck(runCheckBody);
      const parsedChartData = parseDataForLineChart(response);

      if (referencePreviousPeriod) {
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

        parsedChartData.datasets = parsedChartData.datasets.concat(parsedPreviousPeriodChartData.datasets);
      }

      setData(parsedChartData);
    }

    getData();
  }, [
    referencePreviousPeriod,
    filters,
    filtersSelectValue,
    period,
    frequency,
    activeFilter,
    check.id,
    checkConf,
    runCheck
  ]);

  return (
    <StyledAnalysisItem>
      {checkConf && checkConf.length ? (
        <AnalysisChartItemWithFilters
          activeFilter={activeFilter}
          changeActiveFilter={setActiveFilter}
          setSelectValue={setFiltersSelectValue}
          filters={checkConf}
          selectData={checkConf[activeFilter].values || []}
          subtitle={`Last Update: ${dayjs(lastUpdate).format('MMM. DD, YYYY')}`}
          value={filtersSelectValue}
          title={check?.name || '-'}
        >
          <AnalysisItemDiagram isLoading={isLoading} data={data} />
        </AnalysisChartItemWithFilters>
      ) : (
        <AnalysisChartItem
          subtitle={`Last Update: ${dayjs(lastUpdate).format('MMM. DD, YYYY')}`}
          title={check?.name || '-'}
        >
          <AnalysisItemDiagram isLoading={isLoading} data={data} />
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

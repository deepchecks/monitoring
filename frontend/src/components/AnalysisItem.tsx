import React, { memo, useContext, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { ChartData } from 'chart.js';

import { CheckSchema, DataFilter, MonitorOptions, useGetCheckInfoApiV1ChecksCheckIdInfoGet } from 'api/generated';
import { AnalysisContext } from 'context/analysis-context';
import { useRunCheckLookback } from 'hooks/useRunCheckLookback';

import { Box, styled } from '@mui/material';

import { AnalysisChartItemWithFilters } from 'components/AnalysisChartItemWithFilters/AnalysisChartItemWithFilters';
import { AnalysisChartItem } from 'components/AnalysisChartItem';
import DiagramLine from 'components/DiagramLine';

import { OperatorsMap } from 'helpers/conditionOperator';
import { GraphData } from '../helpers/types';

interface AnalysisItemProps {
  check: CheckSchema;
  lastUpdate: Date;
}

interface AnalysisItemDiagramProps {
  data: ChartData<'line', GraphData, unknown>;
}

interface ICheckRunBody {
  checkId: number;
  data: MonitorOptions;
}

const AnalysisItemDiagram = ({ data }: AnalysisItemDiagramProps) => <DiagramLine data={data} height={440} analysis />;

function AnalysisItemComponent({ check, lastUpdate }: AnalysisItemProps) {
  const { filters, period, frequency } = useContext(AnalysisContext);

  const [activeFilter, setActiveFilter] = useState(0);
  const [value, setValue] = useState('');

  const { data: checkInfo } = useGetCheckInfoApiV1ChecksCheckIdInfoGet(check.id);
  const { mutate, chartData } = useRunCheckLookback('line');

  const checkConf = checkInfo?.check_conf;

  useEffect(() => {
    const checkRunBody: ICheckRunBody = {
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
      checkRunBody.data.filter = { filters: activeFilters };
    }

    if (checkConf?.length && value) {
      const currentCheckConf = checkConf[activeFilter];
      checkRunBody.data.additional_kwargs = {
        check_conf: {
          [currentCheckConf.type]: value
        },
        res_conf: []
      };
    }

    mutate(checkRunBody);
  }, [filters, value, period, frequency, activeFilter, check.id, checkConf, mutate]);

  if (!checkConf?.length) {
    return (
      <StyledBoxWrapper>
        <AnalysisChartItem
          subtitle={`Last Update: ${dayjs(lastUpdate).format('MMM. DD, YYYY')}`}
          title={check?.name || '-'}
        >
          <AnalysisItemDiagram data={chartData} />
        </AnalysisChartItem>
      </StyledBoxWrapper>
    );
  }

  return (
    <StyledBoxWrapper>
      <AnalysisChartItemWithFilters
        activeFilter={activeFilter}
        changeActiveFilter={setActiveFilter}
        setSelectValue={setValue}
        filters={checkConf}
        selectData={checkConf[activeFilter].values || []}
        subtitle={`Last Update: ${dayjs(lastUpdate).format('MMM. DD, YYYY')}`}
        value={value}
        title={check?.name || '-'}
      >
        <AnalysisItemDiagram data={chartData} />
      </AnalysisChartItemWithFilters>
    </StyledBoxWrapper>
  );
}

const StyledBoxWrapper = styled(Box)({
  borderRadius: '10px',
  boxShadow: '0px 0px 25px 2px rgba(0, 0, 0, 0.09)'
});

export const AnalysisItem = memo(AnalysisItemComponent);

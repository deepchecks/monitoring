import { Box, styled } from '@mui/material';
import { CheckSchema, DataFilter, MonitorOptions, useGetCheckInfoApiV1ChecksCheckIdInfoGet } from 'api/generated';
import { AnalysisChartItem } from 'components/AnalysisChartItem';
import { AnalysisChartItemWithFilters } from 'components/AnalysisChartItemWithFilters/AnalysisChartItemWithFilters';
import DiagramLine from 'components/DiagramLine';
import { AnalysisContext } from 'Context/AnalysisContext';
import dayjs from 'dayjs';
import { OperatorsMap } from 'helpers/conditionOperator';
import { useRunCheckLookback } from 'hooks/useRunCheckLookback';
import React, { memo, useContext, useEffect, useState } from 'react';

interface AnalysisItemProps {
  check: CheckSchema;
  lastUpdate: Date;
}

const StyledBoxWrapper = styled(Box)({
  borderRadius: '10px',
  boxShadow: '0px 0px 25px 2px rgba(0, 0, 0, 0.09)'
});

function AnalysisItemComponent({ check, lastUpdate }: AnalysisItemProps) {
  const [activeFilter, setActiveFilter] = useState(0);
  const [value, setValue] = useState('');
  const { filters } = useContext(AnalysisContext);

  const { data: checkInfo } = useGetCheckInfoApiV1ChecksCheckIdInfoGet(check.id);

  const { period } = useContext(AnalysisContext);

  const { mutate, chartData } = useRunCheckLookback('line');
  const checkConf = checkInfo?.check_conf;

  useEffect(() => {
    const checkRunBody: { checkId: number; data: MonitorOptions } = {
      checkId: check.id,
      data: {
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
  }, [filters, value, period]);

  if (!checkConf?.length) {
    return (
      <StyledBoxWrapper>
        <AnalysisChartItem
          subtitle={`Last Update: ${dayjs(lastUpdate).format('MMM. DD, YYYY')}`}
          title={check?.name || '-'}
        >
          <DiagramLine data={chartData} />
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
        <DiagramLine data={chartData} />
      </AnalysisChartItemWithFilters>
    </StyledBoxWrapper>
  );
}

export const AnalysisItem = memo(AnalysisItemComponent);

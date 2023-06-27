import React, { useEffect, useState, useMemo, useCallback } from 'react';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import dayjs from 'dayjs';

import { MonitorCheckConfSchema, useGetCheckInfoApiV1ChecksCheckIdInfoGet } from 'api/generated';

import { useRunCheckLookback } from 'helpers/hooks/useRunCheckLookback';
import { useElementOnScreen } from 'helpers/hooks/useElementOnScreen';
import { AnalysisItemProps } from './AnalysisItem.types';
import { CheckFilterTypes, FilteredValues } from 'helpers/utils/checkUtil';
import { manipulateAnalysisItem } from './helpers/manipulateAnalysisItem';
import { getReference } from './helpers/getReference';

import { AnalysisChartItemWithFilters } from './components/AnalysisChartItemWithFilters';
import { AnalysisChartItem } from './components/AnalysisChartItem';
import DiagramLine from 'components/DiagramLine/DiagramLine';

dayjs.extend(localizedFormat);

const AnalysisItem = ({
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
  graphHeight,
  compareByReference
}: AnalysisItemProps) => {
  const { observedContainerRef, isVisible } = useElementOnScreen();
  const { mutateAsync: runCheck, chartData, isLoading } = useRunCheckLookback('line');
  const { data: checkInfo, refetch } = useGetCheckInfoApiV1ChecksCheckIdInfoGet(check.id, {
    query: {
      enabled: false
    }
  });

  const [isItemLoading, setIsItemLoading] = useState(true);
  const [data, setData] = useState(chartData);
  const [perviousPeriodLabels, setPerviousPeriodLabels] = useState<number[]>([]);
  const [filteredValues, setFilteredValues] = useState<FilteredValues>({} as FilteredValues);
  const [isMostWorstActive, setIsMostWorstActive] = useState(false);
  const [runLookBack, setRunLookBack] = useState(false);
  const [reference, setReference] = useState([]);

  const checkConf = useMemo(() => checkInfo && checkInfo.check_conf, [checkInfo?.check_conf]);
  const additionalKwargs = useMemo(() => {
    if (Object.keys(filteredValues).length) {
      const additionalKwargs = {
        check_conf: filteredValues,
        res_conf: undefined
      };

      return additionalKwargs;
    }
  }, [filteredValues]);

  const ascending = checkConf && checkConf.find(e => e.type === CheckFilterTypes.AGGREGATION) ? true : false;

  const handlePointClick = useCallback(
    (datasetName: string, versionName: string, timeLabel: number) => {
      if (onPointCLick) {
        onPointCLick(datasetName, versionName, timeLabel, additionalKwargs as MonitorCheckConfSchema, checkInfo, check);
      }
    },
    [additionalKwargs, check, checkInfo, onPointCLick]
  );

  setTimeout(() => setRunLookBack(true), 500); // Todo - figure out another solution

  useEffect(() => {
    if (check.id && refetch) refetch();
  }, [check.id, refetch]);

  useEffect(() => {
    getReference({ check, compareByReference, additionalKwargs, setReference });
  }, [compareByReference]);

  useEffect(() => {
    manipulateAnalysisItem({
      isVisible,
      runLookBack,
      frequency,
      additionalKwargs,
      initialData,
      checksWithCustomProps,
      check,
      activeFilters,
      period,
      isMostWorstActive,
      compareWithPreviousPeriod,
      ascending,
      setIsItemLoading,
      runCheck,
      setData,
      setPerviousPeriodLabels
    });

    return () => {
      setPerviousPeriodLabels([]);
    };
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
    runLookBack,
    compareByReference
  ]);

  const diagramLineProps = {
    data: data,
    isLoading: isItemLoading || isLoading,
    comparison: compareWithPreviousPeriod,
    onPointCLick: handlePointClick,
    timeFreq: frequency,
    previousPeriodLabels: perviousPeriodLabels,
    analysis: true,
    height: { lg: graphHeight - 104, xl: graphHeight },
    alert_rules: reference
  };

  const chartItemProps = {
    subtitle: `Last Update: ${dayjs(lastUpdate).format('L')}`,
    title: check?.name || '-',
    sx: { height: { sm: 'auto', xl: height }, minHeight: { xs: height - 104, xl: height } },
    docsLink: check.docs_link
  };

  return (
    <div ref={observedContainerRef} style={{ background: 'white', borderRadius: '16px' }}>
      {checkConf && checkConf.length ? (
        <AnalysisChartItemWithFilters
          {...chartItemProps}
          isDriftCheck={check && check.config.class_name.toLowerCase().includes('drift')}
          checkParams={check?.config.params || []}
          isMostWorstActive={isMostWorstActive}
          setIsMostWorstActive={setIsMostWorstActive}
          filters={checkConf}
          filteredValues={filteredValues}
          setFilteredValues={setFilteredValues}
        >
          <DiagramLine {...diagramLineProps} />
        </AnalysisChartItemWithFilters>
      ) : (
        <AnalysisChartItem {...chartItemProps}>
          <DiagramLine {...diagramLineProps} />
        </AnalysisChartItem>
      )}
    </div>
  );
};

export default AnalysisItem;

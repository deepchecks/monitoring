import React, { useMemo, useEffect, useState, memo } from 'react';

import {
  useGetChecksApiV1ModelsModelIdChecksGet,
  MonitorSchema,
  useGetCheckInfoApiV1ChecksCheckIdInfoGet,
  MonitorTypeConf
} from 'api/generated';

import { Stack, MenuItem } from '@mui/material';

import { ControlledMarkedSelect } from 'components/MarkedSelect/ControlledMarkedSelect';
import { MarkedSelect } from 'components/MarkedSelect';
import { Subcategory } from 'components/Subcategory';

import { SetStateType, SelectValues } from 'helpers/types';
import { AnalysisItemFilterTypes, FilteredValues, TypeMap } from './AnalysisItem/AnalysisItem.types';
import { getNameFromData } from './AnalysisItem/components/AnalysisChartItemWithFilters/AnalysisItemSelect/MultiSelect';

interface SelectCheckProps {
  monitor: MonitorSchema | null;
  model: SelectValues;
  check: SelectValues;
  setCheck: SetStateType<SelectValues>;
  filteredValues: FilteredValues;
  setFilteredValues: SetStateType<FilteredValues>;
  resConf: string | undefined;
  setResConf: SetStateType<string | undefined>;
  disabled: boolean;
}

export const SelectCheckComponent = ({
  monitor,
  model = 0,
  check,
  setCheck,
  filteredValues,
  setFilteredValues,
  resConf,
  setResConf,
  disabled
}: SelectCheckProps) => {
  const { data: checksList = [] } = useGetChecksApiV1ModelsModelIdChecksGet(model);
  const { data: checkInfo } = useGetCheckInfoApiV1ChecksCheckIdInfoGet(
    monitor && !!monitor.check.id ? monitor.check.id : check ? +check : 0
  );

  const checkSelectValues = useMemo(() => checksList.map(c => ({ label: c.name || '', value: c.id })), [checksList]);

  const [checkInfoDisabled, setCheckInfoDisabled] = useState(false);
  const [isAgg, setIsAgg] = useState(true);

  useEffect(() => {
    setCheckInfoDisabled(!checkInfo?.check_conf && !checkInfo?.res_conf);
  }, [checkInfo, setCheckInfoDisabled]);

  function getSelectedVal(conf: MonitorTypeConf) {
    const filteredVals = filteredValues?.[conf.type as AnalysisItemFilterTypes];
    let selectedVal = filteredVals === null ? null : filteredVals?.[0];
    if (selectedVal === undefined) {
      const checkParamVal = monitor?.check.config?.params[TypeMap[conf.type as AnalysisItemFilterTypes]];
      if (checkParamVal) {
        selectedVal = typeof checkParamVal == 'string' ? checkParamVal : (Object.values(checkParamVal)[0] as string);
      }
    }
    return (selectedVal && getNameFromData(selectedVal, conf.values)) || '';
  }

  function clearFilteredValue(type: string) {
    const newFilteredValues: any = { ...filteredValues };
    newFilteredValues[type as AnalysisItemFilterTypes] = null;
    setFilteredValues(newFilteredValues);
    setResConf(undefined);
    setIsAgg(type != AnalysisItemFilterTypes.AGGREGATION);
  }

  function isDisabled(conf: MonitorTypeConf) {
    return conf.is_agg_shown != null && conf.is_agg_shown != isAgg;
  }

  return (
    <Stack>
      <ControlledMarkedSelect
        label="Check"
        values={checkSelectValues}
        value={check}
        setValue={setCheck}
        clearValue={() => setCheck('')}
        disabled={disabled}
      />
      {check && !checkInfoDisabled && (
        <>
          {checkInfo?.check_conf?.map((conf, confIndex) => (
            <Subcategory key={confIndex}>
              <MarkedSelect
                label={`Select ${conf.type}`}
                value={isDisabled(conf) ? '' : getSelectedVal(conf)}
                onChange={e => {
                  const value = e.target.value as string;
                  const newFilteredValues: any = { ...filteredValues };
                  newFilteredValues[conf.type as AnalysisItemFilterTypes] = value ? [value] : null;
                  if (value) {
                    const confVal = conf.values?.filter(({ name }) => name == value)?.[0];
                    const isSetAgg = confVal && confVal.is_agg != null;
                    if (isSetAgg) {
                      setIsAgg(!!confVal.is_agg);
                      confVal.is_agg && setResConf(undefined);
                    }
                  }
                  setFilteredValues(newFilteredValues);
                }}
                clearValue={() => clearFilteredValue(conf.type)}
                fullWidth
                disabled={(() => {
                  const isDisabledVal = isDisabled(conf);
                  if (filteredValues?.[conf.type as AnalysisItemFilterTypes]?.[0] && isDisabledVal) {
                    clearFilteredValue(conf.type);
                  }
                  return isDisabledVal;
                })()}
              >
                {conf.values?.map((value, index) => (
                  <MenuItem key={value.name + index + confIndex} value={value.name}>
                    {value.name}
                  </MenuItem>
                ))}
              </MarkedSelect>
            </Subcategory>
          ))}
          {checkInfo?.res_conf && (
            <Subcategory>
              <MarkedSelect
                label={`Select ${checkInfo?.res_conf.type}`}
                value={resConf || undefined}
                onChange={e => setResConf((e.target.value as string) || undefined)}
                clearValue={() => setResConf(undefined)}
                fullWidth
                disabled={(() => {
                  if (isAgg) {
                    setResConf(undefined);
                  }
                  return isAgg;
                })()}
              >
                {checkInfo?.res_conf.values?.map((value, index) => (
                  <MenuItem key={value.name + index} value={value.name}>
                    {value.name}
                  </MenuItem>
                ))}
              </MarkedSelect>
            </Subcategory>
          )}
        </>
      )}
    </Stack>
  );
};

export const SelectCheck = memo(SelectCheckComponent);

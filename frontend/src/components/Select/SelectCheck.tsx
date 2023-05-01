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
import { CheckFilterTypes, FilteredValues, initFilteredValues, TypeMap, unionCheckConf } from 'helpers/utils/checkUtil';
import { getNameFromData } from '../Analysis/AnalysisItem/components/AnalysisChartItemWithFilters/AnalysisItemSelect/MultiSelect';
import { CheckTypeOptions } from 'helpers/types/check';

interface SelectCheckProps {
  monitor: MonitorSchema | null;
  model: SelectValues;
  check: SelectValues;
  setCheck: SetStateType<SelectValues>;
  filteredValues: FilteredValues;
  setFilteredValues: SetStateType<FilteredValues>;
  resConf: string | undefined;
  setResConf: SetStateType<string | undefined>;
  setIsValidConfig: SetStateType<boolean>;
  disabled: boolean;
  error?: boolean;
  size?: 'small' | 'medium';
}

const PER_FEATURE = 'none';

export const SelectCheckComponent = ({
  monitor,
  model = 0,
  check,
  setCheck,
  filteredValues,
  setFilteredValues,
  resConf,
  setResConf,
  setIsValidConfig,
  disabled,
  error,
  size = 'small'
}: SelectCheckProps) => {
  const { data: checksList = [] } = useGetChecksApiV1ModelsModelIdChecksGet(model);
  const { data: checkInfo } = useGetCheckInfoApiV1ChecksCheckIdInfoGet(
    monitor && !!monitor.check.id ? monitor.check.id : check ? +check : 0
  );
  const type = useMemo(
    () =>
      checkInfo?.res_conf
        ? CheckTypeOptions.Class
        : checkInfo?.check_conf?.filter(val => val.type == 'feature').length
        ? CheckTypeOptions.Feature
        : null,
    [checkInfo]
  );

  const checkSelectValues = useMemo(
    () => checksList.map(c => ({ label: c.name || '', value: c.id, params: c.config.params })),
    [checksList]
  );

  const [checkInfoDisabled, setCheckInfoDisabled] = useState(false);
  const [isAgg, setIsAgg] = useState<boolean>(false);

  function getFilteredValue(valueName: string | null, conf: MonitorTypeConf) {
    const confType = conf.type as CheckFilterTypes;
    let value = confType != CheckFilterTypes.AGGREGATION || valueName != PER_FEATURE ? valueName : null;
    if (value) {
      value = getNameFromData(value, conf.values) || value;
      const confVal = conf.values?.filter(({ name }) => name == value)?.[0];
      const isSetAgg = confVal && confVal.is_agg != null;
      if (isSetAgg) {
        setIsAgg(!!confVal.is_agg);
        confVal.is_agg && setResConf(undefined);
      }
    } else if (confType == CheckFilterTypes.AGGREGATION) {
      setIsAgg(false);
    }
    return value;
  }

  useEffect(() => {
    checkInfo?.check_conf?.map(conf => {
      const confType = conf.type as CheckFilterTypes;
      getFilteredValue(filteredValues[confType]?.[0] || null, conf);
    });
    if (type === null) setIsAgg(true);
  }, [type, checkInfo]);

  useEffect(() => {
    setCheckInfoDisabled(!checkInfo?.check_conf && !checkInfo?.res_conf);
  }, [checkInfo, setCheckInfoDisabled]);

  const updateFilteredValue = (valueName: string | null, conf: MonitorTypeConf) => {
    const value = getFilteredValue(valueName, conf);
    const newFilteredValues = { ...filteredValues };
    newFilteredValues[conf.type as CheckFilterTypes] = value ? [value] : null;
    setFilteredValues(newFilteredValues);
  };

  function getSelectedVal(conf: MonitorTypeConf) {
    const confType = conf.type as CheckFilterTypes;
    const filteredVals = filteredValues?.[confType];
    let selectedVal = filteredVals === null ? null : filteredVals?.[0];
    if (selectedVal === undefined) {
      const checkParamVal = monitor?.check.config?.params[TypeMap[confType]];
      if (checkParamVal) {
        selectedVal = typeof checkParamVal == 'string' ? checkParamVal : (Object.values(checkParamVal)[0] as string);
      }
    }
    return (
      (selectedVal && getNameFromData(selectedVal, conf.values)) ||
      (confType == CheckFilterTypes.AGGREGATION ? PER_FEATURE : '')
    );
  }

  function clearFilteredValue(type: string, setAgg = false) {
    const newFilteredValues = { ...filteredValues };
    newFilteredValues[type as CheckFilterTypes] = null;
    setFilteredValues(newFilteredValues);
    setResConf(undefined);
    if (isAgg && setAgg) setIsAgg(type != CheckFilterTypes.AGGREGATION);
  }

  function isDisabled(conf: MonitorTypeConf) {
    return conf.is_agg_shown != null && conf.is_agg_shown != isAgg;
  }

  useMemo(() => {
    if (checkInfo === undefined || (type === CheckTypeOptions.Class && !filteredValues?.scorer?.[0])) {
      setIsValidConfig(false);
    } else {
      setIsValidConfig(isAgg || !!filteredValues?.feature?.[0] || !!resConf);
    }
  }, [filteredValues?.feature?.[0], filteredValues?.scorer?.[0], resConf, isAgg, type, checkInfo]);

  return (
    <Stack>
      <ControlledMarkedSelect
        required
        error={error && !check}
        label="Check"
        values={checkSelectValues}
        value={check}
        setValue={id => {
          setCheck(id);
          const checkIndx = checkSelectValues.findIndex(val => val.value == id);
          if (checkIndx != -1) {
            setFilteredValues(unionCheckConf(checkSelectValues[checkIndx].params, undefined));
          } else {
            setFilteredValues(initFilteredValues({} as FilteredValues));
          }
        }}
        clearValue={() => {
          setFilteredValues(initFilteredValues({} as FilteredValues));
          setCheck('');
        }}
        disabled={disabled}
        size={size}
      />
      {check && !checkInfoDisabled && (
        <>
          {checkInfo?.check_conf?.map((conf, confIndex) => (
            <Subcategory key={confIndex}>
              <MarkedSelect
                label={`Select ${conf.type}`}
                value={isDisabled(conf) ? '' : getSelectedVal(conf)}
                onChange={e => updateFilteredValue(e.target.value as string, conf)}
                clearValue={() => clearFilteredValue(conf.type, true)}
                fullWidth
                disabled={(() => {
                  const isDisabledVal = isDisabled(conf);
                  if (filteredValues?.[conf.type as CheckFilterTypes]?.[0] && isDisabledVal) {
                    clearFilteredValue(conf.type);
                  }
                  return isDisabledVal;
                })()}
                required={!isDisabled(conf)}
                error={error && !isDisabled(conf) && !getSelectedVal(conf)}
                size={size}
              >
                {(conf.type as CheckFilterTypes) == CheckFilterTypes.AGGREGATION && (
                  <MenuItem value={PER_FEATURE}>Per feature</MenuItem>
                )}
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
                onChange={e => setResConf((e.target.value as string) || undefined)}
                clearValue={() => setResConf(undefined)}
                fullWidth
                disabled={(() => {
                  if (isAgg) {
                    setResConf(undefined);
                  }
                  return !!isAgg;
                })()}
                value={resConf || ''}
                required={!isAgg}
                error={error && !isAgg && !resConf}
                size={size}
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

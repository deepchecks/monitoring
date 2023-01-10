import React, { useMemo, useEffect, useState, memo } from 'react';

import {
  useGetChecksApiV1ModelsModelIdChecksGet,
  MonitorSchema,
  useGetCheckInfoApiV1ChecksCheckIdInfoGet
} from 'api/generated';

import { Stack, MenuItem } from '@mui/material';

import { ControlledMarkedSelect } from 'components/MarkedSelect/ControlledMarkedSelect';
import { MarkedSelect } from 'components/MarkedSelect';
import { Subcategory } from 'components/Subcategory';

import { SetStateType, SelectValues } from 'helpers/types';

interface SelectCheckProps {
  monitor: MonitorSchema | null;
  model: SelectValues;
  check: SelectValues;
  setCheck: SetStateType<SelectValues>;
  checkInfoFirstLevel: SelectValues;
  setCheckInfoFirstLevel: SetStateType<SelectValues>;
  checkInfoSecondLevel: SelectValues;
  setCheckInfoSecondLevel: SetStateType<SelectValues>;
  setIsResConf: SetStateType<boolean | undefined>;
  disabled: boolean;
}

export const SelectCheckComponent = ({
  monitor,
  model = 0,
  check,
  setCheck,
  checkInfoFirstLevel,
  setCheckInfoFirstLevel,
  checkInfoSecondLevel,
  setCheckInfoSecondLevel,
  setIsResConf,
  disabled
}: SelectCheckProps) => {
  const { data: checksList = [] } = useGetChecksApiV1ModelsModelIdChecksGet(model);
  const { data: checkInfo } = useGetCheckInfoApiV1ChecksCheckIdInfoGet(monitor && !!monitor.check.id ? monitor.check.id : check ? +check : 0);

  const checkSelectValues = useMemo(() => checksList.map(c => ({ label: c.name || '', value: c.id })), [checksList]);
  const firstLevelValues = useMemo(
    () => (checkInfo?.check_conf && checkInfo?.check_conf[0].values?.map(v => v.name)) || [],
    [checkInfo?.check_conf]
  );
  const secondLevelValues = useMemo(
    () =>
      (checkInfo?.res_conf
        ? checkInfo?.res_conf.values?.map(v => v.name)
        : checkInfo?.check_conf?.[1].values?.map(v => v.name)) || [],
    [checkInfo?.check_conf, checkInfo?.res_conf]
  );

  const [checkInfoDisabled, setCheckInfoDisabled] = useState(false);
  const [isAgg, setIsAgg] = useState(true);

  useEffect(() => {
    setCheckInfoFirstLevel(
      monitor?.additional_kwargs?.check_conf?.['aggregation method']?.[0] ||
        monitor?.additional_kwargs?.check_conf?.['scorer']?.[0] ||
        ''
    );
    setCheckInfoSecondLevel(
      monitor?.additional_kwargs?.res_conf?.[0] || monitor?.additional_kwargs?.check_conf?.['feature']?.[0] || ''
    );
  }, [setCheckInfoFirstLevel, setCheckInfoSecondLevel, monitor]);

  useEffect(() => {
    setCheckInfoDisabled(!checkInfo?.check_conf && !checkInfo?.res_conf);
    setIsResConf(!!checkInfo?.res_conf);
  }, [checkInfo, setIsResConf]);

  useEffect(() => {
    setIsAgg(!!checkInfo?.check_conf?.[0].values?.find(v => v.name === checkInfoFirstLevel)?.is_agg);
  }, [checkInfo?.check_conf, checkInfoFirstLevel]);

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
          <Subcategory>
            <MarkedSelect
              label={checkInfo?.check_conf?.[0].type}
              value={checkInfoFirstLevel}
              onChange={e => {
                setCheckInfoFirstLevel(e.target.value as string);
                setCheckInfoSecondLevel('');
              }}
              clearValue={() => {
                setCheckInfoFirstLevel('');
                setCheckInfoSecondLevel('');
              }}
              fullWidth
            >
              {firstLevelValues.map((value, index) => (
                <MenuItem key={value + index} value={value}>
                  {value}
                </MenuItem>
              ))}
            </MarkedSelect>
          </Subcategory>
          <Subcategory>
            <ControlledMarkedSelect
              label={checkInfo?.res_conf ? checkInfo?.res_conf.type : checkInfo?.check_conf?.[1].type}
              values={secondLevelValues}
              value={checkInfoSecondLevel}
              setValue={setCheckInfoSecondLevel}
              clearValue={() => setCheckInfoSecondLevel('')}
              fullWidth
              disabled={isAgg || !checkInfoFirstLevel}
            />
          </Subcategory>
        </>
      )}
    </Stack>
  );
};

export const SelectCheck = memo(SelectCheckComponent);

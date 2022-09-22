import React, { useEffect, useMemo, useState } from 'react';
import { MonitorTypeConf, MonitorValueConf } from 'api/generated';
import { MarkedSelect } from 'components/MarkedSelect';
import { MenuItem } from '@mui/material';

type isAggShownProps = boolean | undefined;

interface CheckInfoItemSchema {
  data: MonitorTypeConf;
  confType: string;
  isAggShown: isAggShownProps;
  handleOnChange: (confType: string, key: string, item?: MonitorValueConf) => void;
  initValue: any;
  setIsAggShown: (flag: boolean) => void;
}

export const CheckInfoItem = ({
  data,
  confType,
  isAggShown,
  handleOnChange,
  initValue,
  setIsAggShown
}: CheckInfoItemSchema) => {
  const [selectedValue, setSelectedValue] = useState('');

  useEffect(() => {
    if (initValue && initValue[0]) {
      const initObject = data.values?.find(currentItem => currentItem.name === initValue[0]);

      if (initObject?.is_agg === false) {
        setIsAggShown(false);
      }
      setTimeout(() => {
        setSelectedValue(initValue[0]);
      }, 100);
    }
    return () => {
      setSelectedValue('');
    };
  }, []);

  const isDisabled = useMemo(
    () => (data.is_agg_shown !== null && data.is_agg_shown !== isAggShown) || data.values === null,
    [isAggShown]
  );

  useEffect(() => {
    if (!isDisabled) return;
    setSelectedValue('');
  }, [isDisabled]);

  const handleSelectedItem = (item?: MonitorValueConf) => {
    if (!item) {
      setSelectedValue('');
      handleOnChange(confType, data.type, undefined);
    }
    else {
      const dataType = data.type;
      setSelectedValue(item.name);
      handleOnChange(confType, dataType, item);
    }
  };

  return (
    <MarkedSelect label={data.type as string} value={selectedValue} size="small" clearValue={() => {handleSelectedItem(undefined)}} fullWidth disabled={isDisabled}>
      {data.values?.map((item, index) => (
        <MenuItem key={item.name + index} value={item.name} onClick={() => handleSelectedItem(item)}>
          {item.name}
        </MenuItem>
      ))}
    </MarkedSelect>
  );
};

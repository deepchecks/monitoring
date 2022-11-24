import React, { useEffect, useState } from 'react';
import { MonitorCheckConfSchema, MonitorTypeConf, MonitorValueConf } from 'api/generated';

import { Box } from '@mui/material';

import { Subcategory } from './Subcategory';
import { CheckInfoItem } from './CheckInfoItem';

import { isAggShownProps, CheckInfoSchema } from './MonitorDrawer.types';

export const CheckInfo = ({ checkInfo, setFieldValue, initialCheckInfoValues }: CheckInfoSchema) => {
  const [isAggShown, setIsAggShown] = useState<isAggShownProps>(undefined);
  const [checkInfoData, setCheckInfoData] = useState<MonitorCheckConfSchema>();

  const confsToRender = Object.entries(checkInfo);
  const initValuesToRender = initialCheckInfoValues && Object.values(initialCheckInfoValues);

  const shouldRenderInitValues = confsToRender?.length === initValuesToRender?.length;

  useEffect(() => {
    if (initialCheckInfoValues) {
      setCheckInfoData(initialCheckInfoValues);
    } else {
      setCheckInfoData({ check_conf: {} });
    }
  }, [checkInfo, initialCheckInfoValues]);

  useEffect(() => {
    setFieldValue('additional_kwargs', checkInfoData, false);
  }, [checkInfoData, setFieldValue]);

  const handleOnChange = React.useCallback(
    (confType: string, dataType: string, item?: MonitorValueConf) => {
      let objectToUpdate: any = JSON.parse(JSON.stringify(checkInfoData || {}));
      let didAggShowChange = false;
      let changedItem;

      if (!item) {
        changedItem = {
          name: null,
          is_agg: undefined
        };
      } else {
        changedItem = item;
      }

      if (confType === 'res_conf') {
        objectToUpdate[confType] = changedItem.name ? [changedItem.name] : null;
      } else {
        if (!objectToUpdate[confType]) {
          objectToUpdate[confType] = { [dataType]: [changedItem.name] };
        } else {
          changedItem.name
            ? (objectToUpdate[confType][dataType] = [changedItem.name])
            : delete objectToUpdate[confType][dataType];
        }

        if (changedItem.is_agg !== null) {
          didAggShowChange = true;
          setIsAggShown(changedItem.is_agg);
        }
      }

      if (didAggShowChange && changedItem.is_agg === true) {
        objectToUpdate = { check_conf: { [dataType]: changedItem.name ? [changedItem.name ]: undefined } };
      }

      setCheckInfoData(objectToUpdate);
    },
    [checkInfoData]
  );

  return (
    <Box
      sx={{
        marginTop: '0px !important'
      }}
    >
      {confsToRender.map(([key, val], index) => {
        if (!val && val !== 0) return;

        return Array.isArray(val) ? (
          val.map((checkItem: MonitorTypeConf, j: number) => (
            <Subcategory key={'check-info-item' + index + j}>
              <CheckInfoItem
                confType={key}
                data={checkItem}
                handleOnChange={handleOnChange}
                isAggShown={isAggShown}
                initValue={shouldRenderInitValues ? initValuesToRender[index]?.[checkItem.type] || '' : ''}
                setIsAggShown={setIsAggShown}
              />
            </Subcategory>
          ))
        ) : (
          <Subcategory key={'check-info-item' + index}>
            <CheckInfoItem
              confType={key}
              data={val}
              handleOnChange={handleOnChange}
              isAggShown={isAggShown}
              initValue={
                shouldRenderInitValues
                  ? initValuesToRender[index]?.[val.type]
                    ? initValuesToRender[index]?.[val.type]
                    : initValuesToRender[index]
                  : ''
              }
              setIsAggShown={setIsAggShown}
            />
          </Subcategory>
        );
      })}
    </Box>
  );
};

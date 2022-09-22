import React, { useEffect, useState } from 'react';
import { MonitorCheckConf, MonitorCheckConfSchema, MonitorTypeConf, MonitorValueConf } from 'api/generated';
import { Subcategory } from './Subcategory';
import { Box } from '@mui/material';
import { CheckInfoItem } from './CheckInfoItem';

type isAggShownProps = boolean | undefined;

interface CheckInfoSchema {
  checkInfo: MonitorCheckConf;
  setFieldValue: (fieldName: string, fieldValue: any, shouldValidate: boolean) => void;
  initialCheckInfoValues?: MonitorCheckConfSchema;
}

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
  }, [checkInfo]);

  useEffect(() => {
    setFieldValue('additional_kwargs', checkInfoData, false);
  }, [checkInfoData]);

  const handleOnChange = (confType: string, dataType: string, item?: MonitorValueConf) => {
    let objectToUpdate: any = { ...checkInfoData };
    let didAggShowChange = false;
    let changedItem;
    if (!item){
      changedItem = {
        name: null,
        is_agg: undefined
      };
    }
    else {
      changedItem = item;
    }
    if (confType === 'res_conf') {
      objectToUpdate[confType] = [changedItem.name];
    } else {
      if (!objectToUpdate[confType]) {
        objectToUpdate[confType] = { [dataType]: [changedItem.name] };
      } else {
        objectToUpdate[confType][dataType] = [changedItem.name];
      }

      if (changedItem.is_agg !== null) {
        didAggShowChange = true;
        setIsAggShown(changedItem.is_agg);
      }
    }

    if (didAggShowChange && changedItem.is_agg === true) {
      objectToUpdate = { check_conf: { [dataType]: [changedItem.name] } };
    }
    
    console.log(objectToUpdate);

    setCheckInfoData(objectToUpdate);
  };

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
                initValue={shouldRenderInitValues ? initValuesToRender[index][checkItem.type] : ''}
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
              initValue={shouldRenderInitValues ? initValuesToRender[index][val.type] : ''}
              setIsAggShown={setIsAggShown}
            />
          </Subcategory>
        );
      })}
    </Box>
  );
};

import { CheckSchema, MonitorCheckConf, MonitorCheckConfSchema } from 'api/generated';
import { CheckType, CheckTypeOptions } from './types/check';
import { ReverseTypeMap } from 'components/AnalysisItem/AnalysisItem.types';

export const onDrawerOpen = (
  datasetName: string,
  versionName: string,
  timeLabel: number,
  additionalKwargs: MonitorCheckConfSchema | undefined,
  checkInfo: MonitorCheckConf | undefined,
  check: CheckSchema,
  setIsGroupByOpen: (arg: boolean) => void,
  setCurrentType: (arg: CheckType) => void,
  setCurrentAdditionalKwargs: (arg: MonitorCheckConfSchema | null) => void,
  setCurrentDatasetName: (arg: string | null) => void,
  setCurrentModelVersionId: (arg: number | null) => void,
  setCurrentTimeLabel: (arg: number | null) => void,
  setCurrentCheck: (arg: CheckSchema | null) => void,
  currentModel: any
) => {
  function fixDict(obj: any, allowedKeys: any) {
    const keyValues = Object.keys(obj).map(key => {
      if (Object.values(allowedKeys).includes(key))
        return { [key]: typeof obj[key] == 'string' ? [obj[key]] : obj[key] };
      return {};
    });
    return Object.assign({}, ...keyValues);
  }

  function renameKeys(obj: any, newKeys: any) {
    const keyValues = Object.keys(obj).map(key => {
      const newKey = newKeys?.[key] || key;
      return { [newKey]: obj[key] };
    });
    return Object.assign({}, ...keyValues);
  }
  const checkMegaConf = fixDict(
    { ...renameKeys({ ...check.config.params }, ReverseTypeMap), ...additionalKwargs?.check_conf },
    ReverseTypeMap
  );
  if (checkMegaConf) {
    // if the info doesn't contains a selection of features there is no specific check type
    const type = checkInfo?.res_conf
      ? CheckTypeOptions.Class
      : checkInfo?.check_conf?.filter(val => val.type == 'feature').length
      ? CheckTypeOptions.Feature
      : null;
    setCurrentType(type);

    if (
      (type === CheckTypeOptions.Feature && !checkMegaConf['aggregation method']) ||
      ['none', null].includes(checkMegaConf['aggregation method']?.[0])
    ) {
      setCurrentAdditionalKwargs({
        // Filter only the feature that was clicked on
        check_conf: { ...checkMegaConf, feature: [datasetName] },
        res_conf: additionalKwargs?.res_conf
      });
    } else if (type === CheckTypeOptions.Class && additionalKwargs?.check_conf?.scorer != undefined) {
      let class_name = undefined;
      for (let i = 0; i < checkMegaConf?.scorer?.length || 0; i++) {
        if (datasetName.startsWith(checkMegaConf.scorer[i])) {
          class_name = datasetName.replace(checkMegaConf.scorer[i], '').trim();
          if (class_name != datasetName) break;
        }
      }

      setCurrentAdditionalKwargs({
        check_conf: checkMegaConf,
        // Filter only the class that was clicked on
        res_conf: class_name ? [class_name] : undefined
      });
    } else {
      setCurrentAdditionalKwargs({ check_conf: checkMegaConf });
    }
  }

  setCurrentCheck(check);

  if (versionName) {
    const modelVersionId = currentModel.versions.find((v: { name: string }) => v.name === versionName)?.id;

    if (modelVersionId) {
      setCurrentDatasetName(datasetName);
      setCurrentModelVersionId(modelVersionId);
      setCurrentTimeLabel(timeLabel);
    }

    setIsGroupByOpen(true);
  }
};

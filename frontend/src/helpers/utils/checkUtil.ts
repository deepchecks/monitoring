import { CheckConfigSchemaParams, MonitorCheckConfSchemaCheckConf } from "api/generated";

export enum CheckFilterTypes {
  AGGREGATION = 'aggregation method',
  FEATURE = 'feature',
  SCORER = 'scorer'
}

export type FilteredValues = Record<CheckFilterTypes, string[] | null | undefined>;

export const TypeMap = {
  [CheckFilterTypes.AGGREGATION]: 'aggregation_method',
  [CheckFilterTypes.FEATURE]: 'features',
  [CheckFilterTypes.SCORER]: 'scorers'
};

const ReverseTypeMap = {
  aggregation_method: CheckFilterTypes.AGGREGATION,
  features: CheckFilterTypes.FEATURE,
  scorers: CheckFilterTypes.SCORER
};

function renameKeys(obj: { [param: string]: unknown }, newKeys: { [param: string]: unknown }) {
  const keyValues = Object.keys(obj).map(key => {
    const newKey = (newKeys?.[key] || key) as string;
    return { [newKey]: obj[key] };
  });
  return Object.assign({}, ...keyValues);
}

function fixDict(obj: { [param: string]: unknown }, allowedKeys: { [param: string]: unknown }) {
  const keyValues = Object.keys(obj).map(key => {
    if (Object.values(allowedKeys).includes(key)) {
      if (obj[key])
        return { [key]: typeof obj[key] == 'string' ? [obj[key]] : Object.values(obj[key] as { [param: string]: unknown | string[] }) };
      if (obj[key] === null)
        return { [key]: null }
    }
    return {};
  });
  return Object.assign({}, ...keyValues);
}

export function unionCheckConf(checkParams: CheckConfigSchemaParams | undefined, checkConf: MonitorCheckConfSchemaCheckConf | undefined) {
  return fixDict(
    { ...renameKeys({ ...checkParams }, ReverseTypeMap), ...checkConf },
    ReverseTypeMap
  );
}
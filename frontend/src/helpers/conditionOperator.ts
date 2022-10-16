export const OperatorsEnumMap = {
  greater_than_equals: '>=',
  greater_than: '>',
  less_than_equals: '<=>',
  less_than: '<',
  contains: 'contains',
  equals: '==',
  not_equals: '!='
} as const;

export enum OperatorsMap {
  greater_than_equals = 'greater_than_equals',
  greater_than = 'greater_than',
  less_than_equals = 'less_than_equals',
  less_than = 'less_than',
  contains = 'contains',
  equals = 'equals',
  not_equals = 'not_equals'
}

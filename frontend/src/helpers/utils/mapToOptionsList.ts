import { sentenceCase } from 'change-case';

const mapToOptionsList = (map: Record<string, string>, valuesToFilter?: string[] | undefined) =>
  Object.entries(map)
    .filter(([label]) => !valuesToFilter || !valuesToFilter.includes(label))
    .map(([label, value]) => ({
      label: sentenceCase(label),
      value
    }));

export default mapToOptionsList;

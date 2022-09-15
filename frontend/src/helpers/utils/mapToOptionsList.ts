import { sentenceCase } from 'change-case';

const mapToOptionsList = (map: Record<string, string>) =>
  Object.entries(map).map(([label, value]) => ({
    label: sentenceCase(label),
    value
  }));

export default mapToOptionsList;

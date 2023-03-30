import { IDataset } from '../AnalysisItem.types';

interface IScore {
  id: string;
  score: number;
}

export const showDatasets = (dataSets: IDataset[], dataSetsToShow: number, ascending = true) => {
  const scores: IScore[] = [];

  dataSets.forEach(dataSet => {
    const score =
      dataSet.data.reduce(
        (acc, val) => Math.abs(typeof acc === 'number' ? acc : 0) + Math.abs(typeof val === 'number' ? val : 0)
      ) || 0;

    scores.push({ id: dataSet.id, score });
  });

  const sortedDatasets = ascending
    ? [...scores].sort((a, b) => b.score - a.score)
    : [...scores].sort((a, b) => a.score - b.score);

  const filteredDatasets = sortedDatasets.filter(
    (value, index, self) => index === self.findIndex(s => s.id === value.id)
  );

  const datasetsToShow = filteredDatasets.slice(0, dataSetsToShow);

  const result = dataSets.map(data => {
    const dataSet = data;

    if (!datasetsToShow.find(d => d.id === dataSet.id)) dataSet.hidden = true;

    return dataSet;
  });

  return result;
};

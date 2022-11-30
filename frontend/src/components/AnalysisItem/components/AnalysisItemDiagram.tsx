import React from 'react';
import { ChartData } from 'chart.js';

import DiagramLine from 'components/DiagramLine/DiagramLine';

import { GraphData } from 'helpers/types';

interface AnalysisItemDiagramProps {
  isLoading: boolean;
  data: ChartData<'line', GraphData, unknown>;
  comparison: boolean;
  handlePointCLick: (datasetName: string, versionName: string, timeLabel: number) => void;
}

const AnalysisItemDiagram = ({ isLoading, data, comparison, handlePointCLick }: AnalysisItemDiagramProps) => (
  <DiagramLine
    data={data}
    height={420}
    isLoading={isLoading}
    analysis
    comparison={comparison}
    handlePointCLick={handlePointCLick}
  />
);

export default AnalysisItemDiagram;

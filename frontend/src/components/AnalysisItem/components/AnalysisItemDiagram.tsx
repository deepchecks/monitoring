import React from 'react';
import { ChartData } from 'chart.js';

import DiagramLine from 'components/DiagramLine/DiagramLine';

import { GraphData } from 'helpers/types';

interface AnalysisItemDiagramProps {
  isLoading: boolean;
  data: ChartData<'line', GraphData, unknown>;
  comparison: boolean;
}

const AnalysisItemDiagram = ({ isLoading, data, comparison }: AnalysisItemDiagramProps) => (
  <DiagramLine data={data} height={420} isLoading={isLoading} analysis comparison={comparison} />
);

export default AnalysisItemDiagram;

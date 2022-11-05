import React from 'react';
import { ChartData } from 'chart.js';

import DiagramLine from 'components/DiagramLine';

import { GraphData } from 'helpers/types';

interface AnalysisItemDiagramProps {
  isLoading: boolean;
  data: ChartData<'line', GraphData, unknown>;
}

const AnalysisItemDiagram = ({ isLoading, data }: AnalysisItemDiagramProps) => (
  <DiagramLine data={data} height={440} isLoading={isLoading} analysis />
);

export default AnalysisItemDiagram;

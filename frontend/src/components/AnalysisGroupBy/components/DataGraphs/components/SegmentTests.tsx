import React from 'react';
import Plot, { PlotParams } from 'react-plotly.js';

import { GraphLayout } from './GraphLayout';

interface SegmentTestsProps {
  activeBarName: string;
  checkName: string;
  plots: PlotParams[];
}

export const SegmentTests = ({ activeBarName, checkName, plots }: SegmentTestsProps) => (
  <GraphLayout title={`${activeBarName} of ${checkName}`}>
    {plots.map((p, index) => (
      <Plot key={index} data={p.data} layout={{ ...p.layout, height: 515, width: 930 }} />
    ))}
  </GraphLayout>
);

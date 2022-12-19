import React from 'react';
import Plot, { PlotParams } from 'react-plotly.js';

import { GraphLayout } from './GraphLayout';
import { NoGraphDataToShow } from './NoGraphDataToShow';

interface SegmentTestsProps {
  activeBarName: string;
  checkName: string | undefined;
  plots: PlotParams[];
}

const PLOT_HEIGHT = 515;
const PLOT_WIDTH = 950;

export const SegmentTests = ({ activeBarName, checkName, plots }: SegmentTestsProps) =>
  plots.length && checkName ? (
    <GraphLayout title={`${activeBarName} of ${checkName}`} marginBottom="20px">
      {plots.map((p, index) => (
        <Plot key={index} data={p.data} layout={{ ...p.layout, height: PLOT_HEIGHT, width: PLOT_WIDTH }} />
      ))}
    </GraphLayout>
  ) : (
    <NoGraphDataToShow />
  );

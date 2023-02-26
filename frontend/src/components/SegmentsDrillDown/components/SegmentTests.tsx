import React from 'react';
import Plot, { PlotParams } from 'react-plotly.js';

import { GraphLayout } from './GraphLayout';
import { NoGraphDataToShow } from './NoGraphDataToShow';

interface SegmentTestsProps {
  title?: string;
  plots: Array<Record<string, string>>;
}

const PLOT_HEIGHT = 515;

export const SegmentTests = ({ title, plots }: SegmentTestsProps) =>

  plots.length && title ? (
    <GraphLayout title={title} marginBottom="20px">
      {plots.filter(item => item['type'] === 'plotly').map(item => JSON.parse(item['data'])).map((p, index) => (
        <Plot
          key={index}
          data={p.data}
          layout={{ ...p.layout }}
          style={{ height: PLOT_HEIGHT, width: '100%' }}
          useResizeHandler={true}
          config={{ displayModeBar: false }}
        />
      ))}
    </GraphLayout>
  ) : (
    <NoGraphDataToShow />
  );

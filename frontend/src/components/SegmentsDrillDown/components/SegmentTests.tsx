import React from 'react';
import Plot from 'react-plotly.js';

import { GraphLayout } from './GraphLayout';
import { NoGraphDataToShow } from './NoGraphDataToShow';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

interface SegmentTestsProps {
  title?: string;
  plots: Array<Record<string, string>>;
}

const PLOT_HEIGHT = 515;

export const SegmentTests = ({ title, plots }: SegmentTestsProps) => {
  const parsedPlots = plots.map(p => ({ type: p['type'], data: JSON.parse(p['data']) }));

  return parsedPlots.length && title ? (
    <GraphLayout title={title} marginBottom="20px">
      {parsedPlots.map((p, index) => {
        switch (p['type']) {
          case 'plotly':
            return (
              <Plot
                key={index}
                data={p.data.data}
                layout={p.data.layout}
                style={{ height: PLOT_HEIGHT, width: '100%' }}
                useResizeHandler={true}
                config={{ displayModeBar: false }}
              />
            );
          case 'table':
            return (
              <TableContainer component={Paper} style={{ width: '100%' }} key={index}>
                <Table aria-label="simple table">
                  <TableHead>
                    <TableRow>
                      {p.data.schema.fields.map((c: Record<string, any>, index: number) => (
                        <TableCell key={'header-' + index}>{c.name}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {p.data.data.map((row: Array<any>, rowIndex: number) => (
                      <TableRow key={'row-' + rowIndex}>
                        {p.data.schema.fields.map((c: Record<string, any>, colIndex: number) => (
                          <TableCell key={'row-' + colIndex + '-' + rowIndex}>{row[c.name]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          default:
            return <></>;
        }
      })}
    </GraphLayout>
  ) : (
    <NoGraphDataToShow />
  );
};

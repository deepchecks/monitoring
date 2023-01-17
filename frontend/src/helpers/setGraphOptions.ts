import { alpha } from '@mui/material';
import { colors as pointColor } from '../theme/colors';

export const PREVIOUS_PERIOD = '|previous_period';

export const graphColors = [
  '#0044FF',
  '#C9AA99',
  '#4BCED7',
  '#AD7ACD',
  '#B9D8E2',
  '#735240',
  '#7ABFFF',
  '#64A6CB',
  '#4800FF',
  '#BA8EAE',
  '#6099C2',
  '#66E0FF',
  '#0088FF',
  '#2F6CA2',
  '#668FFF'
];

const setLabel = (dashed: boolean, label: string) => (dashed ? label + PREVIOUS_PERIOD : label);
const setBorderDash = (dashed: boolean) => (dashed ? [10, 5] : []);

export const setLineGraphOptions = (label: string, index: number, dashed = false) => ({
  id: label,
  label: setLabel(dashed, label),
  borderColor: graphColors[index % graphColors.length],
  pointBorderColor: '#fff',
  pointBackgroundColor: graphColors[index],
  pointHoverBackgroundColor: '#fff',
  pointHoverBorderColor: pointColor.primary.violet[400],
  hidden: false,
  borderDash: setBorderDash(dashed)
});

export const setBarGraphOptions = (label: string, index: number, dashed = false) => ({
  id: label,
  label: setLabel(dashed, label),
  backgroundColor: alpha(graphColors[index], 0.5),
  borderColor: graphColors[index],
  barPercentage: 0.3,
  borderDash: setBorderDash(dashed)
});

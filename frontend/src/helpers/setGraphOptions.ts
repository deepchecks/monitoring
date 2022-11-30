import { alpha } from '@mui/material';
import { colors as pointColor } from '../theme/colors';

export const PREVIOUS_PERIOD = '|previous_period';

export const graphColors = [
  '#36A2EB',
  '#FF6384',
  '#4BC0C0',
  '#FF9F40',
  '#9966FF',
  '#FFCD56',
  '#C9CBCF',
  '#01A9DB',
  '#A57DBD',
  '#B9D8E2',
  '#0044FF',
  '#BAA9A0',
  '#00CCFF',
  '#6099C2',
  '#0088FF',
  '#66E0FF',
  '#2F6CA2',
  '#668FFF',
  '#4800FF',
  '#0065FF',
  '#0DDFEC',
  '#64A6CB',
  '#7ABFFF'
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

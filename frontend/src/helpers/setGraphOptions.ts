import { alpha } from '@mui/material';
import { colors as pointColor } from '../theme/colors';

export const graphColors = [
  '#01A9DB',
  '#A57DBD',
  '#B9D8E2',
  '#64A6CB',
  '#7ABFFF',
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
  '#0DDFEC'
];

export const setLineGraphOptions = (label: string, index: number) => ({
  label,
  borderColor: graphColors[(index % graphColors.length)],
  pointBorderColor: '#fff',
  pointBackgroundColor: graphColors[index],
  pointHoverBackgroundColor: 'rgb(255, 255, 255)',
  pointHoverBorderColor: pointColor.primary.violet[400],
  hidden: false
});

export const setBarGraphOptions = (label: string, index: number) => ({
  label,
  backgroundColor: alpha(graphColors[index], 0.5),
  borderColor: graphColors[index],
  barPercentage: 0.3
});

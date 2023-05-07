import { AlertSchema } from 'api/generated';
import { alpha } from '@mui/material';
import { theme } from 'components/lib/theme';

export const PREVIOUS_PERIOD = '|previous_period';

const GRAPH_COLORS = [
  '#9D60FB',
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
const ALERT_COLOR = theme.palette.error.main;

const setLabel = (dashed: boolean, label: string) => (dashed ? label + PREVIOUS_PERIOD : label);
const setBorderDash = (dashed: boolean) => (dashed ? [10, 5] : []);

const buildPointPropertiesArray = (
  label: string,
  alerts: AlertSchema[] | undefined,
  timeLabels: number[] | undefined,
  defaultColor: string
) => {
  const pointColors: string[] = [];
  const pointRadiuses: number[] = [];

  if (alerts && timeLabels) {
    const datasetLabel = label?.split('|');

    timeLabels.forEach(timeLabel => {
      const currentAlert = alerts.find(alert => new Date(alert.end_time).getTime() === timeLabel);

      if (Object.keys(currentAlert?.failed_values[datasetLabel[1]] || {}).includes(datasetLabel[0])) {
        pointColors.push(ALERT_COLOR);
        pointRadiuses.push(4);
      } else {
        pointColors.push(defaultColor);
        pointRadiuses.push(3);
      }
    });
  }

  return { pointColors, pointRadiuses };
};

export const setLineGraphOptions = (
  label: string,
  index: number,
  dashed = false,
  alerts?: AlertSchema[],
  timeLabels?: number[]
) => {
  const defaultColor = GRAPH_COLORS[index];
  const { pointColors, pointRadiuses } = buildPointPropertiesArray(label, alerts, timeLabels, defaultColor);

  return {
    id: label,
    label: setLabel(dashed, label),
    pointBorderWidth: alerts && timeLabels ? 1 : 0,
    borderColor: GRAPH_COLORS[index % GRAPH_COLORS.length],
    pointBorderColor: '#fff',
    pointBackgroundColor: pointColors.length ? pointColors : defaultColor,
    pointHoverBackgroundColor: '#fff',
    pointRadius: pointRadiuses.length ? pointRadiuses : 2,
    pointHoverBorderColor: theme.palette.primary.main,
    hidden: false,
    borderDash: setBorderDash(dashed)
  };
};

export const setBarGraphOptions = (label: string, index: number, dashed = false) => ({
  id: label,
  label: setLabel(dashed, label),
  backgroundColor: alpha(GRAPH_COLORS[index], 0.5),
  borderColor: GRAPH_COLORS[index],
  barPercentage: 0.3,
  borderDash: setBorderDash(dashed)
});

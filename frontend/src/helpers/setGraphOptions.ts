import { Condition } from 'api/generated';
import { alpha } from '@mui/material';
import { OperatorsEnumMap } from './conditionOperator';
import { colors } from '../theme/colors';

export const PREVIOUS_PERIOD = '|previous_period';

export const GRAPH_COLORS = [
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

const ALERT_COLOR = colors.semantic.red;

const setLabel = (dashed: boolean, label: string) => (dashed ? label + PREVIOUS_PERIOD : label);

const setBorderDash = (dashed: boolean) => (dashed ? [10, 5] : []);

const buildPointsPropertiesArray = (
  data: (number | null)[] | undefined,
  condition: Condition | undefined,
  defaultColor: string
) => {
  const pointColors: string[] = [];
  const pointRadiuses: number[] = [];

  if (condition && data) {
    data.forEach(value => {
      if (value && eval(`${value} ${OperatorsEnumMap[condition.operator]} ${condition.value}`)) {
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
  condition?: Condition | undefined,
  data?: (number | null)[]
) => {
  const defaultColor = GRAPH_COLORS[index];
  const { pointColors, pointRadiuses } = buildPointsPropertiesArray(data, condition, defaultColor);

  return {
    id: label,
    label: setLabel(dashed, label),
    pointBorderWidth: condition && data ? 1 : 0,
    borderColor: GRAPH_COLORS[index % GRAPH_COLORS.length],
    pointBorderColor: '#fff',
    pointBackgroundColor: pointColors.length ? pointColors : defaultColor,
    pointHoverBackgroundColor: '#fff',
    pointRadius: pointRadiuses.length ? pointRadiuses : 2,
    pointHoverBorderColor: colors.primary.violet[400],
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

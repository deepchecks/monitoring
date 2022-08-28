import { colors as pointColor } from "./theme/colors";

export const graphColors = [
  "#00F0FF",
  "#B9D8E2",
  "#64A6CB",
  "#7ABFFF",
  "#BAA9A0",
  "#00CCFF",
  "#6099C2",
  "#66E0FF",
  "#0088FF",
  "#2F6CA2",
  "#0044FF",
  "#668FFF",
  "#4800FF",
  "#AB90EF",
  "#0065FF",
];

export const setGraphOptions = (label: string, index: number) => ({
  label,
  borderColor: graphColors[index],
  pointBorderColor: "rgba(0, 0, 0, 0)",
  pointBackgroundColor: "rgba(0, 0, 0, 0)",
  pointHoverBackgroundColor: "rgb(255, 255, 255)",
  pointHoverBorderColor: pointColor.primary.violet[400],
  hidden: false,
});

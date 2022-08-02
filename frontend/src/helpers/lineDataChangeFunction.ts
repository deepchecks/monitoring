interface Output {
  [key: string]: string[] | any[];
}

const output: Output = {
  "1": [
    { f1: 0.7, p: 0.5, r2: 5 },
    { f1: 0.8, p: 0.2, r2: 7 },
    null,
    { f1: 0.7, p: 0.3, r2: 6 },
  ],
  "2": [
    { f1: 1, p: 3, r2: 1 },
    { f1: 0.5, p: 4, r2: 7 },
    null,
    { f1: 0.4, p: 2, r2: 2 },
  ],
  "3": [
    { f1: 0.4, p: 1, r2: 2 },
    { f1: 0.8, p: 3, r2: 5 },
    null,
    { f1: 0.9, p: 1, r2: 2 },
  ],
  time_labels: [
    "2022-07-17T17:00:00+03:00",
    "2022-07-18T18:00:00+03:00",
    "2022-07-19T19:00:00+03:00",
    "2022-07-20T20:00:00+03:00",
  ],
};

const months: string[] = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const colors: string[] = [
  "#0B76B7",
  "#01A9DB",
  "#77D1F3",
  "#2750AE",
  "#1283DA",
  "#2D7FF9",
  "#9CC7FF",
  "#6B1CB0",
  "#7C39ED",
  "#CDB0FF",
  "#B2158B",
  "#FF08C2",
  "#E929BA",
  "#F99DE2",
  "#F82B60",
  "#BA1E45",
  "#EF3061",
  "#FF9EB7",
  "#D74D26",
  "#F7653B",
  "#FF6F2C",
  "#E08D00",
  "#FCB400",
];

export const gradientColors: string[][] = [
  ["rgba(11, 118, 183, 0)", "rgba(11, 118, 183, 0.1)"],
  ["rgba(1, 169, 219, 0)", "rgba(1, 169, 219, 0.1)"],
  ["rgba(119, 209, 243, 0)", "rgba(119, 209, 243, 0.1)"],
  ["rgba(39, 80, 174, 0)", "rgba(39, 80, 174, 0.1)"],
  ["rgba(18, 131, 218, 0)", "rgba(18, 131, 218, 0.1)"],
  ["rgba(45, 127, 249, 0)", "rgba(45, 127, 249, 0.1)"],
  ["rgba(156, 199, 255, 0)", "rgba(156, 199, 255,0.1)"],
  ["rgba(107, 28, 176, 0)", "rgba(107, 28, 176, 0.1)"],
  ["rgba(124, 57, 237, 0)", "rgba(124, 57, 237, 0.1)"],
  ["rgba(205, 176, 255, 0)", "rgba(205, 176, 255, 0.1)"],
  ["rgba(178, 21, 139, 0)", "rgba(178, 21, 139, 0.1)"],
  ["rgba(255, 8, 194, 0)", "rgba(255, 8, 194, 0.1)"],
  ["rgba(233, 41, 186, 0)", "rgba(233, 41, 186, 0.1)"],
  ["rgba(249, 157, 226, 0)", "rgba(249, 157, 226, 0.1)"],
  ["rgba(248, 43, 96, 0)", "rgba(248, 43, 96,0.1)"],
  ["rgba(186, 30, 69, 0)", "rgba(186, 30, 69, 0.1)"],
  ["rgba(239, 48, 97, 0)", "rgba(239, 48, 97, 0.1)"],
  ["rgba(255, 158, 183, 0)", "rgba(255, 158, 183, 0.1)"],
  ["rgba(215, 77, 38, 0)", "rgba(215, 77, 38, 0.1)"],
  ["rgba(247, 101, 59, 0)", "rgba(247, 101, 59, 0.1)"],
  ["rgba(255, 111, 44, 0)", "rgba(255, 111, 44, 0.1)"],
  ["rgba(224, 141, 0, 0)", "rgba(224, 141, 0, 0.1)"],
  ["rgba(252, 180, 0, 0)", "rgba(252, 180, 0, 0.1)"],
];
type PerCentValue = number[] | any[];
interface BearValue {
  [key: string | number]: number[];
}
export const lineDataChangeFunction = () => {
  const label: string[] = [];
  const bearValue: BearValue[] = [];
  const perCentValue: PerCentValue[] = [];
  if (Array.isArray(output.time_labels)) {
    output.time_labels.forEach((element: string | any) => {
      const deta = new Date(element);
      label.push(`${months[deta.getMonth()]} ${deta.getDay()}`);
    });
  }
  Object.keys(output).forEach((key) => {
    if (key !== "time_labels") {
      const initialobj: any = {};
      for (let i = 0; i < output[key].length; i += 1) {
        if (output[key][i] === null) {
          Object.keys(initialobj).forEach((item) => {
            initialobj[item].push(
              initialobj[item][initialobj[item].length - 1]
            );
          });
        } else {
          Object.keys(output[key][i]).forEach((item) => {
            if (initialobj[item]) {
              initialobj[item].push(output[key][i][item]);
            } else {
              initialobj[item] = [output[key][i][item]];
            }
          });
        }
      }
      bearValue.push(initialobj);
    }
  });
  bearValue.forEach((element: object) => {
    Object.values(element).forEach((el) => {
      perCentValue.push(el);
    });
  });
  return {
    labels: label,
    datasets: perCentValue.map((el, i) => ({
      label: `${i}`,
      data: el,
      fill: true,
      tension: 0.25,
      pointBorderWidth: 0,
      borderColor: colors[i],
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    })),
  };
};

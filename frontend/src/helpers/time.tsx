export const timeValues = {
  hour: 60 * 60,
  day: 60 * 60 * 24,
  week: 60 * 60 * 24 * 7,
  mouth: 60 * 60 * 24 * 30,
  threeMouths: 60 * 60 * 24 * 30 * 3
};

export const timeMap = {
  day: timeValues.day * 1000,
  week: timeValues.week * 1000,
  month: timeValues.mouth * 1000
};

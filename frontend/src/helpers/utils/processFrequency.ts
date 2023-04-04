const processFrequency = (dayjsDurationInstance: any) => {
  // This function gets dayjs.duration instance with alertRule.repeat_every & 'seconds' as parameters
  // feel free to add more use cases!
  let res;

  if (dayjsDurationInstance['$d'].hours) {
    res = 'Hourly';
  }

  if (dayjsDurationInstance['$d'].days) {
    switch (dayjsDurationInstance['$d'].days) {
      case 1:
        res = 'Daily';
        break;
      case 7:
        res = 'Weekly';
        break;
      default:
        break;
    }
  }

  if (dayjsDurationInstance['$d'].months) {
    switch (dayjsDurationInstance['$d'].months) {
      case 1:
        res = 'Monthly';
        break;
      case 3:
        res = 'Quarterly';
        break;
      default:
        break;
    }
  }

  return res ? res : dayjsDurationInstance.humanize();
};

export default processFrequency;

import { useContext, useEffect, useState } from 'react';
import dayjs from 'dayjs';

import { AnalysisContext } from 'context/analysis-context';

import { DateRange } from './DateRange/DateRange';

interface ExpandableSelectionProps {
  endTime: number | undefined;
}

interface DateRangeData {
  startTime?: Date;
  endTime?: Date;
}

export function ExpandableSelection({ endTime: modelEndTime }: ExpandableSelectionProps) {
  const { setPeriod } = useContext(AnalysisContext);
  const [range, setDateRange] = useState<DateRangeData>({
    endTime: new Date(),
    startTime: dayjs(new Date()).subtract(1, 'month').toDate()
  });
  

  useEffect(() => {
    const dateEndTime = modelEndTime ? dayjs.unix(modelEndTime).toDate() : new Date()
    setDateRange({
      endTime: dateEndTime,
      startTime: dayjs(dateEndTime).subtract(1, 'month').toDate()
    })
  }, [modelEndTime]);

  const handleDateChange = (startTime: Date | undefined, endTime: Date | undefined) => {
    const dateRange: DateRangeData = {
      startTime: startTime,
      endTime: endTime
    }

    setDateRange(dateRange);
    if (dateRange && dateRange.startTime && dateRange.endTime) {
      setPeriod([dateRange.startTime, dateRange.endTime]);
    }
  };

  return (
      <DateRange onChange={handleDateChange} startTime={range.startTime} endTime={range.endTime}/>
  );
}
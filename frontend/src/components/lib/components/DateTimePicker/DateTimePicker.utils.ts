import dayjs, { Dayjs } from 'dayjs';

export function convertDate(date: Date | Dayjs | null) {
  return dayjs(date).format('llll');
}

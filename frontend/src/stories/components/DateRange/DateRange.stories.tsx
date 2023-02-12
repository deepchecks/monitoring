import React from 'react';
import { Meta } from '@storybook/react';
import { DateRange, DateRangeProps } from 'components/DateRange/DateRange';

export default {
  component: DateRange,
  title: 'Components/DateRange'
} as Meta;

const exampleProps: DateRangeProps = {
  onApply: () => undefined,
  onChange: () => undefined,
  startTime: undefined,
  endTime: undefined,
  maxDate: undefined,
  minDate: undefined
};

const DateRangeTemplate = () => <DateRange {...exampleProps} />;

export const DateRangeUI = DateRangeTemplate.bind({});

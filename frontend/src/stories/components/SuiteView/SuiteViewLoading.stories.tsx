import React from 'react';
import { Meta } from '@storybook/react';
import SuiteViewLoading from 'components/SuiteView/SuiteViewLoading';

export default {
  component: SuiteViewLoading,
  title: 'Components/SuiteView/SuiteViewLoading'
} as Meta;

const SwitchButtonTemplate = () => <SuiteViewLoading />;

export const SwitchButtonUI = SwitchButtonTemplate.bind({});

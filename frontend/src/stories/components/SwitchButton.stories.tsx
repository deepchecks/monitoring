import React from 'react';
import { Meta } from '@storybook/react';
import { SwitchButton, SwitchButtonProps } from 'components/SwitchButton';

export default {
  component: SwitchButton,
  title: 'Components/SwitchButton'
} as Meta;

const exampleProps: SwitchButtonProps = {
  label: 'button',
  checked: true,
  setChecked: () => false,
  labelPlacement: 'bottom'
};

const SwitchButtonTemplate = () => <SwitchButton {...exampleProps} />;

export const SwitchButtonUI = SwitchButtonTemplate.bind({});

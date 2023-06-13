import React from 'react';

export interface LogoProps {
  withLabel?: boolean;
  margin?: string;
  width?: string;
}

export const Logo = (props: LogoProps) => {
  const { withLabel, margin = '8px' } = props;

  const logoWithoutLabel = require('../../assets/logo/logo.svg').default;
  const logoWithLabel = require('../../assets/logo/monitoring.svg').default;

  const imgWidth = withLabel ? '200px' : '40px';

  const logoToUse = () => {
    switch (withLabel) {
      case true:
        return logoWithLabel;
      default:
        return logoWithoutLabel;
    }
  };

  return <img src={logoToUse()} alt="logo" style={{ margin: margin, width: imgWidth, height: '40px' }} />;
};

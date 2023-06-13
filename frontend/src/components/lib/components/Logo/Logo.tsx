import React from 'react';

export interface LogoProps {
  withLabel?: boolean;
  margin?: string;
}

export const Logo = (props: LogoProps) => {
  const { withLabel, margin = '8px' } = props;

  const logoWithoutLabel = require('../../assets/logo/logo.svg').default;
  const logoWithLabel = require('../../assets/logo/monitoring.svg').default;

  const logoToUse = () => {
    switch (withLabel) {
      case true:
        return logoWithLabel;
      default:
        return logoWithoutLabel;
    }
  };

  return <img src={logoToUse()} alt="logo" height="40px" width="200px" style={{ margin: margin }} />;
};

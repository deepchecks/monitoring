import React from 'react';

export interface ImageProps {
  src: string;
  alt?: string;
  width?: string;
  height?: string;
  margin?: string;
  borderRadius?: string;
  background?: string;
  padding?: string;
  boxShadow?: string;
}

export const Image = (props: ImageProps) => {
  const {
    src,
    alt = 'Deepchecks image',
    width = '100%',
    height = '100%',
    margin = '0',
    borderRadius = '0',
    background = 'transparent',
    padding = '0',
    boxShadow = 'none'
  } = props;

  return (
    <img
      src={src}
      alt={alt}
      height={height}
      width={width}
      style={{
        margin: margin,
        padding: padding,
        borderRadius: borderRadius,
        background: background,
        boxShadow: boxShadow
      }}
    />
  );
};

import React from 'react';

import { TableChart, VisualModel, NLPModel } from 'assets/icon/icon';

type ModelIconType = 'Tabular' | 'Visual' | 'NLP' | boolean;

const ModelIcon = (type: ModelIconType, width: number, height: number) => {
  switch (type) {
    case 'Tabular':
      return <TableChart width={width} height={height} />;

    case 'Visual':
      return <VisualModel width={width} height={height} />;

    case 'NLP':
      return <NLPModel width={width} height={height} />;

    default:
      return <TableChart width={width} height={height} />;
  }
};

export default ModelIcon;

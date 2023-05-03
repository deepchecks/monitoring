import React, { useState } from 'react';

import { StyledContainer } from 'components/lib';
import OnBoarding from '../OnBoarding';

const FirstOnBoarding = () => {
  const [dataType, setDataType] = useState<'demo' | 'user'>();

  return <StyledContainer>{dataType && <OnBoarding />}</StyledContainer>;
};

export default FirstOnBoarding;

import React from 'react';

import { APIKey } from 'components/APIKey';
import { StyledText } from 'components/lib';

export const APIKeyPage = function () {
  return (
    <>
      <StyledText text="API Key" type="h1" margin="32px 4px 0" />
      <APIKey />
    </>
  );
};

export default APIKeyPage;

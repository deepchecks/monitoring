/* eslint-disable no-useless-escape */
import React from 'react';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import * as FileSaver from 'file-saver';

import { StyledButton } from 'components/lib';

const constants = {
  text: 'Download Notebook',
  notebook: (token: string) => ``
};

const DownloadNotebook = () => {
  const text = constants.notebook('API_TOKEN');

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'application/json' });
    FileSaver.saveAs(blob, 'onboarding.ipynb');
  };

  return (
    <StyledButton
      label={
        <>
          <MenuBookIcon />
          {constants.text}
        </>
      }
      width="180px"
      onClick={handleDownload}
    />
  );
};

export default DownloadNotebook;

import React from 'react';

import MenuBookIcon from '@mui/icons-material/MenuBook';

import * as FileSaver from 'file-saver';

import { StyledButton } from 'components/lib';

const constants = {
  text: 'Download Notebook'
};

const DownloadNotebook = ({
  dataType,
  reportOnboardingStep
}: {
  dataType: 'demo' | 'user';
  reportOnboardingStep: (src: string) => void;
}) => {
  const fileName = dataType === 'demo' ? 'Onboarding_Demo_Data' : 'Onboarding_Your_Data';

  const handleDownload = async () => {
    const response = await fetch(`${window.location.origin}/snippets/${fileName}.json`);
    reportOnboardingStep('notebook');

    if (!response.ok) {
      throw new Error('Error downloading the notebook');
    }

    const data = await response.json();
    const notebookData = JSON.stringify(data);
    const blob = new Blob([notebookData], { type: 'application/json' });

    FileSaver.saveAs(blob, `${fileName}.ipynb`);
  };

  return (
    <StyledButton
      label={
        <>
          <MenuBookIcon />
          {constants.text}
        </>
      }
      onClick={handleDownload}
      sx={{ width: '240px', height: '44px' }}
    />
  );
};

export default DownloadNotebook;

import React from 'react';

import MenuBookIcon from '@mui/icons-material/MenuBook';

import * as FileSaver from 'file-saver';

import { StyledButton } from 'components/lib';

import demoSnippet from './snippets/Onboarding_Demo_Data.json';
import userSnippet from './snippets/Onboarding_Your_Data.json';

const constants = {
  text: 'Download Notebook'
};

const DownloadNotebook = ({
  token,
  dataType,
  reportOnboardingStep
}: {
  token: string;
  dataType: 'demo' | 'user';
  reportOnboardingStep: (src: string) => void;
}) => {
  const handleDownload = () => {
    const fileName = dataType === 'demo' ? 'onboarding-demo-data.ipynb' : 'onboarding-custom-data.ipynb';
    const fileContent = dataType === 'demo' ? demoSnippet : userSnippet;
    const updatedContent = JSON.stringify(fileContent)
      .replace('YOUR_API_TOKEN', token)
      .replace('YOUR_DEPLOYMENT_URL', window.location.origin);
    const blob = new Blob([updatedContent], { type: 'application/json' });

    reportOnboardingStep('notebook');
    FileSaver.saveAs(blob, fileName);
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

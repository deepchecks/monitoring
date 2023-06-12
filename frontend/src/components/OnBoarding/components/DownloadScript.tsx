import React from 'react';
import TerminalIcon from '@mui/icons-material/Terminal';
import * as FileSaver from 'file-saver';
import { StyledButton } from 'components/lib';

const constants = {
  text: 'Download Py Script'
};

const DownloadScript = ({
  dataType,
  reportOnboardingStep
}: {
  dataType: 'demo' | 'user';
  reportOnboardingStep: (src: string) => void;
}) => {
  const fileName = dataType === 'demo' ? 'onboarding-demo-script.py' : 'onboarding-custom-script.py';

  const handleDownload = async () => {
    const response = await fetch(`${window.location.origin}/snippets/${fileName}`);
    reportOnboardingStep('notebook');

    if (!response.ok) {
      throw new Error('Error downloading the notebook');
    }

    const blob = await response.blob();
    FileSaver.saveAs(blob, fileName);
  };

  return (
    <StyledButton
      label={
        <>
          <TerminalIcon />
          {constants.text}
        </>
      }
      onClick={handleDownload}
      sx={{ width: '240px', height: '44px' }}
    />
  );
};

export default DownloadScript;

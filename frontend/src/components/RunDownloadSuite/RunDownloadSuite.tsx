import React, { useState } from 'react';
import mixpanel from 'mixpanel-browser';

import {
  useRunSuiteOnModelVersionApiV1ModelVersionsModelVersionIdSuiteRunPost,
  useGetNotebookApiV1ChecksCheckIdGetNotebookPost,
  useGetNotebookApiV1MonitorsMonitorIdGetNotebookPost,
  SingleCheckRunOptions,
  DataFilter
} from 'api/generated';

import { styled, Tooltip } from '@mui/material';
import { LoadingButton } from '@mui/lab';

import { DownloadSuiteDropdown } from './DownloadSuiteDropdown';

import { Download, GraphReport } from 'assets/icon/icon';

interface RunDownloadSuiteProps {
  modelVersionId: number | undefined;
  notebookId: number | undefined;
  notebookName: string | undefined;
  notebookType: 'check' | 'monitor';
  singleCheckRunOptions: SingleCheckRunOptions;
  activeBarFilters?: DataFilter[];
}

const ALERT_MESSAGE = 'Something went wrong!';

export const RunDownloadSuite = ({
  modelVersionId,
  notebookId,
  notebookName,
  notebookType,
  activeBarFilters,
  singleCheckRunOptions
}: RunDownloadSuiteProps) => {
  const { mutateAsync: mutateRunSuit, isLoading: isSuiteLoading } =
    useRunSuiteOnModelVersionApiV1ModelVersionsModelVersionIdSuiteRunPost();
  const { mutateAsync: mutateDownloadChecksNotebook, isLoading: isChecksNotebookLoading } =
    useGetNotebookApiV1ChecksCheckIdGetNotebookPost();
  const { mutateAsync: mutateDownloadMonitorsNotebook, isLoading: isMonitorsNotebookLoading } =
    useGetNotebookApiV1MonitorsMonitorIdGetNotebookPost();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClose = () => {
    setAnchorEl(null);
  };

  const prepareData = () => {
    const dataToSend: SingleCheckRunOptions = JSON.parse(JSON.stringify(singleCheckRunOptions));

    if (dataToSend.filter && activeBarFilters) {
      dataToSend.filter.filters.push(...activeBarFilters);
    }

    return dataToSend;
  };

  const handleRunTestSuite = async () => {
    mixpanel.track('Run test suite click');

    if (modelVersionId) {
      const dataToSend: SingleCheckRunOptions = prepareData();

      const response = await mutateRunSuit({
        modelVersionId,
        data: dataToSend
      });

      const winUrl = URL.createObjectURL(new Blob([response], { type: 'text/html' }));
      window.open(winUrl);
    } else {
      alert(ALERT_MESSAGE);
    }
  };

  const handleDownloadNotebook = async (asScript?: 'as script') => {
    if (notebookId && modelVersionId) {
      const dataToSend: SingleCheckRunOptions = prepareData();
      const payload = {
        model_version_id: modelVersionId,
        ...(asScript && { as_script: true }),
        ...dataToSend
      };

      const response =
        notebookType === 'check'
          ? await mutateDownloadChecksNotebook({
              checkId: notebookId,
              data: payload
            })
          : await mutateDownloadMonitorsNotebook({
              monitorId: notebookId,
              data: payload
            });

      const url = window.URL.createObjectURL(new Blob([JSON.stringify(response)]));

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', (notebookName || 'notebook').replaceAll(' ', '_') + (asScript ? '.py' : '.ipynb'));

      document.body.appendChild(link);
      link.click();

      link.parentNode?.removeChild(link);
    } else {
      alert(ALERT_MESSAGE);
    }

    handleClose();
  };

  const isNotebookLoading = isChecksNotebookLoading || isMonitorsNotebookLoading;

  return (
    <>
      <Tooltip title="Download" placement="top">
        <StyledLoadingButton
          loading={isNotebookLoading}
          variant="text"
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget)}
          sx={{ marginRight: '10px' }}
        >
          <Download opacity={isNotebookLoading ? 0 : 1} />
        </StyledLoadingButton>
      </Tooltip>
      <DownloadSuiteDropdown
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        downloadNotebook={handleDownloadNotebook}
      />
      <Tooltip title="Run test" placement="top">
        <StyledLoadingButton loading={isSuiteLoading} variant="text" onClick={handleRunTestSuite}>
          <GraphReport opacity={isSuiteLoading ? 0 : 1} />
        </StyledLoadingButton>
      </Tooltip>
    </>
  );
};

const StyledLoadingButton = styled(LoadingButton)({
  minWidth: 36,
  minHeight: 36,
  padding: 0,
  borderRadius: '4px'
});

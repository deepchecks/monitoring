import React, { useCallback } from 'react';
import mixpanel from 'mixpanel-browser';

import {
  useRunSuiteOnModelVersionApiV1ModelVersionsModelVersionIdSuiteRunPost,
  useGetNotebookApiV1ChecksCheckIdGetNotebookPost,
  useGetNotebookApiV1MonitorsMonitorIdGetNotebookPost,
  SingleCheckRunOptions,
  DataFilter
} from 'api/generated';

import { styled } from '@mui/material';
import { LoadingButton } from '@mui/lab';

import { TestTube, Notebook } from 'assets/icon/icon';

interface RunDownloadSuiteProps {
  testSuiteButtonLabel: string;
  modelVersionId: number | undefined;
  notebookId: number | undefined;
  notebookName: string | undefined;
  notebookType: 'check' | 'monitor';
  singleCheckRunOptions: SingleCheckRunOptions;
  activeBarFilters?: DataFilter[];
}

const ALERT_MESSAGE = 'Something went wrong!';

export const RunDownloadSuite = ({
  testSuiteButtonLabel,
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

  const prepareData = useCallback(() => {
    const dataToSend: SingleCheckRunOptions = JSON.parse(JSON.stringify(singleCheckRunOptions));

    if (dataToSend.filter && activeBarFilters) {
      dataToSend.filter.filters.push(...activeBarFilters);
    }

    return dataToSend;
  }, [activeBarFilters, singleCheckRunOptions]);

  const handleRunTestSuite = useCallback(async () => {
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
  }, [modelVersionId, mutateRunSuit, prepareData]);

  const handleDownloadNotebook = useCallback(async () => {
    if (notebookId && modelVersionId) {
      const dataToSend: SingleCheckRunOptions = prepareData();
      const payload = {
        model_version_id: modelVersionId,
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
      link.setAttribute('download', (notebookName || 'notebook').replaceAll(' ', '_') + '.ipynb');

      document.body.appendChild(link);
      link.click();

      link.parentNode?.removeChild(link);
    } else {
      alert(ALERT_MESSAGE);
    }
  }, [
    notebookId,
    notebookName,
    notebookType,
    mutateDownloadChecksNotebook,
    mutateDownloadMonitorsNotebook,
    prepareData,
    modelVersionId
  ]);

  return (
    <>
      <StyledLoadingButton
        size="small"
        color="secondary"
        loading={isChecksNotebookLoading || isMonitorsNotebookLoading}
        loadingPosition="start"
        variant="contained"
        onClick={handleDownloadNotebook}
        startIcon={<Notebook />}
        sx={{ marginRight: '10px' }}
      >
        Get Notebook
      </StyledLoadingButton>
      <StyledLoadingButton
        size="small"
        color="secondary"
        loading={isSuiteLoading}
        loadingPosition="start"
        variant="contained"
        onClick={handleRunTestSuite}
        startIcon={<TestTube />}
      >
        {testSuiteButtonLabel}
      </StyledLoadingButton>
    </>
  );
};

const StyledLoadingButton = styled(LoadingButton)({
  width: 166,
  padding: 0,
  minHeight: 36
});

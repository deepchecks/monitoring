import React, { useCallback } from 'react';

import {
  useRunSuiteOnModelVersionApiV1ModelVersionsModelVersionIdSuiteRunPost,
  useGetNotebookApiV1ChecksCheckIdGetNotebookPost,
  SingleCheckRunOptions,
  DataFilter
} from 'api/generated';

import { styled, Box } from '@mui/material';
import { LoadingButton } from '@mui/lab';

import { TestTube, Notebook } from 'assets/icon/icon';

interface RunDownloadSuiteProps {
  modelVersionId: number;
  checkId: number;
  checkName: string | undefined;
  singleWindowMonitorOptions: SingleCheckRunOptions;
  activeBarFilters: DataFilter[];
}

export const RunDownloadSuite = ({ modelVersionId, checkId, checkName, activeBarFilters, singleWindowMonitorOptions }: RunDownloadSuiteProps) => {
  const { mutateAsync: mutateRunSuit, isLoading: isSuiteLoading } =
    useRunSuiteOnModelVersionApiV1ModelVersionsModelVersionIdSuiteRunPost();

  const { mutateAsync: mutateDownloadNotebook, isLoading: isNotebookLoading } =
    useGetNotebookApiV1ChecksCheckIdGetNotebookPost();

  const handleRunTestSuite = useCallback(async () => {
    const dataToSend: SingleCheckRunOptions = JSON.parse(JSON.stringify(singleWindowMonitorOptions));

    if (dataToSend.filter) {
      dataToSend.filter.filters.push(...activeBarFilters);
    }

    const result = await mutateRunSuit({
      modelVersionId,
      data: singleWindowMonitorOptions
    });

    const winUrl = URL.createObjectURL(new Blob([result], { type: 'text/html' }));
    window.open(winUrl);
  }, [activeBarFilters, modelVersionId, mutateRunSuit, singleWindowMonitorOptions]);

  const handledownloadNotebook = useCallback(async () => {
    const dataToSend: SingleCheckRunOptions = JSON.parse(JSON.stringify(singleWindowMonitorOptions));

    if (dataToSend.filter) {
      dataToSend.filter.filters.push(...activeBarFilters);
    }

    const result = await mutateDownloadNotebook({
      checkId: checkId,
      data: {
        start_time: dataToSend.start_time,
        end_time: dataToSend.end_time,
        model_version_id: modelVersionId,
        filter: dataToSend.filter,
        additional_kwargs: dataToSend.additional_kwargs
      }
    });

     const url = window.URL.createObjectURL(new Blob([JSON.stringify(result)]));

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', (checkName || 'notebook').replaceAll(' ', '_') + '.ipynb');

    // Append to html link element page
    document.body.appendChild(link);
    link.click();

    // Clean up and remove the link
    link.parentNode?.removeChild(link);
  }, [activeBarFilters, modelVersionId, mutateRunSuit, singleWindowMonitorOptions]);

  return (
    <StyledContainer>
      <StyledButtonTest
        size="small"
        color="secondary"
        loading={isNotebookLoading}
        loadingPosition="start"
        variant="contained"
        onClick={handledownloadNotebook}
        startIcon={<Notebook />}
      >
        Get Notebook
      </StyledButtonTest>
      <StyledButtonTest
        size="small"
        color="secondary"
        loading={isSuiteLoading}
        loadingPosition="start"
        variant="contained"
        onClick={handleRunTestSuite}
        startIcon={<TestTube />}
      >
        Run Test Suite
      </StyledButtonTest>
    </StyledContainer>
  );
};

const StyledContainer = styled(Box)({
  margin: 'auto 36px 25px auto'
});

const StyledButtonTest = styled(LoadingButton)({
  width: 166,
  padding: 0,
  minHeight: 36,
  marginTop: '25px',
  marginRight: '10px'
});

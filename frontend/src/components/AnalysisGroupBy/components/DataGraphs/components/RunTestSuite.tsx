import React, { useCallback } from 'react';

import {
  useRunSuiteOnModelVersionApiV1ModelVersionsModelVersionIdSuiteRunPost,
  SingleWindowMonitorOptions,
  DataFilter
} from 'api/generated';

import { styled, Box } from '@mui/material';
import { LoadingButton } from '@mui/lab';

import { TestTube } from 'assets/icon/icon';

interface RunTestSuiteProps {
  modelVersionId: number;
  singleWindowMonitorOptions: SingleWindowMonitorOptions;
  activeBarFilters: DataFilter[];
}

export const RunTestSuite = ({ modelVersionId, activeBarFilters, singleWindowMonitorOptions }: RunTestSuiteProps) => {
  const { mutateAsync: mutateRunSuit, isLoading } =
    useRunSuiteOnModelVersionApiV1ModelVersionsModelVersionIdSuiteRunPost();

  const handleRunTestSuite = useCallback(async () => {
    const dataToSend: SingleWindowMonitorOptions = JSON.parse(JSON.stringify(singleWindowMonitorOptions));

    if (dataToSend.filter) {
      dataToSend.filter.filters.push(...activeBarFilters);
    }

    const result = await mutateRunSuit({
      modelVersionId,
      data: dataToSend
    });

    const winUrl = URL.createObjectURL(new Blob([result], { type: 'text/html' }));
    window.open(winUrl);
  }, [activeBarFilters, modelVersionId, mutateRunSuit, singleWindowMonitorOptions]);

  return (
    <StyledContainer>
      <StyledButtonTest
        size="small"
        color="secondary"
        loading={isLoading}
        loadingPosition="start"
        variant="contained"
        onClick={handleRunTestSuite}
        startIcon={<TestTube />}
      >
        Run all tests
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
  marginTop: '25px'
});

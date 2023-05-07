import React, { useEffect, useState } from 'react';

import {
  useRunSuiteOnModelVersionApiV1ModelVersionsModelVersionIdSuiteRunPost,
  SingleCheckRunOptions
} from 'api/generated';

import SuiteViewLoading from 'components/SuiteView/SuiteViewLoading';
import SuiteViewHeader from 'components/SuiteView/SuiteViewHeader';

import { SuiteViewPageContainer, SuiteViewPageIFrame } from 'components/SuiteView/SuiteView.styles';

const SuiteViewPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { mutateAsync } = useRunSuiteOnModelVersionApiV1ModelVersionsModelVersionIdSuiteRunPost();

  const queryParams = new URLSearchParams(window.location.search);
  const modelVersionId = Number(queryParams.get('modelVersionId'));
  const runSuitePayload = JSON.parse(`${queryParams.get('dataToSend')}`) as SingleCheckRunOptions;
  const formattedPayload = {
    ...runSuitePayload,
    start_time: runSuitePayload?.start_time?.replace('plus', '+'),
    end_time: runSuitePayload?.end_time?.replace('plus', '+')
  };

  const getSuite = async () => {
    const response = await mutateAsync({
      modelVersionId,
      data: formattedPayload
    });

    const blob = new Blob([response], { type: 'text/html' });
    const iframe = document.querySelector('iframe');

    blob.size && setIsLoading(false);

    (iframe as HTMLIFrameElement).src = URL.createObjectURL(blob);
  };

  useEffect(() => {
    if (runSuitePayload && modelVersionId) {
      getSuite();
    }
  }, [modelVersionId]);

  return (
    <SuiteViewPageContainer>
      {runSuitePayload && <SuiteViewHeader modelVersionId={modelVersionId} runSuitePayload={formattedPayload} />}
      {isLoading && <SuiteViewLoading />}
      <SuiteViewPageIFrame></SuiteViewPageIFrame>
    </SuiteViewPageContainer>
  );
};

export default SuiteViewPage;

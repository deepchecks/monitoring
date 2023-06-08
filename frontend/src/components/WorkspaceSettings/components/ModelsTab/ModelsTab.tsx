import React, { useState, useEffect } from 'react';

import { ModelManagmentSchema } from 'api/generated';

import useModels from 'helpers/hooks/useModels';

import { Loader } from 'components/base/Loader/Loader';
import { ModelsTabHeader } from './components/ModelsTabHeader';
import { ModelsTabTable } from './components/ModelsTabTable/ModelsTabTable';

const ModelsTab = () => {
  const { models: initialModels, isLoading, refetchModels } = useModels('showAll');

  const [modelsList, setModelsList] = useState<ModelManagmentSchema[]>([]);

  useEffect(() => {
    initialModels.length && setModelsList(initialModels);
  }, [initialModels]);

  return (
    <>
      <ModelsTabHeader initialModels={initialModels} setModelsList={setModelsList} />
      {isLoading ? <Loader /> : <ModelsTabTable models={modelsList} refetchModels={refetchModels} />}
    </>
  );
};

export default ModelsTab;

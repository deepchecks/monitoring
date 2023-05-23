import React, { useState } from 'react';

import useModels from 'helpers/hooks/useModels';

import { Loader } from 'components/base/Loader/Loader';
import { ModelsTabHeader } from './components/ModelsTabHeader';
import { ModelsTabTable } from './components/ModelsTabTable/ModelsTabTable';

const ModelsTab = () => {
  const { models: initialModels, isLoading } = useModels();

  const [modelsList, setModelsList] = useState(initialModels);

  return (
    <>
      <ModelsTabHeader initialModels={initialModels} setModelsList={setModelsList} />
      {isLoading ? <Loader /> : <ModelsTabTable models={modelsList} />}
    </>
  );
};

export default ModelsTab;

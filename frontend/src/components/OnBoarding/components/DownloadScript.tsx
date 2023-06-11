/* eslint-disable no-useless-escape */
import React from 'react';
import { Code } from '@mui/icons-material';
import * as FileSaver from 'file-saver';

import { StyledButton } from 'components/lib';

const constants = {
  text: 'Download Py Script',
  notebook: (token: string) => `
import sys 
!{sys.executable} -m pip install -U deepchecks-client

from deepchecks.tabular.datasets.regression.airbnb import load_data,\
load_pre_calculated_prediction, load_pre_calculated_feature_importance 

ref_dataset, _ = load_data(data_format="Dataset") 
ref_predictions, _ = load_pre_calculated_prediction() 
feature_importance = load_pre_calculated_feature_importance() # Optional 
feature_importance 

from deepchecks_client import DeepchecksClient, create_schema, read_schema 

schema_file_path = "schema_file.yaml"
create_schema(dataset=ref_dataset, schema_output_file=schema_file_path) 
read_schema(schema_file_path) 

import os 

host = "https://localhost:3000" 
dc_client = DeepchecksClient(host=${window.location.origin}, token="${token}") 

model_name = "Airbnb"
model_version = dc_client.create_tabular_model_version(model_name=model_name, version_name="ver_1",
schema=schema_file_path,
feature_importance=feature_importance,
reference_dataset=ref_dataset,
reference_predictions=ref_predictions,
task_type="regression")

timestamp, label_col = "timestamp", "price"
_, prod_data = load_data(data_format="DataFrame")
_, prod_predictions = load_pre_calculated_prediction()
timestamp_col = prod_data[timestamp].astype(int) // 10 ** 9 
model_version.log_batch(sample_ids=prod_data.index,
data=prod_data.drop([timestamp, label_col], axis=1), 
timestamps=timestamp_col, predictions=prod_predictions)

model_client = dc_client.get_or_create_model(model_name)
model_client.log_batch_labels(sample_ids=prod_data.index, labels=prod_data[label_col])
  `
};

const DownloadScript = ({ token }: { token: string }) => {
  const handleDownload = () => {
    const blob = new Blob([constants.notebook(token)], { type: 'application/json' });
    FileSaver.saveAs(blob, 'onboarding.py');
  };

  return (
    <StyledButton
      label={
        <>
          <Code />
          {constants.text}
        </>
      }
      onClick={handleDownload}
      sx={{ width: '240px', height: '44px' }}
    />
  );
};

export default DownloadScript;

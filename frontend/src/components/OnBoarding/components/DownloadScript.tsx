/* eslint-disable no-useless-escape */
import React from 'react';

import TerminalIcon from '@mui/icons-material/Terminal';

import * as FileSaver from 'file-saver';

import { StyledButton } from 'components/lib';

const constants = {
  text: 'Download Script.py',
  notebook: {
    demo: (token: string) => `
from deepchecks.tabular.datasets.regression.airbnb import load_data_and_predictions, load_pre_calculated_feature_importance
from deepchecks_client import DeepchecksClient, create_schema, read_schema

ref_dataset, ref_predictions = load_data_and_predictions(data_format="Dataset")
prod_data, prod_predictions = load_data_and_predictions(data_format="DataFrame", load_train=False, data_size=100_000)

feature_importance = load_pre_calculated_feature_importance()  # Optional

schema_file_path = "schema_file.yaml"
create_schema(dataset=ref_dataset, schema_output_file=schema_file_path)
read_schema(schema_file_path)

dc_client = DeepchecksClient(host="${window.location.origin}", token="${token}") 

model_name = "Airbnb"
model_version = dc_client.create_tabular_model_version(model_name=model_name, version_name="ver_1",
                                                        schema=schema_file_path,
                                                        feature_importance=feature_importance,
                                                        reference_dataset=ref_dataset,
                                                        reference_predictions=ref_predictions,
                                                        task_type="regression")

timestamp, label_col = "timestamp", "price"
timestamp_col = prod_data[timestamp].astype(int) // 10 ** 9
model_version.log_batch(sample_ids=prod_data.index, data=prod_data.drop([timestamp, label_col], axis=1),
                        timestamps=timestamp_col, predictions=prod_predictions)

model_client = dc_client.get_or_create_model(model_name)
model_client.log_batch_labels(
    sample_ids=prod_data.index, labels=prod_data[label_col])
      `,
    user: (token: string) => `
from deepchecks_client import DeepchecksClient, create_schema, read_schema
from deepchecks.tabular import Dataset

ref_data =  # Load your refenrace data and convert into a pandas DataFrame
ref_predictions =  # Optional - Generate model predictions
feature_importance =  # Optional - Calculate model feature importance

LABEL_COL =  # Name of the label column
CAT_FEATURES =  # List of the categorical features names (list of strings)
DATETIME_COL =  # Name of the datetime column (optional for referance data)

ref_dataset = Dataset(ref_data, label=LABEL_COL,
                      cat_features=CAT_FEATURES, datetime_name=DATETIME_COL)

schema_file_path = "schema_file.yaml"
create_schema(dataset=ref_dataset, schema_output_file=schema_file_path)
read_schema(schema_file_path)

dc_client = DeepchecksClient(host="${window.location.origin}", token="${token}") 

version_arguments = {
    'model_name': "my_model",
    'version_name': 'first_version',
    'schema': schema_file_path,
    'feature_importance': feature_importance,  # Optional
    'reference_dataset': ref_dataset,  # Optional
    'reference_predictions': ref_predictions,  # Optional
    'task_type': 'regression'
}
model_version = dc_client.create_tabular_model_version(**version_arguments)

prod_data =  # Load your production data and convert into a pandas DataFrame
prod_predictions =  # Optional - Generate model predictions

model_version.log_batch(
    sample_ids=prod_data.index,
    data=prod_data.drop([DATETIME_COL, LABEL_COL], axis=1),
    # Timestamps as unix timestamps in seconds
    timestamps=prod_data[DATETIME_COL],
    predictions=prod_predictions
)

model_client = dc_client.get_or_create_model(version_arguments["model_name"])
model_client.log_batch_labels(
    sample_ids=prod_data.index, labels=prod_data[LABEL_COL])
      `
  }
};

const DownloadScript = ({
  token,
  dataType,
  reportOnboardingStep
}: {
  token: string;
  dataType: 'demo' | 'user';
  reportOnboardingStep: (src: string) => void;
}) => {
  const fileName = dataType === 'demo' ? 'onboarding-demo-data.py' : 'onboarding-custom-data.py';

  const handleDownload = () => {
    const blob = new Blob([constants.notebook[dataType](token)], { type: 'application/json' });
    reportOnboardingStep('script');
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

/* eslint-disable no-useless-escape */
import React from 'react';

import TerminalIcon from '@mui/icons-material/Terminal';

import * as FileSaver from 'file-saver';

import { StyledButton } from 'components/lib';

const constants = {
  text: 'Download Py Script',
  notebook: {
    demo: (token: string) => `
    from deepchecks.tabular.datasets.regression.airbnb import load_data, load_pre_calculated_prediction, load_pre_calculated_feature_importance
    from deepchecks_client import DeepchecksClient, create_schema, read_schema


    ref_dataset, prod_data = load_data(data_format="Dataset")
    ref_predictions, prod_predictions = load_pre_calculated_prediction()
    feature_importance = load_pre_calculated_feature_importance() # Optional 


    schema_file_path = "schema_file.yaml"
    create_schema(dataset=ref_dataset, schema_output_file=schema_file_path) 
    read_schema(schema_file_path) 

    dc_client = DeepchecksClient(host="${window.location.origin}", token="${token}") 

    model_name = "Airbnb"
    # model_version = dc_client.get_or_create_model(model_name).version("ver_1")
    model_version = dc_client.create_tabular_model_version(model_name=model_name, version_name="ver_1",
        schema=schema_file_path,
        feature_importance=feature_importance,
        reference_dataset=ref_dataset,
        reference_predictions=ref_predictions,
        task_type="regression")


    timestamp, label_col = "timestamp", "price"
    prod_data = prod_data.data
    timestamp_col = prod_data[timestamp].astype(int) // 10 ** 9
    model_version.log_batch(sample_ids=prod_data.index, data=prod_data.drop([timestamp, label_col], axis=1),
                            timestamps=timestamp_col, predictions=prod_predictions)


    model_client = dc_client.get_or_create_model(model_name)
    model_client.log_batch_labels(sample_ids=prod_data.index, labels=prod_data[label_col])
      `,
    user: (token: string) => `
    from deepchecks.tabular.datasets.regression.airbnb import load_data, load_pre_calculated_prediction, load_pre_calculated_feature_importance
    from deepchecks_client import DeepchecksClient, create_schema, read_schema
    
    ref_data = # Load your refenrace data and convert into a pandas DataFrame
    ref_predictions = # Optional - Generate model predictions
    feature_importance = # Optional - Calculate model feature importance
        
    from deepchecks.tabular import Dataset
    
    LABEL_COL = # Name of the label column
    CAT_FEATURES = # List of the categorical features names (list of strings)
    DATETIME_COL = # Name of the datetime column (optional for referance data)
    
    ref_dataset = Dataset(ref_data, label=LABEL_COL, cat_features=CAT_FEATURES, datetime_name=DATETIME_COL)
        
    from deepchecks_client import DeepchecksClient, create_schema, read_schema
    
    schema_file_path = "schema_file.yaml"
    create_schema(dataset=ref_dataset, schema_output_file=schema_file_path)
    read_schema(schema_file_path) 
    
    dc_client = DeepchecksClient(host="${window.location.origin}", token="${token}") 
    
     version_arguments = {
    'model_name' : "my_model",
    'version_name' : 'first_version',
    'schema' : schema_file_path,
    'feature_importance' : feature_importance, # Optional
    'reference_dataset': ref_dataset, # Optional
    'reference_predictions' : ref_predictions, # Optional
    'task_type' : 'regression'
    }
    model_version = dc_client.create_tabular_model_version(**version_arguments)
    
    prod_data = # Load your production data and convert into a pandas DataFrame
    prod_predictions = # Optional - Generate model predictions
    
    # Convert timestamp to UNIX timestamp format
    timestamp_col = prod_data[DATETIME_COL].astype(int) // 10 ** 9
    model_version.log_batch(sample_ids=prod_data.index,
    data=prod_data.drop([DATETIME_COL, LABEL_COL], axis=1),
    timestamps=timestamp_col, predictions=prod_predictions)
    
    model_client = dc_client.get_or_create_model(version_arguments["model_name"])
    model_client.log_batch_labels(sample_ids=prod_data.index, labels=prod_data[LABEL_COL])
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
    reportOnboardingStep('python script');
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
      sx={{ width: '280px', height: '44px' }}
    />
  );
};

export default DownloadScript;

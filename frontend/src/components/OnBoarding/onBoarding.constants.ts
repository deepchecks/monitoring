/* eslint-disable @typescript-eslint/no-unused-vars */
export const constants = {
  first: {
    title: 'Welcome to Deepchecks!',
    description: 'Hi! So good to have you. \n We are going to show you, step by step, how to configure a model.',
    chooseText: 'Choose your starting point:',
    userDataBtnLabel: 'I have a model I want to use',
    demoDataBtnLabel: 'I want to use the demo data',
    userDataToggleLabel: 'My Data',
    demoDataToggleLabel: 'Demo Data'
  },
  steps: [
    {
      title: 'Signing Up',
      description: '',
      codeSnippet: '',
      secondCodeSnippet: (_token?: string) => ``,
      docLink: { label: 'link to docs', url: '' }
    },
    {
      title: 'Creating a New Model Version',
      description:
        'To create a model version in Deepchecks, we first need to specify the feature schema and provide reference data for the version.\n The reference data is optional but necessary for certain checks.\n The schema file describes the data associated with the model version and should be reviewed before creating the version.\n To create the model version, we need to create an organization in the Deepchecks app and then use the API token to upload the reference data and, for classification tasks, predicted probabilities.',
      codeSnippet: 'import sys \n!{sys.executable} -m pip install -U deepchecks-client',
      secondCodeSnippet: (token?: string) =>
        `from deepchecks.tabular.datasets.regression.airbnb import load_data, \n load_pre_calculated_prediction, load_pre_calculated_feature_importance \n\n ref_dataset, _ = load_data(data_format="Dataset") \n ref_predictions, _ = load_pre_calculated_prediction() \n feature_importance = load_pre_calculated_feature_importance() # Optional \n feature_importance \n\n from deepchecks_client import DeepchecksClient, create_schema, read_schema \n\n schema_file_path = "schema_file.yaml" create_schema(dataset=ref_dataset, schema_output_file=schema_file_path) \n read_schema(schema_file_path) \n\n import os \n\n host = "${window.location.origin}" \n dc_client = DeepchecksClient(host=host, token="${token}" \n\n model_name = "Airbnb"\n model_version = dc_client.create_tabular_model_version(model_name=model_name, version_name="ver_1",\n schema=schema_file_path,\n feature_importance=feature_importance,\n reference_dataset=ref_dataset,\n reference_predictions=ref_predictions,\n task_type="regression")`,
      docLink: {
        label: 'Link to docs >',
        url: 'https://docs.deepchecks.com/monitoring/stable/user-guide/tabular/auto_quickstarts/plot_quickstart.html#creating-a-new-model-version'
      }
    },
    {
      title: 'Uploading Production Data',
      description:
        'To start monitoring with Deepchecks, you need to upload the production data you want to monitor.\n In this example, we will upload the data and predictions stored for the month of August 2022 as a batch and update the labels for some samples.\n Similar to the reference data, predicted probabilities can also be sent for classification tasks to compute probability-based metrics like AUC, log_loss, brier score, etc.',
      codeSnippet:
        'timestamp, label_col = "timestamp", "price"\n _, prod_data = load_data(data_format="DataFrame")\n _, prod_predictions = load_pre_calculated_prediction()\n timestamp_col = prod_data[timestamp].astype(int) // 10 ** 9 \n model_version.log_batch(sample_ids=prod_data.index,\ndata=prod_data.drop([timestamp, label_col], axis=1), \n timestamps=timestamp_col, predictions=prod_predictions)',
      secondCodeSnippet: (_token?: string) => ``,
      docLink: {
        label: 'Link to docs >',
        url: 'https://docs.deepchecks.com/monitoring/stable/user-guide/tabular/auto_quickstarts/plot_quickstart.html#uploading-production-data'
      }
    },
    {
      title: 'Updating the Labels',
      description:
        'In some real-world scenarios, data labels are only available later.\n We can update them retrospectively using global sample IDs, which are not specific to a version but apply globally to the model. To upload the labels, we need the model client.',
      codeSnippet:
        'model_client = dc_client.get_or_create_model(model_name)\n model_client.log_batch_labels(sample_ids=prod_data.index, labels=prod_data[label_col])',
      secondCodeSnippet: (_token?: string) => '',
      docLink: {
        label: 'Link to docs >',
        url: 'https://docs.deepchecks.com/monitoring/stable/user-guide/tabular/auto_quickstarts/plot_quickstart.html#updating-the-labels'
      }
    }
  ]
};

/* eslint-disable @typescript-eslint/no-unused-vars */
export const constants = {
  first: {
    title: 'Welcome to Deepchecks!',
    description:
      'Here is how you can quickly create your first model in Deepchecks.\nAll You need is to open a Python notebook, follow the instructions and in the right places copy the example code into your notebook.\n\nGood luck!',
    chooseText: 'Use a demo model of your own:',
    userDataBtnLabel: 'My model',
    demoDataBtnLabel: 'Demo data',
    userDataToggleLabel: 'My Data',
    demoDataToggleLabel: 'Demo Data'
  },
  steps: [
    {
      title: 'Signing Up',
      description: '',
      codeSnippet: '',
      secondCodeSnippet: ``,
      docLink: { label: 'Read more', url: '' }
    },
    {
      title: 'Creating a New Model Version',
      description:
        'To create a model version in Deepchecks, we first need to specify the feature schema and provide reference data for the version.\nThe reference data is optional but necessary for certain checks.\nThe schema file describes the data associated with the model version and should be reviewed before creating the version.\nTo create the model version, we need to create an organization in the Deepchecks app and then use the API token to upload the reference data and, for classification tasks, predicted probabilities.',
      codeSnippet: 'import sys \n!{sys.executable} -m pip install -U deepchecks-client',
      secondCodeSnippet: `from deepchecks.tabular.datasets.regression.airbnb import load_data,\\\nload_pre_calculated_prediction, load_pre_calculated_feature_importance \n\nref_dataset, _ = load_data(data_format="Dataset") \nref_predictions, _ = load_pre_calculated_prediction() \nfeature_importance = load_pre_calculated_feature_importance() # Optional \nfeature_importance \n\nfrom deepchecks_client import DeepchecksClient, create_schema, read_schema \n\nschema_file_path = "schema_file.yaml"\ncreate_schema(dataset=ref_dataset, schema_output_file=schema_file_path) \nread_schema(schema_file_path) \n\nimport os \n\ndc_client = DeepchecksClient(host="${window.location.origin}", token="YOUR_API_TOKEN") \n\nmodel_name = "Airbnb"\nmodel_version = dc_client.create_tabular_model_version(model_name=model_name, version_name="ver_1",\nschema=schema_file_path,\nfeature_importance=feature_importance,\nreference_dataset=ref_dataset,\nreference_predictions=ref_predictions,\ntask_type="regression")`,
      docLink: {
        label: 'Read more >',
        url: 'https://docs.deepchecks.com/monitoring/stable/user-guide/tabular/auto_quickstarts/plot_quickstart.html#creating-a-new-model-version'
      }
    },
    {
      title: 'Uploading Production Data',
      description:
        'To start monitoring with Deepchecks, you need to upload the production data you want to monitor.\nIn this example, we will upload the data and predictions stored for the month of August 2022 as a batch and update the labels for some samples.\nSimilar to the reference data, predicted probabilities can also be sent for classification tasks to compute probability-based metrics like AUC, log_loss, brier score, etc.',
      codeSnippet:
        'timestamp, label_col = "timestamp", "price"\n_, prod_data = load_data(data_format="DataFrame")\n_, prod_predictions = load_pre_calculated_prediction()\ntimestamp_col = prod_data[timestamp].astype(int) // 10 ** 9 \nmodel_version.log_batch(sample_ids=prod_data.index,\ndata=prod_data.drop([timestamp, label_col], axis=1), \ntimestamps=timestamp_col, predictions=prod_predictions)',
      secondCodeSnippet: ``,
      docLink: {
        label: 'Read more >',
        url: 'https://docs.deepchecks.com/monitoring/stable/user-guide/tabular/auto_quickstarts/plot_quickstart.html#uploading-production-data'
      }
    },
    {
      title: 'Updating the Labels',
      description:
        'In some real-world scenarios, data labels are only available later.\nWe can update them retrospectively using global sample IDs, which are not specific to a version but apply globally to the model. To upload the labels, we need the model client.',
      codeSnippet:
        'model_client = dc_client.get_or_create_model(model_name)\nmodel_client.log_batch_labels(sample_ids=prod_data.index, labels=prod_data[label_col])',
      secondCodeSnippet: '',
      docLink: {
        label: 'Read more >',
        url: 'https://docs.deepchecks.com/monitoring/stable/user-guide/tabular/auto_quickstarts/plot_quickstart.html#updating-the-labels'
      }
    }
  ],
  skipBtnLabel: 'Skip'
};

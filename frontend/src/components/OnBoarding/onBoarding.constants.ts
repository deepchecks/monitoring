/* eslint-disable @typescript-eslint/no-unused-vars */
export const constants = {
  first: {
    title: 'Welcome to Deepchecks!',
    description:
      'Creating your first model in Deepchecks can be done in several ways: \n\nIf this is the first time you are working with deepchecks, you would most likely like to work with our onboarding interactive user interface.\n The interactive mode supports two methods:\n 1.Demo Data, which gives a great introduction to our product.\n 2.To have a more thorough experience and work with the model on your real challenges, you can import your own data.\n\n If you are experienced with Deepchecks and/or enthusiastic to move fast,  you can directly use our SDK here: All you need is to have a python environment.\n You can use Jupyter Notebook, Colab or your favorite Python IDE. \n\n Good luck!',
    chooseText: 'Choose model data type:',
    userDataBtnLabel: 'My model',
    demoDataBtnLabel: 'Demo data',
    userDataToggleLabel: 'My Data',
    demoDataToggleLabel: 'Demo Data'
  },
  demo: {
    steps: [
      {
        title: 'Signing Up',
        description: '',
        codeSnippet: '',
        secondCodeSnippet: (_token?: string) => ``,
        docLink: { label: 'Read more', url: '' }
      },
      {
        title: 'Creating a New Model Version - Demo Data',
        description:
          'To create a model version in Deepchecks, we will need to define the feature schema and preferably also provide referance data. The reference data is optional but necessary for certain checks. The easiest way to create a feature schema and provide the referance data is via a deepschecks Dataset object. \n The data schema is a yaml file contaning the names and types of the different features for the model version. It can be generated autometically based on the Dataset object.',
        codeSnippet: 'import sys \n!{sys.executable} -m pip install -U deepchecks-client',
        secondCodeSnippet: (token?: string) =>
          `from deepchecks.tabular.datasets.regression.airbnb import load_data,\\\nload_pre_calculated_prediction, load_pre_calculated_feature_importance \n\nref_dataset, _ = load_data(data_format="Dataset") \nref_predictions, _ = load_pre_calculated_prediction() \nfeature_importance = load_pre_calculated_feature_importance() # Optional \nfeature_importance \n\nfrom deepchecks_client import DeepchecksClient, create_schema, read_schema \n\nschema_file_path = "schema_file.yaml"\ncreate_schema(dataset=ref_dataset, schema_output_file=schema_file_path) \nread_schema(schema_file_path) \n\nimport os \n\ndc_client = DeepchecksClient(host="${window.location.origin}", token="${token}") \n\nmodel_name = "Airbnb"\nmodel_version = dc_client.create_tabular_model_version(model_name=model_name, version_name="ver_1",\nschema=schema_file_path,\nfeature_importance=feature_importance,\nreference_dataset=ref_dataset,\nreference_predictions=ref_predictions,\ntask_type="regression")`,
        docLink: {
          label: 'Read more >',
          url: 'https://docs.deepchecks.com/monitoring/stable/user-guide/tabular/auto_quickstarts/plot_quickstart.html#creating-a-new-model-version'
        }
      },
      {
        title: 'Uploading Production Data',
        description:
          'To start monitoring with Deepchecks, you need to upload the production data you want to monitor. In this example, we will upload the data and predictions stored for a single month as a batch. Similar to the reference data, predicted probabilities can also be sent for classification tasks to compute probability-based metrics like AUC, log_loss, brier score, etc.',
        codeSnippet:
          'timestamp, label_col = "timestamp", "price"\n_, prod_data = load_data(data_format="DataFrame")\n_, prod_predictions = load_pre_calculated_prediction()\ntimestamp_col = prod_data[timestamp].astype(int) // 10 ** 9 \nmodel_version.log_batch(sample_ids=prod_data.index,\ndata=prod_data.drop([timestamp, label_col], axis=1), \ntimestamps=timestamp_col, predictions=prod_predictions)',
        secondCodeSnippet: (_token?: string) => ``,
        docLink: {
          label: 'Read more >',
          url: 'https://docs.deepchecks.com/monitoring/stable/user-guide/tabular/auto_quickstarts/plot_quickstart.html#uploading-production-data'
        }
      },
      {
        title: 'Updating the Labels',
        description:
          'In some real-world scenarios, data labels are only available later. We can update them retrospectively using global sample IDs, which are not specific to a version but apply globally to the model. To upload the labels, we need the model client.',
        codeSnippet:
          'model_client = dc_client.get_or_create_model(model_name)\nmodel_client.log_batch_labels(sample_ids=prod_data.index, labels=prod_data[label_col])',
        secondCodeSnippet: (_token?: string) => '',
        docLink: {
          label: 'Read more >',
          url: 'https://docs.deepchecks.com/monitoring/stable/user-guide/tabular/auto_quickstarts/plot_quickstart.html#updating-the-labels'
        }
      }
    ]
  },
  user: {
    steps: [
      {
        title: 'Signing Up',
        description: '',
        codeSnippet: '',
        secondCodeSnippet: (_token?: string) => ``,
        docLink: { label: 'Read more', url: '' }
      },
      {
        title: 'Creating a New Model Version',
        description:
          'To create a model version in Deepchecks, we will need to define the feature schema and preferably also provide referance data. The reference data is optional but necessary for certain checks. The easiest way to create a feature schema and provide the referance data is via a deepschecks Dataset object. The data schema is a yaml file contaning the names and types of the different features for the model version. It can be generated autometically based on the Dataset object.',
        codeSnippet: 'import sys \n!{sys.executable} -m pip install -U deepchecks-client',
        secondCodeSnippet: (token?: string) =>
          `ref_data = # Load your refenrace data and convert into a pandas DataFrame\nref_predictions = # Optional - Generate model predictions\nfeature_importance = # Optional - Calculate model feature importance\n\nref_data.head(2) \n\nfrom deepchecks.tabular import Dataset\n\nLABEL_COL = # Name of the label column\nCAT_FEATURES = # List of the categorical features names (list of strings)\nDATETIME_COL = # Name of the datetime column (optional for referance data)\n\nref_dataset = Dataset(ref_data, label=LABEL_COL, cat_features=CAT_FEATURES, datetime_name=DATETIME_COL)\n\nref_dataset\n\nfrom deepchecks_client import DeepchecksClient, create_schema, read_schema\n\nschema_file_path = "schema_file.yaml"\ncreate_schema(dataset=ref_dataset, schema_output_file=schema_file_path)\nread_schema(schema_file_path) \n\ndc_client = DeepchecksClient(host="${window.location.origin}", token="${token}") \n\n version_arguments = {\n'model_name' : "my_model",\n'version_name' : 'first_version',\n'schema' : schema_file_path,\n'feature_importance' : feature_importance, # Optional\n'reference_dataset': ref_dataset, # Optional\n'reference_predictions' : ref_predictions, # Optional\n'task_type' : 'regression'\n}\nmodel_version = dc_client.create_tabular_model_version(**version_arguments)`,
        docLink: {
          label: 'Read more >',
          url: 'https://docs.deepchecks.com/monitoring/stable/user-guide/tabular/auto_quickstarts/plot_quickstart.html#creating-a-new-model-version'
        }
      },
      {
        title: 'Uploading Production Data',
        description:
          'To start monitoring with Deepchecks, you need to upload the production data you want to monitor. In this example, we will upload the data and predictions stored for a single month as a batch. Similar to the reference data, predicted probabilities can also be sent for classification tasks to compute probability-based metrics like AUC, log_loss, brier score, etc.',
        codeSnippet:
          'prod_data = # Load your production data and convert into a pandas DataFrame\nprod_predictions = # Optional - Generate model predictions\n\n# Convert timestamp to UNIX timestamp format\ntimestamp_col = prod_data[DATETIME_COL].astype(int) // 10 ** 9\nmodel_version.log_batch(sample_ids=prod_data.index,\ndata=prod_data.drop([DATETIME_COL, LABEL_COL], axis=1),\ntimestamps=timestamp_col, predictions=prod_predictions)',
        secondCodeSnippet: (_token?: string) => ``,
        docLink: {
          label: 'Read more >',
          url: 'https://docs.deepchecks.com/monitoring/stable/user-guide/tabular/auto_quickstarts/plot_quickstart.html#uploading-production-data'
        }
      },
      {
        title: 'Updating the Labels',
        description:
          'In some real-world scenarios, data labels are only available later. We can update them retrospectively using global sample IDs, which are not specific to a version but apply globally to the model. To upload the labels, we need the model client.',
        codeSnippet:
          'model_client = dc_client.get_or_create_model(version_arguments["model_name"])\nmodel_client.log_batch_labels(sample_ids=prod_data.index, labels=prod_data[LABEL_COL])',
        secondCodeSnippet: (_token?: string) => '',
        docLink: {
          label: 'Read more >',
          url: 'https://docs.deepchecks.com/monitoring/stable/user-guide/tabular/auto_quickstarts/plot_quickstart.html#updating-the-labels'
        }
      }
    ]
  },
  skipBtnLabel: 'Skip'
};

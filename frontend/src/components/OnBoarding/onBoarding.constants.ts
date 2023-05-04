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
      docLink: { label: 'link to docs', url: '' }
    },
    {
      title: 'Creating a new model version',
      description:
        'In order to create a version we must specify the feature schema of the version, including the names and types of the features.\nIt is also highly recommended to provide the feature importance of these features, which is used by the system to prioritize features in various calculations and displays.',
      codeSnippet:
        'import numpy as np \n# General imports\n import pandas as pd\nfrom sklearn.ensemble import RandomForestClassifier \n\n\nfrom sklearn.model_selection import train_test_split \n from deepchecks.tabular.datasets.classification import iris\n # Load Data \niris_df = iris.load_data(data_format="Dataframe", as_train_test=False) \n\nlabel_col = "target"\ndf_train, df_test = train_test_split(iris_df, stratify=iris_df[label_col], random_state=0)',
      docLink: { label: 'Link to docs >', url: '' }
    },
    {
      title: 'Send the first production version',
      description:
        'In order to create a version we must specify the feature schema of the version, including the names and types of the features.\n\n\nIt is also highly recommended to provide the feature importance of these features, which is used by the system to prioritize features in various calculations and displays.',
      codeSnippet:
        'import numpy as np \n# General imports\n import pandas as pd\nfrom sklearn.ensemble import RandomForestClassifier \nfrom sklearn.model_selection import train_test_split \n from deepchecks.tabular.datasets.classification import iris\n # Load Data \niris_df = iris.load_data(data_format="Dataframe", as_train_test=False) \nlabel_col = "target"\ndf_train, df_test = train_test_split(iris_df, stratify=iris_df[label_col], random_state=0)',
      docLink: { label: 'Link to docs >', url: '' }
    },
    {
      title: 'Send labels',
      description: '',
      codeSnippet:
        'import numpy as np \n# General imports\n import pandas as pd\nfrom sklearn.ensemble import RandomForestClassifier \nfrom sklearn.model_selection import train_test_split \n from deepchecks.tabular.datasets.classification import iris\n # Load Data \niris_df = iris.load_data(data_format="Dataframe", as_train_test=False) \nlabel_col = "target"\ndf_train, df_test = train_test_split(iris_df, stratify=iris_df[label_col], random_state=0)',
      docLink: { label: 'Link to docs >', url: '' }
    }
  ]
};

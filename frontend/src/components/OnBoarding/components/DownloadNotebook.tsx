/* eslint-disable no-useless-escape */
import React from 'react';

import MenuBookIcon from '@mui/icons-material/MenuBook';

import * as FileSaver from 'file-saver';

import { StyledButton } from 'components/lib';

const constants = {
  text: 'Download Notebook',
  notebook: {
    demo: (token: string) => `
    {
      "nbformat": 4,
      "nbformat_minor": 0,
      "metadata": {
        "colab": {
          "provenance": []
        },
        "kernelspec": {
          "name": "python3",
          "display_name": "Python 3"
        },
        "language_info": {
          "name": "python"
        }
      },
      "cells": [
        {
          "cell_type": "markdown",
          "source": [
            "# **Welcome To Deepchecks !**",
            "Here is how you can quickly create your first model in Deepchecks.",
            "",
            "All You need is to follow the instructions, Good luck!"
          ],
          "metadata": {
            "id": "6ozMJDZcXunN"
          }
        },
        {
          "cell_type": "markdown",
          "source": [
            "## **Installing Deepchecks' SDK**"
          ],
          "metadata": {
            "id": "9YAl7u84uUld"
          }
        },
        {
          "cell_type": "code",
          "source": [
            "import sys ",
            "!{sys.executable} -m pip install -U deepchecks-client"
          ],
          "metadata": {
            "id": "NvC7hrUCX8Qi",
            "colab": {
              "base_uri": "https://localhost:8080/"
            },
            "outputId": "db96cb7f-c4b6-43f7-ee18-dba05e9784db"
          },
          "execution_count": null,
          "outputs": []
        },
        {
          "cell_type": "markdown",
          "source": [
            "# **Connect Deepchecks with your environment**",
            "To create a model version in Deepchecks, we will need to define the feature schema and preferably also provide referance data.",
            "",
            "The reference data is optional but necessary for certain checks. The easiest way to create a feature schema and provide the referance data is via a deepschecks' Dataset object."
          ],
          "metadata": {
            "id": "3mzmr6gfYBbK"
          }
        },
        {
          "cell_type": "markdown",
          "source": [
            "## **Creating a Dataset Object**",
            "For more information about the deepchecks' Dataset object see [link](https://docs.deepchecks.com/stable/tabular/usage_guides/dataset_object.html)."
          ],
          "metadata": {
            "id": "WyOSC6eNHYhM"
          }
        },
        {
          "cell_type": "code",
          "source": [
            "from deepchecks.tabular.datasets.regression.airbnb import load_data, load_pre_calculated_prediction, load_pre_calculated_feature_importance ",
            "",
            "ref_dataset, _ = load_data(data_format='Dataset') ",
            "ref_predictions, _ = load_pre_calculated_prediction() ",
            "feature_importance = load_pre_calculated_feature_importance() # Optional ",
            "feature_importance "
          ],
          "metadata": {
            "id": "cGARXoQvY_93"
          },
          "execution_count": null,
          "outputs": []
        },
        {
          "cell_type": "markdown",
          "source": [
            "## **Defining Data Schema**"
          ],
          "metadata": {
            "id": "ckfyIlmXtrG-"
          }
        },
        {
          "cell_type": "markdown",
          "source": [
            "The data schema is a yaml file contaning the names and types of the different features for the model version. </br>",
            "It can be generated autometically based on the Dataset object."
          ],
          "metadata": {
            "id": "o1GsbBiT2TCy"
          }
        },
        {
          "cell_type": "code",
          "source": [
            "from deepchecks_client import DeepchecksClient, create_schema, read_schema ",
            "",
            "schema_file_path = 'schema_file.yaml'",
            "create_schema(dataset=ref_dataset, schema_output_file=schema_file_path) ",
            "read_schema(schema_file_path) "
          ],
          "metadata": {
            "id": "w90v4-Hatmrc"
          },
          "execution_count": null,
          "outputs": []
        },
        {
          "cell_type": "markdown",
          "source": [
            "## **Creating a Model Version**",
            "****Please notice that you need to modify API_KEY and DEPLOYMENT_URL**"
          ],
          "metadata": {
            "id": "sZc0Rw6ct-5g"
          }
        },
        {
          "cell_type": "code",
          "source": [
            "import os ",
            "",
            "dc_client = DeepchecksClient(host='${window.location.origin}', token='${token}') ",
            "",
            "version_arguments = {",
            "    'model_name' : 'Airbnb',",
            "    'version_name' : 'ver_1',",
            "    'schema' : schema_file_path,",
            "    'feature_importance' : feature_importance,",
            "    'reference_dataset': ref_dataset,",
            "    'reference_predictions' : ref_predictions,",
            "    'task_type' : 'regression'",
            "}",
            "model_version = dc_client.create_tabular_model_version(**version_arguments)"
          ],
          "metadata": {
            "id": "KLz_QEr5tf7o"
          },
          "execution_count": null,
          "outputs": []
        },
        {
          "cell_type": "markdown",
          "source": [
            "# **Uploading Production Data**",
            "To start monitoring with Deepchecks, you need to upload the production data you want to monitor.",
            "In this example, we will upload the data and predictions stored for a single month as a batch.",
            "",
            "Similar to the reference data, predicted probabilities can also be sent for classification tasks to compute probability-based metrics like AUC, log_loss, brier score, etc."
          ],
          "metadata": {
            "id": "0Of1ZPTSZTY_"
          }
        },
        {
          "cell_type": "code",
          "source": [
            "timestamp, label_col = 'timestamp', 'price'",
            "_, prod_data = load_data(data_format='DataFrame')",
            "_, prod_predictions = load_pre_calculated_prediction()",
            "timestamp_col = prod_data[timestamp].astype(int) // 10 ** 9 ",
            "model_version.log_batch(sample_ids=prod_data.index,",
            "                        data=prod_data.drop([timestamp, label_col], axis=1), ",
            "                        timestamps=timestamp_col, predictions=prod_predictions)"
          ],
          "metadata": {
            "id": "dTe3T2USZeEx"
          },
          "execution_count": null,
          "outputs": []
        },
        {
          "cell_type": "markdown",
          "source": [
            "# **Updating the Labels (Optional)**",
            "In some real-world scenarios, data labels are only available later.",
            "We can update them retrospectively using global sample IDs, which are not specific to a version but apply globally to the model. To upload the labels, we need the model client."
          ],
          "metadata": {
            "id": "3-bUaXvXZgKY"
          }
        },
        {
          "cell_type": "code",
          "source": [
            "model_client = dc_client.get_or_create_model(version_arguments['model_name'])",
            "model_client.log_batch_labels(sample_ids=prod_data.index, labels=prod_data[label_col])"
          ],
          "metadata": {
            "id": "YzqDhw5KZnMr"
          },
          "execution_count": null,
          "outputs": []
        }
      ]
    }
    `,
    user: (token: string) => `
    {
      "nbformat": 4,
      "nbformat_minor": 0,
      "metadata": {
        "colab": {
          "provenance": []
        },
        "kernelspec": {
          "name": "python3",
          "display_name": "Python 3"
        },
        "language_info": {
          "name": "python"
        }
      },
      "cells": [
        {
          "cell_type": "markdown",
          "source": [
            "# **Welcome To Deepchecks !**",
            "Here is how you can quickly create your first model in Deepchecks.",
            "",
            "All You need is to follow the instructions, Good luck!"
          ],
          "metadata": {
            "id": "6ozMJDZcXunN"
          }
        },
        {
          "cell_type": "markdown",
          "source": [
            "## **Installing Deepchecks' SDK**"
          ],
          "metadata": {
            "id": "9YAl7u84uUld"
          }
        },
        {
          "cell_type": "code",
          "source": [
            "import sys ",
            "!{sys.executable} -m pip install -U deepchecks-client"
          ],
          "metadata": {
            "id": "NvC7hrUCX8Qi",
            "colab": {
              "base_uri": "https://localhost:8080/"
            },
            "outputId": "db96cb7f-c4b6-43f7-ee18-dba05e9784db"
          },
          "execution_count": null,
          "outputs": []
        },
        {
          "cell_type": "markdown",
          "source": [
            "# **Connect Deepchecks with your environment**",
            "To create a model version in Deepchecks, we will need to define the feature schema and preferably also provide referance data.",
            "",
            "The reference data is optional but necessary for certain checks. The easiest way to create a feature schema and provide the referance data is via a deepschecks' Dataset object."
          ],
          "metadata": {
            "id": "3mzmr6gfYBbK"
          }
        },
        {
          "cell_type": "markdown",
          "source": [
            "## **Creating a Dataset Object**",
            "For more information about the deepchecks' Dataset object see [link](https://docs.deepchecks.com/stable/tabular/usage_guides/dataset_object.html)."
          ],
          "metadata": {
            "id": "WyOSC6eNHYhM"
          }
        },
        {
          "cell_type": "code",
          "source": [
            "from deepchecks.tabular.datasets.regression.airbnb import load_data, load_pre_calculated_prediction, load_pre_calculated_feature_importance ",
            "",
            "ref_dataset, _ = load_data(data_format='Dataset') ",
            "ref_predictions, _ = load_pre_calculated_prediction() ",
            "feature_importance = load_pre_calculated_feature_importance() # Optional ",
            "feature_importance "
          ],
          "metadata": {
            "id": "cGARXoQvY_93"
          },
          "execution_count": null,
          "outputs": []
        },
        {
          "cell_type": "markdown",
          "source": [
            "## **Defining Data Schema**"
          ],
          "metadata": {
            "id": "ckfyIlmXtrG-"
          }
        },
        {
          "cell_type": "markdown",
          "source": [
            "The data schema is a yaml file contaning the names and types of the different features for the model version. </br>",
            "It can be generated autometically based on the Dataset object."
          ],
          "metadata": {
            "id": "o1GsbBiT2TCy"
          }
        },
        {
          "cell_type": "code",
          "source": [
            "from deepchecks_client import DeepchecksClient, create_schema, read_schema ",
            "",
            "schema_file_path = 'schema_file.yaml'",
            "create_schema(dataset=ref_dataset, schema_output_file=schema_file_path) ",
            "read_schema(schema_file_path) "
          ],
          "metadata": {
            "id": "w90v4-Hatmrc"
          },
          "execution_count": null,
          "outputs": []
        },
        {
          "cell_type": "markdown",
          "source": [
            "## **Creating a Model Version**",
            "****Please notice that you need to modify API_KEY and DEPLOYMENT_URL**"
          ],
          "metadata": {
            "id": "sZc0Rw6ct-5g"
          }
        },
        {
          "cell_type": "code",
          "source": [
            "import os ",
            "",
            "dc_client = DeepchecksClient(host='${window.location.origin}', token='${token}') ",
            "",
            "version_arguments = {",
            "    'model_name' : 'Airbnb',",
            "    'version_name' : 'ver_1',",
            "    'schema' : schema_file_path,",
            "    'feature_importance' : feature_importance,",
            "    'reference_dataset': ref_dataset,",
            "    'reference_predictions' : ref_predictions,",
            "    'task_type' : 'regression'",
            "}",
            "model_version = dc_client.create_tabular_model_version(**version_arguments)"
          ],
          "metadata": {
            "id": "KLz_QEr5tf7o"
          },
          "execution_count": null,
          "outputs": []
        },
        {
          "cell_type": "markdown",
          "source": [
            "# **Uploading Production Data**",
            "To start monitoring with Deepchecks, you need to upload the production data you want to monitor.",
            "In this example, we will upload the data and predictions stored for a single month as a batch.",
            "",
            "Similar to the reference data, predicted probabilities can also be sent for classification tasks to compute probability-based metrics like AUC, log_loss, brier score, etc."
          ],
          "metadata": {
            "id": "0Of1ZPTSZTY_"
          }
        },
        {
          "cell_type": "code",
          "source": [
            "timestamp, label_col = 'timestamp', 'price'",
            "_, prod_data = load_data(data_format='DataFrame')",
            "_, prod_predictions = load_pre_calculated_prediction()",
            "timestamp_col = prod_data[timestamp].astype(int) // 10 ** 9 ",
            "model_version.log_batch(sample_ids=prod_data.index,",
            "                        data=prod_data.drop([timestamp, label_col], axis=1), ",
            "                        timestamps=timestamp_col, predictions=prod_predictions)"
          ],
          "metadata": {
            "id": "dTe3T2USZeEx"
          },
          "execution_count": null,
          "outputs": []
        },
        {
          "cell_type": "markdown",
          "source": [
            "# **Updating the Labels (Optional)**",
            "In some real-world scenarios, data labels are only available later.",
            "We can update them retrospectively using global sample IDs, which are not specific to a version but apply globally to the model. To upload the labels, we need the model client."
          ],
          "metadata": {
            "id": "3-bUaXvXZgKY"
          }
        },
        {
          "cell_type": "code",
          "source": [
            "model_client = dc_client.get_or_create_model(version_arguments['model_name'])",
            "model_client.log_batch_labels(sample_ids=prod_data.index, labels=prod_data[label_col])"
          ],
          "metadata": {
            "id": "YzqDhw5KZnMr"
          },
          "execution_count": null,
          "outputs": []
        }
      ]
    }
    `
  }
};

const DownloadNotebook = ({ token, dataType }: { token: string; dataType: 'demo' | 'user' }) => {
  const handleDownload = () => {
    const blob = new Blob([constants.notebook[dataType](token)], { type: 'application/json' });
    FileSaver.saveAs(blob, 'onboarding.ipynb');
  };

  return (
    <StyledButton
      label={
        <>
          <MenuBookIcon />
          {constants.text}
        </>
      }
      onClick={handleDownload}
      sx={{ width: '280px', height: '44px' }}
    />
  );
};

export default DownloadNotebook;

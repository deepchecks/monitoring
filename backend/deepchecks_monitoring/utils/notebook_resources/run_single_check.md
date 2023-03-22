# Data Review

## Installation & Config

```python
# ! pip install -U deepchecks deepchecks-client
HOST = '{host}'
TOKEN = ENTER_TOKEN_HERE
```

```python
import pandas as pd
from deepchecks_client import DataFilter, DeepchecksClient, OperatorsEnum
from deepchecks_client.tabular.client import DeepchecksModelVersionClient

dc_client = DeepchecksClient(host=HOST, token=TOKEN)
```

```python
model_name = '{model_name}'
version_name = '{model_version_name}'
model_version_client: DeepchecksModelVersionClient = dc_client.get_model_version(model_name=model_name,
                                                                                 version_name=version_name)
```

## Getting the Data

The data is returned as a deepchecks 'Dataset' object, for addition information see [link](https://docs.deepchecks.com/stable/user-guide/tabular/dataset_object.html).

```python
start_time = '{start_time}'
end_time = '{end_time}'

filters = {filters}

dataset, y_pred, y_proba = \
    model_version_client.get_production_data(start_time=start_time, end_time=end_time, filters=filters, deepchecks_format=True)
```

```python
# Visulize and review main properties of the test dataset
print(dataset)
```

## Running the Check

```python
from {check_module} import {check_class}

check = {check_class}({check_params})
check_result = check.run(dataset, feature_importance=model_version_client.get_feature_importance(),
                         y_pred=y_pred, y_proba=y_proba,
                         model_classes=model_version_client.model_classes)
check_result.show()
```

## Running a Suite

A [suite](https://docs.deepchecks.com/stable/user-guide/general/deepchecks_hierarchy.html) is an ordered collection of checks, that can have conditions added to them.

The Suite enables displaying a concluding report for all of the Checks that ran.

```python
from deepchecks.tabular.suites import production_suite

suite_result = production_suite(is_comparative=False).run(dataset,
                                                          feature_importance=model_version_client.get_feature_importance(),
                                                          y_pred_train=y_pred, y_proba_train=y_proba,
                                                          model_classes=model_version_client.model_classes)
suite_result.show()
```

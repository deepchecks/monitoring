import pandas as pd
from deepchecks_client import DataFilter, DeepchecksClient, OperatorsEnum
from deepchecks_client.tabular.client import DeepchecksModelVersionClient

host = '{host}'
dc_client = DeepchecksClient(host=host, token='insert_your_token')
# cell end
model_name = '{model_name}'
version_name = '{model_version_name}'
model_version_client: DeepchecksModelVersionClient = dc_client.get_model_version(model_name=model_name,
                                                                                 version_name=version_name)
# cell end
start_time = '{start_time}'
end_time = '{end_time}'

filters = {filters}

dataset, y_pred, y_proba = \
    model_version_client.get_deepchecks_production_dataset(start_time=start_time, end_time=end_time, filters=filters)
# cell end
from {check_module} import {check_class}

check = {check_class}({check_params})

check_result = check.run(dataset, feature_importance=pd.Series(model_version_client.feature_importance),
                         y_pred=y_pred, y_proba=y_proba,
                         model_classes=model_version_client.model_classes)
check_result.show()
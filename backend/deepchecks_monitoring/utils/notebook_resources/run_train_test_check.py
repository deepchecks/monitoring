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

test_dataset, y_pred_test, y_proba_test = \
    model_version_client.get_deepchecks_production_dataset(start_time=start_time, end_time=end_time, filters=filters)

train_dataset, y_pred_train, y_proba_train = \
    model_version_client.get_deepchecks_reference_dataset(filters=filters)
# cell end
from {check_module} import {check_class}

check = {check_class}({check_params})

check_result = check.run(train_dataset=train_dataset, test_dataset=test_dataset,
                         feature_importance=model_version_client.get_feature_importance(),
                         y_pred_test=y_pred_test, y_proba_test=y_proba_test,
                         y_pred_train=y_pred_train, y_proba_train=y_proba_train,
                         model_classes=model_version_client.model_classes)
check_result.show()
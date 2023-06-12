from deepchecks.tabular.datasets.regression.airbnb import load_data, load_pre_calculated_prediction, load_pre_calculated_feature_importance
from deepchecks_client import DeepchecksClient, create_schema, read_schema

ref_dataset, prod_data = load_data(data_format="Dataset")
ref_predictions, prod_predictions = load_pre_calculated_prediction()
feature_importance = load_pre_calculated_feature_importance()  # Optional

schema_file_path = "schema_file.yaml"
create_schema(dataset=ref_dataset, schema_output_file=schema_file_path)
read_schema(schema_file_path)

dc_client = DeepchecksClient(
    host="YOUR_DEPLOYMENT_URL", token="YOUR_API_TOKEN")

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
model_client.log_batch_labels(
    sample_ids=prod_data.index, labels=prod_data[label_col])

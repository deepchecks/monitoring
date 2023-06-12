from deepchecks_client import DeepchecksClient, create_schema, read_schema
from deepchecks.tabular import Dataset

ref_data =  # Load your refenrace data and convert into a pandas DataFrame
ref_predictions =  # Optional - Generate model predictions
feature_importance =  # Optional - Calculate model feature importance

LABEL_COL =  # Name of the label column
CAT_FEATURES =  # List of the categorical features names (list of strings)
DATETIME_COL =  # Name of the datetime column (optional for referance data)

ref_dataset = Dataset(ref_data, label=LABEL_COL,
                      cat_features=CAT_FEATURES, datetime_name=DATETIME_COL)

schema_file_path = "schema_file.yaml"
create_schema(dataset=ref_dataset, schema_output_file=schema_file_path)
read_schema(schema_file_path)

dc_client = DeepchecksClient(host="https://localhost:3000",
                             token="ZGFzZGFzZGFzZGFzZGFzZDIxMzQxMjM0MTI0QGRlZXBjaGVja3MuY29t.7p6v1yPkiD9NEdJ1o2q6ZQ")

version_arguments = {
    'model_name': "my_model",
    'version_name': 'first_version',
    'schema': schema_file_path,
    'feature_importance': feature_importance,  # Optional
    'reference_dataset': ref_dataset,  # Optional
    'reference_predictions': ref_predictions,  # Optional
    'task_type': 'regression'
}
model_version = dc_client.create_tabular_model_version(**version_arguments)

prod_data =  # Load your production data and convert into a pandas DataFrame
prod_predictions =  # Optional - Generate model predictions

model_version.log_batch(
    sample_ids=prod_data.index,
    data=prod_data.drop([DATETIME_COL, LABEL_COL], axis=1),
    # Timestamps as unix timestamps in seconds
    timestamps=prod_data[DATETIME_COL],
    predictions=prod_predictions
)

model_client = dc_client.get_or_create_model(version_arguments["model_name"])
model_client.log_batch_labels(
    sample_ids=prod_data.index, labels=prod_data[LABEL_COL])

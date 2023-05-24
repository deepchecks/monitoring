import secrets
from time import perf_counter
from time import sleep

import pandas as pd
from deepchecks.tabular.datasets.regression.avocado import load_data, load_fitted_model
from deepchecks_client import DeepchecksClient, create_schema, TabularModelClient
import pendulum as pdl
import numpy as np


def upload_data(model_name, time_for_data):
    for hour in range(hours_per_batch):
        model_client: TabularModelClient = dc_client.get_or_create_model(model_name, task_type='regression')
        # Replace version each sunday
        version_name = time_for_data.start_of('week').to_iso8601_string()
        version_client = model_client.version(name=version_name, create_if_not_exists=False)
        if version_client is None:
            version_client = model_client.version(name=version_name, schema=schema_file_path)
            ref_preds = model.predict(ref_dataset.features_columns)
            version_client.upload_reference(ref_dataset, ref_preds)

        prod_data_sample = prod_data.sample(rows_per_hour)
        batch = secrets.token_hex(20)
        indices = np.array([f'{batch}-{i}' for i in range(len(prod_data_sample))])
        time_with_offset = time_for_data.add(hours=hour)
        timestamps = [time_with_offset.int_timestamp] * len(prod_data_sample)
        prod_predictions = model.predict(prod_data_sample.features_columns)
        start = perf_counter()
        version_client.log_batch(sample_ids=indices, data=prod_data_sample.features_columns,
                                 timestamps=timestamps, predictions=prod_predictions)
        duration = (perf_counter() - start)
        print(f'Logged {len(prod_data_sample)} samples in {duration} seconds for time {time_with_offset}')
        start = perf_counter()
        model_client.log_batch_labels(sample_ids=indices, labels=prod_data_sample.label_col)
        duration = perf_counter() - start
        print(f'Logged {len(prod_data_sample)} labels in {duration} seconds for time {time_with_offset}')


if __name__ == '__main__':
    ref_dataset, prod_data = load_data(data_format='Dataset')
    model = load_fitted_model()
    timestamp = 'Date'
    schema_file_path = 'schema_file.yaml'
    create_schema(dataset=ref_dataset, schema_output_file=schema_file_path)

    host = 'https://app.deepchecks.com'
    token = ''
    dc_client = DeepchecksClient(host=host, token=token)
    hours_per_batch = 5
    rows_per_hour = 13_000
    sleep_between_batches = 60
    start_time = pdl.parse('2023-04-15 00:00:00')
    model_name = 'avocado'

    if len(prod_data.data) < rows_per_hour:
        data = prod_data.data
        multiply_by = rows_per_hour // len(data) + 1
        data = pd.concat([data] * multiply_by, ignore_index=True)
        prod_data = prod_data.copy(data)

    time = start_time
    while start_time < pdl.now():
        upload_data(model_name, time)
        time = time.add(hours=hours_per_batch)
        print(f'sleep for {sleep_between_batches} seconds')
        sleep(sleep_between_batches)

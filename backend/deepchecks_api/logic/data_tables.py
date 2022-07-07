from sqlalchemy import String, Column, DateTime, Float, ARRAY

from deepchecks_api.models.model import TaskType


def get_monitor_table_meta_columns():
    return [
        Column('_dc_sample_id', String(30), primary_key=True),
        Column('_dc_time', DateTime(timezone=True), index=True),
    ]


def get_task_related_table_columns(task_type: TaskType):
    if task_type == TaskType.REGRESSION:
        return [
            Column('_dc_label', Float, index=True),
            Column('_dc_prediction_value', Float, index=True)
        ]
    elif task_type == TaskType.CLASSIFICATION:
        return [
            Column('_dc_label', String, index=True),
            Column('_dc_prediction_label', String, index=True),
            Column('_dc_prediction_value', ARRAY(Float), index=True)
        ]
    else:
        raise Exception(f'Not supported task type {task_type}')

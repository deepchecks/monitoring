# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

"""Module defining utility classes for vision objects."""
import base64

import boto3
import cv2
import numpy as np

from deepchecks_monitoring.schema_models.model_version import ModelVersion


def s3_to_cv2_image(uri: str, s3_bucket: str = None, bucket=None) -> np.ndarray:
    """Load an image from s3 into a cv2 image.

    Parameters
    ----------
    uri : str
        The uri of the image to load.
    s3_bucket : str, optional
        The name of the s3 bucket to load the image from.
    bucket : boto3.resources.factory.s3.Bucket, optional
        The s3 bucket to load the image from.

    Returns
    -------
    np.ndarray
        The loaded image.
    """
    _, path = uri.split(":", 1)
    path = path.lstrip("/")
    bucket_name, path = path.split("/", 1)
    if bucket is not None:
        assert s3_bucket == bucket_name, f"unkown bucket '{bucket_name}' received, excpected '{s3_bucket}'"
    else:
        bucket = boto3.resource("s3").Bucket(bucket_name)

    img = bucket.Object(path).get().get("Body").read()
    img = cv2.imdecode(np.asarray(bytearray(img)), cv2.IMREAD_ANYCOLOR)
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)  # because the s3 has the images as BGR


def _cv2_img_to_s3(img: np.ndarray, model_id: int, model_version_id: int,
                   sample_id: str, org_id: int, s3_bucket: str, s3_client=None):
    s3_client = boto3.client("s3") if s3_client is None else s3_client
    image_string = cv2.imencode(".jpg", img)[1].tostring()
    image_key = f"{org_id}/{model_id}/{model_version_id}/{sample_id}.jpg"
    s3_client.put_object(Bucket=s3_bucket, Key=image_key, Body=image_string)
    return f"s3://{s3_bucket}/{image_key}"


def _base64_img_2_cv2(img_str: str) -> np.ndarray:
    nparr = np.fromstring(base64.decodebytes(img_str.encode("utf-8")), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_ANYCOLOR)
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)  # because the client uploads the image as BGR


def base64_image_data_to_s3(base64_image_data: str, sample_id: str,
                            model_version: ModelVersion, org_id: int, s3_bucket: str, s3_client=None):
    """Upload a base64 encoded image to an S3 bucket.

    Parameters
    ----------
    base64_image_data : str
        The base64 encoded image data.
    sample_id : str
        The sample id.
    model_version : ModelVersion
        The model version.
    org_id : int
        The organization id.
    s3_bucket : str
        The S3 bucket name.
    s3_client : boto3.client, optional
        The S3 client.

    Returns
    -------
    str
        The S3 key.
    """
    img = _base64_img_2_cv2(base64_image_data)
    return _cv2_img_to_s3(img, model_version.model_id,
                          model_version.id, sample_id, org_id, s3_bucket, s3_client)

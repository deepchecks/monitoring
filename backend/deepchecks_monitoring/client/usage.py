# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
# flake8: noqa
# noqa
import pandas as pd
from deepchecks import Dataset
from deepchecks_client import DeepchecksClient

dc_client = DeepchecksClient(host='http://127.0.0.1:5000')

# model_client = dc_client.create_model('my model', 'classification', 'description')
# OR if model already exists
model_client = dc_client.model_client(model_id=1)
#
# version_client = model_client.create_version('v1', features={'a': 'numeric'}, non_features={'b': 'categorical'},
#                                              feature_importance={'a': 0.9})
# # OR if version already exists
version_client = model_client.version_client(model_version_id=1)
#
version_client.log_sample(sample_id='x1', timestamp=178947983, prediction_value=[0.2, 0.8], prediction_label='1',
                          a=333)
version_client.update_sample(sample_id='x1', label='0', b='cat1')
#
ref = pd.DataFrame(data={'a': [1, 2, 3], 'label': ['0', '0', '0']})
ref_dataset = Dataset(ref, label='label')
# Still not sure how to get prediction/label, whether inside the dataframe or as prediction=ndarray
version_client.upload_reference(ref_dataset)

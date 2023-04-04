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

# Create or get a model
# model_client = dc_client.create_model('itays model', 'classification', 'description')
# OR if model already exists
model_client = dc_client.model_client(model_id=6)
# Create or get a version
# version_client = model_client.create_version('v1', features={'a': 'numeric'}, additional_data={'b': 'categorical'},
#                                              feature_importance={'a': 0.9})
# OR if version already exists
version_client = model_client.version_client(model_version_id=1)

# Upload samples
for i in range(100):
    version_client.log_sample(sample_id=f'x{i}', timestamp=178947983, prediction_proba=[0.2, 0.8], prediction='1',
                              a=333)
# Send to server
version_client.send()

# Update sample
version_client.update_sample(sample_id='x1', label='0', b='cat1')

# Upload reference
ref = pd.DataFrame(data={'a': [1, 2, 3], 'label': ['0', '0', '0']})
ref_dataset = Dataset(ref, label='label')
# # Still not sure how to get prediction/label, whether inside the dataframe or as prediction=ndarray
version_client.upload_reference(ref_dataset)


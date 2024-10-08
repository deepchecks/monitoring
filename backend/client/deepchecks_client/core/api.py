# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
#
"""Backend API."""
import json
import typing as t
import warnings
from copy import copy
from datetime import datetime

import deepchecks_client
import httpx
import packaging.version
import pandas as pd
from deepchecks_client.core.utils import DataFilter, maybe_raise, parse_timestamp
from httpx import URL

__all__ = ['API']

TAPI = t.TypeVar('TAPI', bound='API')


# TODO:
# apply `typing.overload` to API class method for better dev experience

class API:
    """Backend API.

    Parameters
    ----------
    session : httpx.Client
        The HTTP session object
    """

    session: httpx.Client
    original_host: URL

    @classmethod
    def instantiate(cls: t.Type[TAPI], host: str, token: t.Optional[str] = None) -> TAPI:
        """Create instance of API.

        Parameters
        ----------
        host : str
            The host URL.
        token : str, optional
            The API token from deepchecks.
        """
        headers = {'Authorization': f'Basic {token}'} if token else None
        return cls(session=httpx.Client(base_url=host, headers=headers, timeout=60))

    def __init__(self, session: httpx.Client):
        self.session = copy(session)
        self.original_host = self.session.base_url
        self.session.base_url = self.session.base_url.join('/api/v1')

        try:
            backend_version = packaging.version.parse(self.retrieve_backend_version())
            client_version = packaging.version.parse(deepchecks_client.__version__)
        except packaging.version.InvalidVersion:
            warnings.warn(
                'Not able to compare backend and client versions, '
                'backend or client use incorrect or legacy versioning schema.'
            )
        else:
            if backend_version.major != client_version.major:
                warnings.warn(
                    'You are using an old, potentially incompatible with the current API, client version. '
                    'Upgrade "deepchecks_client" version by running:\n'
                    '>> pip install -U deepchecks_client'
                )

    def say_hello(self, raise_on_status: bool = True) -> t.Optional[httpx.Response]:
        """Verify connectivity.

        Parameters
        ----------
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        httpx.Response
            The response object.
        """
        if raise_on_status:
            maybe_raise(self.session.get('say-hello'))
        else:
            return self.session.get('say-hello')

    def retrieve_backend_version(self) -> str:
        """Return current active backend version.

        Returns
        -------
        str : backend version string
        """
        payload = maybe_raise(
            self.session.get('backend-version')
        ).json()
        return payload['version']

    def get_samples_count(
            self,
            model_version_id: int,
            raise_on_status: bool = True,
    ) -> t.Union[t.Dict[str, int], httpx.Response]:
        """Get the amount of samples uploaded.

        Parameters
        ----------
        model_version_id : int
            The model version ID.
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        dict
            The response object - {"monitor_count": <count>, "reference_count": <count>}
        """
        if raise_on_status:
            return maybe_raise(
                self.session.get(f'model-versions/{model_version_id}/count-samples'),
                msg=f'Failed to obtain ModelVersion(id:{model_version_id}).\n{{error}}'
            ).json()
        else:
            return self.session.get(f'model-versions/{model_version_id}/count-samples')

    def fetch_model_version(
            self,
            model_version_id: int,
            raise_on_status: bool = True,
    ) -> t.Union[t.Dict[str, t.Any], httpx.Response]:
        """Fetch the model version.

        Parameters
        ----------
        model_version_id : int
            The model version ID.
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        dict
            The response object.
        """
        if raise_on_status:
            return maybe_raise(
                self.session.get(f'model-versions/{model_version_id}'),
                msg=f'Failed to obtain ModelVersion(id:{model_version_id}).\n{{error}}'
            ).json()
        else:
            return self.session.get(f'model-versions/{model_version_id}')

    def fetch_model_version_schema(
            self,
            model_version_id: int,
            raise_on_status: bool = True,
    ) -> t.Union[t.Dict[str, t.Any], httpx.Response]:
        """Fetch model version schema.

        Parameters
        ----------
        model_version_id : int
            The model version ID.
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        dict
            The response object.
        """
        if raise_on_status:
            return maybe_raise(
                self.session.get(f'model-versions/{model_version_id}/schema'),
                msg=f'Failed to obtain ModelVersion(id:{model_version_id}) schema.\n{{error}}'
            ).json()
        else:
            return self.session.get(f'model-versions/{model_version_id}/schema')

    def upload_samples(
            self,
            model_version_id: int,
            samples: t.List[t.Dict[str, t.Any]],
            raise_on_status: bool = True,
    ) -> t.Optional[httpx.Response]:
        """Upload production samples.

        Parameters
        ----------
        model_version_id : int
            The model version ID.
        samples : list
            The list of samples to upload.
        raise_on_status : bool
            Raise exception if status code is not 200.

        Returns
        -------
         httpx.Response
            The response object.
        """
        if raise_on_status:
            maybe_raise(
                self.session.post(f'model-versions/{model_version_id}/data', json=samples),
                msg='Samples upload failure.\n{error}'
            )
        else:
            return self.session.post(f'model-versions/{model_version_id}/data', json=samples)

    def log_labels(
            self,
            model_id: int,
            data: t.List[t.Dict[str, t.Any]],
            raise_on_status: bool = True,
    ) -> t.Optional[httpx.Response]:
        """Update production samples.

        Parameters
        ----------
        model_id : int
            The model ID.
        data : list
            The list of samples to upload.
        raise_on_status : bool
            Raise exception if status code is not 200.

        Returns
        -------
        httpx.Response
            The response object.
        """
        response = self.session.put(f'model/{model_id}/labels', json=data)

        if raise_on_status:
            maybe_raise(response, msg='Samples update failure.\n{error}')
        else:
            return response

    def upload_reference(
            self,
            model_version_id: int,
            reference: t.AnyStr,
            raise_on_status: bool = True,
    ):
        """Upload reference data.

        Parameters
        ----------
        model_version_id : int
            The model version ID.
        reference
            The reference data.
        raise_on_status : bool
            Raise exception if status code is not 200.

        Returns
        -------
        httpx.Response
            The response object.
        """
        if raise_on_status:
            maybe_raise(
                self.session.post(
                    f'model-versions/{model_version_id}/reference',
                    files={'batch': reference.encode()}
                ),
                msg='Reference batch upload failure.\n{error}'
            )
        else:
            return self.session.post(
                f'model-versions/{model_version_id}/reference',
                files={'batch': reference.encode()}
            )

    def fetch_model_version_time_window_statistics(
            self,
            model_version_id: int,
            start_time: t.Optional[str] = None,
            end_time: t.Optional[str] = None,
            raise_on_status: bool = True
    ) -> t.Union[t.Dict[str, t.Any], httpx.Response]:
        """Fetch model version time window statistics.

        Parameters
        ----------
        model_version_id : int
            The model version ID
        start_time : Optional[str] , default None
            The start time of the window
        end_time : Optional[str] , default None
            The end time of the window
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        httpx.Response
            The response object.
        """
        if raise_on_status:
            return maybe_raise(
                self.session.request(
                    'get',
                    url=f'model-versions/{model_version_id}/time-window-statistics',
                    json={'start_time': start_time, 'end_time': end_time}
                ),
                msg='Failed to get statistics for samples within provided time window.\n{error}'
            ).json()
        else:
            return self.session.request(
                'get',
                url=f'model-versions/{model_version_id}/time-window-statistics',
                json={'start_time': start_time, 'end_time': end_time}
            )

    def create_model(
            self,
            model: t.Dict[str, t.Any],
            raise_on_status: bool = True
    ) -> t.Union[httpx.Response, t.Dict[str, t.Any]]:
        """Create model.

        Parameters
        ----------
        model : dict
            The model to create.
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        httpx.Response
            The response object.
        """
        if raise_on_status:
            return maybe_raise(
                self.session.post('models', json=model),
                msg='Failed to create a new model instance.\n{error}'
            ).json()
        else:
            return self.session.post('models', json=model)

    def create_model_notes(
            self,
            model_id: int,
            notes: t.List[t.Dict[str, str]],
            raise_on_status: bool = True
    ) -> t.Union[httpx.Response, t.Dict[str, t.Any]]:
        """Create model notes.

        Parameters
        ----------
        model_id: int
            numerical model identifier
        notes : List[Dict[str, str]]
            The model to create.
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        Union[httpx.Response, List[Dict[str, Any]]]
        """
        response = self.session.post(f'models/{model_id}/notes', json=notes)
        return (
            response
            if not raise_on_status
            else maybe_raise(response, msg='Failed to create model notes.\n{error}').json()
        )

    def delete_model_note(
            self,
            note_id: int,
            raise_on_status: bool = True
    ) -> t.Optional[httpx.Response]:
        """Delete model note.

        Parameters
        ----------
        note_id : int
            The model note id
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        httpx.Response
            The response object.
        """
        response = self.session.delete(f'models-notes/{note_id}')
        return (
            response
            if not raise_on_status
            else maybe_raise(response, msg=f'Failed to delete ModelNote(id:{note_id}).\n{{error}}')
        )

    def fetch_model_notes(
            self,
            model_id: int,
            raise_on_status: bool = True
    ) -> t.Union[httpx.Response, t.List[t.Dict[str, t.Any]]]:
        """Fetch list of model notes.

        Parameters
        ----------
        model_id : int
            The model id
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        Union[httpx.Response, List[Dict[str, Any]]]
        """
        response = self.session.get(f'models/{model_id}/notes')
        return (
            response
            if not raise_on_status
            else maybe_raise(
                response,
                msg=f'Failed to retrieve Model(id:{model_id}) notes.\n{{error}}'
            ).json()
        )

    def delete_model_by_id(
            self,
            model_id: int,
            raise_on_status: bool = True
    ) -> t.Optional[httpx.Response]:
        """Delete model by its numerical identifier.

        Parameters
        ----------
        model_id : int
            The model id
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        httpx.Response
            The response object.
        """
        if raise_on_status:
            maybe_raise(
                self.session.delete(f'models/{model_id}'),
                msg=f'Failed to drop Model(id:{model_id}).\n{{error}}'
            )
        else:
            return self.session.delete(f'models/{model_id}')

    def delete_model_by_name(
            self,
            model_name: str,
            raise_on_status: bool = True
    ) -> t.Optional[httpx.Response]:
        """Delete model by its name.

        Parameters
        ----------
        model_name : str
            The model name.
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        httpx.Response
            The response object.
        """
        if raise_on_status:
            maybe_raise(
                self.session.delete(f'models/{model_name}', params={'identifier_kind': 'name'}),
                msg=f'Failed to drop Model(name:{model_name}).\n{{error}}'
            )
        else:
            return self.session.delete(f'models/{model_name}', params={'identifier_kind': 'name'})

    def fetch_model_by_name(
            self,
            model_name: str,
            raise_on_status: bool = True
    ) -> t.Union[httpx.Response, t.Dict[str, t.Any]]:
        """Fetch model record by its name.

        Parameters
        ----------
        model_name : str
            The model name
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        Union[httpx.Response, list]
            The response object.
        """
        if raise_on_status:
            return maybe_raise(self.session.get(f'models/{model_name}', params={'identifier_kind': 'name'}),
                               msg=f'Failed to obtain Model(name:{model_name}).\n{{error}}').json()
        else:
            return self.session.get(f'models/{model_name}', params={'identifier_kind': 'name'})

    def fetch_model_by_id(
            self,
            model_id: int,
            raise_on_status: bool = True
    ) -> t.Union[httpx.Response, t.Dict[str, t.Any]]:
        """Fetch model record by its numerical identifier.

        Parameters
        ----------
        model_id : int
            The model id.
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        Union[httpx.Response, list]
            The response object.
        """
        if raise_on_status:
            return maybe_raise(
                self.session.get(f'models/{model_id}'),
                msg=f'Failed to obtain Model(id:{model_id}).\n{{error}}'
            ).json()
        else:
            return self.session.get(f'models/{model_id}')

    def fetch_all_model_versions(
            self,
            model_id: int,
            raise_on_status: bool = True
    ) -> t.Union[t.List[t.Dict[str, t.Any]], httpx.Response]:
        """Fetch model versions.

        Parameters
        ----------
        model_id : int
            The model id.
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        Union[list, httpx.Response]
            The response object.
        """
        if raise_on_status:
            return maybe_raise(
                self.session.get(f'models/{model_id}/versions'),
                msg=f'Failed to retrieve existing versions for model id {model_id}. \n{{error}}'
            ).json()
        else:
            return self.session.get(f'models/{model_id}/versions')

    def create_model_version(
            self,
            model_id: int,
            model_version: t.Dict[str, t.Any],
            raise_on_status: bool = True
    ) -> t.Union[httpx.Response, t.Dict[str, t.Any]]:
        """Create model version.

        Parameters
        ----------
        model_id : int
            The model ID.
        model_version : dict
            The model version object.
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        Union[list, httpx.Response]
            The response object.
        """
        if raise_on_status:
            return maybe_raise(
                self.session.post(f'models/{model_id}/version', json=model_version),
                msg='Failed to create new model version.\n{error}'
            ).json()
        else:
            return self.session.post(f'models/{model_id}/version', json=model_version)

    def update_model_version(
            self,
            model_version_id: int,
            data: t.Dict[str, t.Any],
            raise_on_status: bool = True
    ) -> t.Optional[httpx.Response]:
        """Update model version.

        Parameters
        ----------
        model_version_id : int
            The model version ID.
        data : dict
            The data of the model version to update.
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        httpx.Response
            The response object.
        """
        if raise_on_status:
            maybe_raise(
                self.session.put(f'model-versions/{model_version_id}', json=data),
                msg='Failed to update model version.\n{error}'
            )
        else:
            return self.session.put(f'model-versions/{model_version_id}', json=data)

    def delete_model_version_by_id(
            self,
            model_version_id: int,
            raise_on_status: bool = True,
    ) -> t.Optional[httpx.Response]:
        """Delete a model by version ID.

        Parameters
        ----------
        model_version_id : int
            The model version ID.
        raise_on_status
            Raise exception if status code is not 200.

        Returns
        -------
        httpx.Response
            The response object.
        """
        if raise_on_status:
            maybe_raise(
                self.session.delete(f'model-versions/{model_version_id}'),
                msg=f'Failed to delete ModelVersion(id:{model_version_id})\n{{error}}'
            )
        else:
            return self.session.delete(f'model-versions/{model_version_id}')

    def get_model_version_reference_data(
            self,
            model_version_id: int,
            rows_count: int = 10_000,
            filters: t.List[DataFilter] = None,
            raise_on_status: bool = True,
    ) -> t.Union[pd.DataFrame, httpx.Response]:
        """Get reference data for a model version.

        Parameters
        ----------
        model_version_id : int
            The model version id.
        rows_count : int, optional
            The number of rows to return (random sampling will be used).
        filters : t.List[DataFilter], optional
            Data filters to apply. Used in order to received a segment of the data based on selected properties.
            Required format for filters and possible operators are detailed under the respected objects
            which can be found at:
            `from deepchecks_client import DataFilter, OperatorsEnum`
        raise_on_status : bool, optional
            Whether to raise an exception if the status is not 200.

        Returns
        -------
        t.Union['pandas'.DataFrame, httpx.Response]
            The reference data or a plain response if raise_on_status is False.
        """
        data = {'rows_count': rows_count}
        if filters is not None and len(filters) > 0:
            data['filter'] = {'filters': filters}
        resp = self.session.post(f'model-versions/{model_version_id}/get-ref-data', json=data)
        if raise_on_status:
            maybe_raise(
                resp,
                msg=f'Failed to get reference data for ModelVersion(id:{model_version_id})\n{{error}}'
            )
            json_data = json.loads(resp.json())
            return pd.DataFrame.from_dict(json_data)
        return resp

    def get_model_version_production_data(
            self,
            model_version_id: int,
            start_time: t.Union[datetime, str, int],
            end_time: t.Union[datetime, str, int],
            rows_count: int = 10_000,
            filters: t.List[DataFilter] = None,
            raise_on_status: bool = True,
    ) -> t.Union[pd.DataFrame, httpx.Response]:
        """Get production data for a model version on a specific window.

        Parameters
        ----------
        model_version_id : int
            The model version id.
        start_time : t.Union[datetime, str, int]
            The start time timestamp.
                - int: Unix timestamp
                - str: timestamp in ISO8601 format
                - datetime: If no timezone info is provided on the datetime assumes local timezone.
        end_time : t.Union[datetime, str, int]
            The end time timestamp.
                - int: Unix timestamp
                - str: timestamp in ISO8601 format
                - datetime: If no timezone info is provided on the datetime assumes local timezone.
        rows_count : int, optional
            The number of rows to return (random sampling will be used).
        filters : t.List[DataFilter], optional
            Data filters to apply. Used in order to received a segment of the data based on selected properties.
            Required format for filters and possible operators are detailed under the respected objects
            which can be found at:
            `from deepchecks_client import DataFilter, OperatorsEnum`
        raise_on_status : bool, optional
            Whether to raise an exception if the status is not 200.

        Returns
        -------
        t.Union['pandas'.DataFrame, httpx.Response]
            The production data or a plain response if raise_on_status is False.
        """
        start_time = parse_timestamp(start_time).isoformat()
        end_time = parse_timestamp(end_time).isoformat()
        data = {'start_time': start_time, 'end_time': end_time,
                'rows_count': rows_count}
        if filters is not None and len(filters) > 0:
            data['filter'] = {'filters': filters}
        resp = self.session.post(f'model-versions/{model_version_id}/get-prod-data', json=data)
        if raise_on_status:
            maybe_raise(
                resp,
                msg=f'Failed to get production data for ModelVersion(id:{model_version_id})\n{{error}}'
            )
            json_data = json.loads(resp.json())
            return pd.DataFrame.from_dict(json_data)
        return resp

    def delete_model_version_by_name(
            self,
            model_name: str,
            model_version_name: str,
            raise_on_status: bool = True,
    ) -> t.Optional[httpx.Response]:
        """Delete a model by version ID.

        Parameters
        ----------
        model_name : str
            The model name.
        model_version_name : str
            The model version name.
        raise_on_status
            Raise exception if status code is not 200.

        Returns
        -------
        httpx.Response
            The response object.
        """
        params = {'identifier_kind': 'name'}
        path = f'models/{model_name}/model-versions/{model_version_name}'
        if raise_on_status:
            return maybe_raise(
                self.session.delete(path, params=params),
                msg=f'Failed to delete ModelVersion(name:{model_version_name}, model:{model_name})\n{{error}}'
            )
        else:
            return self.session.delete(path, params=params)

    def fetch_model_version_by_id(
            self,
            model_version_id: int,
            raise_on_status: bool = True
    ) -> t.Union[httpx.Response, t.Dict[str, t.Any]]:
        """Fetch the model version by its ID.

        Parameters
        ----------
        model_version_id : int
            The model version ID.
        raise_on_status : bool, optional
            Raise exceptions if status code is not 200.

        Returns
        -------
        Union[httpx.Response, dict]
            The response object.
        """
        response = self.session.get(f'model-versions/{model_version_id}')
        if raise_on_status:
            return maybe_raise(
                response=response,
                msg='Failed to retrieve model version by id.\n{error}'
            ).json()
        else:
            return response

    def fetch_model_version_by_name(
            self,
            model_name: str,
            model_version_name: str,
            raise_on_status: bool = True
    ) -> t.Union[httpx.Response, t.Dict[str, t.Any]]:
        """Fetch the model version by its name.

        Parameters
        ----------
        model_name : str
            The model name.
        model_version_name : str
            The model version name.
        raise_on_status : bool, optional
            Raise exceptions if status code is not 200.

        Returns
        -------
        Union[httpx.Response, dict]
            The response object.
        """
        response = self.session.get(f'models/{model_name}/model-versions/{model_version_name}')
        if raise_on_status:
            return maybe_raise(
                response=response,
                msg='Failed to retrieve model version by name.\n{error}'
            ).json()
        else:
            return response

    def create_checks(
            self,
            model_id: int,
            checks: t.List[t.Dict[str, t.Any]],
            raise_on_status: bool = True
    ) -> t.Union[httpx.Response, t.List[t.Dict[str, t.Any]]]:
        """Create checks.

        Parameters
        ----------
        model_id : int
            The model ID
        checks : list
            Checks that will be created
        raise_on_status : bool, default=true
            Whether to raise error on bad status code or not

        Returns
        -------
        Union[httpx.Response, dict]
            The response from the server
        """
        if raise_on_status:
            return maybe_raise(
                self.session.post(url=f'models/{model_id}/checks', json=checks),
                msg='Failed to create new check instances.\n{error}'
            ).json()
        else:
            return self.session.post(url=f'models/{model_id}/checks', json=checks)

    def fetch_all_model_checks_by_id(
            self,
            model_id: int,
            raise_on_status: bool = True
    ) -> t.Union[httpx.Response, t.List[t.Dict[str, t.Any]]]:
        """Fetch all model checks.

        Parameters
        ----------
        model_id : int
            The model ID.
        raise_on_status : bool, optional
            Whether to raise error on bad status code or not

        Returns
        -------
        Union[httpx.Response, list]
            The response from the server
        """
        if raise_on_status:
            return maybe_raise(
                self.session.get(f'models/{model_id}/checks'),
                msg=f'Failed to obtain Model(id:{model_id}) checks.\n{{error}}'
            ).json()
        else:
            return self.session.get(f'models/{model_id}/checks')

    def fetch_all_model_checks_by_name(
            self,
            model_name: str,
            raise_on_status: bool = True
    ):
        """Fetch all model checks.

        Parameters
        ----------
        model_name : str
            The model name
        raise_on_status : bool, optional
            Whether to raise error on bad status code or not
        """
        # TODO: corresponding PR is not merged into main yet
        raise NotImplementedError()

    def create_alert_rule(
            self,
            monitor_id: int,
            alert_rule: t.Dict[str, t.Any],
            raise_on_status: bool = True
    ) -> t.Union[httpx.Response, t.Dict[str, t.Any]]:
        """Create alert rule.

        Parameters
        ----------
        monitor_id : int
            The ID of the monitor
        alert_rule : dict
            The alert rule to create
        raise_on_status : bool
            Whether to raise error on bad status code or not

        Returns
        -------
        Union[httpx.Response, dict]
            The response from the server
        """
        if raise_on_status:
            return maybe_raise(
                self.session.post(url=f'monitors/{monitor_id}/alert-rules', json=alert_rule),
                msg='Failed to create new alert for check.\n{error}'
            ).json()
        else:
            return self.session.post(url=f'monitors/{monitor_id}/alert-rules', json=alert_rule)

    def fetch_alert_rule(
            self,
            alert_rule_id: int,
            raise_on_status: bool = True
    ) -> t.Union[httpx.Response, t.Dict[str, t.Any]]:
        """Create alert rule.

        Parameters
        ----------
        alert_rule_id : int
            The ID of the alert rule
        raise_on_status : bool
            Whether to raise error on bad status code or not

        Returns
        -------
        Union[httpx.Response, Dict[str, Any]]
            The response from the server
        """
        if raise_on_status:
            return maybe_raise(
                self.session.get(url=f'alert-rules/{alert_rule_id}'),
                msg='Failed to fetch alert rule.\n{error}'
            ).json()
        else:
            return self.session.get(url=f'alert-rules/{alert_rule_id}')

    def create_alert_webhook(self, name: str, https_url: str, http_method: str, description: str = '',
                             http_headers: t.Optional[t.Dict[str, str]] = None,
                             notification_levels: t.Optional[t.List[str]] = None,
                             raise_on_status: bool = True) -> httpx.Response:
        """Create alert webhook.

        Parameters
        ----------
        name : str
            The name of the webhook
        https_url : str
            The url of the webhook
        http_method : str
            The http method of the webhook
            expected: GET, POST
        description : str, optional
            The description of the webhook
        http_headers : dict, optional
            The http headers of the webhook
        notification_levels : list, optional
            The notification levels of the webhook
        raise_on_status : bool
            Whether to raise error on bad status code or not

        Returns
        -------
        httpx.Response
            The response from the server
        """
        webhook = {
            'name': name,
            'http_url': https_url,
            'http_method': http_method,
            'description': description,
            'http_headers': http_headers,
            'notification_levels': notification_levels,
            'kind': 'STANDARD'
        }
        if raise_on_status:
            return maybe_raise(
                self.session.post(url='alert-webhooks', json=webhook),
                msg='Failed to create new alert webhook.\n{error}'
            ).json()
        else:
            return self.session.post(url='alert-webhooks', json=webhook)

    def create_pager_duty_alert_webhook(self, name: str, https_url: str, http_method: str,
                                        event_routing_key: str, description: str = '',
                                        http_headers: t.Optional[t.Dict[str, str]] = None,
                                        notification_levels: t.Optional[t.List[str]] = None,
                                        event_group: str = 'deepchecks', event_class: str = '',
                                        api_access_key: t.Optional[str] = None,
                                        raise_on_status: bool = True) -> httpx.Response:
        """Create alert webhook.

        Parameters
        ----------
        name : str
            The name of the webhook
        https_url : str
            The url of the webhook
        http_method : str
            The http method of the webhook
            expected: GET, POST
        event_routing_key : str
            The event routing key of the webhook in PagerDuty
        description : str, optional
            The description of the webhook
        http_headers : dict, optional
            The http headers of the webhook
        notification_levels : list, optional
            The notification levels of the webhook
        event_group : str
            The event group of the webhook in PagerDuty
        event_class : str
            The event class of the webhook in PagerDuty
        raise_on_status : bool
            Whether to raise error on bad status code or not
        api_access_key : str, optional
            The api access key of PagerDuty
            REMARK: this might not be needed for webhooks at all, and we might remove it in the future
        Returns
        -------
        httpx.Response
            The response from the server
        """
        webhook = {
            'name': name,
            'http_url': https_url,
            'http_method': http_method,
            'description': description,
            'http_headers': http_headers,
            'notification_levels': notification_levels,
            'kind': 'PAGER_DUTY',
            'event_group': event_group,
            'event_class': event_class,
            'api_access_key': api_access_key,
            'event_routing_key': event_routing_key
        }
        if raise_on_status:
            return maybe_raise(
                self.session.post(url='alert-webhooks', json=webhook),
                msg='Failed to create new alert webhook.\n{error}'
            ).json()
        else:
            return self.session.post(url='alert-webhooks', json=webhook)

    def create_monitor(
            self,
            check_id: int,
            monitor: t.Dict[str, t.Any],
            raise_on_status: bool = True
    ) -> t.Union[httpx.Response, t.Dict[str, t.Any]]:
        """Create monitor.

        Parameters
        ----------
        check_id : int
            The ID of the check
        monitor : dict
            The monitor object
        raise_on_status : bool
            Whether to raise error on bad status code or not

        Returns
        -------
        Union[httpx.Response, dict]
            The response from the server
        """
        if raise_on_status:
            return maybe_raise(
                self.session.post(url=f'checks/{check_id}/monitors', json=monitor),
                msg='Failed to create new monitor for check.\n{error}'
            ).json()
        else:
            return self.session.post(url=f'checks/{check_id}/monitors', json=monitor)

    def fetch_monitor(
            self,
            monitor_id: int,
            raise_on_status: bool = True
    ):
        """Create monitor.

        Parameters
        ----------
        monitor_id : int
            The ID of the monitor
        raise_on_status : bool
            Whether to raise error on bad status code or not

        Returns
        -------
        Union[httpx.Response, Dict[str, Any]]
            The response from the server
        """
        response = self.session.get(url=f'monitors/{monitor_id}')
        return (
            maybe_raise(response, msg='Failed to fetch a monitor record.\n{error}').json()
            if raise_on_status
            else response
        )

    # TODO:
    # it should be called fetch_dashboard(s) and should return a list of dashboards
    # but currently only one dashboard is allowed/exists
    def fetch_dashboard(self, raise_on_status: bool = True) -> t.Union[httpx.Response, t.Dict[str, t.Any]]:
        """Fetch dashboard.

        Parameters
        ----------
        raise_on_status : bool, optional
            Raise exceptions if the status code is not 200.

        Returns
        -------
        Union[httpx.Response, dict]
            The response object
        """
        if raise_on_status:
            return self.session.get('dashboards').json()
        else:
            return self.session.get('dashboards')

    def delete_model_checks_by_name(
            self,
            model_id: int,
            check_names: t.Sequence[str],
            raise_on_status: bool = True
    ) -> t.Optional[httpx.Response]:
        """Delete model checks by their names.

        Parameters
        ----------
        model_id : int
            The model ID.
        check_names : Sequence[str]
            A sequence of check names.
        raise_on_status : bool, optional
            Raise exception is status code is not 200.
        """
        if raise_on_status:
            maybe_raise(
                self.session.delete(f'models/{model_id}/checks', params={'names': check_names}),
                msg=f'Failed to drop Model(id:{model_id}) checks.\n{{error}}'
            )
        else:
            return self.session.delete(f'models/{model_id}/checks', params={'names': check_names})

    def delete_check_by_name(self):
        # TODO: corresponding PR is not merged into main yet
        raise NotImplementedError()

    def set_schedule_time(self, model_id: int, timestamp: t.Union[datetime, str, int],
                          raise_on_status: bool = True) -> t.Optional[httpx.Response]:
        """Set new scheduling time for all monitors of a model.

        Parameters
        ----------
        model_id: int
            model's id (model['id'])
        timestamp : t.Union[datetime, str, int]
            The start time timestamp.
            Alerts of the model will be calculated from this timestamp and forward
            - int: Unix timestamp
            - str: timestamp in ISO8601 format
            - datetime: If no timezone info is provided on the datetime assumes local timezone.
        raise_on_status : bool, optional
            Raise exception is status code is not 200.
        Returns
        -------
        Union[httpx.Response, Dict[str, Any]]
            The response from the server
        """
        timestamp_parsed = parse_timestamp(timestamp).isoformat()
        data = {'timestamp': timestamp_parsed}
        response = self.session.post(url=f'models/{model_id}/monitors-set-schedule-time', json=data)

        if raise_on_status:
            maybe_raise(response, msg=f'Failed to set new scheduling time for model {model_id}.\n{{error}}').json()

        return response

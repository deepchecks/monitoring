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
import typing as t
from copy import copy

import httpx
from deepchecks_client.core.utils import maybe_raise

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
        self.session.base_url = self.session.base_url.join('/api/v1')

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
            maybe_raise(self.session.get('say-hello'), msg='Server not available.\n{error}')
        else:
            return self.session.get('say-hello')

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

    def update_samples(
        self,
        model_version_id: int,
        samples: t.List[t.Dict[str, t.Any]],
        raise_on_status: bool = True,
    ) -> t.Optional[httpx.Response]:
        """Update production samples.

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
                self.session.put(f'model-versions/{model_version_id}/data', json=samples),
                msg='Samples update failure.\n{error}'
            )
        else:
            return self.session.put(f'model-versions/{model_version_id}/data', json=samples)

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
        start_time: str,
        end_time: str,
        raise_on_status: bool = True
    ) -> t.Union[t.Dict[str, t.Any], httpx.Response]:
        """Fetch model version time window statistics.

        Parameters
        ----------
        model_version_id : int
            The model version ID
        start_time : str
            The start time of the window
        end_time : str
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
        model_name : int
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

    def fetch_models(
        self,
        raise_on_status: bool = True
    ) -> t.Union[httpx.Response, t.List[t.Dict[str, t.Any]]]:
        """Fetch all available models.

        Parameters
        ----------
        raise_on_status : bool, optional
            Raise exception if status code is not 200.

        Returns
        -------
        Union[httpx.Response, list]
            The response object.
        """
        if raise_on_status:
            return maybe_raise(
                self.session.get('models'),
                msg='Failed to retrieve existing models from session.\n{error}'
            ).json()
        else:
            return self.session.get('models')

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
            return maybe_raise(
                self.session.get(f'models/{model_name}', params={'identifier_kind': 'name'}),
                msg=f'Failed to obtain Model(name:{model_name}).\n{{error}}'
            ).json()
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
            maybe_raise(
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
        response = self.session.post(f'model-versions/{model_version_id}')
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
        response = self.session.post(f'models/{model_name}/model-versions/{model_version_name}')
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
            return self.session.get('dashboards/').json()
        else:
            return self.session.get('dashboards/')

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

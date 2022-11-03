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
from urllib.parse import urljoin

import requests
from deepchecks_client.core.utils import maybe_raise

__all__ = ['API']


class HttpSession(requests.Session):
    """Http session."""

    def __init__(self, base_url: str, token: t.Optional[str] = None):
        super().__init__()
        self.base_url = base_url
        self.token = token

    def request(self, method, url, *args, **kwargs) -> requests.Response:
        url = urljoin(self.base_url, url)
        headers = kwargs.get('headers', {})
        if self.token:
            headers['Authorization'] = f'Basic {self.token}'
        return super().request(
            method,
            url,
            *args,
            headers=headers,
            **kwargs
        )


TAPI = t.TypeVar('TAPI', bound='API')


# TODO:
# apply `typing.overload` to API class method for better dev experience

class API:
    """Backend API."""

    session: requests.Session

    @classmethod
    def instantiate(cls: t.Type[TAPI], host: str, token: t.Optional[str] = None) -> TAPI:
        """Create instance of API."""
        return cls(session=HttpSession(base_url=host + '/api/v1/', token=token))

    def __init__(self, session: requests.Session):
        self.session = session

    def say_hello(self, raise_on_status: bool = True) -> t.Optional[requests.Response]:
        """Verify connectivity."""
        if raise_on_status:
            maybe_raise(self.session.get('say-hello'), msg='Server not available.\n{error}')
        else:
            return self.session.get('say-hello')

    def fetch_model_version_schema(
        self,
        model_version_id: int,
        raise_on_status: bool = True,
    ) -> t.Union[t.Dict[str, t.Any], requests.Response]:
        """Fetch model version schema."""
        if raise_on_status:
            return maybe_raise(self.session.get(
                f'model-versions/{model_version_id}/schema'),
                msg=f'Failed to obtain ModelVersion(id:{model_version_id}) schema.\n{{error}}'
            ).json()
        else:
            return self.session.get(f'model-versions/{model_version_id}/schema')

    def upload_samples(
        self,
        model_version_id: int,
        samples: t.List[t.Dict[str, t.Any]],
        raise_on_status: bool = True,
    ) -> t.Optional[requests.Response]:
        """Upload production samples."""
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
    ) -> t.Optional[requests.Response]:
        """Update production samples."""
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
        """Upload reference data."""
        if raise_on_status:
            maybe_raise(
                self.session.post(
                    f'model-versions/{model_version_id}/reference',
                    files={'batch': reference}
                ),
                msg='Reference batch upload failure.\n{error}'
            )
        else:
            return self.session.post(
                f'model-versions/{model_version_id}/reference',
                files={'batch': reference}
            )

    def fetch_model_version_time_window_statistics(
        self,
        model_version_id: int,
        start_time: str,
        end_time: str,
        raise_on_status: bool = True
    ) -> t.Union[t.Dict[str, t.Any], requests.Response]:
        """Fetch model version time window statistics."""
        if raise_on_status:
            return maybe_raise(
                self.session.get(
                    url=f'model-versions/{model_version_id}/time-window-statistics',
                    json={'start_time': start_time, 'end_time': end_time}
                ),
                msg='Failed to get statistics for samples within provided time window.\n{error}'
            ).json()
        else:
            return self.session.get(
                url=f'model-versions/{model_version_id}/time-window-statistics',
                json={'start_time': start_time, 'end_time': end_time}
            )

    def create_model(
        self,
        model: t.Dict[str, t.Any],
        raise_on_status: bool = True
    ) -> t.Union[requests.Response, t.Dict[str, t.Any]]:
        """Create model."""
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
    ) -> t.Optional[requests.Response]:
        """Delete model by its numerical identifier."""
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
    ) -> t.Optional[requests.Response]:
        """Delete model by its name."""
        # TODO: corresponding PR is not merged into main yet
        raise NotImplementedError()

    def fetch_models(
        self,
        raise_on_status: bool = True
    ) -> t.Union[requests.Response, t.List[t.Dict[str, t.Any]]]:
        """Fetch all available models."""
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
    ) -> t.Union[requests.Response, t.Dict[str, t.Any]]:
        """Fetch model record by its name."""
        # TODO: corresponding PR is not merged into main yet
        raise NotImplementedError()

    def fetch_model_by_id(
        self,
        model_id: int,
        raise_on_status: bool = True
    ) -> t.Union[requests.Response, t.Dict[str, t.Any]]:
        """Fetch model record by its numerical identifier."""
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
    ) -> t.Union[t.List[t.Dict[str, t.Any]], requests.Response]:
        """Fetch model versions."""
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
    ) -> t.Union[requests.Response, t.Dict[str, t.Any]]:
        """Create model version."""
        if raise_on_status:
            return maybe_raise(
                self.session.post(f'models/{model_id}/version', json=model_version),
                msg='Failed to create new model version.\n{error}'
            ).json()
        else:
            return self.session.post(f'models/{model_id}/version', json=model_version)

    def create_checks(
        self,
        model_id: int,
        checks: t.List[t.Dict[str, t.Any]],
        raise_on_status: bool = True
    ) -> t.Union[requests.Response, t.List[t.Dict[str, t.Any]]]:
        """Create checks."""
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
    ) -> t.Union[requests.Response, t.List[t.Dict[str, t.Any]]]:
        """Fetch all model checks."""
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
        """Fetch all model checks."""
        # TODO: corresponding PR is not merged into main yet
        raise NotImplementedError()

    def create_alert_rule(
        self,
        monitor_id: int,
        alert_rule: t.Dict[str, t.Any],
        raise_on_status: bool = True
    ) -> t.Union[requests.Response, t.Dict[str, t.Any]]:
        """Create alert rule."""
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
    ) -> t.Union[requests.Response, t.Dict[str, t.Any]]:
        """Create monitor."""
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
    def fetch_dashboard(self, raise_on_status: bool = True) -> t.Union[requests.Response, t.Dict[str, t.Any]]:
        """Fetch dashboard."""
        if raise_on_status:
            return self.session.get('dashboards/').json()
        else:
            return self.session.get('dashboards/')

    def delete_model_checks_by_name(
        self,
        model_id: int,
        check_names: t.Sequence[str],
        raise_on_status: bool = True
    ) -> t.Optional[requests.Response]:
        """Delete model checks by their names."""
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

# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
"""Feature flags abstractions."""
import abc
import os
import typing as t
from dataclasses import dataclass

from pydantic.generics import GenericModel

if t.TYPE_CHECKING:
    from ldclient.client import LDClient  # pylint: disable=unused-import

__all__ = ["Variation", "LauchDarklyResolver", "EnvVarResolver", "FeatureFlag"]


TBuiltinType = t.Union[int, float, str]
TComposeType = t.Union[t.List["TBuiltinType"], t.Dict["TBuiltinType", "TBuiltinType"]]
T = t.TypeVar("T", bound="TComposeType")


@dataclass(frozen=True)
class Variation(GenericModel, t.Generic[T]):
    """Feature flag variation."""

    value: T
    name: str
    description: str = ""


class FeatureFlagResolver(abc.ABC):
    """Base class for all feature flags resolvers."""

    @abc.abstractmethod
    def resolve(self, *args, **kwargs) -> t.Union[bool, Variation[t.Any]]:
        """Resolve feature flag value."""
        raise NotImplementedError()


class LauchDarklyResolver(FeatureFlagResolver):
    """LauchDarkly feature flag resolver.

    Parameters
    ----------
    client : LDClient
        LauchDarkly client instance
    key : str
        feature flag key
    default : Any, default False
        default value for feature flag to be used if the value is not
        available from LaunchDarkly
    """

    def __init__(self, client: "LDClient", key: str, default: t.Any = False):
        self.client = client
        self.key = key
        self.default = default

    def resolve(
        self,
        user: t.Any,  # TODO: change it to the 'User' type
        **kwargs
    ) -> t.Union[bool, Variation[t.Any]]:
        """Resolve feature flag for the current request/user."""
        # TODO: code below is incomplete
        # value = self.client.variation(key=self.key, user=user, default=self.default)
        raise NotImplementedError()


class EnvVarResolver(FeatureFlagResolver):
    """Enviroment variable resolver.

    Parameters
    ----------
    name : str
        enviroment variable name
    """

    def __init__(self, name: str):
        self.name = name

    def resolve(self, *args, **kwargs) -> t.Union[bool, Variation[t.Any]]:
        """Resolve the environment variable name."""
        var = os.environ.get(self.name, False)
        if var is True:
            return True
        if isinstance(var, str) and var.lower() in {"1", "yes", "ok", ""}:
            return True
        return False


class FeatureFlag(FeatureFlagResolver):
    """Feature flag type.

    Parameters
    ----------
    resolver : FeatureFlagResolver
        feature flag resolver instance
    name : str
        feature flag name
    description : str , default empty string
        feature flag description
    is_public : bool , default False
        whether feature flag should be visible for the clients
    """

    def __init__(
        self,
        resolver: FeatureFlagResolver,
        name: str,
        description: str = "",
        is_public: bool = False
    ):
        self.resolver = resolver
        self.name = name
        self.description = description
        self.is_public = is_public

    def resolve(self, *args, **kwargs) -> t.Union[bool, Variation[t.Any]]:
        """Resolve feature flag value."""
        return self.resolver.resolve(*args, **kwargs)

# pylint: disable=unused-import,import-outside-toplevel
"""Mixpanel events definitions."""
import enum
import json
import logging
import typing as t

import pydantic
import sqlalchemy as sa
from mixpanel import Consumer, DatetimeSerializer, Mixpanel
from sqlalchemy.ext.asyncio import async_object_session
from sqlalchemy.orm import joinedload

import deepchecks_monitoring
from deepchecks_monitoring.monitoring_utils import OperatorsEnum
from deepchecks_monitoring.public_models.organization import OrgTier
from deepchecks_monitoring.schema_models import Alert, AlertRule, Check, Model, ModelVersion, Monitor
from deepchecks_monitoring.schema_models.task_type import TaskType
from deepchecks_monitoring.utils.alerts import AlertSeverity
from deepchecks_monitoring.utils.alerts import Condition as AlertRuleCondition
from deepchecks_monitoring.utils.alerts import Frequency as MonitorFrequency

if t.TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from deepchecks_monitoring.public_models.organization import Organization
    from deepchecks_monitoring.public_models.role import RoleEnum
    from deepchecks_monitoring.public_models.user import User


__all__ = [
    'MixpanelEventReporter',
    'InvitationEvent',
    'LoginEvent',
    'LoginEvent',
    'SignupEvent',
    'ModelCreatedEvent',
    'ModelDeletedEvent',
    'ModelVersionCreatedEvent',
    'ProductionDataUploadEvent',
    'LabelsUploadEvent',
    'AlertRuleCreatedEvent',
    'AlertTriggeredEvent',
]


class BaseEvent(pydantic.BaseModel):
    """Base mixpanel event type."""

    EVENT_NAME: t.ClassVar[str]


class OrganizationEvent(BaseEvent):
    """Organization mixpanel super properties."""

    o_deployment: str = 'saas'  # TODO: figure out how this should be defined
    o_tier: OrgTier
    o_name: str
    o_version: str = deepchecks_monitoring.__version__

    @classmethod
    async def from_organization(cls, org: 'Organization') -> 'OrganizationEvent':
        """Create an event instance from organization record."""
        # NOTE:
        # this function is async only for consistency and
        # compatibility with UserEvent
        return OrganizationEvent(
            o_name=t.cast(str, org.name),
            o_tier=t.cast(OrgTier, org.tier),
            o_deployment='saas'  # TODO:
        )

    @pydantic.validator('o_deployment')
    @classmethod
    def validate_deployment_value(cls, value):
        """Validate deployment value."""
        assert value in {'saas', 'on-prem'}
        return value


class UserEvent(BaseEvent):
    """User mixpanel super properties."""

    u_id: int  # TODO
    u_role: str
    u_email: str
    u_name: str
    u_org_id: int
    u_org_name: str
    u_created_at: str

    @classmethod
    async def from_user(cls, user: 'User') -> 'UserEvent':
        """Create an event instance from user record."""
        session = t.cast('AsyncSession', async_object_session(user))
        unloaded_relations = t.cast('set[str]', sa.inspect(user).unloaded)

        # TODO:
        # create a utility function to load unloaded relationships
        if 'organization' not in unloaded_relations:
            org = user.organization
        else:
            from deepchecks_monitoring.public_models import Organization  # pylint: disable=redefined-outer-name
            q = sa.select(Organization).where(Organization.id == user.organization_id)
            org = session.scalar(q)

        if 'roles' not in unloaded_relations:
            roles = user.roles
        else:
            from deepchecks_monitoring.public_models import Role
            q = sa.select(Role).where(Role.user_id == user.id)
            roles = session.scalars(q)

        org = t.cast('Organization', org)
        roles = t.cast('list[Role]', roles)

        roles = (
            ((role := t.cast('RoleEnum', it.role)).value, role.role_index)
            for it in roles
        )
        max_role = max(
            roles,
            key=lambda it: it[1],
            default=('member', -1)
        )
        return UserEvent(
            u_id=t.cast(int, user.id),
            u_email=t.cast(str, user.email),
            u_name=t.cast(str, user.full_name),
            u_role=max_role[0],
            u_org_id=t.cast(int, org.id),
            u_org_name=t.cast(str, org.name),
            u_created_at=str(user.created_at)
        )


class InvitationEvent(UserEvent):
    """User invitation event definition."""

    EVENT_NAME: t.ClassVar[str] = 'invite'

    invitees: list[str]
    invitees_count: int

    @classmethod
    async def create_event(
        cls,
        invitees: list[str],
        user: 'User'
    ) -> t.Self:
        """Create event instance."""
        super_props = await UserEvent.from_user(user)
        return cls(
            invitees=invitees,
            invitees_count=len(invitees),
            **super_props.dict()
        )


class _AuthEvent(UserEvent):
    """Base auth event definition."""

    method: str

    @classmethod
    async def create_event(
        cls,
        method: str,
        user: 'User'
    ) -> t.Self:
        """Create event instance."""
        super_props = await UserEvent.from_user(user)
        return cls(
            method=method,
            **super_props.dict()
        )


class LoginEvent(_AuthEvent):
    """User login event definition."""

    EVENT_NAME: t.ClassVar[str] = 'login'


class LogoutEvent(_AuthEvent):
    """User logout event definition."""

    EVENT_NAME: t.ClassVar[str] = 'logout'


class SignupEvent(_AuthEvent):
    """User signup event definition."""

    EVENT_NAME: t.ClassVar[str] = 'signup'


class ModelCreatedEvent(OrganizationEvent):
    """Model creation event definition."""

    EVENT_NAME: t.ClassVar[str] = 'model created'

    id: int
    name: str
    task_type: TaskType

    @classmethod
    async def create_event(
        cls,
        model: 'Model',
        user: 'User'
    ) -> t.Self:
        """Create event instance."""
        org = t.cast('Organization', user.organization)
        super_props = await OrganizationEvent.from_organization(org)
        return cls(
            id=t.cast(int, model.id),
            name=t.cast(str, model.name),
            task_type=t.cast('TaskType', model.task_type),
            **super_props.dict()
        )


class ModelDeletedEvent(OrganizationEvent):
    """Model removal event definition."""

    EVENT_NAME: t.ClassVar[str] = 'model deleted'

    id: int
    name: str
    task_type: TaskType
    versions_count: int
    predictions_count: int

    @classmethod
    async def create_event(
        cls,
        model: 'Model',
        user: 'User'
    ) -> t.Self:
        """Create event instance."""
        org = t.cast('Organization', user.organization)
        super_props = await OrganizationEvent.from_organization(org)

        session = async_object_session(model)
        unloaded_relations = t.cast('set[str]', sa.inspect(model).unloaded)

        if 'versions' not in unloaded_relations:
            versions = t.cast('list[ModelVersion]', model.versions)
            n_of_versions = len(versions)
        else:
            q = sa.select(ModelVersion).where(ModelVersion.model_id == model.id)
            versions = t.cast('list[ModelVersion]', await session.scalars(q))
            n_of_versions = len(versions)

        return cls(
            id=t.cast(int, model.id),
            name=t.cast(str, model.name),
            task_type=t.cast('TaskType', model.task_type),
            versions_count=n_of_versions,
            predictions_count=await model.n_of_predictions(),
            **super_props.dict()
        )


class ModelVersionCreatedEvent(OrganizationEvent):
    """Model version creation event definition."""

    EVENT_NAME: t.ClassVar[str] = 'model version created'

    id: int
    name: str
    model_id: int
    model_name: str
    feature_count: int

    @classmethod
    async def create_event(
        cls,
        model_version: 'ModelVersion',
        user: 'User'
    ):
        """Create event instance."""
        org = t.cast('Organization', user.organization)
        super_props = await OrganizationEvent.from_organization(org)

        session = async_object_session(model_version)
        unloaded_relations = t.cast('set[str]', sa.inspect(model_version).unloaded)

        if 'model' not in unloaded_relations:
            model = t.cast('Model', model_version.model)
        else:
            q = sa.select(Model).where(Model.id == model_version.model_id)
            model = t.cast('Model', await session.scalar(q))

        return cls(
            id=t.cast(int, model_version.id),
            name=t.cast(str, model_version.name),
            model_id=t.cast(int, model.id),
            model_name=t.cast(str, model.name),
            feature_count=len(t.cast('dict[str, str]', model_version.features_columns)),
            **super_props.dict()
        )


class ProductionDataUploadEvent(OrganizationEvent):
    """Production data upload event definition."""

    EVENT_NAME: t.ClassVar[str] = 'production data uploaded'

    model_id: int
    model_name: str
    model_version_id: int
    model_version_name: str
    n_of_received_samples: int
    n_of_accepted_samples: int

    @classmethod
    async def create_event(
        cls,
        n_of_received_samples: int,
        n_of_accepted_samples: int,
        model_version: 'ModelVersion',
        user: 'User'
    ):
        """Create event instance."""
        org = t.cast('Organization', user.organization)
        super_props = await OrganizationEvent.from_organization(org)

        session = async_object_session(model_version)
        unloaded_relations = t.cast('set[str]', sa.inspect(model_version).unloaded)

        if 'model' not in unloaded_relations:
            model = t.cast('Model', model_version.model)
        else:
            q = sa.select(Model).where(Model.id == model_version.model_id)
            model = await session.scalar(q)

        return cls(
            model_id=t.cast(int, model.id),
            model_name=t.cast(str, model.name),
            model_version_id=t.cast(int, model_version.id),
            model_version_name=t.cast(str, model_version.name),
            n_of_received_samples=n_of_received_samples,
            n_of_accepted_samples=n_of_accepted_samples,
            **super_props.dict()
        )


class LabelsUploadEvent(OrganizationEvent):
    """Labels upload event definition."""

    EVENT_NAME: t.ClassVar[str] = 'labels uploaded'

    model_id: int
    model_name: str
    n_of_received_labels: int
    n_of_accepted_labels: int

    @classmethod
    async def create_event(
        cls,
        n_of_received_labels: int,
        n_of_accepted_labels: int,
        model: 'Model',
        user: 'User'
    ):
        """Create event instance."""
        org = t.cast('Organization', user.organization)
        super_props = await OrganizationEvent.from_organization(org)
        return cls(
            model_id=t.cast(int, model.id),
            model_name=t.cast(str, model.name),
            n_of_received_labels=n_of_received_labels,
            n_of_accepted_labels=n_of_accepted_labels,
            **super_props.dict()
        )


class AlertRuleCreatedEvent(UserEvent):
    """Alert rule creation event definition."""

    EVENT_NAME: t.ClassVar[str] = 'alert rule created'

    id: int
    rule_operator: OperatorsEnum
    rule_threshold: float
    severity: AlertSeverity
    monitor_id: int
    monitor_name: str
    monitor_frequency: MonitorFrequency
    monitor_aggregation_window: int
    check_id: int
    check_type: str
    check_name: str
    model_id: int
    model_name: str
    model_task_type: TaskType

    @staticmethod
    def _get_check_type(check: 'Check') -> str:
        config = t.cast(dict[str, t.Any], check.config)
        name = config.get('class_name') or 'unknown'
        module = config.get('class_name') or 'unknown'
        return f'{module}.{name}'

    @classmethod
    async def create_event(
        cls,
        alert_rule: 'AlertRule',
        user: 'User',
    ):
        """Create event instance."""
        super_props = await UserEvent.from_user(user)
        session = async_object_session(alert_rule)

        monitor = t.cast(Monitor, await session.scalar(
            sa.select(Monitor)
            .where(Monitor.id == alert_rule.monitor_id)
            .options(
                joinedload(Monitor.check)
                .joinedload(Check.model)
            )
        ))

        check = t.cast(Check, monitor.check)
        model = t.cast(Model, check.model)

        return cls(
            id=t.cast(int, alert_rule.id),
            rule_operator=t.cast(AlertRuleCondition, alert_rule.condition).operator,
            rule_threshold=t.cast(AlertRuleCondition, alert_rule.condition).value,
            severity=t.cast(AlertSeverity, alert_rule.alert_severity),
            monitor_id=t.cast(int, monitor.id),
            monitor_name=t.cast(str, monitor.name),
            monitor_frequency=t.cast(MonitorFrequency, monitor.frequency),
            monitor_aggregation_window=t.cast(int, monitor.aggregation_window),
            check_id=t.cast(int, check.id),
            check_type=cls._get_check_type(check),
            check_name=t.cast(str, check.name),
            model_id=t.cast(int, model.id),
            model_name=t.cast(str, model.name),
            model_task_type=t.cast(TaskType, model.task_type),
            **super_props.dict()
        )


class AlertTriggeredEvent(OrganizationEvent):
    """Alert event definition."""

    EVENT_NAME: t.ClassVar[str] = 'alert triggered'

    id: int
    alert_rule_id: int
    alert_rule_operator: OperatorsEnum
    alert_rule_threshold: float
    alert_rule_severity: AlertSeverity
    failed_values: t.Any

    @classmethod
    async def create_event(
        cls,
        alert: 'Alert',
        organization: 'Organization'
    ):
        super_props = await OrganizationEvent.from_organization(organization)
        session = async_object_session(alert)
        unloaded_relations = t.cast('set[str]', sa.inspect(alert).unloaded)

        if 'alert_rule' not in unloaded_relations:
            alert_rule = t.cast(AlertRule, alert.alert_rule)
        else:
            alert_rule = await session.get(AlertRule, alert.alert_rule_id)

        return cls(
            id=t.cast(int, alert.id),
            alert_rule_id=t.cast(int, alert_rule.id),
            alert_rule_operator=t.cast(AlertRuleCondition, alert_rule.condition).operator,
            alert_rule_threshold=t.cast(AlertRuleCondition, alert_rule.condition).value,
            alert_rule_severity=t.cast(AlertSeverity, alert_rule.alert_severity),
            failed_values={},
            **super_props.dict()
        )


class _Serializer(DatetimeSerializer):
    def default(self, obj):
        if isinstance(obj, enum.Enum):
            return obj.value
        return super().default(obj)


class MixpanelEventReporter:
    """Mixpanel events reporter."""

    @classmethod
    def from_token(
        cls,
        token: str,
        consumer: Consumer | None = None,
        supress_errors: bool = True
    ) -> t.Self:
        """Create a 'MixpanelEventReporter' instance from a mixpanel api token."""
        return cls(
            Mixpanel(token, consumer=consumer, serializer=_Serializer),
            supress_errors=supress_errors
        )

    def __init__(
        self,
        mixpanel: Mixpanel,
        supress_errors: bool = True,
        logger: logging.Logger | None = None
    ):
        self.mixpanel = mixpanel
        self.supress_errors = supress_errors
        self.logger = logger or logging.getLogger(type(self).__name__)

    def report(
        self,
        event: BaseEvent
    ):
        """Send an event to the mixpanel service."""
        if isinstance(event, UserEvent):
            kwargs = {
                'distinct_id': event.u_email,  # TODO: should be id
                'event_name': event.EVENT_NAME,
                'properties': event.dict()
            }
        elif isinstance(event, OrganizationEvent):
            kwargs = {
                'distinct_id': event.o_name,
                'event_name': event.EVENT_NAME,
                'properties': event.dict()
            }
        else:
            raise TypeError(f'Unsupported event type - {type(event)}')

        if not self.supress_errors:
            self.mixpanel.track(**kwargs)
            return

        try:
            self.mixpanel.track(**kwargs)
        except Exception:  # pylint: disable=broad-except
            self.logger.exception(
                'Failed to send mixpanel event.\n'
                f'Event:\n{json.dumps(kwargs, indent=3)}'
            )

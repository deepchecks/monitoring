import typing as t
import pydantic

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import async_object_session

import deepchecks_monitoring
from deepchecks_monitoring.public_models.organization import OrgTier
from deepchecks_monitoring.schema_models.task_type import TaskType
from deepchecks_monitoring.utils.alerts import Condition as AlertRuleCondition
from deepchecks_monitoring.utils.alerts import AlertSeverity
from deepchecks_monitoring.utils.alerts import Frequency as MonitorFrequency

if t.TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession
    from deepchecks_monitoring.public_models.role import RoleEnum
    from deepchecks_monitoring.public_models.user import User
    from deepchecks_monitoring.public_models.organization import Organization


class OrganizationMixpanelProps(pydantic.BaseModel):
    """Organization mixpanel super properties."""

    o_deployment: str = "saas"  # TODO: figure out how this should be defined
    o_tier: OrgTier
    o_name: str
    o_version: str = deepchecks_monitoring.__version__

    @classmethod
    async def from_organization(cls, org: "Organization") -> "OrganizationMixpanelProps":
        # NOTE:
        # this function is async only for consistency and 
        # compatibility with UserMixpanelProps
        return OrganizationMixpanelProps(
            o_name=t.cast(str, org.name),
            o_tier=t.cast(OrgTier, org.tier),
            o_deployment="saas"  # TODO:
        )

    @pydantic.validator("o_deployment")
    @classmethod
    def validate_deployment_value(cls, value):
        assert value in {"saas", "on-prem"}
        return value


class UserMixpanelProps(pydantic.BaseModel):
    """User mixpanel super properties."""
    
    u_id: int  # TODO
    u_roles: list[str]
    u_email: str
    u_name: str
    u_org: str  # TODO: maybe it should be an org id?
    u_created_at: str

    @classmethod
    async def from_user(cls, user: "User") -> "UserMixpanelProps":
        session = t.cast(AsyncSession, async_object_session(user))
        unloaded_relations = t.cast("set[str]", sa.inspect(user).unloaded)

        # TODO: 
        # create a utility function to load unloaded relationships
        if "organization" not in unloaded_relations:
            org = user.organization
        else:
            from deepchecks_monitoring.public_models import Organization
            q = sa.select(Organization).where(Organization.id == user.organization_id)
            org = session.scalar(q)
        
        if "roles" not in unloaded_relations:
            roles = user.roles
        else:
            from deepchecks_monitoring.public_models import Role
            q = sa.select(Role).where(Role.user_id == user.id)
            roles = session.scalars(q)
        
        org = t.cast('Organization', org)
        roles = t.cast('list[Role]', roles)
        
        return UserMixpanelProps(
            u_id=t.cast(int, user.id),
            u_email=t.cast(str, user.email),
            u_name=t.cast(str, user.full_name),
            u_roles=[t.cast('RoleEnum', it.role).value for it in roles],
            u_org=t.cast(str, org.name),
            u_created_at=str(user.created_at)
        )


class ModelCreatedEvent(pydantic.BaseModel):
    
    EVENT_NAME: t.ClassVar[str] = 'model created'
    
    id: int
    name: str
    task_type: TaskType


class ModelDeletedEvent(pydantic.BaseModel):

    EVENT_NAME: t.ClassVar[str] = 'model deleted'

    id: int
    name: str
    task_type: TaskType
    versions_count: int
    predictions_count: int


class ModelVersionCreatedEvent(pydantic.BaseModel):
    
    EVENT_NAME: t.ClassVar[str] = 'model version created'
    
    id: int
    name: str
    feature_count: int


class ProductionDataUploadEvent(pydantic.BaseModel):

    EVENT_NAME: t.ClassVar[str] = 'production data uploaded'

    model_id: int
    model_name: str
    model_version_id: int
    model_version_name: str
    sample_size: int


class LabelsUploadEvent(pydantic.BaseModel):

    EVENT_NAME: t.ClassVar[str] = 'labels uploaded'

    model_id: int
    model_name: str
    model_version_id: int
    model_version_name: str
    sample_size: int


class AlertRuleCreatedEvent(pydantic.BaseModel):

    EVENT_NAME: t.ClassVar[str] = 'alert rule created'

    id: int
    condition: AlertRuleCondition
    severity: AlertSeverity
    monitor_id: int
    monitor_name: str
    monitor_frequency: MonitorFrequency
    monitor_aggregation_window: int
    check_id: int
    check_type: str
    model_id: int
    model_name: str
    model_task_type: TaskType


class AlertRuleDeletedEvent(pydantic.BaseModel):

    EVENT_NAME: t.ClassVar[str] = 'alert rule deleted'

    id: int
    name: str
    alerts_count: int


class AlertTriggeredEvent(pydantic.BaseModel):

    EVENT_NAME: t.ClassVar[str] = 'alert triggered'
    
    id: int
    alert_rule_id: int
    alert_rule_condition: AlertRuleCondition
    alert_rule_severity: AlertSeverity
    failed_values: t.Any


class AlertResolvedEvent(pydantic.BaseModel):

    EVENT_NAME: t.ClassVar[str] = 'alert resolved'

    alert_rule_id: int
    monitor_id: int
    monitor_name: str
    check_id: int
    check_type: str
    model_id: int
    model_name: str
    model_task_type: TaskType
    n_of_resolved_alerts: int
    were_all_alerts_resolved: bool



class MixpanelEventReporter:

    def __init__(self) -> None:
        pass

    def report(self):
        pass
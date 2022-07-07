# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Optional

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table
from sqlalchemy.dialects.postgresql import JSONB

from deepchecks_api.models.database import mapper_registry


class ColumnRole(enum.Enum):
    """Enum containing different roles of columns in data."""
    NUMERIC_FEATURE = 'numeric_feature'
    CATEGORICAL_FEATURE = 'categorical_feature'
    OTHER = 'other'


@mapper_registry.mapped
@dataclass
class ModelVersion:
    __table__ = Table(
        "model_version",
        mapper_registry.metadata,
        Column("id", Integer, primary_key=True, index=True),
        Column("name", String(50)),
        Column("start_time", DateTime),
        Column("end_time", DateTime),
        Column("json_schema", JSONB),
        Column("column_roles", JSONB),
        Column("features_importance", JSONB),
        Column("model_id", Integer, ForeignKey("model.id")),
    )
    id: int = field(init=False)
    name: Optional[str] = None
    model_id: int = field(init=False)
    start_time: datetime = field(init=False)
    end_time: datetime = field(init=False)
    json_schema: dict = field(init=False)
    column_roles: Dict[str, ColumnRole] = field(init=False)
    features_importance: Dict[str, float] = field(init=False)

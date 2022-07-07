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
from typing import List, Optional

from sqlalchemy import Column, Enum, Integer, String, Table
from sqlalchemy.orm import relationship

from deepchecks_api.models.database import mapper_registry


class TaskType(enum.Enum):
    """Enum containing supported task types."""
    REGRESSION = 'regression'
    BINARY = 'binary'
    MULTICLASS = 'multiclass'


@mapper_registry.mapped
@dataclass
class Model:
    from deepchecks_api.models.model_version import ModelVersion

    __table__ = Table(
        "model",
        mapper_registry.metadata,
        Column("id", Integer, primary_key=True, index=True),
        Column("name", String(50)),
        Column("description", String(200)),
        Column("task_type", Enum(TaskType)),
    )
    id: int = field(init=False)
    name: Optional[str] = None
    description: Optional[str] = None
    task_type: Enum = None
    versions: List[ModelVersion] = field(default_factory=list)

    __mapper_args__ = {  # type: ignore
        "properties": {
            "versions": relationship("ModelVersion"),
        }
    }

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

import uuid as uuid_pkg
from dataclasses import dataclass, field
from textwrap import indent

from sqlalchemy import Column, String, Table

from deepchecks_api.models.database import mapper_registry


@mapper_registry.mapped
@dataclass
class User:
    __table__ = Table(
        "user",
        mapper_registry.metadata,
        Column("uuid", uuid_pkg.UUID, primary_key=True, index=True),
        Column("name", String(50)),
        Column("email", String(50), index=True),
        Column("password", String(50)),
    )
    uuid: uuid_pkg.UUID = field(init=False, default_factory=uuid_pkg.uuid4)
    name: str = None
    email: str = None
    password: str = None

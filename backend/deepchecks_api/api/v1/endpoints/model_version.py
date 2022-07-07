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

from typing import Dict

from pydantic import BaseModel

from deepchecks_api.models.model_version import ColumnRole
from deepchecks_api.v1.api import get_db, router


class VersionInfo(BaseModel):
    name: str = None
    features_importance: Dict[str, float] = None
    column_roles: Dict[str, ColumnRole]

@router.post("/models/", response_model=schemas.Model)
async def create_model(model: schemas.Model, db: Session = Depends(get_db)):
    data = model.dict(exclude_none=True)
    db_item = models.Model(**data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

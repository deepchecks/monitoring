<!--
  ~ ----------------------------------------------------------------------------
  ~ Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
  ~
  ~ This file is part of Deepchecks.
  ~ Deepchecks is distributed under the terms of the GNU Affero General
  ~ Public License (version 3 or later).
  ~ You should have received a copy of the GNU Affero General Public License
  ~ along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
  ~ ----------------------------------------------------------------------------
-->
# Running the tests

In order to run the E2E tests, you first need to run all services and the application itself using docker using these
commands (Note: you need to run those from the root of the repository)

1. make docker (builds a local docker image)
2. make env-setup (deploying Kafka, Redis, and Postgres and the locally-built image using docker-compose)
3. make cypress (running the tests in this folder)

The used configuration in this deployment is the one in the .development.env file at the root of this repository.
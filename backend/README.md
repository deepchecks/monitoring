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

# Deepchecks Monitoring Backend

## Server structure

The server is built using the following technologies: 
- [FastAPI](https://fastapi.tiangolo.com/): library for web APIs in python.
- [PostgreSQL](https://www.postgresql.org/): relational database.
- [SQLAlchemy](https://www.sqlalchemy.org/): ORM in python to interact with postgres.
- [Alembic](https://alembic.sqlalchemy.org/en/latest/): database migrations tool.
- [Kafka](https://kafka.apache.org/): message broker.
- [Redis](https://redis.io/): in-memory data structure store.

The important server components are:
- `deepchecks_monitoring`: the main server code.
- `client`: The python client to interact with the server.
- `tests`: The tests for the server.
- `deepchecks_monitoring/bgtasks`: Workers and tasks that run in separate processes.

In order to increase IO performance we are trying to use async libraries for redis, postgres and kafka.

## Running the server

### Prerequisites

You need to have a local docker and postgres installed. Install them depends on your OS. For MacOS `postgres.app` is recommended.
The first step before running the server is to run all the external services and create a database with the latest
schema.

- Create a database named `deepchecks` in postgres.
- Install all the requirements for the server:
```bash
pip install -r requirements.txt dev-requirements.txt
pip install -e .
```
- Run the migrations for the public schema. For more info on migrations see below.
```bash
export DATABASE_URI=postgresql://postgres@localhost:5432/deepchecks
# upgrade public schema to the latest revision
alembic --name public upgrade head
```
- Run also redis and kafka:
```bash
docker-compose -f docker-compose-development.yml up
```

### Run the fastapi server

First we need a `.env` file with minimal values needed to run the server. fill in the missing values and put them under
`backend/.env` file.

```bash
oauth_url=https://deepchecks-monitoring.eu.auth0.com
oauth_client_id=<fill>
oauth_client_secret=<fill>
DATABASE_URI=postgresql://postgres@localhost:5432/deepchecks
ASYNC_DATABASE_URI=postgresql+asyncpg://postgres@localhost:5432/deepchecks
ASSETS_FOLDER=../frontend/build  # path to the frontend build folder. Either build the frontend or delete this line.
DEBUG_MODE=True
kafka_host=localhost:29092
kafka_security_protocol=PLAINTEXT
kafka_sasl_mechanism=PLAIN
kafka_replication_factor=1
redis_uri=redis://localhost/0
is_cloud=False
```

To run the server we are using library called `uvicorn` which is an ASGI server implementation. 
We can use uvicorn directly:
```bash
uvicorn --factory deepchecks_monitoring.app:create_application --host 0.0.0.0 --workers 4 --log-level warning --proxy-headers --forwarded-allow-ips '*'
```
Or we can call our `cli.py` file with `run` command:
```bash
python deepchecks_monitoring/cli.py run
```

## Database Migrations

Deepchecks Monitoring uses two database migrations lineages:

+ public lineage - public schema migrations, defines general tables and database objects like `organizations` and `users` tables, etc.
+ organizations lineage - organizations schemas migrations, defines organization 'monitoring' tables and objects like `models`, `monitoring`, `alerts` tables, etc.


All alembic configurations for those two lineages are declared in `backend/alembic.ini` file with own section for each lineage. As a result when you run an alembic command you need to specify explicitly which configuration section (lineage) to use


Examples of commands:

```bash
# upgrade public schema to the latest revision
alembic --name public upgrade heads

# print current revision used by public schema
alembic --name public current
```


Organizations lineage is used for each created organization schema and it requires you to additionally specify name of database schema to use.


Examples of commands:

```bash
# upgrade org schema to the latest revision
alembic --name org -x schema=<org-schema-name> upgrade heads

# print current revision used by organization schema
alembic --name org -x schema=<org-schema-name> current
```

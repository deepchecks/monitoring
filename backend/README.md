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

Deepchecks Monitoring Backend

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


Organizations lineage is used for each created organization schema and it requires you to additionaly specify name of database schema to use.


Examples of commands:

```bash
# upgrade org schema to the latest revision
alembic --name org -x schema=<org-schema-name> upgrade heads

# print current revision used by organization schema
alembic --name org -x schema=<org-schema-name> current
```

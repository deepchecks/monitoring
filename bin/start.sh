#!/bin/bash
cd /code/backend && alembic --name public upgrade head
python /code/backend/deepchecks_monitoring/cli.py upgrade-organizations-schemas --orgid=all

if [[ -v INIT_LOCAL_RAY_INSTANCE ]]; then
  ray start --address 127.0.0.2 --port 6389 --head
  RAY_HOST="127.0.0.2:6389"
fi

STARTAPP="uvicorn --factory deepchecks_monitoring.app:create_application --host 0.0.0.0 --workers 4 --log-level critical --proxy-headers --forwarded-allow-ips '*'"

if [[ -v DD_ENV ]]; then
  STARTAPP="ddtrace-run ${RUN}"
fi

eval "${STARTAPP}"

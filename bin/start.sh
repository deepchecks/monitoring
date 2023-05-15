#!/bin/bash
cd /code/backend && alembic --name public upgrade head
python /code/backend/deepchecks_monitoring/cli.py upgrade-organizations-schemas --orgid=all
RUN="uvicorn --factory deepchecks_monitoring.app:create_application --host 0.0.0.0 --workers 4 --log-level critical --proxy-headers --forwarded-allow-ips '*'"
if [[ -v DD_ENV ]]; then
  RUN="ddtrace-run ${RUN}"
fi
eval "${RUN}"

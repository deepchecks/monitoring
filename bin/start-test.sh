#!/bin/bash
cd /code/backend
python deepchecks_monitoring/cli.py initdb
python deepchecks_monitoring/cli.py upgrade-organizations-schemas --orgid=all
uvicorn --factory deepchecks_monitoring.app:create_application --host 0.0.0.0 --workers 4 --log-level warning \
        --proxy-headers --forwarded-allow-ips '*'

#!/bin/bash
cd /code/backend/deepchecks_monitoring && python cli.py initdb
uvicorn --factory deepchecks_monitoring.app:create_application --host 0.0.0.0 --workers 4 --log-level info \
        --proxy-headers --forwarded-allow-ips '*'
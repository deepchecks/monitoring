#!/bin/bash
cd /code/backend
python deepchecks_monitoring/cli.py initdb
python deepchecks_monitoring/cli.py generate-user --random=false

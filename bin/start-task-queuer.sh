#!/bin/bash
RUN="python -m deepchecks_monitoring.bgtasks.tasks_queuer"
if [[ -v DD_ENV ]]; then
  RUN="ddtrace-run ${RUN}"
fi
eval "${RUN}"

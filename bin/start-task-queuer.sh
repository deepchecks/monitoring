#!/bin/bash
RUN="python -m deepchecks_monitoring.bgtasks.tasks_queuer"
if [[ -z "${DD_ENV}" ]]; then
  RUN="ddtrace-run ${RUN}"
fi
eval "${RUN}"

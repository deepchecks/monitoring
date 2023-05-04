#!/bin/bash
RUN="ddtrace-run python -m deepchecks_monitoring.bgtasks.tasks_runner"
if [[ -z "${DD_ENV}" ]]; then
  RUN="ddtrace-run ${RUN}"
fi
eval "${RUN}"

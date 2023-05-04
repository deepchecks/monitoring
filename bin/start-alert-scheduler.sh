#!/bin/bash
RUN="python -m deepchecks_monitoring.bgtasks.scheduler"
if [[ -z "${DD_ENV}" ]]; then
  RUN="ddtrace-run ${RUN}"
fi
eval "${RUN}"

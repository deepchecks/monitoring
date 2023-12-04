# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

FROM --platform=$BUILDPLATFORM node:16.15-alpine3.14 AS frontend

WORKDIR /code

COPY frontend/ frontend/

WORKDIR /code/frontend

RUN yarn config set network-timeout 300000 && \
    yarn install --frozen-lockfile

RUN yarn build


# Build the backend image

FROM python:3.11

ENV PYTHONUNBUFFERED 1

WORKDIR /code

COPY backend/requirements.txt ./

# TODO: not secure, use docker build-kit instead
ARG MIXPANEL_ID
ENV MIXPANEL_ID=$MIXPANEL_ID
# ---
ARG DEEPCHECKS_CI_TOKEN

RUN pip install -U pip setuptools
# For ARM arch, ray>2.3.1 uses grpcio==1.51.3 which doesn't has wheel and takes forever to build from source
RUN pip install ray==2.3.1 grpcio==1.54.2
RUN pip install -r requirements.txt --compile --no-cache-dir

RUN adduser --system --group deepchecks

RUN chown deepchecks.deepchecks /code

USER deepchecks

# Add in Django deps and generate Django's static files
COPY backend backend/
COPY --from=frontend /code/frontend/build /code/frontend/dist

ARG IS_DEEPCHECKS_OSS
RUN if [ -z "$IS_DEEPCHECKS_OSS" ] ; then pip install -q -r backend/addon-requirements.txt --compile --no-cache-dir &> /dev/null ; fi

# Switch to root and install yarn so we can install runtime deps. Node that we
# still need yarn to run the plugin-server so we do not remove it.
USER root

# RUN pip install deepchecks-monitoring --no-index --find-links file:///code/backend/
RUN pip install -q -e backend/

COPY ./bin ./bin/

RUN chown -R deepchecks.deepchecks /code

COPY ./deploy/local_certs/CA/rootCA.pem /usr/local/share/ca-certificates/deepchecksRootCA.crt
RUN update-ca-certificates

USER deepchecks

# Expose container port and run entry point script
EXPOSE 8000

ENV PATH="${PATH}:/code/bin"
ENTRYPOINT ["/bin/bash"]
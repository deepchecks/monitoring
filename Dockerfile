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

FROM ubuntu:22.04

ENV PYTHONUNBUFFERED 1
ENV TZ=Asia/Jerusalem
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN echo "Updated on 2 Apr 2024" # Change to force apt to update the cache
RUN apt-get -y update &&  apt-get -y upgrade

RUN apt-get install -y software-properties-common && add-apt-repository ppa:deadsnakes/ppa &&  \
    apt install -y git python3.11 python3.11-dev python3.11-distutils curl g++ libpq-dev &&  \
    curl -sS https://bootstrap.pypa.io/get-pip.py | python3.11

WORKDIR /code

COPY backend/requirements.txt ./backend_requirements.txt
COPY backend/client/requirements.txt ./client_requirements.txt

# TODO: not secure, use docker build-kit instead
ARG MIXPANEL_ID
ENV MIXPANEL_ID=$MIXPANEL_ID
# ---
ARG DEEPCHECKS_CI_TOKEN

RUN ln -s /usr/bin/python3.11 /usr/bin/python && python -m pip install -U pip==25.1.1 setuptools==80.9.0 --no-cache-dir
# For ARM arch, ray>2.3.1 uses grpcio==1.51.3 which doesn't has wheel and takes forever to build from source
RUN python -m pip install ray==2.9.0 grpcio==1.60.0 --no-cache-dir
RUN python -m pip install -r backend_requirements.txt --compile --no-cache-dir
RUN python -m pip install -r client_requirements.txt --compile --no-cache-dir

RUN adduser --system --group deepchecks

RUN chown deepchecks.deepchecks /code

USER deepchecks

# Add in Django deps and generate Django's static files
COPY backend backend/
COPY --from=frontend /code/frontend/build /code/frontend/dist

ARG IS_DEEPCHECKS_OSS
RUN if [ -z "$IS_DEEPCHECKS_OSS" ] ; then pip install -q -r backend/addon-requirements.txt --compile --no-cache-dir 2> /dev/null ; fi

# Switch to root and install yarn so we can install runtime deps. Node that we
# still need yarn to run the plugin-server so we do not remove it.
USER root

# RUN pip install deepchecks-monitoring --no-index --find-links file:///code/backend/
RUN python -m pip install -q -e backend/
RUN python -m pip install -q -e backend/client

COPY ./bin ./bin/

RUN chown -R deepchecks.deepchecks /code

COPY ./deploy/local_certs/CA/rootCA.pem /usr/local/share/ca-certificates/deepchecksRootCA.crt
RUN update-ca-certificates

USER deepchecks

# Expose container port and run entry point script
EXPOSE 8000

ENV PATH="${PATH}:/code/bin"
ENTRYPOINT ["/bin/bash"]

# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

FROM node:16.15-alpine3.14 AS frontend

WORKDIR /code

COPY frontend/ frontend/

WORKDIR /code/frontend

RUN yarn config set network-timeout 300000 && \
    yarn install --frozen-lockfile

RUN yarn build


# Build the backend image

FROM python:3.8.12

ENV PYTHONUNBUFFERED 1

WORKDIR /code

# RUN apt-get update && \
#     apt-get install \
#     "libpq" \
#     "libxslt" \
#     "nodejs-current" \
#     "chromium" \
#     "chromium-chromedriver" \
#     "xmlsec"

COPY backend/requirements.txt ./

# TODO: not secure, use docker build-kit instead
ARG DEEPCHECKS_CI_TOKEN

RUN pip install -U pip==22.0.4 setuptools==58.3.0 && \
    pip install -q -r requirements.txt --compile --no-cache-dir
    # && apk del .build-deps

RUN pip install pyinstrument

RUN adduser --system --group deepchecks

RUN chown deepchecks.deepchecks /code

USER deepchecks

# Add in Django deps and generate Django's static files
COPY backend backend/
COPY --from=frontend /code/frontend/build /code/frontend/dist

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
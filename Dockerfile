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

COPY ./bin/ /code/bin/

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

ARG GPU_BUILD
RUN if [ -z "$GPU_BUILD" ]; then pip install -q "torch==1.11.0+cpu" "torchvision==0.12.0+cpu" "torchaudio==0.11.0+cpu" \
			-f https://s3.amazonaws.com/pytorch/whl/torch_stable.html; else pip install -e "torch==1.11.0+cu111" "torchvision==0.12.0+cu111" "torchaudio==0.11.0" \
		 	 -f https://s3.amazonaws.com/pytorch/whl/torch_stable.html; fi;
COPY backend/requirements.txt ./
RUN pip install -U pip \
    && \
    pip install pyinstrument && \
    pip install -r requirements.txt --compile --no-cache-dir
    # && \
    # apk del .build-deps

RUN pip install uvicorn pyinstrument

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
RUN pip install -e backend/

RUN apt-get update && apt-get install -y "npm" \
    && npm install -g yarn \
    && yarn install --frozen-lockfile --production=true \
    && yarn cache clean \
    && apt-get clean
    # && apk del .build-deps


COPY ./bin ./bin/

RUN chown -R deepchecks.deepchecks /code

USER deepchecks

ENV DATABASE_URI \
    ASYNC_DATABASE_URI \
    CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/ \
    CHROMEDRIVER_BIN=/usr/bin/chromedriver

# Expose container port and run entry point script
EXPOSE 8000
CMD ["./bin/start"]

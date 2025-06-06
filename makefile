# This makefile helps with deepchecks Development environment
# including syntax checking, virtual environments creation,
# test running and coverage
# This Makefile is based on Makefile by jidn: https://github.com/jidn/python-Makefile/blob/master/Makefile

# Package = Source code Directory
PACKAGE = backend/deepchecks_monitoring

# Requirements file
REQUIRE = backend/requirements.txt

# python3 binary takes precedence over python binary,
# this variable is used when setting python variable, (Line 18)
# and on 'env' goal ONLY
# If your python path binary name is not python/python3,
# override using ext_python=XXX and it'll propagate into python variable, too
ext_py := $(shell which python3 || which python)

# Override by putting in commandline python=XXX when needed.
python = $(shell echo ${ext_py} | rev | cut -d '/' -f 1 | rev)
TESTDIR = $(shell realpath backend/tests)
ENV = $(shell realpath -q .venv || echo .venv)
repo = pypi

WIN_ENV := .venv
WIN_TESTDIR := backend/tests
WIN_BIN := $(WIN_ENV)/bin

# System Envs
BIN := $(ENV)/bin
pythonpath := PYTHONPATH=.
OS := $(shell uname -s)

# Venv Executables
PIP := $(BIN)/pip
PIP_WIN := python -m pip
PYTHON := $(BIN)/$(python)
ANALIZE := $(BIN)/pylint -j 0
COVERAGE := $(BIN)/coverage
COVERALLS := $(BIN)/coveralls
FLAKE8 := $(BIN)/flake8 --whitelist spelling-allowlist.txt
FLAKE8_RST := $(BIN)/flake8-rst
PYTEST := $(BIN)/pytest
TOX := $(BIN)/tox
SPHINX_BUILD := $(BIN)/sphinx-build
TWINE := $(BIN)/twine
UVICORN := $(BIN)/uvicorn
ALEMBIC := $(BIN)/alembic

# Project Settings
PKGDIR := $(or $(PACKAGE), ./)
SOURCES := $(or $(PACKAGE), $(wildcard *.py))


# Test and Analyize
TEST_CODE := tests/

PYLINT_LOG = .pylint.log

# Coverage vars
COVERAGE_LOG = .cover.log
COVERAGE_FILE = default.coveragerc
COVERAGE_RC := $(wildcard $(COVERAGE_FILE))
COVER_ARG := --cov-report term-missing --cov=$(PKGDIR) \
	$(if $(COVERAGE_RC), --cov-config $(COVERAGE_RC))


# Documentation
#
DOCS         := $(shell realpath ./docs)
DOCS_SRC     := $(DOCS)/source
DOCS_BUILD   := $(DOCS)/build
DOCS_REQUIRE := $(DOCS)/$(REQUIRE)

# E2E tests
E2E := $(shell realpath ./e2e)

# variables that will be passed to the documentation make file
SPHINXOPTS   ?=


EGG_INFO := $(subst -,_,$(PROJECT)).egg-info
EGG_LINK = venv/lib/python3.7/site-packages/deepchecks.egg-link


### Main Targets ######################################################

.PHONY: help env all requirements doc-requirements dev-requirements

# TODO: add description for all targets (at least for the most usefull)

help:
	@echo "env"
	@echo ""
	@echo "    Create virtual environment and install requirements"
	@echo "    python=PYTHON_EXE interpreter to use, default=python,"
	@echo "    when creating new env and python binary is 2.X, use 'make env python=python3'"
	@echo ""
	@echo "validate"
	@echo ""
	@echo "    Run style checks 'pylint' , 'docstring'"
	@echo "    pylint docstring - sub commands of validate"
	@echo ""
	@echo "test"
	@echo ""
	@echo "    TEST_RUNNER on '$(TESTDIR)'"
	@echo "    args=\"<pytest Arguements>\" optional arguments"
	@echo ""
	@echo "coverage"
	@echo ""
	@echo "    Get coverage information, optional 'args' like test"
	@echo ""
	@echo "tox"
	@echo ""
	@echo "    Test against multiple versions of python as defined in tox.ini"
	@echo ""
	@echo "clean | clean-all"
	@echo ""
	@echo "    Clean up | clean up & removing virtualenv"
	@echo ""


all: validate test


env: $(ENV) requirements dev-requirements


$(ENV):
	@echo "#### Creating Python Vertual Enviroment [ $(ENV) ] ####"
	@test -d $(ENV) || $(ext_py) -m venv $(ENV)
	@$(PIP) install -e backend/
	@$(PIP) install -U pip setuptools ray==2.9.0


requirements: $(ENV)
	@echo "####  installing main dependencies, it could take some time, please wait! #### "
	@$(PIP) install -q -r ./backend/requirements.txt
	@$(PIP) install -q uvicorn
	@$(PIP) install backend/client


dev-requirements: $(ENV)
	@echo "####  installing development dependencies, it could take some time, please wait! ####"
	@$(PIP) install -q -r ./backend/dev-requirements.txt


### Static Analysis ######################################################


.PHONY: validate pylint docstring


validate: pylint docstring


pylint:
	$(ANALIZE) $(SOURCES) $(TEST_CODE)
	$(FLAKE8) $(SOURCES) --per-file-ignores="deepchecks_monitoring/utils/notebook_resources/*:E999"
# 	$(FLAKE8_RST) $(SOURCES)


docstring:
	$(PYTHON) -m pydocstyle --convention=pep257 --add-ignore=D107 $(SOURCES) --match-dir="^deepchecks_monitoring/utils/notebook_resources/"


### Testing ######################################################

.PHONY: test coverage


test:
	$(PYTEST) $(args) $(TESTDIR)


test-win:
	@test -d $(WIN_ENV) || python -m venv $(WIN_ENV)
	@$(WIN_ENV)\Scripts\activate.bat
	@$(PIP_WIN) install -U pip==22.0.4 setuptools==58.3.0
	@$(PIP_WIN) install -q -r ./requirements.txt -r ./dev-requirements.txt
	python -m pytest $(WIN_TESTDIR)


coverage:
	$(COVERAGE) run --source deepchecks_monitoring/,tests/ -m pytest

coveralls: coverage
	$(COVERALLS) --service=github


# This is Here For Legacy || future use case,
# our PKGDIR is in its own directory so we dont really need to remove the ENV dir.
$(COVERAGE_FILE):
ifeq ($(PKGDIR),./)
ifeq (,$(COVERAGE_RC))
	# If PKGDIR is root directory, ie code is not in its own directory
	# then you should use a .coveragerc file to remove the ENV directory
	$(info Rerun make to discover autocreated $(COVERAGE_FILE))
	@echo -e "[run]\nomit=$(ENV)/*" > $(COVERAGE_FILE)
	@cat $(COVERAGE_FILE)
	@exit 68
endif
endif


tox:
	$(TOX)


freeze:
	@$(PIP) freeze


check-migrations-liniarity:
	@cd backend/ && test $$($(ALEMBIC) --name public heads | wc -l) -eq 1
	@cd backend/ && test $$($(ALEMBIC) --name org heads | wc -l) -eq 1
# @test $$($(ALEMBIC) --name public heads | wc -l) -eq 1
# @test $$($(ALEMBIC) -c ./backend/alembic.ini --name org heads | wc -l) -eq 1


### Cleanup ######################################################

.PHONY: clean clean-env clean-all clean-build clean-test clean-dist clean-docs trailing-spaces


clean: clean-dist clean-test clean-build clean-docs


clean-all: clean clean-env


clean-env: clean
	-@rm -rf $(ENV)
	-@rm -rf $(COVERAGE_LOG)
	-@rm -rf $(PYLINT_LOG)
	-@rm -rf ./lychee.output
	-@rm -rf .tox


clean-build:
	@find $(PKGDIR) -name '*.pyc' -delete
	@find $(PKGDIR) -name '__pycache__' -delete
	@find $(TESTDIR) -name '*.pyc' -delete 2>/dev/null || true
	@find $(TESTDIR) -name '__pycache__' -delete 2>/dev/null || true
	-@rm -rf $(EGG_INFO)
	-@rm -rf __pycache__


clean-test:
	-@rm -rf .pytest_cache
	-@rm -rf .coverage


clean-dist:
	-@rm -rf dist build


clean-docs: $(DOCS)
	@rm -rf $(DOCS_BUILD)
	@rm -rf $(DOCS)/docs.error.log


trailing-spaces:
	@find ./deepchecks_monitoring/ -name "*.py" -type f -print0 | xargs -0 sed -i "s/[[:space:]]*$$//"
	@find ./tests/ -name "*.py" -type f -print0 | xargs -0 sed -i "s/[[:space:]]*$$//"


### Release ######################################################

.PHONY: authors register dist upload test-upload release test-release .git-no-changes env-setup external-services-setup cypress


authors:
	echo "Authors\n=======\n\nA huge thanks to all of our contributors:\n\n" > AUTHORS.md
	git log --raw | grep "^Author: " | cut -d ' ' -f2- | cut -d '<' -f1 | sed 's/^/- /' | sort | uniq >> AUTHORS.md


dist: $(ENV)
	$(PIP) install wheel twine
	$(PYTHON) setup.py sdist
	$(PYTHON) setup.py bdist_wheel


# upload expects to get all twine args as environment,
# refer to https://twine.readthedocs.io/en/latest/ for more information
#
upload: $(TWINE)
	$(TWINE) upload dist/*


# TestPyPI – a separate instance of the Python Package Index that allows us
# to try distribution tools and processes without affecting the real index.
#
test-upload: $(TWINE)
	$(TWINE) upload --repository-url https://test.pypi.org/legacy/ dist/*


release: dist upload
test-release: dist test-upload


.git-no-changes:
	@if git diff --name-only --exit-code;       \
	then                                        \
		echo Git working copy is clean...;        \
	else                                        \
		echo ERROR: Git working copy is dirty!;   \
		echo Commit your changes and try again.;  \
		exit -1;                                  \
	fi;


docker:
	@docker build -t deepchecks-enterprise-testing --build-arg DEEPCHECKS_CI_TOKEN=$DEEPCHECKS_CI_TOKEN .

external-services-setup:
	@docker-compose -f $(E2E)/docker-compose.yml up -d
	@sleep 2

env-setup: external-services-setup
	@docker run -d --env-file $(E2E)/.development.env -e IS_ON_PREM -e OAUTH_CLIENT_ID -e OAUTH_CLIENT_SECRET --network deepchecks -p 8000:8000 deepchecks-enterprise-testing start-test.sh
	@sleep 15
	@docker run -d --env-file $(E2E)/.development.env --network deepchecks deepchecks-enterprise-testing start-alert-scheduler.sh
	@docker run -d --env-file $(E2E)/.development.env --network deepchecks deepchecks-enterprise-testing start-task-queuer.sh
	@docker run -d --env-file $(E2E)/.development.env --network deepchecks deepchecks-enterprise-testing start-task-runner.sh
	@sleep 10

cypress: env-setup
	@cd $(E2E) && npm install && TZ=UTC npx cypress run

### Documentation

.PHONY: docs validate-examples website dev-docs gen-static-notebooks license-check links-check doc-requirements

doc-requirements: $(ENV)
	@echo "####  installing documentation dependencies, it could take some time, please wait! #### "
	@$(PIP) install -r ./docs/requirements.txt

# ANSI_COLORS_DISABLED disables pretty_print in mon cli and makes doctest work with those prints
docs: doc-requirements $(DOCS_SRC)
	@export ANSI_COLORS_DISABLED=True
	$(PIP) install backend/client; \
	cd $(DOCS) && \
	make html SPHINXBUILD=$(SPHINX_BUILD) SPHINXOPTS=$(SPHINXOPTS) 2> docs.error.log
	@echo ""
	@echo "++++++++++++++++++++++++"
	@echo "++++ Build Finished ++++"
	@echo "++++++++++++++++++++++++"
	@echo ""
	@echo "statistic:"
	@echo "- ERRORs: $$(grep "ERROR" $(DOCS)/docs.error.log | wc -l)"
	@echo "- WARNINGs: $$(grep "WARNING" $(DOCS)/docs.error.log | wc -l)"

validate-examples: doc-requirements
	@$(PYTHON) $(TESTDIR)/examples_validation.py

show-docs: $(DOCS_BUILD)/html
	@cd $(DOCS_BUILD)/html && $(PYTHON) -m http.server 8001


license-check:
	@wget https://dlcdn.apache.org/skywalking/eyes/0.4.0/skywalking-license-eye-0.4.0-bin.tgz && tar -xzvf skywalking-license-eye-0.4.0-bin.tgz
	@mv skywalking-license-eye-0.4.0-bin/bin/linux/license-eye ./
	@rm -rf skywalking-license-eye-0.4.0-bin && rm -f skywalking-license-eye-0.4.0-bin.tgz
	./license-eye -c .licenserc_fix.yaml header check
	@rm license-eye


links-check: $(DOCS_BUILD) $(LYCHEE)
	@$(LYCHEE) \
		"./deepchecks/**/*.rst" "./*.rst" "$(DOCS_BUILD)/html/**/*.html" \
		--base $(DOCS_BUILD)/html \
		--accept=200,403,429 \
		--format markdown \
		--output ./lychee.output \
		--exclude-loopback \
		--exclude-mail \
		--exclude-file $(DOCS)/.lycheeignore \
		--exclude ".*git.*"; \
	if [ $? -eq 0 ]; \
	then \
		echo "+++ Nothing Detected +++"; \
		exit 0; \
	else \
		echo ""; \
		echo "++++++++++++++++++++++++++++"; \
		echo "++++ Links Check Failed ++++"; \
		echo "++++++++++++++++++++++++++++"; \
		echo ""; \
		echo "full output was written to the next file:"; \
		echo "- $(shell realpath ./lychee.output)"; \
		echo ""; \
		head -n 12 lychee.output; \
		exit 1; \
	fi;


$(LYCHEE):
	@curl -L --output lychee.tar.gz https://github.com/lycheeverse/lychee/releases/download/v0.8.2/lychee-v0.8.2-x86_64-unknown-linux-gnu.tar.gz
	@tar -xvzf lychee.tar.gz
	@rm -rf ./lychee.tar.gz
	@chmod +x ./lychee
	@mkdir -p $(BIN)/
	@mv ./lychee $(BIN)/


### System Installation ######################################################

.PHONY: develop install download run

develop:
	$(PYTHON) setup.py develop

install:
	$(PYTHON) setup.py install

download:
	$(PIP) install $(PROJECT)

run:
	$(UVICORN) --reload --factory deepchecks_monitoring.app:create_application
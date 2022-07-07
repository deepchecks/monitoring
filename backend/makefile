# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------

# This makefile helps with deepchecks Development environment
# including syntax checking, virtual environments creation,
# test running and coverage
# This Makefile is based on Makefile by jidn: https://github.com/jidn/python-Makefile/blob/master/Makefile

# Package = Source code Directory
PACKAGE = deepchecks_api

# Requirements file
REQUIRE = requirements.txt

# python3 binary takes precedence over python binary,
# this variable is used when setting python variable, (Line 18)
# and on 'env' goal ONLY
# If your python path binary name is not python/python3,
# override using ext_python=XXX and it'll propagate into python variable, too
ext_py := $(shell which python3 || which python)

# Override by putting in commandline python=XXX when needed.
python = $(shell echo ${ext_py} | rev | cut -d '/' -f 1 | rev)
TESTDIR = $(shell realpath $(PACKAGE)/tests)
ENV = $(shell realpath venv)
repo = pypi

# System Envs
BIN := $(ENV)/bin
pythonpath := PYTHONPATH=.
OS := $(shell uname -s)

# Venv Executables
PIP := $(BIN)/pip
PYTHON := $(BIN)/$(python)
ANALIZE := $(BIN)/pylint -j 0
COVERAGE := $(BIN)/coverage
COVERALLS := $(BIN)/coveralls
FLAKE8 := $(BIN)/flake8 --whitelist spelling-allowlist.txt
FLAKE8_RST := $(BIN)/flake8-rst
PYTEST := $(BIN)/pytest
TOX := $(BIN)/tox
TWINE := $(BIN)/twine

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


env: $(ENV)


$(ENV):
	@echo "#### Creating Python Vertual Enviroment [ $(ENV) ] ####"
	@echo "external python_exe is $(ext_py)"
	@test -d $(ENV) || $(ext_py) -m venv $(ENV)


requirements: $(ENV)
	@echo "####  installing dependencies, it could take some time, please wait! #### "

	@$(PIP) install -U pip
	@$(PIP) install -q \
		wheel setuptools \
		-r ./requirements.txt
	@$(PIP) install --no-deps -e .


dev-requirements: $(ENV)
	@echo "####  installing development dependencies, it could take some time, please wait! ####"
	@$(PIP) install -r ./dev-requirements.txt


### Static Analysis ######################################################

.PHONY: validate pylint docstring


validate: pylint docstring


pylint: dev-requirements
	$(ANALIZE) $(SOURCES) $(TEST_CODE)
	$(FLAKE8) $(SOURCES)
	$(FLAKE8_RST) $(SOURCES)


docstring: dev-requirements
	$(PYTHON) -m pydocstyle --convention=pep257 --add-ignore=D107 $(SOURCES)


### Testing ######################################################

.PHONY: test coverage


test: requirements dev-requirements
	$(PYTEST) $(args) $(TESTDIR)


test-win:
	@test -d $(WIN_ENV) || python -m venv $(WIN_ENV)
	@$(WIN_ENV)\Scripts\activate.bat
	@$(PIP_WIN) install -U pip
	@$(PIP_WIN) install -q \
		-r requirements.txt \
		-r dev-requirements.txt
	python -m pytest $(WIN_TESTDIR)


coverage: requirements dev-requirements
	$(COVERAGE) run --source deepchecks_api -m pytest

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


tox: requirements dev-requirements
	$(TOX)


freeze: requirements dev-requirements
	@$(PIP) freeze


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
	@find ./deepchecks/ -name "*.py" -type f -print0 | xargs -0 sed -i "s/[[:space:]]*$$//"
	@find ./tests/ -name "*.py" -type f -print0 | xargs -0 sed -i "s/[[:space:]]*$$//"


### Release ######################################################

.PHONY: authors register dist upload test-upload release test-release .git-no-changes


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


### Documentation

.PHONY: website dev-docs gen-static-notebooks license-check links-check

license-check:
	@wget https://dlcdn.apache.org/skywalking/eyes/0.3.0/skywalking-license-eye-0.3.0-bin.tgz && tar -xzvf skywalking-license-eye-0.3.0-bin.tgz
	@mv skywalking-license-eye-0.3.0-bin/bin/linux/license-eye ./
	@rm -rf skywalking-license-eye-0.3.0-bin && rm -f skywalking-license-eye-0.3.0-bin.tgz
	./license-eye -c .licenserc_fix.yaml header check
	@rm license-eye


### System Installation ######################################################

.PHONY: develop install download jupyter

develop:
	$(PYTHON) setup.py develop

install:
	$(PYTHON) setup.py install

download:
	$(PIP) install $(PROJECT)

jupyter: $(JUPYTER)
	$(BIN)/jupyter-notebook $(args) --notebook-dir=./docs/source/examples

$(JUPYTER):
	$(PIP) install jupyter

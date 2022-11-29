# ----------------------------------------------------------------------------
# Copyright (C) 2021-2022 Deepchecks (https://www.deepchecks.com)
#
# This file is part of Deepchecks.
# Deepchecks is distributed under the terms of the GNU Affero General
# Public License (version 3 or later).
# You should have received a copy of the GNU Affero General Public License
# along with Deepchecks.  If not, see <http://www.gnu.org/licenses/>.
# ----------------------------------------------------------------------------
import os
import pathlib
import re
import typing as t

import setuptools

SETUP_MODULE = pathlib.Path(__file__).absolute()
ROOTDIR = SETUP_MODULE.parent
VERSION_FILE = ROOTDIR / "VERSION"


SEMANTIC_VERSIONING_RE = re.compile(
   r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
   r"(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)"
   r"(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))"
   r"?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$"
)


PYTHON_VERSIONING_RE = re.compile(
    r"^([1-9][0-9]*!)?(0|[1-9][0-9]*)(\.(0|[1-9][0-9]*))*"
    r"((a|b|rc)(0|[1-9][0-9]*))?(\.post(0|[1-9][0-9]*))?"
    r"(\.dev(0|[1-9][0-9]*))?$"
)


def is_correct_version_string(value: str) -> bool:
    match = PYTHON_VERSIONING_RE.match(value)
    return value == "dev" or match is not None


def get_version_string() -> str:
    if not (VERSION_FILE.exists() and VERSION_FILE.is_file()):
        raise RuntimeError(
            "Version file does not exist! "
            f"(filepath: {str(VERSION_FILE)})")
    else:
        version = VERSION_FILE.open("r").readline()
        if not is_correct_version_string(version):
            raise RuntimeError(
                "Incorrect version string! "
                f"(filepath: {str(VERSION_FILE)})"
            )
        return version


def read_requirements_file(path: pathlib.Path) -> t.Tuple[t.List[str], t.List[str]]:
    if not (path.exists() and path.is_file()):
        raise RuntimeError(f'Did not find requirements file - {path.name}')
    
    # github_user = os.environ.get("GITHUB_USER")
    github_token = os.environ.get("GITHUB_TOKEN")
    deepchecks_ci_token = os.environ.get("DEEPCHECKS_CI_TOKEN")
    dependencies = []
    dependencies_links = []
    
    for line in path.open("r").readlines():
        if "-f" in line or "--find-links" in line:
            dependencies_links.append(
                line
                .replace("-f", "")
                .replace("--find-links", "")
                .strip()
            )
        else:
            if "${GITHUB_TOKEN}" in line:
                if not github_token:
                    raise RuntimeError("Cannot provide github credentials")
                else:
                    line = line.replace("${GITHUB_TOKEN}", github_token)
            if "${DEEPCHECKS_CI_TOKEN}" in line and not line.startswith('#'):
                if not deepchecks_ci_token:
                    raise RuntimeError("Cannot provide DEEPCHECKS_CI_TOKEN")
                else:
                    line = line.replace("${DEEPCHECKS_CI_TOKEN}", deepchecks_ci_token)
            dependencies.append(line)
    
    return dependencies, dependencies_links


# ===============================================================

version = get_version_string()
install_requires, dependency_links = read_requirements_file(ROOTDIR / 'requirements.txt')

setuptools.setup(
    name="deepchecks-monitoring",
    version=version,
    author="Deepchecks",
    author_email="",
    description="",
    packages=setuptools.find_packages(where=".", include=["deepchecks_monitoring", "deepchecks_monitoring.*"]),
    python_requires='>=3.8',
    install_requires=install_requires,
    dependency_links=dependency_links,
    package_data={'deepchecks_monitoring.migrations': ['script.py.mako']},
)

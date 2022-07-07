import setuptools

setuptools.setup(
    name="deepchecks-monitoring",
    version="0.0.1",
    author="Deepchecks",
    author_email="",
    description="",
    package_dir={"": "deepchecks_api"},
    packages=setuptools.find_packages(where="deepchecks_api"),
    python_requires='>=3.8'
)

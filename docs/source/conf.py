# Configuration file for the Sphinx documentation builder.
#
# This file only contains a selection of the most common options. For a full
# list see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html
import os
from subprocess import check_output


# -- Path setup --------------------------------------------------------------

# If extensions (or modules to document with autodoc) are in another directory,
# add these directories to sys.path here. If the directory is relative to the
# documentation root, use os.path.abspath to make it absolute, like shown here.
#
# import os
# import sys
# sys.path.insert(0, os.path.abspath('.'))


# -- Project information -----------------------------------------------------

project = 'Deepchecks Monitoring'
copyright = '2022, Deepchecks'
author = 'Deepchecks'


# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
    'numpydoc',
    'sphinx.ext.autodoc',
    'sphinx.ext.autosummary',
    'sphinx.ext.doctest',
    'sphinx_gallery.gen_gallery',
    'sphinx_copybutton',
    'sphinx.ext.intersphinx',
    'sphinx_toolbox.collapse',
    'sphinx_reredirects',
    'sphinx_design',
]

intersphinx_mapping = {
    'python': ('https://docs.python.org/3', None),
    'deepchecks': ('https://docs.deepchecks.com/stable', None),
    'pandas': ('https://pandas.pydata.org/docs/', None),
    'pd': ('https://pandas.pydata.org/docs/', None),
    'requests':  ('https://requests.readthedocs.io/en/latest/', None),
    'numpy': ('https://numpy.org/doc/stable/', None),
    'torch':  ('https://pytorch.org/docs/stable/', None),
    'datetime':  ('https://docs.python.org/3', None),
}

redirects = {
    "index": "getting-started/welcome.html",
    "getting-started/index": "welcome.html",
}

sphinx_gallery_conf = {
    "remove_config_comments": True, # for enabling to overide the default thumb_file aesthetically
    "default_thumb_file": os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                       "_static/images/general/sphx_glr_deepchecks_icon.png"),
    "examples_dirs": [
        "user-guide/tabular/quickstarts",
        "user-guide/demos"
    ],
    "gallery_dirs": [
        "user-guide/tabular/auto_quickstarts",
        "user-guide/auto_demos"
    ],

}

# Add any paths that contain templates here, relative to this directory.
templates_path = ['_templates']

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
exclude_patterns = []


# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
#
html_theme = 'pydata_sphinx_theme'

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
html_static_path = ['_static']
html_css_files = ['css/custom.css',]

#
html_sidebars = {
    "**": ["search-field.html", "sidebar-nav-bs"]
}

# Path to logo and favicon
#
html_logo = "./_static/images/general/deepchecks-monitoring-logo.svg"
html_favicon = "./_static/favicons/favicon.ico"

GIT = {
    "user": "deepchecks",
    "repo": "deepchecks"
}

try:
    GIT["branch"] = tag = check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]).decode().strip()
    GIT["release"] = check_output(['git', 'describe', '--tags', '--always']).decode().strip()
except Exception as error:
    raise RuntimeError("Failed to extract commit hash!") from error

html_theme_options = {
    # "collapse_navigation": False,
    # "navigation_depth": 6,
    "navbar_end": ["navbar-icon-links"],
    "external_links": [
      {"name": "API Docs", "url": "https://staging-v2.deepchecks.com/docs"},
      {"name": "Testing", "url": "https://docs.deepchecks.com/stable"},
      {"name": "CI", "url": "https://docs.deepchecks.com/stable/general/usage/ci_cd.html"}
    ],
    "page_sidebar_items": ["page-toc", ],
    "icon_links_label": "Quick Links",
    "icon_links": [
        {
            "name": "GitHub",
            "url": f"https://github.com/{GIT['user']}/{GIT['repo']}",
            "icon": "fab fa-github-square",
        },
        {
            "name": "Slack",
            "url": "https://deepchecks.com/slack",
            "icon": "fab fa-slack",
        },
        {
            "name": "PyPI",
            "url": "https://pypi.org/project/deepchecks/",
            "icon": "fab fa-python",
        }
    ],
}

# If true, Sphinx will warn about all references where the target cannot be found.
# Default is False. You can activate this mode temporarily using the -n command-line switch.
#
nitpicky = True
nitpick_ignore_regex = [('py:docstring', r'deepchecks_client.*')]

# A boolean that decides whether module names are prepended to all object names.
# Default is True.
#
add_module_names = False

# If true, suppress the module name of the python reference if it can be resolved.
# The default is False.
#
python_use_unqualified_type_names = True

# -- autosummary settings --------------------------------------------------

# Boolean indicating whether to scan all found documents for autosummary directives,
# and to generate stub pages for each. It is enabled by default.
#
# autosummary_generate = False


# If true, autosummary overwrites existing files by generated stub pages.
# Defaults to true (enabled).
#
autosummary_generate_overwrite = False

# A boolean flag indicating whether to document classes and
# functions imported in modules. Default is False
#
autosummary_imported_members = False

# If False and a module has the __all__ attribute set, autosummary
# documents every member listed in __all__ and no others. Default is True
#
autosummary_ignore_module_all = False

# -- autodoc settings --------------------------------------------------

# Autodoc settings.
# This value selects how the signature will be displayed for the class defined by autoclass directive.
# The possible values are:
# + "mixed"     - Display the signature with the class name (default).
# + "separated" - Display the signature as a method.
#
autodoc_class_signature = 'separated'

# This value controls how to represent typehints. The setting takes the following values:
#    'signature' – Show typehints in the signature (default)
#    'description' – Show typehints as content of the function or method The typehints of overloaded functions or methods will still be represented in the signature.
#    'none' – Do not show typehints
#    'both' – Show typehints in the signature and as content of the function or method
#
autodoc_typehints = 'signature'

# This value controls the format of typehints.
# The setting takes the following values:
#   + 'fully-qualified' – Show the module name and its name of typehints
#   + 'short' – Suppress the leading module names of the typehints (default in version 5.0)
#
autodoc_typehints_format = 'short'

# True to convert the type definitions in the docstrings as references. Defaults to False.
#
napoleon_preprocess_types = False

# Report warnings for all validation checks
numpydoc_validation_checks = {"PR01", "PR02", "PR03", "RT03"}

# -- Copybutton settings --------------------------------------------------

# Only copy lines starting with the input prompts,
# valid prompt styles: [
#     Python Repl + continuation (e.g., '>>> ', '... '),
#     Bash (e.g., '$ '),
#     ipython and qtconsole + continuation (e.g., 'In [29]: ', '  ...: '),
#     jupyter-console + continuation (e.g., 'In [29]: ', '     ...: ')
# ]
# regex taken from https://sphinx-copybutton.readthedocs.io/en/latest/#using-regexp-prompt-identifiers
copybutton_prompt_text = r">>> |\.\.\. |\$ |In \[\d*\]: | {2,5}\.\.\.: | {5,8}: "
copybutton_prompt_is_regexp = True

# Continue copying lines as long as they end with this character
copybutton_line_continuation_character = "\\"


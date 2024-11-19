.. _user_guide:

==========
User Guide
==========

For installing the open-source version of the monitoring app,
check out the :ref:`installation__self_host_deepchecks` guide,
and for getting started with the SaaS version go to the :ref:`quick_tabular`

To get better familiar with the way the system operates, and dive into various concepts and
configuration options, make sure to check the :ref:`user_guide__general` section.


.. _user_guide__general:

General
-------

Here you can find all of the data related to the system and the way it operates, this includes:
info about our concepts and terminology (e.g. checks, monitors, alert rules, etc.),
workspaces, FAQ about interacting with the SDK and app (e.g. recommendations regarding uploading of the data),
aggregation methods (over windows), metrics, etc.

.. toctree::
    :maxdepth: 2
    :caption: General

    general/workspace_settings
    general/concepts
    general/faq
    general/deploying_on_ec2
    general/aggregation_methods
    general/scorers

Tabular
-------

Here you can find more info and examples about how to set your data and model and see them in deepchecks.
In the quickstarts you can find quick guides, and aside from them you can find more elaborate explanations
about each of the steps.

.. toctree::
    :maxdepth: 2
    :caption: Tabular

    tabular/auto_quickstarts/index
    tabular/tabular_setup
    tabular/tabular_production


User Interface
----------------

This section goes through the different screens in the Deepchecks Monitoring UI,
and how you can work with each of them.

.. toctree::
    :maxdepth: 2
    :caption: User Interface

    user_interface/dashboard
    user_interface/alerts
    user_interface/analysis
    user_interface/configuration
    user_interface/integrations

Examples
--------

End-to-end examples showcasing how to send data from real-life scenarios, all the way through to finding
issues in production and pinpointing their root cause.

.. toctree::
    :maxdepth: 2
    :caption: Examples

    auto_demos/index


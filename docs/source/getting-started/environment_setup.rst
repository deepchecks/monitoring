.. _environment_setup:

================================
Setting Up the Environment
================================

Overview - Deepchecks Monitoring Structure
================================================

Deepchecks Monitoring can be used using via SaaS, as an open-source, and with a 
managed on-prem solution. Check out 
`the different tiers <https://deepchecks.com/pricing>`__ if you want 
more info about the licensed versions, or contact us at info@deepchecks.com.

There are two parts to the system:

- The client side (the ``deepchecks-client`` Python SDK), for interacting with the 
  monitoring app: you should :ref:`install it <installation__deepchecks_client>` in all cases.
- The monitoring service itself (UI, backend, etc.), which is built of several 
  docker containers and deployed with docker-compose: 
  you need :ref:`to install it <installation__self_host_deepchecks>` only if you're using the open-source self-hosted version.

The installation for each of the two parts is independent, and this guide includes a step-by-step tutorial for both options.
Step #2 is the local installation of the monitoring service, which you'll skip if you're not working with the open-source deployment.


Installation and Setup Steps
===============================

In order to work with Deepchecks Monitoring, you need to:

1. :ref:`Install the deepchecks-client with pip <installation__deepchecks_client>`, which installs the SDK for interacting
   with the app, along with the :doc:`Deepchecks Testing <deepchecks:getting-started/welcome>` package.
2. :ref:`Deploy the self-hosted open source <installation__deepchecks_self_hosted>` 
   instance of Deepchecks Monitoring app (**Only for open source deployments**).
3. Log in to the Deepchecks Monitoring app and 
   :ref:`Create an organization or join an existing organization <installation__create_or_join_organization>`
4. :ref:`Obtain your API key <installation__obtain_api_key>` from the app



.. _installation__deepchecks_client:

Step #1: Install ``deepchecks-client`` with pip
====================================================

``deepchecks-client`` is a Python package which contains the SDK for interacting with the monitoring app. 
Its installation will install also the :doc:`Deepchecks Testing <deepchecks:getting-started/welcome>` package (named ``deepchecks``) 
which includes core functionalities that are used by the deepchecks solution. In addition ``deepchecks`` is useful when exploring existing issues 
(e.g. when using the "download" feature to further research the issue in your local environment).

To install, use pip with the the following command:

.. code-block:: bash

    pip install deepchecks-client --upgrade


.. _installation__deepchecks_self_hosted:

Step #2: Deploy the self-hosted open source
==============================================

**If you're using the SaaS version, you can skip this step.** 

If you wish to self-host the deepchecks open source monitoring app, 
jump over to the :ref:`self-host deepchecks monitoring <installation__self_host_deepchecks>` installation instructions,
and continue to the next step once you've completed the local installation and can open your local deepchecks monitoring instance.


.. _installation__create_or_join_organization:

Step #3: Create or join an organization
=============================================

For SaaS usage: following an invite mail (sign up to our invite system at the `Deepchecks Website`_, or contact us at info@deepchecks.com),
you'll be able to join a new organization.
Then, head over to the deepchecks host URL (e.g. https://app.deepchecks.com or your unique url if received) to start exploring.

For open source: create a user and organization and log in to the deepchecks UI, hosted at the url you've chosen during installation
(default is http://localhost).

.. _Deepchecks Website: https://www.deepchecks.com


.. _installation__obtain_api_key:

Step #4: Obtain your API key
=================================

To start working with deepchecks, you must first create a
:class:`DeepchecksClient <deepchecks_client.DeepchecksClient>` object.
To do that, you will need go generate a personal API token using the application's dashboard:

.. image:: /_static/images/quickstart/get_api_token.png
    :width: 600

|

Note: save your API key as you will be able to view it only once.
We recommend seting an environment variable named ``DEEPCHECKS_API_TOKEN`` by running the following in your terminal:

.. code-block:: bash

    export DEEPCHECKS_API_TOKEN=replace-this-string-with-your-api-token

If you need a new API key, the "regenerate" button will create and reveal a new key. This will invalidate the previously generated key.

You can then use the following code snippet to instantiate a :class:`DeepchecksClient <deepchecks_client.DeepchecksClient>` 
and start interacting with the system.

.. doctest::

    >>> import os
    >>> from deepchecks_client import DeepchecksClient
    >>> # it is recommended to store the token in an enviroment variable for security reasons.
    >>> # alternatively (not recommended) you can replace the os.getenv function with the value of the token.
    >>> host = os.getenv('DEEPCHECKS_API_HOST')
    >>> token = os.getenv('DEEPCHECKS_API_TOKEN')
    >>> dc_client = DeepchecksClient(host=host, token=os.getenv('DEEPCHECKS_API_TOKEN'))


You're ready to go!
======================

Congratulations, you're ready to start monitoring your models with deepchecks!

Head over to our :doc:`Quickstart </user-guide/tabular/auto_quickstarts/plot_quickstart>`
or see the full :doc:`User Guide </user-guide/index>`
to get your model & data monitoring up and running.

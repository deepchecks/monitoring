.. _installation:

============
Installation
============

In order to work with Deepchecks Monitoring, you need to:

1. :ref:`Install with pip <installation__deepchecks_client>` the ``deepchecks-client`` python package, which installs the SDK for interacting with the app
   and the :doc:`Deepchecks Testing <deepchecks:getting-started/welcome>` package.
2. Sign up to Deepchecks Cloud or self-host your own instance of Deepchecks Monitoring open-source.
3. Log in to the Deepchecks Monitoring app and :ref:`create an organization or join an existing organization <installation__create_or_join_organization>`
4. :ref:`Obtain an API key <installation__obtain_api_key>` from the app



.. _installation__deepchecks_client:

Install with pip
=================================

deepchecks-client is a python package that installs the SDK for interacting with the monitoring app and
the :doc:`Deepchecks Testing <deepchecks:getting-started/welcome>` package, which can be useful when exploring existing issues
(e.g. when using the "download" feature to further research the issue in your local environment)

It can be installed using pip:

.. code-block:: bash

    pip install deepchecks-client --upgrade


.. _installation__create_or_join_organization:

Create or join an organization
=================================

Following an invite mail (sign up to our invite system at the `Deepchecks Website`_, or contact us at info@deepchecks.com),
you'll be able to join a new organization.
Then, head over to the deepchecks host URL (e.g. https://app.deepchecks.com) to start exploring.

.. _Deepchecks Website: https://www.deepchecks.com


.. _installation__obtain_api_key:

Obtain your API key
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
Then you'll be able to create a :class:`DeepchecksClient <deepchecks_client.DeepchecksClient>` and start interacting with the system.

You can use the following code snippet to instantiate it and start sending data to the system.

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
to get your model monitoring up and running.
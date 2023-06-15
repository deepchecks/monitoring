.. _installation__self_host_deepchecks:

=======================================
Install the Open-Source Deployment
=======================================

Deepchecks can be self-hosted on your on-prem environment. If you are a large company and you have data privacy
concerns when sharing your data with SaaS tools, or you're an engineer wishing to use the open-source version
of Deepchecks, you're in the right place! The open-source deployment let's you spin up a fresh Deepchecks instance
in a few minutes.

If you're using the SaaS offering, feel free to skip to the :ref:`environment_setup`, or jump right to the 
:ref:`Monitoring Quickstart for SaaS <quick_tabular>`.

.. Don't want to manage the deepchecks app yourself? The quickest way to get started with Deepchecks is to use
.. the SaaS `Deepchecks Cloud <https://app.deepchecks.com>`__ offering.

.. note::
    The open source version is built for monitoring 1 model per deployment. Its ability to handle scale
    (e.g. more than 100K data samples/month) may be limited and depends also on your infrastructure limitations.


Requirements
============

* A Linux Ubuntu Server / MacOS / Windows with `installed docker <https://docs.docker.com/desktop/install/windows-install/>`__
* At least 4GB of RAM
* At least 2 vCPU cores
* At least 20GB of persistent volumes

  - POSIX-compliant block storage
  - 3,000 IOPS recommended

* **Optional (but recommended for secured installations):**

  - A DNS record on a domain you own. Deepchecks will automatically create an SSL certificate for your domain
    using LetsEncrypt.

Configuration
=============

Deepchecks can be configured using environment variables. See the :ref:`Configuration section <installation__self_host_configuration>`
for more details.

Installing
==========

To get started: first make sure you have the docker engine up and running 
(try running ``docker`` or ``docker ps`` in your cli and check if you receive relevant output).

.. admonition:: Before Installing: Make a New Directory
    :class: hint

    Create a new directory where you want the monitoring installation files to be inside.
    Then open the terminal inside that directory and start the installation.

Running the following commands in the terminal will spin up a new Deepchecks deployment automatically.

.. code-block:: bash
    
    pip install deepchecks-installer
    deepchecks-installer install-monitoring

During the installation you'll be asked for:

- The release tag you would like to use (default to ``latest-release``)
- The domain you'd like to use (default to ``local-host``)
- Whether the deployment should be secured (HTTP or HTTPS)

You can press "enter" throughout
the installation process to use the default values.

Once everything has been setup by the installer (if you have fast internet, this shouldn't take more
than a couple of minutes), you should see the following message:

.. code-block::

    We will need to wait ~5-10 minutes for things to settle down, 
    migrations to finish, and TLS certs to be issued.

    ⏳ Waiting for Deepchecks to boot (this will take a few minutes)

.. note::

    The installation will hang here a couple of minutes 
    waiting for all services to finish their deployment procedures.

Once this step concludes successfully: Congratulations 🥇

The monitoring service is now installed. You should now be able to go to the url/domain you provided
(the default is http://localhost), create your user account, and start working with the system 
and with the Deepchecks Monitoring app!

.. image:: /_static/images/installation/deepchecks_oss_login.png
   :alt: Deepchecks Login Screen
   :align: center
   :width: 100%


After you have your user and organizaiton, you can create a model-version 
for monitoring and start sending data to the app!
Open the app's url and follow the onboardingo
tutorial, where you'll upload data to the system. The onboarding tutorial follows the same steps as our
:doc:`quickstart </user-guide/tabular/auto_quickstarts/plot_quickstart>`.


Customizing your deployment (optional)
==========================================

The configuration file exists under the name ``oss-conf.env`` and comes with a series of default config values that should
work for most deployments. If you need to customize anything, you can take a look at the full list of
:ref:`environment variables <installation__self_host__configurationn>`.
After making any changes, simply restart the stack with docker-compose.


Define SMTP for email integration
---------------------------------

Deepchecks sends emails to users in multiple scenarios. Among these, it will send emails to users that are invited to
the platform and can be configured to send emails when there is a new alert.
To enable this feature you need to use your own SMTP server, which can be configured in the environment file with the
following variables:

.. list-table::
   :header-rows: 1
   :widths: 25 40 35

   * - email_smtp_host
     - SMTP host for email
     -

   * - email_smtp_port
     - SMTP port for email
     - 25

   * - email_smtp_username
     - SMTP username for email
     -

   * - email_smtp_password
     - SMTP password for email
     -

   * - deepchecks_email
     - Allows to set "sender" field in emails instead of the "email_smtp_username" value
     -


.. toctree::
    :hidden:
    :maxdepth: 2

    deploy_configuration

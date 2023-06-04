.. _self_host_deepchecks:

======================
Open-source Deployment
======================

Deepchecks can be self-hosted on your on-prem environment. If you are a large company and you have data privacy
concerns when sharing your data with SaaS tools, or you're an engineer wishing to use the open-source version
of Deepchecks, you're in the right place! The open-source deployment let's you spin up a fresh Deepchecks instance
in a few minutes.

Want more reliability? The easiest way to get started with Deepchecks is to use
`Deepchecks Cloud <https://app.deepchecks.com>`_.

.. note::
    The self-hosted open-sourced version is intended for proof-of-concept and experimentation and provided without
    guarantee. You should be confident in your security and ops knowledge to run it. It is limited to 1 model
    and is unlikely to handle more than 100K data samples/month (depends on your infrastructure limitations).

Requirements
============

* A Linux Ubuntu Server / MacOS / Windows with `installed docker <https://docs.docker.com/desktop/install/windows-install/>`_
* At least 4GB of RAM
* At least 2 vCPU cores
* At least 20GB of persistent volumes
    * POSIX-compliant block storage
    * 3,000 IOPS recommended
* **Optional (but recommended for secured installations):**
    * A DNS record on a domain you own. Deepchecks will automatically create an SSL certificate for your domain
      using LetsEncrypt.

Configuration
=============

Deepchecks can be configured using environment variables. See the :doc:`Configuration section </installation/configuration>`
for more details.

Installing
==========

To get started, all you need to do is to run the following command, which will spin up a new Deepchecks deployment
for us automatically!

.. code-block:: bash

    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/deepchecks/monitoring/main/deploy/deploy-oss.sh)"

You will be asked for the release tag you would like to use (default to `latest-release`), the domain you'd like to use,
and whether this deployment should be secured (HTTP or HTTPS).

Once everything has been setup, you should see the following message:

.. code-block::

    We will need to wait ~5-10 minutes for things to settle down, migrations to finish, and TLS certs to be issued.

    ⏳ Waiting for Deepchecks to boot (this will take a few minutes)

The installation will hang here a couple of minutes, waiting for all services to finish their deployment procedures.

Once this is completed, you should be able to see your Deepchecks dashboard on the domain you provided!

Now to get some data into the application, you should follow the
:doc:`quickstart </user-guide/tabular/auto_quickstarts/plot_quickstart>`.

Customizing your deployment (optional)
--------------------------------------

The configuration file exists under the name `oss-conf.env` and comes with a series of default config values that should
work for most deployments. If you need to customize anything, you can take a look at the full list of
:doc:`environment variables </installation/configuration>`.
After making any changes, simply restart the stack with docker-compose.


Define SMTP for email integration
---------------------------------

Deepchecks can send emails to users when they are invited to the platform and when there is a new alert. To enable
this feature you need to use your own SMTP server, which can be configured in the environment file with the following
variables:

.. list-table:: Environment Variables
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

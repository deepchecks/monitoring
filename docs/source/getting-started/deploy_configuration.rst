.. _installation__self_host_configuration:

=====================================
Open-source Deployment Settings
=====================================

Deepchecks is configured by using environment variables. To customize your deployments for your needs, the table below
details the list of environment details Deepchecks is using.

.. list-table:: Environment Variables
   :header-rows: 1
   :widths: 25 40 35

   * - Variable
     - Description
     - Default value

   * - DEPLOYMENT_URL
     - URL for the deployment
     - ``https://$DOMAIN``

   * - oauth_url
     - URL for OAuth
     - ``https://$DOMAIN:8443``

   * - oauth_client_id
     - OAuth client ID
     - ``<randomly generated>``

   * - oauth_client_secret
     - OAuth client secret
     - ``<randomly generated>``

   * - DATABASE_URI
     - URI for the PostgreSQL database
     - ``postgresql://user:password@db:5432/deepchecks``

   * - ASYNC_DATABASE_URI
     - Async URI for the PostgreSQL database
     - ``postgresql+asyncpg://user:password@db:5432/deepchecks``

   * - SECRET_KEY
     - Helps secure cookies, sessions, hashes, etc. Custom value required in production.
     - ``<Randomly generated>``

   * - ACCESS_TOKEN_EXPIRE_MINUTES
     - Expiration time for access token
     - 10

   * - ASSETS_FOLDER
     - Folder path for assets and frontend code
     - ``/code/frontend/dist``

   * - DEBUG_MODE
     - Debug mode flag
     - False

   * - kafka_host
     - Kafka host
     - ``kafka:9092``

   * - kafka_security_protocol
     - Kafka security protocol
     - PLAINTEXT

   * - kafka_sasl_mechanism
     - Kafka SASL mechanism
     - PLAIN

   * - kafka_username
     - Kafka username
     -

   * - kafka_password
     - Kafka password
     -

   * - kafka_replication_factor
     - Kafka replication factor
     - 1

   * - kafka_max_metadata_age
     - Kafka max metadata age
     - 1000

   * - redis_uri
     - URI for Redis
     - ``redis://redis/0``

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




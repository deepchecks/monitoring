=============
Integrations
=============


Notifications
=============


Email Notifications
-------------------

To configure email notifications go to the page 'Configurations/Integrations' and click on the 'Notifications' tab.
On the display table mark the alert severity levels for which you would like to receive notifications on.


.. image:: /_static/images/user-guide/user_interface/8.1.1_selection_of_alert_severity_for_email_notifications.png
    :width: 600


An example of an email notification.


.. image:: /_static/images/user-guide/user_interface/8.1.1_example_of_email_notification.png
    :width: 600



Slack Notifications
-------------------

To configure Slack notifications go to the page 'Configurations/Integrations' and click on the 'Notifications' tab.
In order to authorize the Deepchecks to send messages to a desired Slack workspace click on the button 'Connect' within the 'Get notified on Slack' rectangle.


.. image:: /_static/images/user-guide/user_interface/8.1.2_slack_app_installation.png
    :width: 600


A click on the button shows a Slack application authorization dialog. 
Select a slack workspace and channel where the Deepchecks must send notifications and press the 'Allow' button.


.. image:: /_static/images/user-guide/user_interface/8.1.2_slack_app_authorization.png
    :width: 600


As an acknowledgment of a successful operation the 'Slack App installed' message is shown. 
If you see any other message, please-reach out the Deepchecks support.


.. image:: /_static/images/user-guide/user_interface/8.1.2_slack_app_installation_result.png
    :width: 600


On the table mark alert severity levels about which you want to be notified via Slack.


.. image:: /_static/images/user-guide/user_interface/8.1.2_selection_of_alert_severity_for_slack_notifications.png
    :width: 600


An example of a slack message.


.. image:: /_static/images/user-guide/user_interface/8.1.2_example_of_slack_message.png
    :width: 600


Webhooks
--------

Webhooks functionality gives users a possibility to integrate their Deepchecks organization account with any kind of third-party applications and services that expose reachable public HTTP endpoint.
Saying shortly, you give the Deepchecks an URL address and each time when an alert is raised the Deepchecks will send an 'HTTP POST' request with an alert payload to it.

To configure a webhook go to the page 'Configurations/Integrations' and click on the 'Notifications' tab.

To create a webhook click on the button 'Create Webhook'.


.. image:: /_static/images/user-guide/user_interface/8.1.3_webhook_creation.png
    :width: 600


Fill the form.

Make sure that the specified 'Webhook URL' is reachable and is ready to receive 'HTTP POST' requests.
If an exposed HTTP endpoint requires an authentification then add appropriate 'HTTP Header' values to the webhook.


.. image:: /_static/images/user-guide/user_interface/8.1.3_webhook_creation_form.png
    :width: 600


On the table mark alert severity levels with which the Deepchecks must send requests to the specified HTTP endpoint.


.. image:: /_static/images/user-guide/user_interface/8.1.3_selection_of_alert_severity_for_webhook.png
    :width: 600


An example of an HTTP request payload.


.. code-block::

    POST /index HTTP/1.1 200 OK

    {
        "alert_id": 15, 
        "alert_name": "model: Airbnb monitor: Percent Of Nulls - Medium", 
        "alert_rule": "Medium - Percent Of Nulls > 0.0", 
        "severity": "medium",
        "alert_link": "https://app.deepchecks.com/configuration/alert-rules?modelId=6&severity=medium"
    }



Data Connectors
===============

TODO

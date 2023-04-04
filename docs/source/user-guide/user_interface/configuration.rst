===============
Configuration
===============


Alert Rules
=================

Use this in order to view and manage the alert rules, where you can edit and delete existing rules and create new ones. 
It is highly recommended to create new alert rules directly from the dashboard pages, as otherwise you 
might have many monitors (every new alert rule defined here creates a new monitor).  

Models
==========

The list of models is useful to view the status of your model data ingestion and document any comments on specific versions. 
The following items are the key cases where you would like to use this screen:

1. Understand if there were errors during the ingestion process. Hover over the relevant model, go to “view details”
   which allows you to see all the versions of this models and view all the errors that were found during its data ingestion process.
2. You can put notes on these versions using the “MY NOTES” menu.
3. You can delete models, please note that this is irreversible. 
   Once you delete a model the only way to get the data back to the model is to resend all the data back to the system.


Notification
=================

Configure which level of alerts is sent to email and Slack.


Integrations
=================

Connect to your slack channel here. Press the “Connect” button and follow the instructions.


API Key
===============

The API Key is used to communicate with the Deepchecks server. Press “Regenerate” in order to reveal your API key. 
This will invalidate the previously generated API key - which is critical to maintain the security of your data.
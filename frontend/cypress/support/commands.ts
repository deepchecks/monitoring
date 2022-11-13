/* eslint-disable comma-dangle */
/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

Cypress.Commands.add('login', (username: string, password: string) => {
    cy.url().should('contain', '.auth0.com')
    cy.get('#username').type(username)
    cy.get('#password').type(password)
    cy.get('button[name="action"]').click()
    cy.url().should('eq', Cypress.config().baseUrl + '/')
})


Cypress.Commands.add('resetState', () => {
    const username = Cypress.env('auth0_username')
    const password = Cypress.env('auth0_password')
    cy.session(username, () => {
        cy.clearCookies()
        cy.visit('/')
        cy.login(username, password)
        cy.request({ method: 'delete', url: 'api/v1/organization', timeout: 20000 })
        cy.visit('/')
        cy.url().should('eq', Cypress.config().baseUrl + '/complete-details')
        cy.get('#full_name').focus().clear().type(Cypress.env('user_full_name'))
        cy.get('#organization').type(Cypress.env('organization_name'))
        cy.get('button[type="submit"]').click()
        cy.url().should('eq', Cypress.config().baseUrl + '/')
    })
})


Cypress.Commands.add('createModelAndVersion', (modelName, taskType, modelVersionName) => {
  // Creating a model
  const modelRequest = { name: modelName, task_type: taskType, description: "Model created from Cypress!" }
  const modelVersionRequest = {
    name: modelVersionName,
    features: {
        numeric_feature: "numeric",
        categorical_feature: "categorical"
    },
    non_features: {
        non_feat: "numeric"
    },
  };

  return cy.request('POST', '/api/v1/models', modelRequest)
    .then(response => response.body.id)
    .then(modelId => {
      cy.request('POST', `/api/v1/models/${modelId}/version`, modelVersionRequest).then(
      versionResponse => {
        const ModelVersionId = versionResponse.body.id
        return {
          'model_id': modelId,
          'version_id': ModelVersionId,
          'schema': modelVersionRequest,
          'task_type': taskType

        }
      });
    })
});


Cypress.Commands.add('addDataToVersion', (modelInfo: object, samplesPerHour=20, hourArr = [1, 3, 4, 5, 7]) => {
    const samples = samplesPerHour * hourArr.length
    const data: Record<string, unknown>[] = [];
    const currTime = new Date('November 9, 2022 00:00:00').getTime();
    const dayBefore = currTime - (24 * 60 * 60 * 1000);
    for (let i = 0; i < samples; i++) {
        const hourIndex = Math.floor(i / samplesPerHour)
        const hour = hourArr[Math.floor(i / samplesPerHour)]
        const date = new Date(dayBefore + (hour * 60 * 60 * 1000));
        const label = modelInfo['task_type'] == 'regression' ? i : String(i % 3)
        const pred = modelInfo['task_type'] == 'regression' ? i + (i % (hourIndex + 1)) : String((i + (i % (hourIndex + 1))) % 3)
        const sample = {
            "_dc_sample_id": i + '',
            "_dc_time": date.toISOString(),
            "_dc_prediction": pred,
            "_dc_label": label,
            "numeric_feature": 10 + i,
            "categorical_feature": "ppppp",
            "non_feat": 2
        }

        data.push(sample);
    }

    return cy.request('POST', '/api/v1/model-versions/' + modelInfo['version_id'] + '/data', data);
});


Cypress.Commands.add('addCheck', (modelInfo: object) => {
  const checkData = {
        name: "checky v1",
        config: {
            class_name: "SingleDatasetPerformance",
            params: {reduce: "mean"},
            module_name: "deepchecks.tabular.checks"
        }
    }

  return cy.request('POST', '/api/v1/models/' + modelInfo['model_id'] + '/checks', checkData).then(response => response.body[0])
});

Cypress.Commands.add('addMonitor', (checkInfo: object, frequency = 3600, lookback = 86400, aggregation_window = 3600) => {
    const monitorData = {
        name: `${checkInfo['name']} Monitor`,
        "frequency": frequency,
        "lookback": lookback,
        "aggregation_window": aggregation_window,
    }

    return cy.request('GET', '/api/v1/dashboards/').then(response => {
        monitorData['dashboard_id'] = response.body.id
        return cy.request('POST', `/api/v1/checks/${checkInfo['id']}/monitors`, monitorData).then(() => response.body)
    });
});


Cypress.Commands.add('addAlertRule', (monitorInfo: object, operator = "less_than", value = 0.5, alert_severity = "mid") => {
    const data = {
        "condition": {
            "operator": operator,
            "value": value
        },
        "alert_severity": alert_severity
    }

    cy.request('POST', `api/v1/monitors/${monitorInfo['id']}/alert-rules`, data);
});

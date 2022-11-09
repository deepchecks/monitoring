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

// Cypress.Commands.add(
//   'loginByAuth0Api', () => {
//     const client_id = Cypress.env('auth0_client_id')
//     const client_secret = Cypress.env('auth0_client_secret')
//     const audience = Cypress.env('auth0_audience')
//     const scope = Cypress.env('auth0_scope')
//     const username = Cypress.env('auth0_username')
//     const password = Cypress.env('auth0_password')

//     cy.request({
//       method: 'POST',
//       url: `https://${Cypress.env('auth0_domain')}/oauth/token`,
//       body: {
//         grant_type: 'password',
//         username,
//         password,
//         audience,
//         scope,
//         client_id,
//         client_secret,
//       },
//     }).then(({ body }) => {
//       cy.request(`${Cypress.env('base_url')}/api/v1/auth/login/auth0/callback?oauth_token=${body.access_token}`).then((response) => {
//         console.log(response)
//       })
//     })
//   }
// )


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
    cy.request({method: 'delete', url: 'api/v1/organization', timeout: 20000})
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
    cy.request('POST', '/api/v1/models', modelRequest).then(
        response => {
            const modelId = response.body.id;

            cy.request('POST', `/api/v1/models/${modelId}/version`, modelVersionRequest).then(
                versionResponse => {
                  const ModelVersionId = versionResponse.body.id
                  return {
                    'model_id': modelId,
                    'version_id': ModelVersionId,
                    'schema': modelVersionRequest
                  }
                }
            );
        }
    );
});


Cypress.Commands.add('addDataToVersion', (modelVersionId, taskType, samples=100) => {
    const hourArr = [1, 3, 4, 5, 7]
    const numberEachHour = samples / hourArr.length
    const data: Record<string, unknown>[] = [];
    let date: Date;
    let hour: number;
    const currTime = new Date().getTime();
    const dayBefore = currTime - (24 * 60 * 60 * 1000);
    for (let i = 0; i < samples; i++) {
        hour = hourArr[i % numberEachHour]
        date = new Date(dayBefore + (hour * 60 * 60 * 1000));
        const label = taskType == 'regression' ? i : String(i % 2)

        data.push({
            "_dc_sample_id": i + '',
            "_dc_time": date.toISOString(),
            "_dc_prediction_probabilities": (i % 2) ? [0.1, 0.3, 0.6] : [0.1, 0.6, 0.3],
            "_dc_prediction": (i % 2) ? "2" : "1",
            "_dc_label": label,
            "numeric_feature": 10 + i,
            "categorical_feature": "ppppp",
            "non_feat": 2
        });
    }

    cy.request('POST', '/api/v1/model-versions/' + modelVersionId + '/data', data);
});


Cypress.Commands.add('addChecksToModel', modelId => {
    const checkData = {
        name: "checky v1",
        config: {class_name: "SingleDatasetPerformance",
                   params: {reduce: "mean"},
                   module_name: "deepchecks.tabular.checks"
                   },
    }

    cy.request('POST', '/api/v1/models/' + modelId + '/checks', checkData)
});
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

Cypress.Commands.add('login', () => {
  const username = Cypress.env('auth0_username')
  const password = Cypress.env('auth0_password')
  cy.session(username, () => {
    cy.visit('/')
    cy.get('#username').type(username)
    cy.get('#password').type(password)
    cy.get('button[name="action"]').click()
    cy.wait(10000)
    cy.request('delete', '/api/v1/organization')
    cy.visit('/')
    cy.get('#organization').type('test org')
    cy.get('button[type="submit"]').click()
    cy.wait(10000)
    cy.get('#root').should('be.visible')
  })
})

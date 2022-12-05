describe('load main page', () => {
  it('Have authorization cookie', () => {
    cy.visit('/')
    cy.url().should('eq', Cypress.config().baseUrl + '/')
    cy.getCookie('Authorization').should('exist')
  })

  it('Have correct name', () => {
    cy.visit('/')
    cy.get('p').contains(Cypress.env('user_full_name')).should('have.text', Cypress.env('user_full_name'))
  })

  it('Test invite user', () => {
    cy.visit('/')
    // Intrecepting the request
    cy.intercept('PUT', '/api/v1/organization/invite').as('invitation')
    // Invting the second user
    cy.contains('button', 'Invite to workspace').click()
    cy.get('input[placeholder="Please enter the email address of the invitee.."').type(Cypress.env('second_username'))
    cy.contains('button', 'invite').click()
    // Wait for invitation to complete
    cy.wait('@invitation').its('response.statusCode').should('eq', 200)
    // Logging out
    cy.clearCookies()
    cy.visit('/')
    // Login with the second user
    cy.login(Cypress.env('second_username'), Cypress.env('second_password'))
    // Make sure we have invite
    cy.contains('p', Cypress.env('user_full_name')).should('exist')
    cy.contains('div', 'invited you to').should('exist')
    cy.contains('p', Cypress.env('organization_name')).should('exist')

    // Accept invite
    cy.contains('button', 'Submit').click()
    cy.wait(2000)
    cy.get('input[type="checkbox"]').click()
    cy.get('button[type="button"]').click()
    cy.wait(5000)

    cy.url().should('eq', Cypress.config().baseUrl + '/')
  })
})

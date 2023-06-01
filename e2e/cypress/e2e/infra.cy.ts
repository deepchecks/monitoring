describe("load main page", () => {
  it("Have authorization cookie", () => {
    cy.visit("/");
    cy.url().should("eq", Cypress.config().baseUrl + "/");
    cy.getCookie("Authorization").should("exist");
  });

  it("Have correct name", () => {
    cy.visit("/");
    cy.get("p").contains(Cypress.env("user_full_name"));
  });

  it("Test invite user", () => {
    // Step 1 - Remove secondary user
    // Logging out
    cy.clearCookies();
    cy.visit("/");
    // Login with the second user
    cy.login(Cypress.env("second_username"), Cypress.env("second_password"));
    // Removing user in order to make sure we are at clean state
    cy.request({ method: "delete", url: "api/v1/users", timeout: 20000 });

    // Step 2 - Invite user
    // Login with main user
    cy.visit("/");
    cy.login(Cypress.env("auth0_username"), Cypress.env("auth0_password"));
    // Intercepting the request
    cy.intercept("PUT", "/api/v1/organization/invite").as("invitation");
    // Inviting the second user
    cy.contains("button", "Invite users").click();
    cy.get(
      'input[placeholder="email1@org-name.com, email2@org-name.com, email3@org-name.com, email4@org..."]'
    ).type(Cypress.env("second_username"));
    cy.contains("button", "Send Invite").click();
    // Wait for invitation to complete
    cy.wait("@invitation").its("response.statusCode").should("eq", 200);

    // Step 3 - Accept invitation
    // Login again
    cy.clearCookies();
    cy.visit("/");
    cy.login(Cypress.env("second_username"), Cypress.env("second_password"));
    cy.url().should("eq", Cypress.config().baseUrl + "/complete-details");
    // Make sure we have invite
    cy.contains("div", "invited you to").should("exist");
    cy.contains("p", Cypress.env("organization_name")).should("exist");

    // Accept invite
    cy.contains("button", "Submit").click();
    cy.get('input[type="checkbox"]').click();
    cy.get('button[type="button"]').click();

    // Should be in main page
    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });
});

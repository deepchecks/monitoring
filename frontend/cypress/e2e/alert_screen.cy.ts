describe('Alerts screen', () => {
  it('check alert values', () => {
    cy.createModelAndVersion('alerts model', 'multiclass', 'v1')
    .then(modelInfo => {
      cy.addDataToVersion(modelInfo, undefined, [13, 15, 18, 21])
      return cy.addCheck(modelInfo)
    }
    ).then(checkInfo => cy.addMonitor(checkInfo)
    ).then(monitorInfo => cy.addAlertRule(monitorInfo))

    cy.wait(1000 * 30);

    cy.visit('/alerts');
    const alertDrawerLi = cy.get('ul li div div h4');
    alertDrawerLi.should('have.length', 1);
    alertDrawerLi.should('have.text', 2);
    alertDrawerLi.click();

    cy.contains('h4', 'checky v1 Monitor'); // to wait for alert modal to load
    cy.contains('h4', 'checky v1 Monitor').parent().parent().parent().parent().within(() => {
      cy.contains('p', 'Rule: Value < 0.5').should('exist');
      cy.contains('p', '8.11.2022').should('exist');
      cy.contains('h6', 'alerts model').should('exist');
      cy.contains('h6', 'checky v1').should('exist');
    })
  });
});

describe('Analysis screen drilldown', () => {
  it('check analysis values', () => {
    cy.createModelAndVersion('analysis model', 'multiclass', 'v1')
      .then(modelInfo => {
        cy.addDataToVersion(modelInfo, undefined, [13, 15, 18, 21])
        cy.addDataToVersion(modelInfo, undefined, [13, 15, 18, 21], 86400 * 31)
        cy.addReferenceToVersion(modelInfo)
        return cy.addPerformanceCheck(modelInfo)
      }).then(() => {
        cy.visit('/analysis')
        // toggle comparison mode
        cy.contains('span', 'Data comparison').click({ force: true });
        // select frequency hourly
        cy.contains('div', 'Daily').trigger('mouseover', { force: true }).click({ force: true });
        cy.contains('li', 'Hourly').click();
        // filter some values
        cy.contains('button', 'Filter').click({ force: true });
        cy.contains('div', 'categorical_feature').click();
        cy.contains('li', 'ppppp').click();
        cy.contains('button', 'Apply').click({ force: true });
        cy.contains('button', 'Filter').click({ force: true });
        cy.contains('div', 'numeric_feature').click();
        cy.get('input[value="41.6"]').last().type('10');
        cy.contains('button', 'Apply').click({ force: true });

        cy.contains('p', 'Current').parent().within(() => {
          cy.contains('h6', 'Accuracy - v1').should('exist');
          cy.contains('h6', 'Precision - Macro Average - v1').should('exist');
          cy.contains('h6', 'Recall - Macro Average - v1').should('exist');
        });
        cy.contains('p', 'Previous').parent().within(() => {
          cy.contains('h6', 'Accuracy - v1').should('exist');
          cy.contains('h6', 'Precision - Macro Average - v1').should('exist');
          cy.contains('h6', 'Recall - Macro Average - v1').should('exist');
        });

        cy.get('canvas').should('exist');
        // TODO test reference data too when it will be fixed
      });
  });
});


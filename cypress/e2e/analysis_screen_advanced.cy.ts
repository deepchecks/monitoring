describe('Analysis screen drilldown', () => {
  it('check analysis values', () => {
    cy.createModelAndVersion('analysis model', 'multiclass', 'v1')
      .then(modelInfo => {
        cy.addDataToVersion(modelInfo, undefined, [13, 15, 18, 21])
        cy.addDataToVersion(modelInfo, undefined, [13, 15, 18, 21], 86400)
        cy.addReferenceToVersion(modelInfo)
        return cy.addPerformanceCheck(modelInfo)
      }).then(() => {
        cy.visit('/analysis')
        // toggle comparison mode
        cy.contains('span', 'Data comparison').click({ force: true });
        // select frequency hourly
        // cy.contains('div', 'Daily').trigger('mouseover', { force: true }).click({ force: true });
        // cy.contains('li', 'Hourly').click();
        // Select time range
        cy.contains('label', 'Time Range').parent().trigger('mouseover', { force: true }).click({ force: true });
        cy.contains('span.rdrDayNumber > span', '8').click();
        cy.contains('span.rdrDayNumber > span', '9').click();
        cy.contains('button', 'Apply').click({ force: true });
        // filter some values
        cy.contains('button', 'Filter').click({ force: true });
        cy.contains('div', 'categorical_feature').click();
        cy.contains('li', 'ppppp').click();
        cy.contains('button', 'Apply').click({ force: true });
        cy.contains('button', 'Filter').click({ force: true });
        cy.contains('div', 'numeric_feature').click();
        cy.get('input[value="41.6"]').last().type('10');
        cy.contains('button', 'Apply').click({ force: true });

        cy.contains('p', 'Current', {"timeout": 30000}).parent().within(() => {
          cy.contains('p', 'v1:').should('exist');
          cy.contains('h6', 'Accuracy').should('exist');
          cy.contains('h6', 'Precision - Macro Average').should('exist');
          cy.contains('h6', 'Recall - Macro Average').should('exist');
        });
        cy.contains('p', 'Previous').parent().within(() => {
          cy.contains('p', 'v1:').should('exist');
          cy.contains('h6', 'Accuracy').should('exist');
          cy.contains('h6', 'Precision - Macro Average').should('exist');
          cy.contains('h6', 'Recall - Macro Average').should('exist');
        });

        cy.get('canvas').should('exist');
        // TODO test reference data too when it will be fixed
      });
  });
});


describe('Analysis screen drilldown', () => {
  it('check analysis values', () => {
    cy.createModelAndVersion('analysis model', 'multiclass', 'v1')
      .then(modelInfo => {
        cy.addDataToVersion(modelInfo, undefined, [13, 15, 18, 21])
        return cy.addNullsCheck(modelInfo)
      })
      .then(() => {
        cy.visit('/analysis')
        cy.contains('p', 'nully checky v1').should('exist');
        cy.get('canvas').should('exist');
        // default canvas click
        cy.get('canvas', {"timeout": 30000}).click().then(() => {
          // the time is in UTC here, locally it may differ
          cy.contains('p', '08/11/22 00:00 - 09/11/22 00:00', {"timeout": 30000}).should('exist');
          cy.contains('p', 'Daily').should('exist');
          cy.contains('p', 'analysis model').should('exist');
          cy.contains('p', 'All Data of nully checky v1').should('exist');
          cy.get('canvas').should('have.length', 2);
          cy.get('.js-plotly-plot').should('exist');
          cy.contains('h4', 'nully checky v1').parent().within(() => {
            cy.get('button').click();
          });
        });
        cy.contains('h6', 'Max Null Ratio - v1').should('exist');
        // select frequency weekly
        cy.contains('div', 'Daily').trigger('mouseover', {force: true}).click({force: true});
        cy.contains('li', 'Weekly').click();
        cy.get('canvas').should('exist');
        // select aggregation method none
        cy.contains('h6', 'aggregation method').parent().parent().trigger('mouseover').click()
        cy.contains('li', 'none').click();
        cy.contains('h6', 'numeric_feature - v1').should('exist');
        cy.contains('h6', 'categorical_feature - v1').should('exist');
        // canvas aggregation method none click
        cy.get('canvas').click().then(() => {
          cy.contains('p', '03/11/22 00:00 - 10/11/22 00:00', {"timeout": 30000}).should('exist');
          cy.contains('p', 'Weekly').should('exist');
          cy.contains('p', 'analysis model').should('exist');
          cy.contains('p', 'categorical_feature').should('exist');
          cy.contains('p', 'All Data of nully checky v1').should('exist');
          cy.get('canvas').should('have.length', 2);
          cy.get('.js-plotly-plot').should('exist');
          cy.contains('h4', 'nully checky v1').parent().within(() => {
            cy.get('button').click();
          });
        });
      })
  });
});

describe('test dashboard', () => {
  let model_info;
  const monitorName = 'checky v1 Monitor'
  const modelName = 'my model'
  const checkName = 'checky v1'

  it('Add model - appears in list', () => {
    cy.createModelAndVersion(modelName, 'regression', 'v1').then(response => {
      model_info = response
      cy.visit('/')
      // Check for model name under models list
      cy.contains('h6', 'Models List').parent().within(() => {
        cy.contains('h6', modelName).should('exist')
      })
    })
  })

  it('Add check and monitor - graphs appear', () => {
    cy.addPerformanceCheck(model_info)
    .then(checkInfo => cy.addMonitor(checkInfo))
    .then(() => {
      cy.visit('/')
      // Check for graph with check name
      cy.contains('p', monitorName).should('have.text', monitorName)
    })
  })

  it('Add data - graphs appear', () => {
    cy.addDataToVersion(model_info)
    .then(() => {
      cy.visit('/')
      // Check for labels under graph
      cy.contains('p', monitorName).parent().parent().within(() => {
        cy.contains('h6', 'Neg RMSE').should('exist')
        cy.contains('h6', 'Neg MAE').should('exist')
        cy.contains('h6', 'R2').should('exist')
      })
      // Check for label with model name under data status
      cy.contains('p', 'Prediction Data Status').parent().parent().within(() => {
        cy.contains('h6', modelName).should('exist')
      })
    })
  })

  it('Add manual monitor - graphs appear', () => {
    
    cy.visit('/')
    cy.contains('button', 'Add Monitor').click()
    cy.contains('div[role="presentation"]', 'Create monitor').contains('label', 'Monitor name').parent().within(() => {
        cy.get('input').type('manual monitor')
    });
    cy.wait(500)
    cy.contains('div[role="presentation"]', 'Create monitor').contains('label', 'Model').parent().within(() => {
        cy.get('div.MuiInputBase-root').click();
        cy.wait(200)
    });
    cy.get('#menu- > div.MuiPaper-root > ul').contains('li', modelName).click();
    cy.wait(1000)
    cy.contains('div[role="presentation"]', 'Create monitor').contains('label', 'Check').parent().within(() => {
        cy.get('div.MuiInputBase-root').click();
    });
    cy.get('#menu- > div.MuiPaper-root > ul', {"timeout": 10000}).contains('li', checkName).click()
    cy.contains('div[role="presentation"]', 'Create monitor').contains('div', 'scorer').click()
    cy.get('#menu-').contains('li', 'Mae').click()
    cy.contains('div[role="presentation"]', 'Create monitor').contains('div', 'Aggregation window').click()
    cy.get('#menu-').contains('li', '1 day').click()
    cy.contains('div[role="presentation"]', 'Create monitor').contains('div', 'Frequency').click()
    cy.get('#menu-').contains('li', '1 day').click()
    cy.contains('div[role="presentation"]', 'Create monitor').contains('div', 'Time range').click()
    cy.get('#menu-').contains('li', '1 week').click()
    cy.intercept('POST', '/api/v1/checks/*/monitors').as('addMonitor')
    cy.contains('button', 'Save').click()
    cy.wait('@addMonitor')
    cy.contains('p', 'manual monitor').parent().parent().contains('h6', 'Mae').should('exist')

  })
})
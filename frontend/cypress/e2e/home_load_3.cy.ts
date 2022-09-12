describe('load main page', () => {
  it('Load main page!', () => {
    cy.visit('/')
    cy.get('#root').should('be.visible')
  })
})

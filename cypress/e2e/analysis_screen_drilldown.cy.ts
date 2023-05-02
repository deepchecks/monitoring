describe("Analysis screen drilldown", () => {
  it("check analysis values", () => {
    cy.createModelAndVersion("analysis model", "multiclass", "v1")
      .then((modelInfo: any) => {
        cy.addDataToVersion(modelInfo, undefined, [13, 15, 18, 21]);
        return cy.addNullsCheck(modelInfo);
      })
      .then(() => {
        cy.visit("/analysis");
        cy.contains("p", "nully checky v1").should("exist");
        cy.get("canvas").should("exist");
        // default canvas click
        cy.wait(1000);
        cy.get("canvas", { timeout: 30000 })
          .click()
          .then(() => {
            // the time is in UTC here, locally it may differ. We need to uncomment it when we solve this.
            //           cy.contains('p', '11/02/2022 11:59 PM - 11/09/2022 11:59 PM', {"timeout": 30000}).should('exist');
            cy.contains("p", "analysis model").should("exist");
            cy.contains("p", "nully checky v1 On Segment: All Data").should(
              "exist"
            );
            cy.get("canvas").should("have.length", 2);
            cy.get(".js-plotly-plot").should("exist");
            cy.contains("h4", "nully checky v1")
              .parent()
              .within(() => {
                cy.get("button").click();
              });
          });
        cy.contains("h6", "Max Null Ratio").should("exist");
        // select frequency weekly
        cy.contains("div", "Daily")
          .trigger("mouseover", { force: true })
          .click({ force: true });
        cy.contains("li", "Hourly").click();
        cy.get("canvas").should("exist");
        // select aggregation method none
        cy.contains("div", "max")
          .trigger("mouseover", { force: true })
          .click({ force: true });
        cy.contains("li", "Per feature")
          .trigger("mouseover", { force: true })
          .click({ force: true });
        cy.contains("h6", "numeric_feature").should("exist");
        cy.contains("h6", "categorical_feature").should("exist");
        // canvas aggregation method none click
        cy.wait(1000);
        cy.get("canvas", { timeout: 30000 })
          .click()
          .then(() => {
            // the time is in UTC here, locally it may differ. We need to uncomment it when we solve this.
            //           cy.contains('p', '11/08/2022 12:59 PM - 11/08/2022 1:59 PM', {"timeout": 30000}).should('exist');
            // cy.contains('p', 'analysis model').should('exist');
            // cy.contains('p', 'categorical_feature').should('exist');
            // cy.contains('p', 'nully checky v1 On Segment: All Data').should('exist');
            cy.get("canvas").should("have.length", 2);
            //cy.get(".js-plotly-plot").should("exist");
            cy.contains("h4", "nully checky v1")
              .parent()
              .within(() => {
                cy.get("button").click();
              });
          });
      });
  });
});

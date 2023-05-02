describe("Analysis screen drilldown", () => {
  it("check analysis values", () => {
    cy.createModelAndVersion("analysis model", "multiclass", "v1")
      .then((modelInfo: any) => {
        cy.addDataToVersion(modelInfo, undefined, [13, 15, 18, 21]);
        cy.addDataToVersion(modelInfo, undefined, [13, 15, 18, 21], "DAY");
        cy.addReferenceToVersion(modelInfo);
        cy.addPerformanceCheck(modelInfo);
        cy.wait(3000);
      })
      .then(() => {
        cy.visit("/analysis");
        cy.contains("span", "Compare with previous period").click({
          force: true,
        });
        // cy.get('input[value="11/05/2022 - 11/08/2022"]')
        //  .parent()
        //  .first()
        //  .trigger("mouseover", { force: true })
        //  .click({ force: true });
        // cy.contains("span.rdrDayNumber > span", "8").click();
        // cy.contains("span.rdrDayNumber > span", "9").click();
        // cy.contains("button", "Apply").click({ force: true });

        // filter some values
        cy.get('input[value="Filter"]').parent().first().click({ force: true });
        cy.contains("div", "categorical_feature").click();
        cy.contains("li", "ppppp").click();
        cy.contains("button", "Apply").click({ force: true });
        cy.get('input[value="Filter"]').parent().first().click({ force: true });
        cy.contains("div", "numeric_feature").click();
        cy.get('input[value="49.6"]').last().type("10");
        cy.contains("button", "Apply").click({ force: true });

        cy.contains("p", "Current", { timeout: 30000 })
          .parent()
          .within(() => {
            cy.contains("p", "v1:").should("exist");
            cy.contains("h6", "Accuracy").should("exist");
            cy.contains("h6", "Precision - Macro Average").should("exist");
            cy.contains("h6", "Recall - Macro Average").should("exist");
          });
        cy.contains("p", "Previous")
          .parent()
          .within(() => {
            cy.contains("p", "v1:").should("exist");
            cy.contains("h6", "Accuracy").should("exist");
            cy.contains("h6", "Precision - Macro Average").should("exist");
            cy.contains("h6", "Recall - Macro Average").should("exist");
          });

        cy.get("canvas").should("exist");
        // TODO test reference data too when it will be fixed
      });
  });
});

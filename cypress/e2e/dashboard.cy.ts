describe("test dashboard", () => {
  let model_info: any;
  const monitorName = "checky v1 Monitor";
  const modelName = "my model";
  const checkName = "checky v1";

  it("Add model - appears in list", () => {
    cy.createModelAndVersion(modelName, "regression", "v1").then(
      (response: any) => {
        model_info = response;
        cy.visit("/");
        // Check for model name under models list
        cy.contains("h1", "Models")
          .parent()
          .parent()
          .within(() => {
            cy.contains("p", modelName).should("exist");
          });
      }
    );
  });

  it("Add check and monitor - graphs appear", () => {
    cy.addPerformanceCheck(model_info)
      .then((checkInfo: any) => cy.addMonitor(checkInfo))
      .then(() => {
        cy.visit("/");
        // Check for graph with check name
        cy.contains("p", monitorName).should("have.text", monitorName);
      });
  });

  it("Add data - graphs appear", () => {
    cy.addDataToVersion(model_info).then(() => {
      cy.visit("/");
      // Check for labels under graph
      cy.contains("p", monitorName)
        .parent()
        .parent()
        .within(() => {
          cy.contains("h6", "RMSE").should("exist");
        });
      // Check for label with model name under data status
      cy.contains("p", "Samples status")
        .parent()
        .parent()
        .within(() => {
          cy.contains("h6", modelName).should("exist");
        });
    });
  });

  it.skip("Add manual monitor - graphs appear", () => {
    cy.visit("/dashboard");
    cy.contains("p", "Monitors")
      .parent()
      .within(() => {
        cy.get("button").click();
      });

    cy.contains('div[role="presentation"]', "Create monitor")
      .contains("label", "Monitor name")
      .parent()
      .within(() => {
        cy.get("input").type("manual monitor");
      });
    cy.wait(500);
    cy.contains('div[role="presentation"]', "Create monitor")
      .contains("label", "Model")
      .parent()
      .within(() => {
        cy.get("div.MuiInputBase-root").click();
        cy.wait(200);
      });
    cy.get("#menu- > div.MuiPaper-root > ul").contains("li", modelName).click();
    cy.wait(1000);
    cy.contains('div[role="presentation"]', "Create monitor")
      .contains("label", "Check")
      .parent()
      .within(() => {
        cy.get("div.MuiInputBase-root").click();
      });
    cy.get("#menu- > div.MuiPaper-root > ul", { timeout: 10000 })
      .contains("li", checkName)
      .click();
    cy.contains('div[role="presentation"]', "Create monitor")
      .contains("div", "scorer")
      .click();
    cy.get("#menu-").contains("li", "RMSE").click();
    cy.contains('div[role="presentation"]', "Create monitor")
      .contains("a", "Advanced")
      .click();
    cy.contains('div[role="presentation"]', "Create monitor")
      .contains("div", "HOUR")
      .click();
    cy.contains('div[role="presentation"]', "Create monitor")
      .contains("div", "Frequency")
      .click();
    cy.get("#menu-").contains("li", "Day").click();
    cy.contains('div[role="presentation"]', "Create monitor").click();
    cy.intercept("POST", "/api/v1/checks/*/monitors").as("addMonitor");
    cy.contains("button", "Save").click();
    cy.wait("@addMonitor");
    cy.contains("p", "manual monitor")
      .parent()
      .parent()
      .contains("h6", "RMSE")
      .should("exist");
  });
});

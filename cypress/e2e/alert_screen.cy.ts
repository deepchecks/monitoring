// Need to fix the call on line 11
describe("Alerts screen", () => {
  it.skip("check alert values", () => {
    cy.createModelAndVersion("alerts model", "multiclass", "v1")
      .then((modelInfo: any) => {
        cy.addDataToVersion(modelInfo, undefined, [13, 15, 18, 21]);
        return cy.addPerformanceCheck(modelInfo);
      })
      .then((checkInfo: any) => cy.addMonitor(checkInfo))
      .then((monitorInfo: any) => cy.addAlertRule(monitorInfo))
      .then((alertRuleInfo: any) => {
        cy.request(
          "GET",
          "/api/v1/wait-for-alerts/" + alertRuleInfo["id"] + "?amount=2"
        );
      })
      .then(() => {
        cy.visit("/alerts");
        const alertDrawerLi = cy.get("ul li div div h4");
        alertDrawerLi.should("have.length", 1);
        alertDrawerLi.should("have.text", 2);
        alertDrawerLi.click();

        cy.contains("p", "checky v1 Monitor"); // to wait for alert modal to load
        cy.contains("p", "checky v1 Monitor")
          .parent()
          .parent()
          .within(() => {
            cy.contains("h6", "Check:").should("exist");
            cy.contains("h6", "< 0.5").should("exist");
            cy.contains("h6", "alerts model").should("exist");
            cy.contains("h6", "checky v1").should("exist");
          });
      });
  });
});

describe("Alert Rules Screen", () => {
  const Severity = {
    Low: "Low",
    Medium: "Medium",
    High: "High",
    Critical: "Critical",
  };

  const Frequency = {
    Hour: "Hour",
    Day: "Day",
    Week: "Week",
    Month: "Month",
  };

  const AlertRuleOperator = {
    GTE: "Greater than equals",
    GT: "Greater than",
    LTE: "Less than equals",
    LT: "Less than",
  };

  const availableModels = [
    {
      name: "Alert Rules Screen - First Model",
      taskType: "multiclass",
      versionName: "v1",
      checkName: "Alert Rules Screen - Test Check",
      features: ["numeric_feature", "categorical_feature", "non_feature"],
    },
    {
      name: "Alert Rules Screen - Second Model",
      taskType: "multiclass",
      versionName: "v1",
      checkName: "Alert Rules Screen - Test Check",
      features: ["numeric_feature", "categorical_feature", "non_feature"],
    },
  ];

  const availableAlertRules = [
    {
      details: {
        name: "New Alert Rule #1",
        severity: Severity.Medium,
      },
      monitorData: {
        model: availableModels[0].name,
        check: availableModels[0].checkName,
        aggregationWindow: 1,
        frequency: Frequency.Hour,
        filterBy: availableModels[0].features[0],
      },
      alertLogic: {
        operator: AlertRuleOperator.LT,
        value: 100,
      },
    },
    {
      details: {
        name: "New Alert Rule #2",
        severity: Severity.Critical,
      },
      monitorData: {
        model: availableModels[1].name,
        check: availableModels[1].checkName,
        aggregationWindow: 1,
        frequency: Frequency.Day,
        filterBy: availableModels[1].features[1],
      },
      alertLogic: {
        operator: AlertRuleOperator.GTE,
        value: 200,
      },
    },
  ];

  function containsExactly(values: Array<string>) {
    return (optionsElement: JQuery<HTMLElement>) => {
      expect(optionsElement).to.have.length(values.length);
      for (let i = 0; i < values.length; i++)
        expect(optionsElement[i]).to.contain(values[i]);
    };
  }

  function findOption(value: string) {
    return (optionsElement: JQuery<HTMLElement>) => {
      const options = optionsElement.get();
      const index = options.findIndex((v, i) => v.textContent === value);
      return optionsElement.eq(index);
    };
  }

  type BasicDetails = {
    name?: string;
    severity?: string;
  };

  function fillBasicDetails(details: BasicDetails, submit: boolean = true) {
    return (form: JQuery<HTMLElement>) => {
      cy.wrap(form)
        .contains("button", "Next")
        .should("exist")
        .as("basicDetailsSubmit");

      if (details.name !== undefined) {
        cy.wrap(form)
          .contains("label", "Alert rule name")
          .should("exist")
          .next()
          .find("input")
          .should("exist")
          .should("have.attr", "type", "text")
          .type(`{selectall}{backspace}${details.name}{enter}`);
      }
      if (details.severity !== undefined) {
        cy.wrap(form).contains("label", "Severity").next().click();
        cy.get("div[role=presentation]#menu- li")
          .should(containsExactly(Object.values(Severity)))
          .then(findOption(details.severity))
          .click();
      }

      if (details.severity !== undefined && details.name !== undefined)
        cy.get("@basicDetailsSubmit").should("not.have.attr", "disabled");

      if (submit === true) cy.get("@basicDetailsSubmit").click();
    };
  }

  type MonitorData = {
    model?: string;
    check?: string;
    aggregationWindow?: number;
    frequency?: string;
    filterBy?: string;
    // TODO: value for filter by
  };

  function fillMonitorData(monitorData: MonitorData, submit: boolean = true) {
    return (form: JQuery<HTMLElement>) => {
      cy.wrap(form)
        .contains("button", "Next")
        .should("exist")
        .as("monitorDataSubmit");

      cy.wrap(form)
        .contains("button", "Back")
        .should("exist")
        .as("monitorDataRollback");

      if (monitorData.model !== undefined) {
        cy.wrap(form).contains("label", "Model").next().click();
        cy.get("div[role=presentation]#menu- li")
          .should("contain", monitorData.model)
          .then(findOption(monitorData.model))
          .click();
      }
      if (monitorData.check !== undefined) {
        cy.wrap(form).contains("label", "Check").next().click();
        cy.get("div[role=presentation]#menu- li")
          .should("contain", monitorData.check)
          .then(findOption(monitorData.check))
          .click();
      }
      if (monitorData.aggregationWindow !== undefined) {
        cy.get("input[placeholder='Aggregation window']")
          .should("exist")
          .clear()
          .type(monitorData.aggregationWindow);
      }
      if (monitorData.frequency !== undefined) {
        cy.wrap(form).contains("label", "Frequency").next().click();
        cy.get("div[role=presentation]#menu- li")
          .should(containsExactly(Object.values(Frequency)))
          .then(findOption(monitorData.frequency))
          .click();
      }
      if (monitorData.filterBy !== undefined) {
        cy.wrap(form).contains("label", "Filter by segment").next().click();
        cy.get("div[role=presentation]#menu- li")
          .should("contain", monitorData.filterBy)
          .then(findOption(monitorData.filterBy))
          .click();
      }
      cy.wrap(form)
        .contains("label", "Select aggregation method")
        .next()
        .click();
      cy.get("div[role=presentation]#menu- li")
        .should("contain", "mean")
        .then(findOption("mean"))
        .click();
      cy.get("@monitorDataSubmit").should("not.have.attr", "disabled");

      if (submit === true) cy.get("@monitorDataSubmit").click();
    };
  }

  type AlertRuleLogic = {
    operator?: string;
    value?: number;
  };

  function fillAlertLogic(
    alertRuleLogic: AlertRuleLogic,
    submit: boolean = true
  ) {
    return (form: JQuery<HTMLElement>) => {
      cy.wrap(form)
        .contains("button", "Save")
        .should("exist")
        .as("newAlertRuleSubmit");

      cy.wrap(form)
        .contains("button", "Back")
        .should("exist")
        .as("newAlertRuleRollback");

      cy.wrap(form).find("canvas[role=img]").should("exist");

      if (alertRuleLogic.operator !== undefined) {
        cy.wrap(form).contains("label", "Select Operator").next().click();
        cy.get("div[role=presentation]#menu- li")
          .should(containsExactly(Object.values(AlertRuleOperator)))
          .then(findOption(alertRuleLogic.operator))
          .click();
      }

      if (alertRuleLogic.value !== undefined)
        cy.wrap(form)
          .contains("label", "Threshold")
          .next()
          .find("input")
          .should("exist")
          .type(`{selectall}{backspace}${alertRuleLogic.value}{enter}`);

      if (submit === true) cy.get("@newAlertRuleSubmit").click();
    };
  }

  function createNewAlertRule(rule: {
    details: BasicDetails;
    monitorData: MonitorData;
    alertLogic: AlertRuleLogic;
  }) {
    cy.contains("button", "New Alert Rule").should("exist").click();

    cy.get("div[role=dialog]")
      .first()
      .should("exist")
      .as("dialogWindow");
    cy.get("@dialogWindow")
      .find("div.MuiDialogContent-root")
      .first()
      .should("exist")
      .as("currentStepForm");

    cy.get("@currentStepForm").then(
      fillBasicDetails({
        name: rule.details.name,
        severity: rule.details.severity,
      })
    );

    cy.get("@currentStepForm").then(
      fillMonitorData({
        model: rule.monitorData.model,
        check: rule.monitorData.check,
        aggregationWindow: rule.monitorData.aggregationWindow,
        frequency: rule.monitorData.frequency,
        filterBy: rule.monitorData.filterBy,
      })
    );

    cy.get("@currentStepForm").then(
      fillAlertLogic({
        operator: rule.alertLogic.operator,
        value: rule.alertLogic.value,
      })
    );
  }

  function findAlertRule(rule: {
    details: BasicDetails;
    monitorData?: MonitorData;
  }) {
    return cy
      .contains("p", rule.details.name as any)
      .should("exist")
      .parent()
      .parent()
      .contains("p", rule.details.severity?.toLowerCase() as any)
      .should("exist");
  }

  function updateAlertRule({
    oldRule,
    newRule,
  }: {
    oldRule: {
      details: BasicDetails;
      monitorData: MonitorData;
    };
    newRule: {
      details?: BasicDetails;
      monitorData?: MonitorData;
      alertLogic?: AlertRuleLogic;
    };
  }) {
    return findAlertRule(oldRule)
      .then((container) => {
        cy.wrap(container.parent().parent().parent()).trigger("mouseover");
        cy.wrap(container.parent().parent().parent())
          .contains("p", "Edit rule")
          .should("exist")
          .parent()
          .should("have.attr", "type", "button")
          .click();
      })
      .then(() => {
        cy.get("div[role=dialog]")
          .first()
          .should("exist")
          .as("dialogWindow");
        cy.get("@dialogWindow")
          .find("div.MuiDialogContent-root")
          .first()
          .should("exist")
          .as("currentStepForm");

        if (newRule.details !== undefined) {
          cy.get("@currentStepForm").then(fillBasicDetails(newRule.details));
        } else {
          cy.get("@currentStepForm")
            .contains("button", "Next")
            .should("exist")
            .click();
        }
        if (newRule.monitorData !== undefined) {
          cy.get("@currentStepForm").then(fillMonitorData(newRule.monitorData));
        } else {
          cy.get("@currentStepForm")
            .contains("button", "Next")
            .should("exist")
            .click();
        }
        if (newRule.alertLogic !== undefined) {
          cy.get("@currentStepForm").then(fillAlertLogic(newRule.alertLogic));
        } else {
          cy.get("@currentStepForm")
            .contains("button", "Save")
            .should("exist")
            .click();
        }
      });
  }

  it("Test closure of rule creation form", () => {
    cy.visit("/configuration/alert-rules");
    cy.contains("button", "New Alert Rule").should("exist").click();
    cy.contains("h1", "Create New Alert Rule").should("exist").next().click();
    cy.get("div[role=presentation] > div[role=dialog]").should("not.exist");
  });

  it("Check that models appear in the filtering dropdown", () => {
    cy.createModelAndVersion(
      availableModels[0].name,
      availableModels[0].taskType,
      availableModels[0].versionName
    )
      .then((modelInfo: any) => {
        cy.addDataToVersion(modelInfo);
        return cy.addCheck(modelInfo, { name: availableModels[0].checkName });
      })
      .then((checkInfo: any) => cy.addMonitor(checkInfo));

    cy.createModelAndVersion(
      availableModels[1].name,
      availableModels[1].taskType,
      availableModels[1].versionName
    )
      .then((modelInfo: any) => {
        cy.addDataToVersion(modelInfo);
        return cy.addCheck(modelInfo, { name: availableModels[1].checkName });
      })
      .then((checkInfo: any) => cy.addMonitor(checkInfo));

    cy.visit("/configuration/alert-rules");

    cy.intercept("/api/v1/available-models").as("availableModels");
    cy.intercept("/api/v1/config/alert-rules").as("availableRules");

    cy.wait("@availableModels");
    cy.wait("@availableRules");

    // click on "Model" dropdown
    cy.contains("label", "Model").parent().click();

    // verify that dropdown list constains newly created models
    cy.get("div[role=presentation]")
      .find("ul")
      .should(($it) => {
        expect($it).to.contain("Alert Rules Screen - First Model");
        expect($it).to.contain("Alert Rules Screen - Second Model");
      });
  });

  it("Test alert rule creation", () => {
    // models and checks were already created by previous test
    const chain = cy.visit("/configuration/alert-rules");
    availableAlertRules.forEach((it) => {
      chain.then(() => createNewAlertRule(it)).then(() => findAlertRule(it));
    });
  });

  it("Test alert rule deletion", () => {
    cy.visit("/configuration/alert-rules")
      .then(() => findAlertRule(availableAlertRules[0]))
      .then((container) => {
        cy.wrap(container.parent().parent().parent()).trigger("mouseover");
        cy.wrap(container.parent().parent().parent())
          .contains("p", "Delete rule")
          .should("exist")
          .parent()
          .should("have.attr", "type", "button")
          .click();
      })
      .then(() => {
        cy.contains("h1", "Delete alert rule").should("exist");
        cy.contains("button", "Yes, continue").should("exist").click();
      })
      .then(() => {
        cy.contains("h1", "Delete alert rule").should("not.exist");
        cy.contains("button", "Yes, continue").should("not.exist");
        cy.contains("p", availableAlertRules[0].details.name).should(
          "not.exist"
        );
      });
  });

  it("Test alert rule update", () => {
    const newRule = {
      details: {
        name: "Updated Alert Rule",
        severity: Severity.Low,
      },
    };
    cy.visit("/configuration/alert-rules")
      .then(() =>
        updateAlertRule({ oldRule: availableAlertRules[1], newRule: newRule })
      )
      .then(() => findAlertRule(newRule));
  });
});

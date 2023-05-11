/* eslint-disable comma-dangle */
/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

Cypress.Commands.add("login", (username: string, password: string) => {
  cy.url().should("contain", ".auth0.com");
  cy.get("#username").type(username);
  cy.get("#password").type(password);
  cy.get('button[name="action"]').click();
  cy.url().should("not.contain", ".auth0.com");
});

Cypress.Commands.add("resetState", () => {
  const username = Cypress.env("auth0_username");
  const password = Cypress.env("auth0_password");
  cy.session(username, () => {
    cy.clearCookies();
    cy.visit("/");
    cy.login(username, password);
    cy.request({ method: "delete", url: "api/v1/users", timeout: 20000 });
    cy.visit("/");
    cy.login(username, password);
    cy.url().should("eq", Cypress.config().baseUrl + "/complete-details");
    cy.get("#full_name").focus().clear();
    cy.get("#full_name").focus().clear();
    cy.get("#full_name").focus().type(Cypress.env("user_full_name"));
    cy.get("#organization").type(Cypress.env("organization_name"));

    cy.intercept("POST", "/api/v1/users/complete-details").as(
      "complete-details"
    );
    cy.get('button[type="submit"]').click();
    // Wait for complete details to return
    cy.wait("@complete-details").its("response.statusCode").should("eq", 302);
    cy.url().should("eq", Cypress.config().baseUrl + "/");
    // Accept EULA
    cy.get('input[type="checkbox"]').click();
    cy.get('button[type="button"]').click();
    cy.wait(200);
  });
});

Cypress.Commands.add(
  "createModelAndVersion",
  (modelName, taskType, modelVersionName) => {
    // Creating a model
    const modelRequest = {
      name: modelName,
      task_type: taskType,
      description: "Model created from Cypress!",
      alerts_delay_labels_ratio: 1,
      alerts_delay_seconds: 60,
    };
    const modelVersionRequest = {
      name: modelVersionName,
      features: {
        numeric_feature: "numeric",
        categorical_feature: "categorical",
      },
      additional_data: {
        non_feat: "numeric",
      },
    };

    return cy
      .request("POST", "/api/v1/models", modelRequest)
      .then((response) => response.body.id)
      .then((modelId) => {
        cy.request(
          "POST",
          `/api/v1/models/${modelId}/version`,
          modelVersionRequest
        ).then((versionResponse) => {
          const ModelVersionId = versionResponse.body.id;
          return {
            model_id: modelId,
            version_id: ModelVersionId,
            schema: modelVersionRequest,
            task_type: taskType,
          };
        });
      });
  }
);

Cypress.Commands.add(
  "addDataToVersion",
  (
    modelInfo: object,
    samplesPerHour = 20,
    hourArr = [1, 3, 4, 5, 7],
    currTimeOffset: number = 0
  ) => {
    const samples = samplesPerHour * hourArr.length;
    const data: Record<string, unknown>[] = [];
    const labels: Record<string, unknown>[] = [];
    const currTime =
      new Date("November 9, 2022 00:00:00").getTime() - currTimeOffset * 1000;
    const dayBefore = currTime - 24 * 60 * 60 * 1000;
    for (let i = 0; i < samples; i++) {
      const hourIndex = i % hourArr.length;
      const hour = hourArr[hourIndex];
      const date = new Date(dayBefore + hour * 60 * 60 * 1000);
      const label = modelInfo["task_type"] == "regression" ? i : String(i % 3);
      const pred =
        modelInfo["task_type"] == "regression"
          ? i + (i % (hourIndex + 1))
          : String((i + (i % (hourIndex + 1))) % 3);
      const sample_id = i + "_" + currTimeOffset;
      data.push({
        _dc_sample_id: sample_id,
        _dc_time: date,
        _dc_prediction: pred,
        numeric_feature: 10 + i,
        categorical_feature: i % 3 ? "ppppp" : null,
        non_feat: 2,
      });
      labels.push({
        _dc_sample_id: sample_id,
        _dc_label: label,
      });
    }

    return cy
      .request(
        "POST",
        "/api/v1/model-versions/" + modelInfo["version_id"] + "/data",
        data
      )
      .then(() => {
        return cy
          .request(
            "PUT",
            "/api/v1/model/" + modelInfo["model_id"] + "/labels",
            labels
          )
          .then(() => {
            return cy.request(
              "GET",
              "/api/v1/wait-for-queue/" + modelInfo["version_id"]
            );
          });
      });
  }
);

Cypress.Commands.add("formRequest", (method: string, url, formData, done) => {
  const xhr = new XMLHttpRequest();
  xhr.open(method, url);
  xhr.onload = function () {
    done(xhr);
  };
  xhr.onerror = function () {
    done(xhr);
  };
  xhr.send(formData);
});

Cypress.Commands.add(
  "addReferenceToVersion",
  (modelInfo: object, samples: number = 100) => {
    const columns = [
      "_dc_prediction",
      "_dc_label",
      "numeric_feature",
      "categorical_feature",
      "non_feat",
    ];
    const data = [];
    for (let i = 0; i < samples; i++) {
      const label = modelInfo["task_type"] == "regression" ? i : String(i % 3);
      const pred =
        modelInfo["task_type"] == "regression"
          ? i + i / samples
          : String(i + (i % 3));
      const sample = [pred, label, 10 + i, i % 3 ? "ppppp" : null, 2];

      data.push(sample);
    }
    const refDataSplit = { columns: columns, data: data };
    const formData = new FormData();
    const blob = Cypress.Blob.base64StringToBlob(
      btoa(JSON.stringify(refDataSplit)),
      "application/json"
    );
    formData.append("batch", blob);

    return cy.formRequest(
      "POST",
      "/api/v1/model-versions/" + modelInfo["version_id"] + "/reference",
      formData,
      function (response) {
        expect(response.status).to.eq(200, response.text);
        return response;
      }
    );
  }
);

Cypress.Commands.add("addPerformanceCheck", (modelInfo: object) => {
  const checkData = {
    name: "checky v1",
    config: {
      class_name: "SingleDatasetPerformance",
      params: { reduce: "mean" },
      module_name: "deepchecks.tabular.checks",
    },
  };

  return cy
    .request(
      "POST",
      "/api/v1/models/" + modelInfo["model_id"] + "/checks",
      checkData
    )
    .then((response) => response.body[0]);
});

Cypress.Commands.add("addNullsCheck", (modelInfo: object) => {
  const checkData = {
    name: "nully checky v1",
    config: {
      class_name: "PercentOfNulls",
      params: { aggregation_method: "max" },
      module_name: "deepchecks.tabular.checks",
    },
  };
  return cy
    .request("POST", `/api/v1/models/${modelInfo.model_id}/checks`, checkData)
    .then((response) => response.body[0]);
});

Cypress.Commands.add("addCheck", (modelInfo: object, checkInfo?: object) => {
  const defaultCheck = {
    name: "nully checky v1",
    config: {
      class_name: "PercentOfNulls",
      params: {},
      module_name: "deepchecks.tabular.checks",
    },
  };
  const checkData =
    checkInfo !== undefined ? { ...defaultCheck, ...checkInfo } : defaultCheck;

  return cy
    .request("POST", `/api/v1/models/${modelInfo.model_id}/checks`, checkData)
    .then((response) => response.body[0]);
});

Cypress.Commands.add(
  "addMonitor",
  (
    checkInfo: object,
    frequency = "DAY",
    lookback = 86400,
    aggregation_window = 2
  ) => {
    const monitorData = {
      name: `${checkInfo["name"]} Monitor`,
      frequency: frequency,
      lookback: lookback,
      aggregation_window: aggregation_window,
    };

    return cy.request("GET", "/api/v1/dashboards").then((response) => {
      monitorData["dashboard_id"] = response.body.id;
      return cy
        .request(
          "POST",
          `/api/v1/checks/${checkInfo["id"]}/monitors`,
          monitorData
        )
        .then((response) => response.body);
    });
  }
);

Cypress.Commands.add(
  "addAlertRule",
  (
    monitorInfo: object,
    operator = "less_than",
    value = 0.5,
    alert_severity = "medium"
  ) => {
    const data = {
      condition: {
        operator: operator,
        value: value,
      },
      alert_severity: alert_severity,
    };
    return cy
      .request("POST", `api/v1/monitors/${monitorInfo["id"]}/alert-rules`, data)
      .then((response) => response.body);
  }
);

import dayjs from "dayjs";

describe("Connected Models Screen", () => {
  // NOTE:
  // - be carefull modifying number of models or models properties, that will affect tests
  // - during tests execution this list might be modified
  // - this models are created by first test in the block
  //
  // TODO: use 'before' hook to create models
  //
  const models = [
    {
      name: "Models Screen - First Model",
      taskType: "multiclass",
      versionName: "v1",
    },
    {
      name: "Models Screen - Second Model",
      taskType: "multiclass",
      versionName: "v1",
    },
    {
      name: "Models Screen - Super Cool Model",
      taskType: "multiclass",
      versionName: "v1",
    },
    {
      name: "Models Screen - Dummy Model",
      taskType: "multiclass",
      versionName: "v1",
    },
  ];

  function findModel(model: {
    name: string;
    n_of_critical_errors?: number;
    n_of_pending_rows?: number;
    n_of_pending_versions?: number;
    last_update?: Date;
  }) {
    const modelLabelText = `model-${model.name}`;
    const modelLabel = `@${modelLabelText}`;

    cy.contains("span", model.name)
      .should("exist")
      .parent()
      .parent()
      .parent()
      .parent()
      .as(modelLabelText);

    cy.get(modelLabel)
      .contains("p", "Critical Alerts")
      .should("exist")
      .prev()
      .should((it) => {
        if (model.n_of_critical_errors !== undefined)
          expect(it.text()).to.equal(model.n_of_critical_errors.toString());
      });

    cy.get(modelLabel)
      .contains("p", "Versions Updating")
      .should("exist")
      .prev()
      .should((it) => {
        if (model.n_of_pending_versions !== undefined)
          expect(it.text()).to.equal(model.n_of_pending_versions.toString());
      });

    cy.get(modelLabel)
      .contains("p", "Pending Rows")
      .should("exist")
      .prev()
      .should((it) => {
        if (model.n_of_pending_rows !== undefined)
          expect(it.text()).to.equal(model.n_of_pending_rows.toString());
      });

    if (model.last_update) {
      const lastUpdate = dayjs(model.last_update).format("MM/DD/YYYY");
      cy.get(modelLabel)
        .contains("p", `Last update: ${lastUpdate}`)
        .should("exist");
    }

    return cy.get(modelLabel);
  }

  function findModelDeletionConfirmationDialog() {
    cy.contains("h1", "Delete Model")
      .should("exist")
      .parent()
      .parent()
      .as("modelDeletionConfirmationDialog");

    cy.get("@modelDeletionConfirmationDialog")
      .contains("p", "Are you sure you want to delete this model?")
      .should("exist");

    return cy.get("@modelDeletionConfirmationDialog");
  }

  function chunckArray<T>(array: Array<T>, chunkSize: number): Array<Array<T>> {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize)
      result.push(array.slice(i, i + chunkSize));
    return result;
  }

  function getModelVersionsList(model: {
    name: string;
    n_of_critical_errors?: number;
    n_of_pending_rows?: number;
    n_of_pending_versions?: number;
    last_update?: Date;
  }) {
    return findModel(model).then((container) => {
      cy.wrap(container).trigger("mouseover");

      cy.wrap(container)
        .contains("button", "View Details")
        .should("exist")
        .click();

      cy.contains("div[role=presentation] p", `${model.name} Details`)
        .should("exist")
        .parent()
        .next()
        .as("detailsDialogContent");

      cy.get("@detailsDialogContent")
        .find("div[role=tablist] button[role=tab]")
        .should("have.length", 2)
        .eq(0)
        .click();

      cy.get("@detailsDialogContent")
        .find("div[role=tabpanel]")
        .should("have.length", 2)
        .eq(0)
        .as("versionsList")
        .should("not.have.attr", "hidden");

      cy.get("@versionsList")
        .children()
        .should("have.length", 1)
        .first()
        .get("tbody")
        .get("td")
        .then((it) => {
          const elements = it.get();
          const grid = chunckArray(elements, 4);
          const versions = [];
          for (let row of grid) {
            expect(row).to.have.length(4);
            let [name, lastUpdate, pendingRows, details] = row;
            versions.push({
              name: name.textContent,
              lastUpdate: lastUpdate.textContent,
              pendingRows: pendingRows.textContent,
            });
          }
          return versions;
        });
    });
  }

  function getModelsList() {
    cy.contains("h4", "Connected Models")
      .should("exist")
      .parent()
      .parent()
      .children()
      .should("have.length", 2)
      .eq(1)
      .children()
      .should("have.length", 2)
      .eq(1)
      .as("modelContainers")
      .find("span[role=progressbar]")
      .should("not.exist");
    return cy.get("@modelContainers").then((container) => {
      const wraper = container.get()[0];
      const modelElements = wraper.children;
      const models = [];

      for (let e of modelElements) {
        const sections = e.children;
        expect(sections).to.have.length(2);

        const [headerSection, infoSection] = sections;
        const headerElements = headerSection.querySelectorAll("p");
        expect(headerElements).to.have.length(2);

        const title = headerElements[0].textContent;
        const lastUpdate = headerElements[1].textContent;

        models.push({ name: title, lastUpdate: lastUpdate });
      }

      return models;
    });
  }

  it("Check that new models appear in the list", () => {
    Cypress.Promise.all(
      models.map((it) =>
        cy.createModelAndVersion(it.name, it.taskType, it.versionName)
      )
    ).then(() => {
      cy.visit("/configuration/models");
      cy.contains("h4", "Connected Models").should("exist");
      models.forEach((it) =>
        findModel({
          name: it.name,
          n_of_critical_errors: 0,
          n_of_pending_rows: 0,
          n_of_pending_versions: 0,
          // last_update: new Date()  TODO:
        })
      );
    });
  });

  it("Test that model still exists if user denials model deletion confirmation dialog", () => {
    const model = models[1];
    cy.visit("/configuration/models");
    cy.contains("h4", "Connected Models").should("exist");

    findModel({ name: model.name }).then((container) => {
      cy.wrap(container).trigger("mouseover");

      cy.wrap(container).contains("button", "Delete").should("exist").click();

      findModelDeletionConfirmationDialog()
        .contains("button", "Cancel")
        .should("exist")
        .click();

      cy.contains("span", model.name).should("exist");
    });
  });

  it("Test model details", () => {
    cy.visit("/configuration/models");
    cy.contains("h4", "Connected Models").should("exist");

    getModelVersionsList(models[1]).then((versions) => {
      expect(versions).to.be.an("array");
      expect(versions).to.have.length(1);
      expect(versions[0])
        .to.have.property("name")
        .that.equals(models[1].versionName);
      expect(versions[0]).to.have.property("pendingRows").that.equals("0");

      // TODO:
      // const lastUpdate = dayjs(new Date()).format('MM/DD/YYYY');
      // expect(versions[0]).to.have.property("lastUpdate").that.contains(lastUpdate);

      expect(versions[0]).to.have.property("lastUpdate");
    });
  });

  it("Test model search", () => {
    cy.visit("/configuration/models");
    cy.contains("h4", "Connected Models").should("exist");

    cy.contains("label", "Search...")
      .should("exist")
      .parent()
      .find("input[role=combobox]")
      .should("exist")
      .as("searchInput");

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      cy.get("@searchInput").type(`{selectall}{backspace}${model.name}{enter}`);
      cy.contains("span", model.name).should("exist");
      for (let j = 0; j < models.length; j++) {
        if (j === i) continue;
        const model = models[j];
        cy.contains("span", model.name).should("not.exist");
      }
    }
  });

  it("Test model sorting", () => {
    const modelNames = models.map((it) => it.name);
    const modelNamesAsc = [...modelNames].sort();

    const modelNamesDesc = [...modelNames].sort((a, b) => {
      if (a < b) {
        return 1;
      } else if (a > b) {
        return -1;
      } else {
        return 0;
      }
    });

    function sortModels(by: string) {
      cy.contains("button", "Sort").should("exist").click();
      cy.get("ul[role=menu]")
        .should("exist")
        .contains("h6", by)
        .should("exist")
        .parent()
        .click();
    }

    cy.visit("/configuration/models");
    cy.contains("h4", "Connected Models").should("exist");

    sortModels("Alphabetically A-Z");

    getModelsList().then((models) => {
      expect(
        models.map((it) => it.name).every((it, i) => it === modelNamesAsc[i])
      ).to.be.true;
    });

    sortModels("Alphabetically Z-A");

    getModelsList().then((models) => {
      expect(
        models.map((it) => it.name).every((it, i) => it === modelNamesDesc[i])
      ).to.be.true;
    });
  });

  it("Test model deletion", () => {
    const model = models[0];
    cy.visit("/configuration/models");
    cy.contains("h4", "Connected Models").should("exist");

    findModel({ name: model.name }).then((container) => {
      cy.wrap(container).trigger("mouseover");

      cy.wrap(container).contains("button", "Delete").should("exist").click();

      findModelDeletionConfirmationDialog()
        .contains("button", "Yes")
        .should("exist")
        .click();
    });
  });
});

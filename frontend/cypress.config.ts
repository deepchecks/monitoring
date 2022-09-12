import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    experimentalSessionAndOrigin: true,
    chromeWebSecurity: false,
    // base_url: "https://staging-v2.deepchecks.com"
    baseUrl: "https://127.0.0.1:8000"
  },
  env: {
    auth0_username: "e2e-testing@deepchecks.com",
    auth0_password: "&fNo#fnEb7ZFm2kd"
  }
});

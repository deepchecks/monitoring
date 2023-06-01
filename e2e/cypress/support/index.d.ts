declare namespace Cypress {
  interface Chainable {
    createModelAndVersion(arg1, arg2, arg3, arg4): Promise;
    addMonitor(arg): void;
    addAlertRule(arg): void;
    addPerformanceCheck(arg): Promise;
    addDataToVersion(arg1, arg2?, arg3?, arg4?): Promise;
    addReferenceToVersion(arg): void;
    login(arg1, arg2): void;
    createModelAndVersion(arg1, arg2, arg3): Promise;
    addNullsCheck(arg): void;
    addCheck(arg1, arg2?): Promise;
  }
}
